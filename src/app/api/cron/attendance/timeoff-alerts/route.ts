/**
 * Cron: time-off alerts for upcoming absences
 * Schedule: 0 13 * * * (1pm UTC = 8am CST daily)
 *
 * Notifies ADMIN/GERENTE at 5d, 2d, and day-of for approved absences,
 * so they can plan workforce coverage.
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

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const in5Days = new Date(today)
  in5Days.setDate(today.getDate() + 5)

  const in2Days = new Date(today)
  in2Days.setDate(today.getDate() + 2)

  // Find all approved time-offs that need alerts
  const timeOffs = await prisma.workerTimeOff.findMany({
    where: {
      status: 'APPROVED',
      OR: [
        { alert5dSent: false, startDate: { equals: in5Days } },
        { alert2dSent: false, startDate: { equals: in2Days } },
        { alertDaySent: false, startDate: { equals: today } },
      ],
    },
    include: {
      worker: {
        select: { id: true, name: true, usuario: { select: { nomeCompleto: true } } },
      },
    },
  })

  if (timeOffs.length === 0) {
    return NextResponse.json({ alerted: 0 })
  }

  const managers = await prisma.usuario.findMany({
    where: {
      nivel: { in: ['ADMIN', 'GERENTE'] },
      status: 'ATIVO',
      empresaId: 1,
    },
    select: { email: true, nomeCompleto: true },
  })

  let alerted = 0

  for (const timeOff of timeOffs) {
    const workerName =
      timeOff.worker.name ?? timeOff.worker.usuario?.nomeCompleto ?? `#${timeOff.worker.id}`

    const startFmt = timeOff.startDate.toLocaleDateString('en-US', {
      timeZone: 'America/Chicago',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })

    const isToday = timeOff.startDate.getTime() === today.getTime()
    const isIn2 = timeOff.startDate.getTime() === in2Days.getTime()
    const isIn5 = timeOff.startDate.getTime() === in5Days.getTime()

    const alertLabel = isToday ? 'HOJE' : isIn2 ? 'em 2 dias' : '5 dias'
    const subject = `📅 Ausência ${alertLabel} — ${workerName}`
    const html = `
      <p>Atenção,</p>
      <p><strong>${workerName}</strong> estará ausente a partir de <strong>${startFmt}</strong> 
      (${timeOff.totalDays} dia(s)) — tipo: ${timeOff.type}.</p>
      <p>Certifique-se de que há cobertura para os projetos em andamento.</p>
      <p>— GladPros ERP (automático)</p>
    `

    for (const manager of managers) {
      if (!manager.email) continue
      await sendMail(manager.email, subject, html).catch(() => {})
    }

    // Mark alert as sent
    await prisma.workerTimeOff.update({
      where: { id: timeOff.id },
      data: {
        alert5dSent: isIn5 ? true : undefined,
        alert2dSent: isIn2 ? true : undefined,
        alertDaySent: isToday ? true : undefined,
      },
    })

    alerted++
  }

  return NextResponse.json({ alerted })
}
