/**
 * Cron: shift reminder for workers still clocked in
 * Schedule: 0 22 * * * (10pm UTC = 5pm CST)
 *
 * Sends a Telegram reminder to workers who have an OPEN shift,
 * reminding them to clock out before midnight.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTelegramMessage } from '@/shared/lib/telegram'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const openShifts = await prisma.timeEntry.findMany({
    where: {
      status: 'OPEN',
      clockOut: null,
    },
    include: {
      worker: {
        include: { telegramLink: true },
      },
    },
  })

  let sent = 0
  for (const entry of openShifts) {
    if (!entry.worker.telegramLink) continue

    const chatId = entry.worker.telegramLink.telegramId.toString()
    const clockInFmt = entry.clockIn.toLocaleTimeString('en-US', {
      timeZone: 'America/Chicago',
      hour: '2-digit',
      minute: '2-digit',
    })

    await sendTelegramMessage(
      chatId,
      `🔔 *Lembrete: você ainda está com o turno aberto!*\n\n` +
        `⏰ Entrada registrada às *${clockInFmt}*\n\n` +
        `Se você já terminou o trabalho, registre a saída agora para evitar que o sistema feche automaticamente à meia-noite.`
    ).catch(() => {})

    sent++
  }

  return NextResponse.json({ reminded: sent })
}
