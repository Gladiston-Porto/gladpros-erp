import { prisma } from '@/lib/prisma';
import { sendMail } from '@/shared/lib/mailer';
import { renderNewDeviceEmail } from '@/shared/lib/emails/new-device';
import { logger } from '@/lib/api/logger';

interface DeviceAlertParams {
  userId: number;
  ip: string;
  userAgent: string;
  email: string;
  name: string;
}

function extractBrowserFamily(ua: string): string {
  if (!ua) return 'Unknown';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/edg/i.test(ua)) return 'Edge';
  if (/opr|opera/i.test(ua)) return 'Opera';
  return ua.slice(0, 30);
}

export async function checkAndAlertNewDevice(params: DeviceAlertParams): Promise<void> {
  const { userId, ip, userAgent, email, name } = params;

  type SessaoRow = { userAgent: string | null };
  const recentSessions = await prisma.$queryRaw<SessaoRow[]>`
    SELECT userAgent FROM SessaoAtiva
    WHERE usuarioId = ${userId}
    ORDER BY criadoEm DESC
    LIMIT 5
  `.catch(() => [] as SessaoRow[]);

  const currentBrowser = extractBrowserFamily(userAgent);
  const knownBrowsers = new Set(recentSessions.map((s) => extractBrowserFamily(s.userAgent || '')));

  // Se o browser atual já aparece nas sessões recentes, não é "novo"
  if (knownBrowsers.has(currentBrowser) && recentSessions.length > 0) {
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.gladpros.com';
  const loginTime = new Date().toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const { subject, html } = renderNewDeviceEmail({
    name,
    email,
    ip,
    device: userAgent ? `${currentBrowser} — ${userAgent.slice(0, 80)}` : 'Desconhecido',
    loginTime,
    appUrl,
  });

  await sendMail(email, subject, html).catch((e) => {
    logger.warn('[DeviceAlert] Falha ao enviar email de novo dispositivo', { error: e });
  });
}
