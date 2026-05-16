/**
 * Cron: weekly summary email to each worker
 * Schedule: 0 20 * * 6 (8pm UTC Saturday = 3pm CST Saturday)
 *
 * Sends each worker a weekly summary of their approved/auto-closed
 * time entries, total hours, overtime, and any penalties.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/shared/lib/mailer'
import { sendTelegramMessage } from '@/shared/lib/telegram'

const fmt$ = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Week = Mon–Sun (current week ending today, Saturday)
  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setHours(23, 59, 59, 999)

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 6) // go back 6 days (Mon)
  weekStart.setHours(0, 0, 0, 0)

  const workers = await prisma.worker.findMany({
    where: { deletadoEm: null },
    include: {
      usuario: { select: { email: true, nomeCompleto: true } },
      telegramLink: { select: { telegramId: true } },
      timeEntries: {
        where: {
          workDate: { gte: weekStart, lte: weekEnd },
          status: { in: ['APPROVED', 'AUTO_CLOSED', 'SUBMITTED'] },
        },
        orderBy: { workDate: 'asc' },
      },
      infractions: {
        where: { occurredAt: { gte: weekStart, lte: weekEnd } },
      },
    },
  })

  let summariesSent = 0

  for (const worker of workers) {
    if (worker.timeEntries.length === 0) continue

    const workerName = worker.name ?? worker.usuario?.nomeCompleto ?? `Worker #${worker.id}`
    const workerEmail = worker.email ?? worker.usuario?.email

    const totalMinutes = worker.timeEntries.reduce((sum, e) => sum + (e.totalMinutes ?? 0), 0)
    const regularMinutes = worker.timeEntries.reduce((sum, e) => sum + (e.regularMinutes ?? 0), 0)
    const overtimeMinutes = worker.timeEntries.reduce((sum, e) => sum + (e.overtimeMinutes ?? 0), 0)

    const totalHours = (totalMinutes / 60).toFixed(1)
    const regularHours = (regularMinutes / 60).toFixed(1)
    const overtimeHours = (overtimeMinutes / 60).toFixed(1)

    const hourlyRate = Number(worker.defaultHourlyRate)
    const regularPay = (regularMinutes / 60) * hourlyRate
    const overtimePay = (overtimeMinutes / 60) * hourlyRate * 1.5
    const estimatedGross = regularPay + overtimePay

    const penaltiesThisWeek = worker.infractions.filter((i) => i.penaltyApplied && !i.waived)
    const penaltyTotal = penaltiesThisWeek.reduce(
      (sum, i) => sum + (i.penaltyAmount ? Number(i.penaltyAmount) : 0),
      0
    )

    const entryRows = worker.timeEntries
      .map((e) => {
        const date = e.workDate.toLocaleDateString('en-US', {
          timeZone: 'America/Chicago',
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
        const hours = ((e.totalMinutes ?? 0) / 60).toFixed(1)
        const statusBadge =
          e.source === 'AUTO_CLOSED'
            ? ' ⚠️'
            : e.status === 'APPROVED'
              ? ' ✅'
              : ''
        return `<tr><td>${date}</td><td>${hours}h${statusBadge}</td></tr>`
      })
      .join('')

    const html = `
      <h2 style="color:#0098DA;">📊 Resumo semanal — ${workerName}</h2>
      <p><strong>${weekStart.toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' })} 
         – ${weekEnd.toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric' })}</strong></p>

      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin:12px 0;">
        <thead><tr><th>Dia</th><th>Horas</th></tr></thead>
        <tbody>${entryRows}</tbody>
      </table>

      <p>
        🕐 Total: <strong>${totalHours}h</strong><br>
        ⚡ Horas regulares: <strong>${regularHours}h</strong><br>
        🔥 Horas extras: <strong>${overtimeHours}h</strong>
      </p>

      <p>
        💵 Estimativa de pagamento (${fmt$(hourlyRate)}/h):<br>
        Regular: <strong>${fmt$(regularPay)}</strong><br>
        Overtime (1.5×): <strong>${fmt$(overtimePay)}</strong><br>
        ${penaltyTotal > 0 ? `Penalidades: <strong style="color:red;">-${fmt$(penaltyTotal)}</strong><br>` : ''}
        <strong>Estimativa bruta: ${fmt$(estimatedGross - penaltyTotal)}</strong>
      </p>

      ${worker.infractions.length > 0 ? `<p>⚠️ Você teve <strong>${worker.infractions.length} infração(ões)</strong> esta semana. Verifique seu histórico no app.</p>` : ''}

      <p style="color:#666;font-size:12px;">⚠️ Valores estimados. O pagamento oficial é calculado ao fechar o período de folha.</p>
      <p>— GladPros ERP</p>
    `

    if (workerEmail) {
      await sendMail(workerEmail, `📊 Seu resumo semanal — GladPros`, html).catch(() => {})
    }

    // Compact Telegram summary
    if (worker.telegramLink) {
      const chatId = worker.telegramLink.telegramId.toString()
      const telegramText =
        `📊 *Resumo da semana*\n\n` +
        `🕐 Total: *${totalHours}h* (regular: ${regularHours}h, OT: ${overtimeHours}h)\n` +
        `💵 Estimativa: *${fmt$(estimatedGross - penaltyTotal)}*` +
        (penaltyTotal > 0 ? `\n⚠️ Penalidades: -${fmt$(penaltyTotal)}` : '') +
        `\n\nDetalhes enviados por email.`
      await sendTelegramMessage(chatId, telegramText).catch(() => {})
    }

    summariesSent++
  }

  return NextResponse.json({ summariesSent })
}
