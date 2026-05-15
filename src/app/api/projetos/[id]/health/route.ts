import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, requireProjectPermission } from '@/shared/lib/rbac-projects';
import { withErrorHandler } from '@/lib/api/error-handler';
import { getProjectHealthSnapshot, OPERATIONAL_ALERT_TYPES } from '@/domains/projects/services/project-health.service';

export const GET = withErrorHandler(async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const user = await requireProjectPermission(req, 'canViewFinancials');

  const { id } = await context.params;
  const projetoId = Number.parseInt(id, 10);
  if (Number.isNaN(projetoId)) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'ID do projeto inválido', success: false },
      { status: 400 }
    );
  }

  await requireProjectAccess(user, projetoId, 'canViewFinancials');

  const snapshot = await getProjectHealthSnapshot(projetoId);
  if (!snapshot) {
    return NextResponse.json(
      { error: 'Not found', message: 'Projeto não encontrado', success: false },
      { status: 404 }
    );
  }

  // GERENTE sees operational data (schedule, labor, materials) but not financial figures
  if (user.role === 'GERENTE') {
    return NextResponse.json({
      data: {
        projetoId: snapshot.projetoId,
        numeroProjeto: snapshot.numeroProjeto,
        status: snapshot.status,
        progressPct: snapshot.progressPct,
        expectedProgressPct: snapshot.expectedProgressPct,
        scheduleVariancePct: snapshot.scheduleVariancePct,
        laborPlannedHours: snapshot.laborPlannedHours,
        laborActualHours: snapshot.laborActualHours,
        materialPlannedCost: snapshot.materialPlannedCost,
        materialActualCost: snapshot.materialActualCost,
        materialVariance: snapshot.materialVariance,
        osMarginRiskCount: snapshot.osMarginRiskCount,
        riskScore: snapshot.riskScore,
        // Only operational alerts — no financial figures like margins/cash
        alerts: snapshot.alerts.filter(a => OPERATIONAL_ALERT_TYPES.has(a.type)),
        recommendations: snapshot.recommendations.filter(r =>
          // Surface recommendations that don't expose financial detail
          !r.reason.toLowerCase().includes('margem') &&
          !r.reason.toLowerCase().includes('caixa') &&
          !r.reason.toLowerCase().includes('invoice')
        ),
        updatedAt: snapshot.updatedAt,
      },
      success: true,
    });
  }

  return NextResponse.json({ data: snapshot, success: true });
});
