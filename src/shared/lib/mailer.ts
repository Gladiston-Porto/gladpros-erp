// src/lib/mailer.ts
import nodemailer from "nodemailer";

// Minimal local types to avoid dependency on nodemailer type namespaces
type SentInfo = { messageId?: string } & Record<string, unknown>;
type SendMailOptionsLite = {
  from: string;
  to: string;
  subject: string;
  html: string;
  date: string;
  envelope: { from: string; to: string };
  sender?: string;
};
type MailTransport = { sendMail: (opts: SendMailOptionsLite) => Promise<SentInfo> };
let transporter: MailTransport | null = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: String(process.env.SMTP_SECURE ?? "false") === "true",
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! } : undefined,
  });
}

// Save last mail in memory in dev for easy testing
type LastMail = SendMailOptionsLite & {
  date: string;
  envelope: { from: string; to: string };
  sender?: string;
  info?: SentInfo;
};

const globalForMail = global as unknown as { __lastMail?: LastMail };

export async function sendMail(to: string, subject: string, html: string) {
  // Prefer explicit SMTP_FROM, then MAIL_FROM, else fall back to the authenticated SMTP user
  const smtpUser = process.env.SMTP_USER || "";
  const headerFrom = process.env.SMTP_FROM || process.env.MAIL_FROM || (smtpUser ? `GladPros <${smtpUser}>` : "GladPros <no-reply@localhost>");

  // Envelope MAIL FROM must usually match the authenticated account to avoid 553 errors
  const extractEmail = (s: string) => {
    const m = s.match(/<([^>]+)>/);
    return m ? m[1] : s;
  };
  const envelopeFrom = process.env.SMTP_ENVELOPE_FROM || smtpUser || extractEmail(headerFrom);

  const senderHeader = extractEmail(headerFrom) !== envelopeFrom ? envelopeFrom : undefined;
  const payload: SendMailOptionsLite = {
    from: headerFrom,
    to,
    subject,
    html,
    date: new Date().toISOString(),
    envelope: { from: envelopeFrom, to },
    ...(senderHeader ? { sender: senderHeader } : {}),
  };

  // Se há transporter configurado, envia por SMTP mesmo em desenvolvimento
  if (transporter) {
    try {
      const info = await transporter.sendMail(payload);
      // guardar último envio para debug em dev
      globalForMail.__lastMail = { ...payload, info };
      if (process.env.NODE_ENV === "development") {
        console.log("[SMTP MAILER SENT]", { to, subject, messageId: info?.messageId });
      }
      return info;
    } catch (err) {
      console.error("[SMTP MAILER ERROR]", err);
      throw err;
    }
  }

  // Fallback: modo dev sem SMTP → apenas registra
  globalForMail.__lastMail = payload;
  console.log("[DEV MAILER] (no SMTP configured)", payload);
  return payload;
}

export function getLastDevMail(): LastMail | null {
  const g = global as unknown as { __lastMail?: LastMail };
  return g.__lastMail ?? null;
}
