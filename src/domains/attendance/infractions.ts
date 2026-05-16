/**
 * Domain: Attendance Infractions
 * Handles the 3D escalation system:
 * - Dimension 1: rolling 30-day cycle (3 = penalty)
 * - Dimension 2: multiple penalty cycles in same month → ADMIN alert
 * - Dimension 3: 3 consecutive months with cycles → day cancellation
 */
import { prisma } from '@/lib/prisma'
import { sendTelegramMessage } from '@/shared/lib/telegram'
import { sendMail } from '@/shared/lib/mailer'

type InfractionType = 'FORGOT_CLOCK_OUT' | 'FORGOT_CLOCK_IN'

interface RecordInfractionInput {
  workerId: number
  empresaId: number
  timeEntryId?: number
  type: InfractionType
  occurredAt: Date
}

/** Default penalty config (used if no AttendancePenaltyConfig exists for empresa) */
const DEFAULT_CONFIG = {
  cycleThreshold: 3,
  periodDays: 30,
  monthlyAlertThreshold: 3,
  penaltyType: 'FIXED_AMOUNT' as const,
  penaltyValue: 25,
  dayOffAfterMonths: 3,
}

export async function recordInfraction(input: RecordInfractionInput): Promise<void> {
  const config = await prisma.attendancePenaltyConfig
    .findUnique({ where: { empresaId: input.empresaId } })
    .then((c) => c ?? { ...DEFAULT_CONFIG, empresaId: input.empresaId })

  const periodStart = new Date(input.occurredAt)
  periodStart.setDate(periodStart.getDate() - config.periodDays)

  // Count existing infractions in the rolling window
  const recentCount = await prisma.workerInfraction.count({
    where: {
      workerId: input.workerId,
      occurredAt: { gte: periodStart },
    },
  })

  const cyclePosition = (recentCount % config.cycleThreshold) + 1
  const cycleNumber = Math.floor(recentCount / config.cycleThreshold) + 1
  const isCycleComplete = cyclePosition === config.cycleThreshold

  const penaltyApplied = isCycleComplete
  const penaltyAmount = isCycleComplete
    ? config.penaltyValue instanceof Object
      ? Number((config.penaltyValue as { toNumber: () => number }).toNumber?.() ?? config.penaltyValue)
      : Number(config.penaltyValue)
    : null

  await prisma.workerInfraction.create({
    data: {
      workerId: input.workerId,
      empresaId: input.empresaId,
      timeEntryId: input.timeEntryId,
      type: input.type,
      occurredAt: input.occurredAt,
      cycleNumber,
      cyclePosition,
      penaltyApplied,
      penaltyAmount: penaltyAmount ? penaltyAmount : null,
    },
  })

  // Send alert to ADMIN/GERENTE when a penalty cycle completes
  if (isCycleComplete) {
    await sendCycleAlert(input, penaltyAmount ?? 0, cycleNumber, config)
  }

  // Check if we need to send a monthly escalation alert
  const monthStart = new Date(input.occurredAt.getFullYear(), input.occurredAt.getMonth(), 1)
  const monthEnd = new Date(input.occurredAt.getFullYear(), input.occurredAt.getMonth() + 1, 0)

  const cyclesThisMonth = await prisma.workerInfraction.count({
    where: {
      workerId: input.workerId,
      occurredAt: { gte: monthStart, lte: monthEnd },
      penaltyApplied: true,
      alertSentToAdmin: false,
    },
  })

  if (cyclesThisMonth >= config.monthlyAlertThreshold) {
    await sendMonthlyEscalationAlert(input, cyclesThisMonth)
    // Mark all this month's infractions as alerted
    await prisma.workerInfraction.updateMany({
      where: {
        workerId: input.workerId,
        occurredAt: { gte: monthStart, lte: monthEnd },
        penaltyApplied: true,
        alertSentToAdmin: false,
      },
      data: { alertSentToAdmin: true },
    })
  }
}

