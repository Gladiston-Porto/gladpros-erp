/**
 * Infraction Notification Templates
 *
 * Covers the 3D attendance escalation system:
 *   - AVISO_LEVE      : 1st / 2nd infraction in a 30-day window
 *   - AVISO_SEVERO    : 3rd infraction (cycle complete) = penalty triggered
 *   - PENALIDADE      : financial deduction confirmed (same cycle completion, worker-facing)
 *   - CANCELAMENTO_DIA: day cancelled after 3 consecutive penalty months
 *   - ALERTA_GERENTE  : manager alert — 2nd consecutive month
 *   - ALERTA_CRITICO  : manager alert — 3rd consecutive month (cancellation triggered)
 *
 * Emails   → English (en-US), GladPros branding, Dallas TX
 * Telegram → Portuguese (pt-BR), concise, emoji-heavy
 */

import { sendMail } from '@/shared/lib/mailer'
import { sendTelegramMessage } from '@/shared/lib/telegram'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InfractionNotificationType =
  | 'AVISO_LEVE'
  | 'AVISO_SEVERO'
  | 'PENALIDADE'
  | 'CANCELAMENTO_DIA'
  | 'ALERTA_GERENTE'
  | 'ALERTA_CRITICO'

export interface InfractionNotificationData {
  workerName: string
  workerEmail?: string
  telegramId?: bigint | null
  /** YYYY-MM-DD (America/Chicago) of the missed clock-in/out */
  date: string
  type: InfractionNotificationType
  /** Position in the current 30-day cycle (1, 2, or 3) */
  cycleCount?: number
  /** Penalty amount in USD */
  penaltyAmount?: number
  /** How many consecutive months had penalty cycles */
  monthsConsecutive?: number
  /** Manager / admin email addresses (used for ALERTA_* types) */
  managerEmails?: string[]
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function emailShell(subject: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(subject)}</title>
<style>
  body{margin:0;padding:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#1F2937;}
  .wrap{width:100%;background:#f6f8fb;padding:24px 0;}
  .box{width:100%;max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.08);}
  .hdr{background:linear-gradient(90deg,#3E4095,#0098DA);padding:20px 24px;color:#fff;font-size:18px;font-weight:700;letter-spacing:.5px;}
  .body{padding:24px;line-height:1.6;}
  h1{font-size:20px;font-weight:700;color:#111827;margin:0 0 12px;}
  .card{border:1px solid #E5E7EB;border-radius:12px;padding:16px;margin:16px 0;background:#F9FAFB;}
  .warn{background:#FFF7ED;border-color:#FED7AA;color:#92400E;}
  .danger{background:#FEF2F2;border-color:#FECACA;color:#991B1B;}
  .info{background:#EEF6FB;border-color:#D1E7F5;color:#1E3A5F;}
  .amount{font-size:26px;font-weight:700;color:#B91C1C;display:block;text-align:center;margin:8px 0;}
  .ftr{padding:16px 24px;color:#6B7280;font-size:12px;text-align:center;border-top:1px solid #F3F4F6;}
</style>
</head>
<body>
<table role="presentation" class="wrap" width="100%" cellspacing="0" cellpadding="0">
<tr><td align="center">
<table role="presentation" class="box" width="100%" cellspacing="0" cellpadding="0">
<tr><td class="hdr">GladPros</td></tr>
<tr><td class="body">${body}</td></tr>
<tr><td class="ftr">GladPros LLC &middot; Dallas, TX<br/>This is an automated message from the GladPros attendance system.</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Email templates — worker-facing
// ---------------------------------------------------------------------------

type EmailTemplate = { subject: string; html: string }

export function getInfractionEmailTemplate(
  data: InfractionNotificationData
): EmailTemplate | null {
  const name = esc(data.workerName)
  const date = esc(data.date)

  switch (data.type) {
    case 'AVISO_LEVE': {
      const pos = data.cycleCount ?? 1
      const remaining = 3 - pos
      const penaltyFmt = `$${(data.penaltyAmount ?? 25).toFixed(2)}`
      const subject = `GladPros — Attendance Warning (${pos} of 3)`
      const body = `
        <h1>⚠️ Attendance Warning — ${pos} of 3</h1>
        <p>Hi <strong>${name}</strong>,</p>
        <p>A missed clock-in or clock-out was recorded on <strong>${date}</strong>.
           This is infraction <strong>${pos} of 3</strong> in your current 30-day evaluation period.</p>
        <div class="card warn">
          <strong>⏳ ${remaining} more infraction(s)</strong> in this 30-day window will trigger a
          <strong>${penaltyFmt} paycheck deduction</strong>.
        </div>
        <p>Please remember to clock in and out on time using the GladPros app or Telegram bot.</p>
        <p>If you believe this is a mistake, contact your manager immediately.</p>`
      return { subject, html: emailShell(subject, body) }
    }

    case 'AVISO_SEVERO':
    case 'PENALIDADE': {
      const amount = data.penaltyAmount ?? 25
      const subject = `GladPros — Attendance Penalty Applied — $${amount.toFixed(2)}`
      const body = `
        <h1>🚨 Attendance Penalty Applied</h1>
        <p>Hi <strong>${name}</strong>,</p>
        <p>You have reached <strong>3 infractions</strong> in your 30-day evaluation period.
           A penalty has been recorded against your account.</p>
        <div class="card danger" style="text-align:center;">
          <div style="font-size:13px;color:#6B7280;">Penalty amount</div>
          <span class="amount">$${amount.toFixed(2)}</span>
          <div style="font-size:13px;color:#6B7280;">Will be deducted from your next paycheck</div>
        </div>
        <div class="card info">
          <strong>📅 Infraction date:</strong> ${date}<br/>
          <strong>📋 Status:</strong> Cycle complete — penalty triggered
        </div>
        <p>To contest this penalty or provide justification, speak with your manager directly.</p>
        <p>A new 30-day evaluation cycle has now begun. Please ensure all shifts are properly recorded.</p>`
      return { subject, html: emailShell(subject, body) }
    }

    case 'CANCELAMENTO_DIA': {
      const months = data.monthsConsecutive ?? 3
      const subject = `GladPros — Day Cancellation Notice (${months} Consecutive Months)`
      const body = `
        <h1>🔴 Day Cancellation — Policy Escalation</h1>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Due to repeated attendance infractions over <strong>${months} consecutive months</strong>,
           a <strong>day cancellation</strong> has been applied to your record per GladPros attendance policy.</p>
        <div class="card danger">
          <strong>⚠️ Immediate action required:</strong> Please contact your manager to review your
          attendance history and discuss corrective steps.
        </div>
        <div class="card info">
          <strong>📅 Reference date:</strong> ${date}<br/>
          <strong>📅 Consecutive months flagged:</strong> ${months}
        </div>
        <p>Continued attendance issues may result in further disciplinary action.</p>`
      return { subject, html: emailShell(subject, body) }
    }

    // Manager-only types — no worker email
    case 'ALERTA_GERENTE':
    case 'ALERTA_CRITICO':
      return null

    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Email templates — manager-facing
// ---------------------------------------------------------------------------

export function getManagerAlertEmailTemplate(
  data: InfractionNotificationData
): EmailTemplate | null {
  const name = esc(data.workerName)
  const date = esc(data.date)
  const months = data.monthsConsecutive ?? 1

  if (data.type === 'ALERTA_GERENTE') {
    const subject = `GladPros — Staff Alert: ${data.workerName} — Recurring Infractions (Month ${months})`
    const body = `
      <h1>⚠️ Staff Attendance Alert — Action Recommended</h1>
      <p>This is an automated notification from the GladPros attendance system.</p>
      <div class="card warn">
        <strong>Worker:</strong> ${name}<br/>
        <strong>Reference date:</strong> ${date}<br/>
        <strong>Consecutive months with penalty cycles:</strong> ${months}
      </div>
      <p><strong>Recommended action:</strong> Please contact <strong>${name}</strong> to review
         their attendance record. If infractions continue into the next month,
         a <strong>day cancellation</strong> will be triggered automatically.</p>
      <p>Full history: <strong>RH → Attendance → Infractions → ${name}</strong></p>`
    return { subject, html: emailShell(subject, body) }
  }

  if (data.type === 'ALERTA_CRITICO') {
    const subject = `GladPros — CRITICAL: ${data.workerName} — Day Cancellation Triggered (${months} Months)`
    const body = `
      <h1>🚨 Critical Alert — Day Cancellation Triggered</h1>
      <p>This is an automated critical alert from the GladPros attendance system.</p>
      <div class="card danger">
        <strong>Worker:</strong> ${name}<br/>
        <strong>Reference date:</strong> ${date}<br/>
        <strong>Consecutive months with penalty cycles:</strong> ${months}<br/>
        <strong>Action triggered:</strong> Day Cancellation
      </div>
      <p><strong>${name}</strong> has completed penalty cycles in <strong>${months} consecutive months</strong>.
         Per GladPros attendance policy, a <strong>day has been cancelled</strong> from their record.</p>
      <p>Please review this situation immediately and document any corrective actions in the ERP.</p>
      <p>Access: <strong>RH → Attendance → Infractions → ${name}</strong></p>`
    return { subject, html: emailShell(subject, body) }
  }

  return null
}

// ---------------------------------------------------------------------------
// Telegram message templates (pt-BR)
// ---------------------------------------------------------------------------

export function getInfractionTelegramMessage(
  data: InfractionNotificationData
): string | null {
  switch (data.type) {
    case 'AVISO_LEVE': {
      const pos = data.cycleCount ?? 1
      const remaining = 3 - pos
      const penaltyFmt = `$${(data.penaltyAmount ?? 25).toFixed(2)}`
      return (
        `⚠️ *Aviso de Ponto — ${pos}/3*\n\n` +
        `Foi registrada uma infração de ponto em *${data.date}*.\n` +
        `Esta é a infração *${pos} de 3* no ciclo atual de 30 dias.\n\n` +
        `Ainda ${remaining === 1 ? 'falta *1 infração*' : `faltam *${remaining} infrações*`} ` +
        `para aplicação de penalidade de *${penaltyFmt}*.\n\n` +
        `✅ Lembre-se de registrar entrada e saída corretamente.\n` +
        `Dúvidas? Fale com seu gerente.`
      )
    }

    case 'AVISO_SEVERO':
    case 'PENALIDADE': {
      const amount = data.penaltyAmount ?? 25
      return (
        `🚨 *Penalidade de Ponto Aplicada*\n\n` +
        `Você completou 3 infrações no ciclo de 30 dias (${data.date}).\n\n` +
        `💸 *Valor descontado:* $${amount.toFixed(2)}\n` +
        `📅 Desconto aplicado no próximo pagamento.\n\n` +
        `Para contestar, entre em contato com o gerente.`
      )
    }

    case 'CANCELAMENTO_DIA': {
      const months = data.monthsConsecutive ?? 3
      return (
        `🔴 *Cancelamento de Dia — Aviso*\n\n` +
        `Você completou ciclos de penalidade em *${months} meses consecutivos*.\n\n` +
        `⚠️ Um dia foi cancelado conforme a política de ponto da GladPros.\n` +
        `Entre em contato com o gerente *imediatamente* para mais informações.`
      )
    }

    // Manager-only — no Telegram to worker
    case 'ALERTA_GERENTE':
    case 'ALERTA_CRITICO':
      return null

    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

export async function sendInfractionNotification(
  data: InfractionNotificationData
): Promise<void> {
  const isManagerAlert =
    data.type === 'ALERTA_GERENTE' || data.type === 'ALERTA_CRITICO'

  if (isManagerAlert) {
    const emails = data.managerEmails ?? []
    if (emails.length === 0) return

    const template = getManagerAlertEmailTemplate(data)
    if (!template) return

    await Promise.all(
      emails.map((email) =>
        sendMail(email, template.subject, template.html).catch((err) => {
          console.error(
            `[infraction-notifications] Failed to send manager alert to ${email}:`,
            err
          )
        })
      )
    )
    return
  }

  // Worker notifications (email + Telegram in parallel)
  const emailTemplate = getInfractionEmailTemplate(data)
  const telegramMsg = getInfractionTelegramMessage(data)

  await Promise.all([
    data.workerEmail && emailTemplate
      ? sendMail(data.workerEmail, emailTemplate.subject, emailTemplate.html).catch((err) => {
          console.error('[infraction-notifications] Failed to send worker email:', err)
        })
      : Promise.resolve(),

    data.telegramId && telegramMsg
      ? sendTelegramMessage(data.telegramId.toString(), telegramMsg).catch((err) => {
          console.error('[infraction-notifications] Failed to send Telegram message:', err)
        })
      : Promise.resolve(),
  ])
}
