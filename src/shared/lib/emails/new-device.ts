export type NewDeviceParams = {
  name: string;
  email: string;
  ip: string;
  device: string;
  loginTime: string; // já formatado em America/Chicago
  appUrl: string;
};

export function renderNewDeviceEmail(params: NewDeviceParams) {
  const { name, ip, device, loginTime, appUrl } = params;

  const subject = "GladPros — Novo acesso detectado na sua conta";
  const sessionsUrl = `${appUrl.replace(/\/$/, "")}/configuracoes/seguranca`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0098DA 0%,#006899 100%);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:1px;">GladPros</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:20px;">Olá, ${name}</h2>
              <p style="margin:0 0 24px;color:#444;line-height:1.6;">
                Detectamos um login na sua conta <strong>GladPros</strong> a partir de um dispositivo que não reconhecemos.
              </p>
              <table width="100%" cellpadding="12" cellspacing="0" style="background:#f9f9f9;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="color:#666;font-size:13px;border-bottom:1px solid #eee;"><strong>Endereço IP</strong></td>
                  <td style="color:#1a1a1a;font-size:13px;border-bottom:1px solid #eee;">${ip}</td>
                </tr>
                <tr>
                  <td style="color:#666;font-size:13px;border-bottom:1px solid #eee;"><strong>Dispositivo</strong></td>
                  <td style="color:#1a1a1a;font-size:13px;border-bottom:1px solid #eee;">${device}</td>
                </tr>
                <tr>
                  <td style="color:#666;font-size:13px;"><strong>Horário (Dallas, TX)</strong></td>
                  <td style="color:#1a1a1a;font-size:13px;">${loginTime}</td>
                </tr>
              </table>
              <p style="margin:0 0 24px;color:#444;line-height:1.6;">
                Se foi você, pode ignorar este email.<br />
                Se <strong>não reconhece</strong> este acesso, encerre as sessões imediatamente e altere sua senha.
              </p>
              <div style="text-align:center;margin-bottom:32px;">
                <a href="${sessionsUrl}" style="background:#0098DA;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                  Gerenciar Sessões
                </a>
              </div>
              <p style="margin:0;color:#888;font-size:12px;text-align:center;">
                GladPros LLC &mdash; Dallas, TX
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
