export type WelcomeParams = {
  name: string;
  email: string;
  tempPassword: string;
  appUrl: string;
  assetsBaseUrl?: string;
  supportEmail?: string;
  firstAccessUrl?: string; // magic link gerado na criação do usuário
};

export function renderWelcomeEmail(params: WelcomeParams) {
  const {
    name,
    email,
    tempPassword,
    appUrl,
    assetsBaseUrl,
    supportEmail = "suporte@gladpros.com",
    firstAccessUrl,
  } = params;

  const logoUrl =
    (assetsBaseUrl ? `${assetsBaseUrl}/images/LOGO_200.png` : `${appUrl}/images/LOGO_200.png`);

  const subject = "Bem-vindo à GladPros — Acesso inicial e verificação MFA";

  const preheader =
    "Sua conta foi criada. Use a senha provisória para o primeiro login; confirmaremos via MFA e você definirá a nova senha.";

  const loginUrl = `${appUrl.replace(/\/$/, "")}/login`;
  const helpUrl = `${appUrl.replace(/\/$/, "")}/ajuda`;

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
    .muted { color:#6B7280; font-size:14px; margin:0 0 16px 0; }
    .card {
      border:1px solid #E5E7EB; border-radius:12px; padding:16px; margin:16px 0;
      background: #F9FAFB;
    }
    .key { font-size:12px; color:#6B7280; }
    .val {
      background:#EEF6FB; color:#0F365E; border:1px solid #D1E7F5;
      padding:8px 12px; border-radius:10px; display:inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }
    .cta {
      display:inline-block; margin:8px 0 0 0; background:#0098DA; color:#ffffff !important;
      padding:12px 18px; border-radius:12px; font-weight:600;
    }
    .cta:hover { filter: brightness(1.05); }
    .step { display:flex; gap:12px; align-items:flex-start; padding:10px 0; }
    .badge {
      flex:0 0 auto; width:28px; height:28px; border-radius:8px; display:grid; place-items:center; font-weight:700; color:#fff;
      box-shadow:0 4px 12px rgba(0,0,0,.08);
      background: linear-gradient(135deg, #3E4095, #0098DA);
    }
    .step p { margin:0; }
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
                <div class="brand-name">GladPros</div>
              </div>
            </td>
          </tr>
          <tr>
            <td class="body">
              <h1 class="h1">Olá, ${escapeHtml(name)}!</h1>
              <p class="muted">Sua conta foi criada com sucesso. Utilize as credenciais abaixo <strong>apenas para o primeiro acesso</strong> ao sistema.</p>

              <div class="card">
                <div style="margin-bottom:8px;">
                  <div class="key">E-mail</div>
                  <div class="val">${escapeHtml(email)}</div>
                </div>
                <div>
                  <div class="key">Senha provisória</div>
                  <div class="val">${escapeHtml(tempPassword)}</div>
                </div>
              </div>

              <div style="text-align:center;">
                ${firstAccessUrl
                  ? `<a class="cta" href="${escapeHtml(firstAccessUrl)}" target="_blank" rel="noopener" style="background:linear-gradient(135deg,#3E4095,#0098DA);font-size:16px;padding:14px 28px;">&#x1F680; Começar agora — clique aqui</a>
                <p style="font-size:12px;color:#6B7280;margin:8px 0 0 0;">Link válido por 7 dias. Use apenas uma vez.</p>`
                  : `<a class="cta" href="${loginUrl}" target="_blank" rel="noopener">Acessar o sistema</a>`
                }
              </div>

              <div style="height:16px;"></div>

              <div style="font-weight:600; margin-bottom:6px;">Como será o seu primeiro acesso?</div>

              ${firstAccessUrl ? `
              <div class="step">
                <div class="badge">1</div>
                <p>Clique no botão <strong>"Começar agora"</strong> acima. Você será levado direto para a configuração da sua conta.</p>
              </div>
              <div class="step">
                <div class="badge">2</div>
                <p>Defina sua <strong>nova senha</strong>, um <strong>PIN de segurança</strong> e escolha uma <strong>pergunta de verificação</strong>.</p>
              </div>
              <div class="step">
                <div class="badge">3</div>
                <p>Pronto! Você será redirecionado para o painel. A senha provisória abaixo serve apenas como backup.</p>
              </div>
              ` : `
              <div class="step">
                <div class="badge">1</div>
                <p>Entre em <a class="hover-underline" href="${loginUrl}" target="_blank" rel="noopener">${loginUrl}</a> usando seu <strong>e-mail</strong> e a <strong>senha provisória</strong>.</p>
              </div>
              <div class="step">
                <div class="badge">2</div>
                <p>Enviaremos um <strong>código de verificação (MFA)</strong> por e-mail. Digite-o para confirmar sua identidade.</p>
              </div>
              <div class="step">
                <div class="badge">3</div>
                <p>Você será direcionado para <strong>definir uma nova senha</strong>. Após salvar, o acesso será liberado ao painel.</p>
              </div>
              `}

              <div style="height:16px;"></div>

              <div class="card" style="background:#FFF7ED; border-color:#FED7AA;">
                <div style="font-weight:700; color:#9A3412; margin-bottom:6px;">Dicas de segurança</div>
                <ul style="margin:0 0 0 18px; padding:0;">
                  <li>Não compartilhe esta senha provisória.</li>
                  <li>Crie uma senha forte na troca (8+ caracteres, letras, números e símbolos).</li>
                  <li>Se você não solicitou esta conta, por favor, ignore este e-mail.</li>
                </ul>
              </div>

              <div style="height:10px;"></div>

              <p class="muted">Precisa de ajuda? Fale com a nossa equipe: <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>${helpUrl ? ` ou acesse <a href="${helpUrl}" target="_blank" rel="noopener">${helpUrl}</a>` : ""}.</p>
            </td>
          </tr>

          <tr>
            <td class="footer">
              © ${new Date().getFullYear()} GladPros • Todos os direitos reservados<br />
              Este e-mail foi enviado para ${escapeHtml(email)} por ser um contato cadastrado no sistema.<br />
              Caso não reconheça, ignore esta mensagem.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const text = [
    `Olá, ${name}!`,
    ``,
    `Sua conta foi criada com sucesso. Use estas credenciais apenas para o primeiro acesso:`,
    `E-mail: ${email}`,
    `Senha provisória: ${tempPassword}`,
    ``,
    `Acesse: ${loginUrl}`,
    ``,
    `Como será o primeiro acesso:`,
    `1) Entre com e-mail e senha provisória.`,
    `2) Receba o código MFA por e-mail e confirme.`,
    `3) Defina sua nova senha e pronto!`,
    ``,
    `Dicas de segurança:`,
    `- Não compartilhe a senha provisória.`,
    `- Crie uma senha forte na troca.`,
    `- Se não solicitou a conta, ignore este e-mail.`,
    ``,
    `Suporte: ${supportEmail}`,
  ].join("\n");

  return { subject, html, text };
}

/* Utilitário simples para escapar conteúdo dinâmico */
function escapeHtml(input: string) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}