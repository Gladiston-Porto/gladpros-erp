// src/lib/email.ts
import * as nodemailer from 'nodemailer';
import { renderBaseTemplate } from './emails/template-base';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

function shouldDebugEmail() {
  return process.env.DEBUG_EMAIL === '1';
}

export class EmailService {
  private static transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
  private static isInitialized = false;
  private static initializingPromise: Promise<void> | null = null;
  private static lastFailedAt: number | null = null;
  private static readonly RESET_AFTER_FAILURE_MS = 60_000; // reset singleton 60s após falha

  private static getConfig(): EmailConfig {
    return {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    };
  }

  /** Reseta o singleton para que a próxima chamada recrie o transporter (ex: após falha SMTP). */
  static reset(): void {
    if (this.transporter) {
      try { (this.transporter as { close?: () => void }).close?.(); } catch { /* ignore */ }
    }
    this.transporter = null;
    this.isInitialized = false;
    this.initializingPromise = null;
    this.lastFailedAt = null;
  }

  private static async initializeTransporter(): Promise<void> {
    // Auto-reset se houve falha recente e já passou o tempo de espera
    if (
      this.isInitialized &&
      this.lastFailedAt !== null &&
      Date.now() - this.lastFailedAt > this.RESET_AFTER_FAILURE_MS
    ) {
      this.reset();
    }

    if (this.isInitialized) return;
    if (this.initializingPromise) {
      await this.initializingPromise;
      return;
    }

    this.initializingPromise = (async () => {
      const config = this.getConfig();
      
      // Sem pool: false = uma conexão por sendMail — mais resiliente a falhas temporárias.
      // Pool manteria conexões em estado quebrado após timeout/queda do servidor.
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000, // 10s para conectar
        greetingTimeout: 10000,   // 10s para greeting SMTP
        socketTimeout: 30000      // 30s para operações no socket
      });

      if (shouldDebugEmail()) {
         
        // eslint-disable-next-line no-console
        console.log('[Email] Transporter configurado (sem pool, resiliente a falhas temporárias)');
      }
      this.isInitialized = true;
    })();

    try {
      await this.initializingPromise;
    } finally {
      this.initializingPromise = null;
    }
  }

  private static async getTransporter(): Promise<ReturnType<typeof nodemailer.createTransport>> {
    await this.initializeTransporter();
    return this.transporter!;
  }

  static prewarm(): void {
    if (this.isInitialized || this.initializingPromise) {
      return;
    }

    void this.initializeTransporter().catch((error) => {
      if (shouldDebugEmail()) {
        console.warn('[Email] Falha ao pré-aquecer transporter:', error);
      }
    });
  }

  /**
   * Send a generic email. Supports optional attachments (e.g. PDF invoices).
   */
  static async send({
    to,
    subject,
    html,
    text,
    attachments,
    bcc,
  }: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
    bcc?: string;
  }) {
    return this.sendEmail({ to, subject, html, text, attachments, bcc });
  }

  static async sendMFA({
    to,
    userName,
    code,
    expiresInMinutes = 5,
    isFirstAccess = false
  }: {
    to: string;
    userName: string;
    code: string;
    expiresInMinutes?: number;
    isFirstAccess?: boolean;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const template = this.getMFATemplate({
        userName,
        code,
        expiresInMinutes,
        isFirstAccess
      });

      return await this.sendEmail({
        to,
        subject: template.subject,
        html: template.html,
        text: template.text
      });
    } catch (error) {
      console.error('[Email] Erro ao enviar MFA:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  static async sendPasswordReset({
    to,
    userName,
    resetLink,
    expiresInHours = 1
  }: {
    to: string;
    userName: string;
    resetLink: string;
    expiresInHours?: number;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const template = this.getPasswordResetTemplate({
        userName,
        resetLink,
        expiresInHours
      });

      const result = await this.sendEmail({
        to,
        subject: template.subject,
        html: template.html,
        text: template.text
      });
      return result
    } catch (error) {
      console.error('[Email] Erro ao enviar reset:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  static async sendProvisionalPassword({
    to,
    userName,
    provisionalPassword,
    expiresInDays = 7
  }: {
    to: string;
    userName: string;
    provisionalPassword: string;
    expiresInDays?: number;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const template = this.getProvisionalPasswordTemplate({
        userName,
        provisionalPassword,
        expiresInDays
      });

      return await this.sendEmail({
        to,
        subject: template.subject,
        html: template.html,
        text: template.text
      });
    } catch (error) {
      console.error('[Email] Erro ao enviar senha provisória:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  private static async sendEmail({
    to,
    subject,
    html,
    text,
    attachments,
    bcc,
  }: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
    bcc?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const isDevOrE2E =
        (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) ||
        process.env.E2E_MODE === '1';

      if (isDevOrE2E) {
        // Captura o e-mail em memória para que /api/dev/last-mail possa devolvê-lo
        // nos testes E2E. Em produção esta branch nunca é atingida.
        const globalForMail = global as unknown as {
          __lastMail?: { to: string; subject: string; html: string; sentAt: string };
          __mailByRecipient?: Record<string, { to: string; subject: string; html: string; sentAt: string }>;
        };
        const mailEntry = { to, subject, html, sentAt: new Date().toISOString() };
        globalForMail.__lastMail = mailEntry; // backward compat — single-slot
        if (!globalForMail.__mailByRecipient) globalForMail.__mailByRecipient = {};
        globalForMail.__mailByRecipient[to.toLowerCase()] = mailEntry; // per-recipient — prevents cross-worker interference

        if (shouldDebugEmail()) {
          // eslint-disable-next-line no-console
          console.log('\n📧 [EMAIL DEV/E2E MODE]');
          // eslint-disable-next-line no-console
          console.log('Para:', to);
          // eslint-disable-next-line no-console
          if (bcc) console.log('BCC:', bcc);
          // eslint-disable-next-line no-console
          console.log('Assunto:', subject);
          // eslint-disable-next-line no-console
          if (attachments?.length) console.log('Anexos:', attachments.map(a => a.filename).join(', '));
          // eslint-disable-next-line no-console
          console.log('Conteúdo: [omitted]');
          // eslint-disable-next-line no-console
          console.log('📧 [/EMAIL DEV/E2E MODE]\n');
        }
        return { success: true, messageId: 'dev-mode' };
      }

      const transporter = await this.getTransporter();
      
      // Use SMTP_FROM as-is if it already contains display name + email,
      // otherwise wrap SMTP_USER with display name
      const fromAddress = process.env.SMTP_FROM || 
        (process.env.SMTP_USER ? `"GladPros Sistema" <${process.env.SMTP_USER}>` : 'noreply@gladpros.com');

      const mailOptions = {
        from: fromAddress,
        to,
        subject,
        html,
        text,
        ...(bcc ? { bcc } : {}),
        ...(attachments?.length ? { attachments } : {}),
      };

      const info = await transporter.sendMail(mailOptions);
      
      // Reset lastFailedAt em caso de sucesso (SMTP voltou ao ar)
      this.lastFailedAt = null;
      return { 
        success: true, 
        messageId: info.messageId 
      };

    } catch (error) {
      // Marcar falha para que o singleton possa se auto-resetar na próxima tentativa
      this.lastFailedAt = Date.now();
      console.error('[Email] Erro ao enviar:', error);
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  }

  private static getMFATemplate({
    userName,
    code,
    expiresInMinutes,
    isFirstAccess
  }: {
    userName: string;
    code: string;
    expiresInMinutes: number;
    isFirstAccess: boolean;
  }): EmailTemplate {
    const accessType = isFirstAccess ? 'primeiro acesso' : 'login';
    const subject = `GladPros — Código de verificação: ${code}`;
    const preheader = `Seu código de verificação para ${accessType} na GladPros.`;
    
    const content = `
      <p>Olá, <strong>${userName}</strong>!</p>
      <p>Você solicitou <strong>${accessType}</strong> em sua conta GladPros. Para continuar, use o código de verificação abaixo:</p>
      
      <div class="code-display">
        <div class="code-text">${code}</div>
      </div>
      
      <p><strong>⏰ Este código expira em ${expiresInMinutes} minutos.</strong></p>
      
      <div class="card warning-card">
        <div style="font-weight:700; margin-bottom:6px;">🔒 Dicas de Segurança</div>
        <ul style="margin:8px 0 0 18px; padding:0;">
          <li>Nunca compartilhe este código com ninguém</li>
          <li>Nossa equipe nunca solicitará este código por telefone ou email</li>
          <li>Se não foi você que solicitou, ignore este email com segurança</li>
        </ul>
      </div>
    `;

    const html = renderBaseTemplate({
      subject,
      preheader,
      title: "Código de Verificação",
      subtitle: `Confirmação necessária para ${accessType}`,
      content
    });

    const text = `
GladPros - Código de Verificação

Olá, ${userName}

Você solicitou ${accessType} em sua conta GladPros.
Seu código de verificação é: ${code}

Este código expira em ${expiresInMinutes} minutos.

SEGURANÇA:
- Nunca compartilhe este código com ninguém
- Nossa equipe nunca solicitará este código por telefone ou email
- Se não foi você que solicitou, ignore este email

Este email foi enviado automaticamente pelo sistema GladPros.
    `.trim();

    return {
      subject,
      html,
      text
    };
  }

  private static getPasswordResetTemplate({
    userName,
    resetLink,
    expiresInHours
  }: {
    userName: string;
    resetLink: string;
    expiresInHours: number;
  }): EmailTemplate {
    const subject = 'GladPros — Redefinição de senha solicitada';
    const preheader = 'Link para redefinir sua senha na GladPros. Expire em breve.';
    
    const content = `
      <p>Olá, <strong>${userName}</strong>!</p>
      <p>Recebemos uma solicitação para <strong>redefinir a senha</strong> da sua conta GladPros.</p>
      
      <div class="card info-card">
        <div style="font-weight:700; margin-bottom:6px;">🔗 Link para redefinição</div>
        <p style="margin:8px 0; word-break:break-all; font-size:14px;">
          ${resetLink}
        </p>
      </div>
      
      <p><strong>⏰ Este link expira em ${expiresInHours} hora(s).</strong></p>
      
      <div class="card danger-card">
        <div style="font-weight:700; margin-bottom:6px;">⚠️ Importante</div>
        <ul style="margin:8px 0 0 18px; padding:0;">
          <li>Se você não solicitou esta redefinição, ignore este email</li>
          <li>Sua senha atual permanecerá inalterada até que você use este link</li>
          <li>Por segurança, este link só pode ser usado uma vez</li>
        </ul>
      </div>
    `;

    const html = renderBaseTemplate({
      subject,
      preheader,
      title: "Redefinição de Senha",
      subtitle: "Solicitação para alteração da sua senha de acesso",
      content,
      ctaButton: {
        text: "Redefinir Minha Senha",
        url: resetLink
      },
      footerNote: "Se você não solicitou a redefinição de senha, pode ignorar este email com segurança."
    });

    return {
      subject,
      html,
      text: `GladPros - Redefinição de senha\n\nOlá, ${userName}\n\nRecebemos uma solicitação para redefinir sua senha.\nClique no link: ${resetLink}\n\nEste link expira em ${expiresInHours} hora(s).`
    };
  }

  private static getProvisionalPasswordTemplate({
    userName,
    provisionalPassword,
    expiresInDays
  }: {
    userName: string;
    provisionalPassword: string;
    expiresInDays: number;
  }): EmailTemplate {
    const subject = 'GladPros — Bem-vindo! Sua senha provisória';
    const preheader = 'Sua conta foi criada. Use a senha provisória para o primeiro acesso.';
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`;
    
    const content = `
      <p>Olá, <strong>${userName}</strong>!</p>
      <p>Sua conta foi criada com sucesso no sistema GladPros! Para acessar pela primeira vez, use as credenciais abaixo:</p>
      
      <div class="card success-card">
        <div style="font-weight:700; margin-bottom:8px;">🔑 Credenciais de Acesso</div>
        <div style="margin-bottom:8px;">
          <div style="font-size:12px; color:#15803D; margin-bottom:4px;">Senha Provisória</div>
          <div style="background:#ffffff; color:#0F365E; border:1px solid #BBF7D0; padding:8px 12px; border-radius:8px; display:inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-weight:bold; letter-spacing:2px;">
            ${provisionalPassword}
          </div>
        </div>
      </div>
      
      <div class="card info-card">
        <div style="font-weight:700; margin-bottom:6px;">📋 Próximos Passos</div>
        <ol style="margin:8px 0 0 18px; padding:0;">
          <li>Acesse o sistema com sua senha provisória</li>
          <li>Confirme sua identidade com o código MFA enviado por email</li>
          <li>Configure sua senha definitiva (mín. 9 caracteres)</li>
          <li>Configure seu PIN de segurança (4 dígitos)</li>
          <li>Escolha uma pergunta de segurança</li>
        </ol>
      </div>
      
      <p><strong>⏰ Esta senha provisória expira em ${expiresInDays} dias.</strong></p>
      
      <div class="card warning-card">
        <div style="font-weight:700; margin-bottom:6px;">🔒 Dicas de Segurança</div>
        <ul style="margin:8px 0 0 18px; padding:0;">
          <li>Altere esta senha provisória no primeiro acesso</li>
          <li>Nunca compartilhe suas credenciais com ninguém</li>
          <li>Use uma senha forte e única para sua conta</li>
        </ul>
      </div>
    `;

    const html = renderBaseTemplate({
      subject,
      preheader,
      title: `Bem-vindo, ${userName}!`,
      subtitle: "Sua conta foi criada com sucesso",
      content,
      ctaButton: {
        text: "Acessar Sistema",
        url: loginUrl
      },
      footerNote: "Em caso de dúvidas, entre em contato com o suporte."
    });

    return {
      subject,
      html,
      text: `GladPros - Bem-vindo!\n\nOlá, ${userName}\n\nSua conta foi criada! Senha provisória: ${provisionalPassword}\n\nEsta senha expira em ${expiresInDays} dias.\n\nAltere-a no primeiro acesso para maior segurança.`
    };
  }

  static async sendProposalNotification({
    to,
    clientName,
    proposalNumber,
    proposalTitle,
    proposalValue,
    currency = 'USD'
  }: {
    to: string;
    clientName: string;
    proposalNumber: string;
    proposalTitle: string;
    proposalValue?: number | null;
    currency?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const valorFormatado = proposalValue
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(proposalValue))
        : 'A definir';

      const subject = `GladPros — Proposta ${proposalNumber} enviada para sua análise`;
      const preheader = `${clientName}, sua proposta "${proposalTitle}" está pronta para análise.`;

      const content = `
        <p>Olá, <strong>${clientName}</strong>!</p>
        <p>Uma nova proposta foi enviada para sua análise no sistema GladPros.</p>
        
        <div class="card info-card">
          <div style="font-weight:700; margin-bottom:8px;">📋 Detalhes da Proposta</div>
          <table style="width:100%; font-size:14px;">
            <tr><td style="padding:4px 0; color:#6B7280;">Número:</td><td style="padding:4px 0; font-weight:600;">${proposalNumber}</td></tr>
            <tr><td style="padding:4px 0; color:#6B7280;">Título:</td><td style="padding:4px 0; font-weight:600;">${proposalTitle}</td></tr>
            <tr><td style="padding:4px 0; color:#6B7280;">Valor:</td><td style="padding:4px 0; font-weight:600;">${valorFormatado}</td></tr>
          </table>
        </div>
        
        <p>Para visualizar e assinar a proposta, acesse o sistema:</p>
      `;

      const html = renderBaseTemplate({
        subject,
        preheader,
        title: "Nova Proposta",
        subtitle: `Proposta ${proposalNumber} aguardando sua análise`,
        content,
        ctaButton: {
          text: "Ver Proposta",
          url: `${appUrl}/propostas`
        },
        footerNote: "Este email foi enviado automaticamente. Em caso de dúvidas, entre em contato."
      });

      return await this.sendEmail({
        to,
        subject,
        html,
        text: `GladPros - Nova Proposta\n\nOlá, ${clientName}\n\nProposta ${proposalNumber}: ${proposalTitle}\nValor: ${valorFormatado}\n\nAcesse o sistema para visualizar.`
      });
    } catch (error) {
      console.error('[Email] Erro ao enviar notificação de proposta:', error);
      return { success: false, error: (error as Error).message };
    }
  }
}
