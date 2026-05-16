/**
 * Cron: orphan alert — report AUTO_CLOSED entries to ADMIN
 * Schedule: 0 12 * * * (12pm UTC = 7am CST)
 *
 * Sends a daily briefing to ADMIN/GERENTE about shifts that were
 * auto-closed overnight, so managers can review and adjust if needed.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/shared/lib/mailer'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find AUTO_CLOSED entries from the last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const orphans = await prisma.timeEntry.findMany({
    where: {
      source: 'AUTO_CLOSED',
      createdAt: { gte: since },
    },
    include: {
      worker: {
        select: { id: true, name: true, usuario: { select: { nomeCompleto: true } } },
      },
    },
    orderBy: { workDate: 'desc' },
  })

  if (orphans.length === 0) {
    return NextResponse.json({ alerted: 0, message: 'No orphan shifts' })
  }

  const managers = await prisma.usuario.findMany({
    where: {
      nivel: { in: ['ADMIN', 'GERENTE'] },
      status: 'ATIVO',
      empresaId: 1,
    },
    select: { email: true, nomeCompleto: true },
  })

  const rows = orphans
    .map((e) => {
      const workerName = e.worker.name ?? e.worker.usuario?.nomeCompleto ?? `#${e.worker.id}`
      const date = e.workDate.toLocaleDateString('en-US', { timeZone: 'America/Chicago' })
      const clockIn = e.clockIn.toLocaleTimeString('en-US', {
        timeZone: 'America/Chicago',
        hour: '2-digit',
        minute: '2-digit',
      })
      const clockOut = e.clockOut
        ? e.clockOut.toLocaleTimeString('en-US', {
            timeZone: 'America/Chicago',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—'
      return `<tr><td>${workerName}</td><td>${date}</td><td>${clockIn}</td><td>${clockOut} (est.)</td></tr>`
    })
    .join('')

  const html = `
    <p>Bom dia,</p>
    <p>Os seguintes turnos foram <strong>fechados automaticamente</strong> pelo sistema ontem à noite:</p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
      <thead>
        <tr><th>Worker</th><th>Data</th><th>Entrada</th><th>Saída (estimada)</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p>Revise no ERP se algum horário precisar ser ajustado.</p>
    <p>— GladPros ERP (automático)</p>
  `

  let sent = 0
  for (const manager of managers) {
    if (!manager.email) continue
    await sendMail(
      manager.email,
      `📋 Turnos fechados automaticamente — ${orphans.length} registro(s)`,
      html
    ).catch(() => {})
    sent++
  }

  return NextResponse.json({ orphans: orphans.length, alerted: sent })
}
