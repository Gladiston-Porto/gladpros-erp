import { prisma } from '@/lib/prisma';
import type { Prisma, ProjectHealthAlertStatus } from '@prisma/client';
import {
  getProjectHealthSnapshot,
  type ProjectHealthAlert,
  type ProjectHealthRecommendation,
  type ProjectHealthSnapshot,
} from './project-health.service';

const ACTIVE_ALERT_STATUSES: ProjectHealthAlertStatus[] = ['OPEN', 'ACKNOWLEDGED'];

function buildAlertKey(projetoId: number, type: string): string {
  return `PROJECT:${projetoId}:HEALTH:${type}`;
}

function recommendationForAlert(
  alert: ProjectHealthAlert,
  recommendations: ProjectHealthRecommendation[]
): string | null {
  return (
    recommendations.find((recommendation) => recommendation.priority === alert.severity)?.action ??
    recommendations[0]?.action ??
    null
  );
}

function snapshotForAlert(snapshot: ProjectHealthSnapshot, alert: ProjectHealthAlert): Prisma.InputJsonObject {
  return {
    type: alert.type,
    riskScore: snapshot.riskScore,
    progressPct: snapshot.progressPct,
    budgetUsedPct: snapshot.budgetUsedPct,
    actualCost: snapshot.actualCost,
    plannedCost: snapshot.plannedCost,
    estimatedAtCompletion: snapshot.estimatedAtCompletion,
    projectedMarginPct: snapshot.projectedMarginPct,
    cashGap: snapshot.cashGap,
    invoiceCoveragePct: snapshot.invoiceCoveragePct,
    billingCoveragePct: snapshot.billingCoveragePct,
    materialVariance: snapshot.materialVariance,
    laborActualHours: snapshot.laborActualHours,
    scheduleVariancePct: snapshot.scheduleVariancePct,
    osMarginRiskCount: snapshot.osMarginRiskCount,
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export async function syncProjectHealthAlerts(
  projetoId: number,
  options: { userId?: number; now?: Date } = {}
) {
  const now = options.now ?? new Date();
  const snapshot = await getProjectHealthSnapshot(projetoId, now);

  if (!snapshot) {
    return null;
  }

  const desiredAlerts = snapshot.alerts.map((alert) => ({
    alert,
    activeKey: buildAlertKey(projetoId, alert.type),
    recommendation: recommendationForAlert(alert, snapshot.recommendations),
    snapshot: snapshotForAlert(snapshot, alert),
  }));
  const desiredKeys = desiredAlerts.map((item) => item.activeKey);

  const existingForKeys = desiredKeys.length > 0
    ? await prisma.projectHealthAlert.findMany({
        where: { projetoId, activeKey: { in: desiredKeys } },
        select: { id: true, activeKey: true, status: true },
      })
    : [];
  const existingByKey = new Map(existingForKeys.map((alert) => [alert.activeKey, alert]));

  let created = 0;
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const item of desiredAlerts) {
      const existing = existingByKey.get(item.activeKey);
      const data = {
        severity: item.alert.severity,
        metric: item.alert.metric,
        message: item.alert.message,
        recommendation: item.recommendation,
        snapshot: item.snapshot,
        lastDetectedAt: now,
        resolvedAt: null,
        resolvedBy: null,
      };

      if (existing) {
        await tx.projectHealthAlert.update({
          where: { id: existing.id },
          data: {
            ...data,
            status: existing.status === 'RESOLVED' ? 'OPEN' : existing.status,
          },
        });
        updated += 1;
      } else {
        await tx.projectHealthAlert.create({
          data: {
            empresaId: 1,
            projetoId,
            type: item.alert.type,
            activeKey: item.activeKey,
            status: 'OPEN',
            ...data,
          },
        });
        created += 1;
      }
    }

    const resolvedResult = await tx.projectHealthAlert.updateMany({
      where: {
        projetoId,
        status: { in: ACTIVE_ALERT_STATUSES },
        ...(desiredKeys.length > 0 ? { activeKey: { notIn: desiredKeys } } : {}),
      },
      data: {
        status: 'RESOLVED',
        resolvedAt: now,
        resolvedBy: options.userId,
      },
    });

    updated += resolvedResult.count;
  });

  const activeAlerts = await prisma.projectHealthAlert.findMany({
    where: { projetoId, status: { in: ACTIVE_ALERT_STATUSES } },
    orderBy: [{ severity: 'desc' }, { lastDetectedAt: 'desc' }],
  });

  return {
    snapshot,
    created,
    updated,
    activeAlerts,
  };
}

export async function listProjectHealthAlerts(
  projetoId: number,
  options: { status?: ProjectHealthAlertStatus; limit?: number } = {}
) {
  return prisma.projectHealthAlert.findMany({
    where: {
      projetoId,
      ...(options.status ? { status: options.status } : {}),
    },
    orderBy: [{ status: 'asc' }, { lastDetectedAt: 'desc' }],
    take: Math.min(options.limit ?? 50, 100),
  });
}

export async function updateProjectHealthAlertStatus(
  projetoId: number,
  alertId: number,
  status: Extract<ProjectHealthAlertStatus, 'ACKNOWLEDGED' | 'RESOLVED'>,
  userId: number
) {
  const now = new Date();
  return prisma.projectHealthAlert.updateMany({
    where: { id: alertId, projetoId },
    data: status === 'ACKNOWLEDGED'
      ? { status, acknowledgedBy: userId, acknowledgedAt: now }
      : { status, resolvedBy: userId, resolvedAt: now },
  });
}
