// src/lib/emails/template-base.ts

export interface BaseTemplateParams {
  subject: string;
  preheader: string;
  title: string;
  subtitle?: string;
  content: string;
  appUrl?: string;
  assetsBaseUrl?: string;
  supportEmail?: string;
  ctaButton?: {
    text: string;
    url: string;
  };
  footerNote?: string;
}

export function renderBaseTemplate(params: BaseTemplateParams) {
  const {
    subject,
    preheader,
    title,
    subtitle,
    content,
    appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    assetsBaseUrl,
    supportEmail = "suporte@gladpros.com",
    ctaButton,
    footerNote
  } = params;

  const logoUrl = assetsBaseUrl 
    ? `${assetsBaseUrl}/images/LOGO_200.png` 
    : `${appUrl}/images/LOGO_200.png`;

  const html = `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <title>${escapeHtml(subject)}</title>
  <style>
    @font-face {
      font-family: 'Neuropol';
      src: url('${assetsBaseUrl ? assetsBaseUrl : appUrl}/fonts/Neuropol.woff2') format('woff2');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
    body,table,td,a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table,td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; display:block; }
    body { margin:0; padding:0; width:100% !important; background:#f6f8fb; }
    a { color:#0098DA; text-decoration:none; }
    .hover-underline:hover { text-decoration:underline; }
    .wrapper { width:100%; background:#f6f8fb; padding:24px 0; }
    .container { width:100%; max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,0.08); }
    .header {
      background-color: #3E4095;
      background: linear-gradient(90deg, #3E4095, #0098DA);
      padding: 20px 24px;
      color: #ffffff;
    }
    .brand { display:flex; align-items:center; gap:12px; }
    .brand-name {
      font-family: 'Neuropol','Segoe UI',Arial,Helvetica,sans-serif;
      font-size: 18px; letter-spacing:0.5px;
    }
    .body { padding: 24px; font-family: "Gill Sans MT","Gill Sans",Calibri,"Trebuchet MS",Arial,sans-serif; color:#1F2937; line-height:1.55; }
    .h1 {
      font-family: 'Neuropol','Segoe UI',Arial,Helvetica,sans-serif;
      font-size: 22px; color:#111827; margin:0 0 8px 0;
    }
    .subtitle { color:#6B7280; font-size:14px; margin:0 0 16px 0; }
    .card {
      border:1px solid #E5E7EB; border-radius:12px; padding:16px; margin:16px 0;
      background: #F9FAFB;
    }
    .warning-card {
      background:#FFF7ED; border-color:#FED7AA; color:#9A3412;
    }
    .success-card {
      background:#F0FDF4; border-color:#BBF7D0; color:#15803D;
    }
    .info-card {
      background:#EEF6FB; border-color:#D1E7F5; color:#0F365E;
    }
    .danger-card {
      background:#FEF2F2; border-color:#FECACA; color:#B91C1C;
    }
    .code-display {
      text-align:center; margin:20px 0;
      background:#F8F9FA; border:2px dashed #0098DA; padding:20px; border-radius:12px;
    }
    .code-text {
      font-size:28px; font-weight:bold; color:#0098DA; letter-spacing:6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }
    .cta {
      display:inline-block; margin:16px 0; background:#0098DA; color:#ffffff !important;
      padding:12px 18px; border-radius:12px; font-weight:600; text-align:center;
    }
    .cta:hover { filter: brightness(1.05); }
    .footer {
      padding: 16px 24px; font-family: "Gill Sans MT","Gill Sans",Calibri,"Trebuchet MS",Arial,sans-serif;
      color:#6B7280; font-size:12px; text-align:center;
    }
    .preheader {
      display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden;
      mso-hide:all; font-size:1px; line-height:1px; max-height:0; max-width:0;
    }
    @media (max-width: 620px) {
      .body { padding: 18px; }
      .header { padding: 16px 18px; }
    }
  </style>
</head>
<body>
  <div class="preheader">${escapeHtml(preheader)}</div>
  <table role="presentation" class="wrapper" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td class="header">
              <div class="brand">
                <img src="${logoUrl}" width="140" alt="GladPros" style="display:block; border:0;"/>
              </div>
            </td>
          </tr>
          <tr>
            <td class="body">
              <h1 class="h1">${title}</h1>
              ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
              
              ${content}
              
              ${ctaButton ? `
              <div style="text-align:center; margin:24px 0;">
                <a class="cta" href="${ctaButton.url}" target="_blank" rel="noopener">${escapeHtml(ctaButton.text)}</a>
              </div>` : ''}
              
              <div style="height:16px;"></div>
              
              <p class="subtitle">Precisa de ajuda? Fale com a nossa equipe: <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a></p>
            </td>
          </tr>

          <tr>
            <td class="footer">
              © ${new Date().getFullYear()} GladPros • Todos os direitos reservados<br />
              ${footerNote || 'Este e-mail foi enviado automaticamente pelo sistema GladPros.'}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return html;
}

/* Utilitário para escapar conteúdo dinâmico */
function escapeHtml(input: string) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
