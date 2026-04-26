/**
 * MarginService — Fase 3: Margin Protection
 * Calculates marginStatus for Service Orders based on actual cost vs agreedClientPrice.
 * Fires persistent alerts (AlertaEstoque) and in-memory notifications to GERENTE+ADMIN.
 */

import { prisma } from "@/lib/prisma"
import { NotificationService } from "@/shared/lib/notifications"

export type MarginStatus = "OK" | "WARNING" | "ALERT" | "CRITICAL" | "LOSS"

interface MarginResult {
  status: MarginStatus
  costRatio: number        // (materialTotal + laborTotal) / agreedClientPrice
  marginPct: number        // (1 - costRatio) * 100
  totalCost: number
  agreedClientPrice: number
}

/**
 * Compute margin status from raw numbers.
 * Thresholds (costRatio vs agreedClientPrice):
 *   < 70%  → OK
 *   70–85% → WARNING
 *   85–100% → ALERT
 *   100–110% → CRITICAL
 *   > 110% → LOSS
 */
export function computeMarginStatus(
  agreedClientPrice: number | null | undefined,
  materialTotal: number,
  laborTotal: number
): MarginResult | null {
  if (!agreedClientPrice || agreedClientPrice <= 0) return null

  const totalCost = materialTotal + laborTotal
  const costRatio = totalCost / agreedClientPrice
  const marginPct = (1 - costRatio) * 100

  let status: MarginStatus = "OK"
  if (costRatio > 1.1) status = "LOSS"
  else if (costRatio > 1.0) status = "CRITICAL"
  else if (costRatio >= 0.85) status = "ALERT"
  else if (costRatio >= 0.70) status = "WARNING"

  return { status, costRatio, marginPct, totalCost, agreedClientPrice }
}

/**
 * Compute margin from estimates (used in preview before save).
 * Uses materialEstimate + laborEstimate instead of actuals.
 */
export function computeEstimatedMargin(
  agreedClientPrice: number | null | undefined,
  materialEstimate: number,
  laborEstimate: number
): MarginResult | null {
  return computeMarginStatus(agreedClientPrice, materialEstimate, laborEstimate)
}

/**
 * Fire alerts/notifications if status is actionable.
 * Exported separately so recalculateTotals can call this after it already persisted the status.
 */
export async function fireMarginAlertsIfNeeded(
  serviceOrderId: number,
  agreedClientPrice: number,
  materialTotal: number,
  laborTotal: number,
  osNumber?: string
): Promise<void> {
  const result = computeMarginStatus(agreedClientPrice, materialTotal, laborTotal)
  if (result && (result.status === "ALERT" || result.status === "CRITICAL" || result.status === "LOSS")) {
    await fireMarginAlert(serviceOrderId, result, osNumber)
  }
}

/**
 * Update marginStatus on an OS, fire alerts if needed.
 * Call this in the OS PUT route whenever agreedClientPrice changes.
 */
export async function recalculateOSMargin(
  serviceOrderId: number,
  agreedClientPrice: number | null | undefined,
  materialTotal: number,
  laborTotal: number,
  osNumber?: string
): Promise<MarginStatus> {
  const result = computeMarginStatus(agreedClientPrice, materialTotal, laborTotal)
  const status: MarginStatus = result?.status ?? "OK"

  // Persist the new status
  await prisma.serviceOrder.update({
    where: { id: serviceOrderId },
    data: { marginStatus: status },
  })

  // Fire alert/notification only for actionable levels
  if (result && (status === "ALERT" || status === "CRITICAL" || status === "LOSS")) {
    await fireMarginAlert(serviceOrderId, result, osNumber)
  }

  return status
}

/** Enum type mapping from our status to AlertaEstoque_tipo */
const MARGIN_TIPO_MAP: Record<string, "MARGEM_WARNING" | "MARGEM_ALERT" | "MARGEM_CRITICAL" | "MARGEM_LOSS"> = {
  WARNING: "MARGEM_WARNING",
  ALERT: "MARGEM_ALERT",
  CRITICAL: "MARGEM_CRITICAL",
  LOSS: "MARGEM_LOSS",
}

const MARGIN_PRIORIDADE_MAP: Record<string, "BAIXA" | "MEDIA" | "ALTA" | "CRITICA"> = {
  WARNING: "MEDIA",
  ALERT: "ALTA",
  CRITICAL: "CRITICA",
  LOSS: "CRITICA",
}

const MARGIN_TITLE_MAP: Record<string, string> = {
  WARNING: "⚠️ Margin Warning",
  ALERT: "🟠 Margin Alert — costs above 85%",
  CRITICAL: "🔴 Critical — costs over 100%",
  LOSS: "⛔ Projected Loss — costs over 110%",
}

async function fireMarginAlert(
  serviceOrderId: number,
  result: MarginResult,
  osNumber?: string
): Promise<void> {
  const tipo = MARGIN_TIPO_MAP[result.status]
  if (!tipo) return

  const label = osNumber ? `OS #${osNumber}` : `OS #${serviceOrderId}`
  const marginPctFmt = result.marginPct.toFixed(1)
  const costFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(result.totalCost)
  const agreedFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(result.agreedClientPrice)

  const mensagem =
    `${label}: agreed price ${agreedFmt}, actual cost ${costFmt}. ` +
    `Margin: ${marginPctFmt}% (${result.status}). Review and take action.`

  // Persistent alert record (AlertaEstoque)
  await prisma.alertaEstoque
    .create({
      data: {
        tipo,
        prioridade: MARGIN_PRIORIDADE_MAP[result.status],
        serviceOrderId,
        titulo: MARGIN_TITLE_MAP[result.status],
        mensagem,
        ativo: true,
      },
    })
    .catch(() => {/* non-blocking */})

  // In-memory notifications to GERENTE + ADMIN (LOSS: ADMIN only)
  const roles = result.status === "LOSS" ? ["ADMIN"] : ["ADMIN", "GERENTE"]
  const users = await prisma.usuario.findMany({
    where: { nivel: { in: roles }, status: "ATIVO" },
    select: { id: true },
  })

  await Promise.allSettled(
    users.map((u) =>
      NotificationService.create({
        userId: u.id,
        type: "WARNING",
        title: MARGIN_TITLE_MAP[result.status],
        message: mensagem,
        data: { serviceOrderId, marginStatus: result.status, marginPct: result.marginPct },
      })
    )
  )
}