async function sendCycleAlert(
  input: RecordInfractionInput,
  penaltyAmount: number,
  cycleNumber: number,
  _config: { dayOffAfterMonths: number }
): Promise<void> {
  const worker = await prisma.worker.findUnique({
    where: { id: input.workerId },
    select: {
      id: true,
      name: true,
      email: true,
      telegramLink: { select: { telegramId: true } },
      usuario: { select: { email: true, nomeCompleto: true } },
    },
  })

  if (!worker) return

  const workerName = worker.name ?? worker.usuario?.nomeCompleto ?? 'Worker'
  const workerEmail = worker.email ?? worker.usuario?.email

  const typeLabel = input.type === 'FORGOT_CLOCK_OUT' ? 'esqueceu de registrar saída' : 'esqueceu de registrar entrada'

  // Notify worker via Telegram
  if (worker.telegramLink) {
    const chatId = worker.telegramLink.telegramId.toString()
    await sendTelegramMessage(
      chatId,
      `⚠️ *Infração registrada — Ciclo ${cycleNumber} completo*\n\n` +
        `Você ${typeLabel} pela 3ª vez no período.\n\n` +
        `💸 Penalidade aplicada: *$${penaltyAmount.toFixed(2)}*\n\n` +
        `Se precisar contestar, entre em contato com o gerente.`
    ).catch(() => {})
  }

  // Notify worker via email
  if (workerEmail) {
    await sendMail(
      workerEmail,
      `⚠️ Penalidade de pontualidade aplicada — GladPros`,
      `<p>Olá, ${workerName},</p>
      <p>Uma penalidade de <strong>$${penaltyAmount.toFixed(2)}</strong> foi aplicada ao seu próximo pagamento 
      por ter ${typeLabel} pela 3ª vez no período de avaliação.</p>
      <p>Caso precise contestar ou justificar, entre em contato com seu gerente.</p>
      <p>— GladPros ERP</p>`
    ).catch(() => {})
  }
}

async function sendMonthlyEscalationAlert(
  input: RecordInfractionInput,
  cycleCount: number
): Promise<void> {
  const worker = await prisma.worker.findUnique({
    where: { id: input.workerId },
    select: {
      name: true,
      email: true,
      usuario: { select: { nomeCompleto: true } },
    },
  })

  const workerName = worker?.name ?? worker?.usuario?.nomeCompleto ?? `Worker #${input.workerId}`

  // Get all ADMIN and GERENTE emails
  const managers = await prisma.usuario.findMany({
    where: {
      nivel: { in: ['ADMIN', 'GERENTE'] },
      status: 'ATIVO',
      empresaId: input.empresaId,
    },
    select: { email: true, nomeCompleto: true },
  })

  const month = input.occurredAt.toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Chicago',
  })

  for (const manager of managers) {
    if (!manager.email) continue
    await sendMail(
      manager.email,
      `🚨 Alerta de pontualidade — ${workerName} — ${cycleCount} ciclos em ${month}`,
      `<p>Olá, ${manager.nomeCompleto},</p>
      <p>O trabalhador <strong>${workerName}</strong> completou <strong>${cycleCount} ciclos de penalidade</strong> 
      em ${month}, o que excede o limite de alertas configurado.</p>
      <p><strong>Recomendação:</strong> entre em contato com o trabalhador para entender o que está acontecendo 
      e evitar que o padrão se repita no próximo mês.</p>
      <p>Acesse o ERP para ver o histórico completo de infrações.</p>
      <p>— GladPros ERP (automático)</p>`
    ).catch(() => {})
  }
}

/** Check if worker has had penalty cycles in consecutive months (for day-off escalation) */
export async function checkConsecutiveMonths(
  workerId: number,
  empresaId: number,
  referenceDate: Date
): Promise<number> {
  let consecutiveMonths = 0
  const checkDate = new Date(referenceDate)

  for (let i = 0; i < 3; i++) {
    const monthStart = new Date(checkDate.getFullYear(), checkDate.getMonth() - i, 1)
    const monthEnd = new Date(checkDate.getFullYear(), checkDate.getMonth() - i + 1, 0)

    const cyclesInMonth = await prisma.workerInfraction.count({
      where: {
        workerId,
        occurredAt: { gte: monthStart, lte: monthEnd },
        penaltyApplied: true,
      },
    })

    if (cyclesInMonth > 0) {
      consecutiveMonths++
    } else {
      break
    }
  }

  return consecutiveMonths
}
