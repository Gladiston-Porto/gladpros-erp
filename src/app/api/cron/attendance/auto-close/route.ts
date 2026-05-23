/**
 * Cron: auto-close open shifts
 * Schedule: 0 5 * * * (5am UTC = midnight CST)
 *
 * Finds OPEN TimeEntries where clockIn is >12h ago,
 * closes them with source=AUTO_CLOSED, records infractions,
 * and notifies workers via Telegram.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/shared/lib/telegram';
import { recordInfraction } from '@/domains/attendance/infractions';

const EMPRESA_ID = 1;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const threshold = new Date(now.getTime() - 12 * 60 * 60 * 1000);

  const openShifts = await prisma.timeEntry.findMany({
    where: {
      status: 'OPEN',
      clockIn: { lt: threshold },
      clockOut: null,
    },
    include: {
      worker: {
        include: { telegramLink: true },
      },
    },
  });

  if (openShifts.length === 0) {
    return NextResponse.json({ closed: 0, message: 'No open shifts to close' });
  }

  const results: { id: number; workerId: number }[] = [];
  const errors: { id: number; error: string }[] = [];

  for (const entry of openShifts) {
    try {
      const estimatedClockOut = new Date(entry.clockIn.getTime() + 12 * 60 * 60 * 1000);
      const totalMinutes = Math.round(
        (estimatedClockOut.getTime() - entry.clockIn.getTime()) / 60000,
      );
      const regularMinutes = Math.min(totalMinutes, 8 * 60);
      const overtimeMinutes = Math.max(0, totalMinutes - 8 * 60);

      await prisma.timeEntry.update({
        where: { id: entry.id },
        data: {
          clockOut: estimatedClockOut,
          totalMinutes,
          regularMinutes,
          overtimeMinutes,
          status: 'AUTO_CLOSED',
          source: 'AUTO_CLOSED',
          correctionReason: 'Turno fechado automaticamente pelo sistema (12h sem clockOut)',
        },
      });

      // Record infraction only for W-2 employees
      if (entry.worker.classification === 'W2_EMPLOYEE') {
        await recordInfraction({
          workerId: entry.worker.id,
          empresaId: EMPRESA_ID,
          timeEntryId: entry.id,
          type: 'FORGOT_CLOCK_OUT',
          occurredAt: entry.workDate,
        });
      }

      // Notify worker via Telegram
      if (entry.worker.telegramLink) {
        const chatId = entry.worker.telegramLink.telegramId.toString();
        const clockInFmt = entry.clockIn.toLocaleTimeString('en-US', {
          timeZone: 'America/Chicago',
          hour: '2-digit',
          minute: '2-digit',
        });
        const estOutFmt = estimatedClockOut.toLocaleTimeString('en-US', {
          timeZone: 'America/Chicago',
          hour: '2-digit',
          minute: '2-digit',
        });
        await sendTelegramMessage(
          chatId,
          `⚠️ *Turno fechado automaticamente*\n\n` +
            `Você esqueceu de registrar sua saída.\n\n` +
            `⏰ Entrada: *${clockInFmt}*\n` +
            `🔒 Saída estimada: *${estOutFmt}* (12h)\n\n` +
            `Se o horário estiver incorreto, solicite uma correção no app.`,
        ).catch(() => {});
      }

      results.push({ id: entry.id, workerId: entry.worker.id });
    } catch (err) {
      errors.push({ id: entry.id, error: String(err) });
      console.error(`[auto-close] Error on entry ${entry.id}:`, err);
    }
  }

  return NextResponse.json({ closed: results.length, errors: errors.length });
}
