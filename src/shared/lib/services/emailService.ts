// Email service for sending proposal notifications
import nodemailer from 'nodemailer'

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
  cc?: string[]
  bcc?: string[]
}

class EmailService {
  private transporter: ReturnType<typeof nodemailer.createTransporter>
  private configured: boolean

  constructor() {
    const host = process.env.SMTP_HOST
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    this.configured = !!(host && user && pass)

    if (!this.configured) {
      console.warn('[EmailService] ⚠️ SMTP não configurado (SMTP_HOST/SMTP_USER/SMTP_PASS ausentes). Emails não serão enviados.')
    }

    const config: EmailConfig = {
      host: host || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: user || '',
        pass: pass || ''
      }
    }

  this.transporter = nodemailer.createTransport(config)
  }

  /** Returns true if SMTP is properly configured */
  isConfigured(): boolean {
    return this.configured
  }

  async sendEmail({ to, subject, html, cc, bcc }: SendEmailParams) {
    if (!this.configured) {
      console.warn(`[EmailService] SMTP não configurado — email para "${to}" NÃO enviado (subject: "${subject}")`)
      return { messageId: null, skipped: true, reason: 'SMTP not configured' }
    }
    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        cc,
        bcc,
        subject,
        html
      })

       
      // eslint-disable-next-line no-console
      console.log('Email enviado:', info.messageId)
      return { success: true, messageId: info.messageId }
    } catch (error) {
      console.error('Erro ao enviar email:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
    }
  }

  async sendProposalSignedNotification(proposal: { id: string; numeroProposta: string; valorEstimado?: number; cliente?: { nome?: string } }, clientName: string) {
    const subject = `Proposta ${proposal.numeroProposta} foi assinada pelo cliente`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4f46e5; color: white; padding: 20px; text-align: center;">
          <h1>Proposta Assinada</h1>
        </div>
        
        <div style="padding: 20px; background: #f9fafb;">
          <h2>Boa notícia!</h2>
          <p>A proposta <strong>${proposal.numeroProposta}</strong> foi assinada pelo cliente.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Detalhes da Proposta:</h3>
            <ul style="line-height: 1.6;">
              <li><strong>Número:</strong> ${proposal.numeroProposta}</li>
              <li><strong>Cliente:</strong> ${proposal.cliente?.nome || 'N/A'}</li>
              <li><strong>Valor:</strong> ${proposal.valorEstimado ? `$${proposal.valorEstimado.toLocaleString()}` : 'N/A'}</li>
              <li><strong>Assinado por:</strong> ${clientName}</li>
              <li><strong>Data da assinatura:</strong> ${new Date().toLocaleString('pt-BR')}</li>
            </ul>
          </div>
          
          <p>A proposta agora está no status <strong>ASSINADA</strong> e está pronta para aprovação.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL}/propostas/${proposal.id}" 
               style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Ver Proposta no Sistema
            </a>
          </div>
        </div>
        
        <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>GladPros - Sistema de Gestão de Propostas</p>
          <p>Este é um email automático, não responda a esta mensagem.</p>
        </div>
      </div>
    `

    // Send to system administrators or proposal managers
    const recipients = process.env.PROPOSAL_NOTIFICATION_EMAILS?.split(',') || ['admin@gladpros.com']
    
    for (const recipient of recipients) {
      await this.sendEmail({
        to: recipient.trim(),
        subject,
        html
      })
    }
  }

  async sendProposalSentNotification(proposal: { numeroProposta: string; descricao?: string; valorEstimado?: number; dataCriacao: string }, clientEmail: string) {
    const subject = `Nova proposta comercial para sua análise - ${proposal.numeroProposta}`
    
    const proposalUrl = `${process.env.NEXTAUTH_URL}/p/${proposal.numeroProposta}`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; color: white; padding: 20px; text-align: center;">
          <h1>Nova Proposta Comercial</h1>
        </div>
        
        <div style="padding: 20px; background: #f0fdf4;">
          <h2>Olá!</h2>
          <p>Você recebeu uma nova proposta comercial da GladPros.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Detalhes da Proposta:</h3>
            <ul style="line-height: 1.6;">
              <li><strong>Número:</strong> ${proposal.numeroProposta}</li>
              <li><strong>Descrição:</strong> ${proposal.descricao}</li>
              <li><strong>Valor Estimado:</strong> ${proposal.valorEstimado ? `$${proposal.valorEstimado.toLocaleString()}` : 'A consultar'}</li>
              <li><strong>Data de Criação:</strong> ${new Date(proposal.dataCriacao).toLocaleDateString('pt-BR')}</li>
            </ul>
          </div>
          
          <p>Para visualizar todos os detalhes e assinar a proposta, clique no botão abaixo:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${proposalUrl}" 
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Visualizar e Assinar Proposta
            </a>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p><strong>Importante:</strong> Este link é único e pessoal. Não compartilhe com terceiros.</p>
          </div>
        </div>
        
        <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>GladPros - Sistema de Gestão de Propostas</p>
          <p>Em caso de dúvidas, entre em contato conosco.</p>
        </div>
      </div>
    `

    return await this.sendEmail({
      to: clientEmail,
      subject,
      html
    })
  }
}

export const emailService = new EmailService()
export default emailService
