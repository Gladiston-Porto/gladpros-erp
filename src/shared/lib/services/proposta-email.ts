import * as nodemailer from 'nodemailer'
import { generateTokenPublico } from './proposta-token'
import { PropostaPDFService, type PropostaWithRelations, type RBACContext } from './proposta-pdf'
import { prisma } from '@/lib/prisma'

interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

interface PropostaEmailOptions {
  /**
   * Incluir PDF da proposta como anexo
   */
  includePDF?: boolean
  
  /**
   * Template de email a ser usado
   */
  template?: 'send-proposal' | 'reminder' | 'signed' | 'approved'
  
  /**
   * Configurações personalizadas
   */
  customMessage?: string
  
  /**
   * Dados adicionais para o template
   */
  templateData?: Record<string, unknown>
}

/**
 * Serviço para envio de emails relacionados a propostas
 */
export class PropostaEmailService {
  private static transporter: ReturnType<typeof nodemailer.createTransporter> | null = null

  /**
   * Configura o transporter de email
   */
  private static getTransporter(): ReturnType<typeof nodemailer.createTransporter> {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      })
    }
    
    return this.transporter
  }

  /**
   * Envia proposta para o cliente por email
   */
  static async sendPropostaToClient(
    proposta: PropostaWithRelations,
    options: PropostaEmailOptions = {}
  ): Promise<{
    success: boolean
    messageId?: string
    error?: string
    tokenPublico?: string
  }> {
    try {
      // Gerar token público se não existir
      let tokenPublico = proposta.tokenPublico
      if (!tokenPublico) {
        const tokenResult = await generateTokenPublico()
        tokenPublico = tokenResult.token
        // Persistir token no banco de dados
        await prisma.proposta.update({
          where: { id: proposta.id },
          data: {
            tokenPublico,
            tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
          },
        })
      }

      // Configurar contexto RBAC para cliente
      const rbacContext: RBACContext = {
        isClientAccess: true,
        permissions: ['propostas.view'],
        userRole: 'client'
      }

      // Gerar template de email
      const emailTemplate = this.generateEmailTemplate(
        proposta,
        tokenPublico,
        options.template || 'send-proposal',
        options
      )

      const attachments: Array<{
        filename: string;
        content: Buffer;
        contentType?: string;
      }> = []

      // Incluir PDF se solicitado
      if (options.includePDF) {
        const { buffer, filename } = await PropostaPDFService.generatePDF(
          proposta,
          rbacContext,
          {
            template: 'client',
            includeValues: true,
            watermark: 'CONFIDENCIAL'
          }
        )

        attachments.push({
          filename,
          content: buffer,
          contentType: 'application/pdf'
        })
      }

      // Configurar email
      const mailOptions: {
        from: string;
        to: string;
        subject: string;
        html: string;
        text?: string;
        attachments?: typeof attachments;
      } = {
        from: process.env.SMTP_FROM || 'GladPros <noreply@gladpros.com>',
        to: proposta.contatoEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
        attachments
      }

      // Enviar email
      const transporter = this.getTransporter()
      const info = await transporter.sendMail(mailOptions)

      return {
        success: true,
        messageId: info.messageId,
        tokenPublico
      }

    } catch (error) {
      console.error('Erro ao enviar email da proposta:', error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }

  /**
   * Envia notificação de proposta assinada
   */
  static async notifyProposalSigned(
    proposta: PropostaWithRelations,
    signatureData: {
      clientName: string
      signedAt: Date
      ip?: string
      userAgent?: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const emailTemplate = this.generateEmailTemplate(
        proposta,
        '',
        'signed',
        {
          templateData: signatureData
        }
      )

      const mailOptions: {
        from: string;
        to: string;
        cc?: string[];
        subject: string;
        html: string;
        text?: string;
      } = {
        from: process.env.SMTP_FROM || 'GladPros <noreply@gladpros.com>',
        to: process.env.NOTIFICATION_EMAIL || 'admin@gladpros.com',
        cc: process.env.SALES_EMAIL ? [process.env.SALES_EMAIL] : undefined,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text
      }

      const transporter = this.getTransporter()
      await transporter.sendMail(mailOptions)

      return { success: true }

    } catch (error) {
      console.error('Erro ao notificar assinatura:', error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }

  /**
   * Envia lembrete para cliente assinar proposta
   */
  static async sendReminder(
    proposta: PropostaWithRelations,
    daysOverdue: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!proposta.tokenPublico) {
        throw new Error('Proposta não possui token público')
      }

      const emailTemplate = this.generateEmailTemplate(
        proposta,
        proposta.tokenPublico,
        'reminder',
        {
          templateData: { daysOverdue }
        }
      )

      const mailOptions: {
        from: string;
        to: string;
        subject: string;
        html: string;
        text?: string;
      } = {
        from: process.env.SMTP_FROM || 'GladPros <noreply@gladpros.com>',
        to: proposta.contatoEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text
      }

      const transporter = this.getTransporter()
      await transporter.sendMail(mailOptions)

      return { success: true }

    } catch (error) {
      console.error('Erro ao enviar lembrete:', error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }

  /**
   * Gera templates de email baseado no tipo
   */
  private static generateEmailTemplate(
    proposta: PropostaWithRelations,
    tokenPublico: string,
    template: string,
    options: PropostaEmailOptions = {}
  ): EmailTemplate {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const proposalUrl = `${baseUrl}/p/${tokenPublico}`
    
    switch (template) {
      case 'send-proposal':
        return {
          subject: `Proposta Comercial ${proposta.numeroProposta} - GladPros`,
          html: this.generateSendProposalHTML(proposta, proposalUrl, options),
          text: this.generateSendProposalText(proposta, proposalUrl, options)
        }

      case 'reminder':
        const daysOverdue = typeof options.templateData?.daysOverdue === 'number' 
          ? options.templateData.daysOverdue 
          : 0
        return {
          subject: `Lembrete: Proposta ${proposta.numeroProposta} aguarda sua análise`,
          html: this.generateReminderHTML(proposta, proposalUrl, daysOverdue),
          text: this.generateReminderText(proposta, proposalUrl, daysOverdue)
        }

      case 'signed':
        const signatureData = options.templateData || {}
        return {
          subject: `✅ Proposta ${proposta.numeroProposta} foi assinada`,
          html: this.generateSignedHTML(proposta, signatureData),
          text: this.generateSignedText(proposta, signatureData)
        }

      case 'approved':
        return {
          subject: `🎉 Proposta ${proposta.numeroProposta} aprovada internamente`,
          html: this.generateApprovedHTML(proposta),
          text: this.generateApprovedText(proposta)
        }

      default:
        throw new Error(`Template não reconhecido: ${template}`)
    }
  }

  /**
   * HTML template para envio de proposta
   */
  private static generateSendProposalHTML(
    proposta: PropostaWithRelations,
    proposalUrl: string,
    options: PropostaEmailOptions
  ): string {
    const customMessage = options.customMessage ? `
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0; font-style: italic;">${options.customMessage}</p>
      </div>
    ` : ''

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Proposta Comercial</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin-bottom: 10px;">GladPros</h1>
        <h2 style="color: #666; font-weight: normal;">Proposta Comercial</h2>
      </div>

      <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #2563eb;">Olá, ${proposta.contatoNome}!</h3>
        
        <p>Esperamos que você esteja bem. Temos o prazer de apresentar nossa proposta comercial para o projeto:</p>
        
        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h4 style="margin: 0; color: #374151;">${proposta.titulo}</h4>
          ${proposta.descricaoEscopo ? `<p style="margin: 10px 0 0 0; color: #6b7280;">${proposta.descricaoEscopo}</p>` : ''}
        </div>

        ${customMessage}
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${proposalUrl}" 
           style="display: inline-block; background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
          📄 Visualizar Proposta Completa
        </a>
      </div>

      <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #92400e;">Informações Importantes:</h4>
        <ul style="margin: 10px 0; padding-left: 20px; color: #92400e;">
          <li><strong>Número da Proposta:</strong> ${proposta.numeroProposta}</li>
          ${proposta.validadeProposta ? `<li><strong>Válida até:</strong> ${new Date(proposta.validadeProposta).toLocaleDateString('pt-BR')}</li>` : ''}
          <li>Este link é confidencial e pessoal</li>
          <li>A assinatura digital é obrigatória para aprovação</li>
        </ul>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
        <p>Ficamos à disposição para esclarecer qualquer dúvida.</p>
        <p><strong>GladPros</strong><br>
        Email: contato@gladpros.com<br>
        ${process.env.COMPANY_PHONE ? `Telefone: ${process.env.COMPANY_PHONE}` : ''}</p>
      </div>
    </body>
    </html>
    `
  }

  /**
   * Text template para envio de proposta
   */
  private static generateSendProposalText(
    proposta: PropostaWithRelations,
    proposalUrl: string,
    options: PropostaEmailOptions
  ): string {
    return `
GladPros - Proposta Comercial

Olá, ${proposta.contatoNome}!

Temos o prazer de apresentar nossa proposta comercial para o projeto:
${proposta.titulo}

${proposta.descricaoEscopo || ''}

${options.customMessage || ''}

Para visualizar a proposta completa e proceder com a assinatura, acesse:
${proposalUrl}

Informações Importantes:
- Número da Proposta: ${proposta.numeroProposta}
${proposta.validadeProposta ? `- Válida até: ${new Date(proposta.validadeProposta).toLocaleDateString('pt-BR')}` : ''}
- Este link é confidencial e pessoal
- A assinatura digital é obrigatória para aprovação

Ficamos à disposição para esclarecer qualquer dúvida.

GladPros
Email: contato@gladpros.com
${process.env.COMPANY_PHONE ? `Telefone: ${process.env.COMPANY_PHONE}` : ''}
    `.trim()
  }

  /**
   * HTML template para lembrete
   */
  private static generateReminderHTML(
    proposta: PropostaWithRelations,
    proposalUrl: string,
    daysOverdue: number
  ): string {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lembrete - Proposta Comercial</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #f59e0b; margin-bottom: 10px;">⏰ Lembrete</h1>
        <h2 style="color: #666; font-weight: normal;">Proposta Aguarda Sua Análise</h2>
      </div>

      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
        <h3 style="margin-top: 0; color: #92400e;">Olá, ${proposta.contatoNome}!</h3>
        
        <p>Este é um lembrete amigável sobre a proposta <strong>${proposta.numeroProposta}</strong> que enviamos.</p>
        
        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h4 style="margin: 0; color: #374151;">${proposta.titulo}</h4>
          <p style="margin: 10px 0 0 0; color: #dc2626;">
            <strong>Status:</strong> Aguardando análise há ${daysOverdue} dias
          </p>
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${proposalUrl}" 
           style="display: inline-block; background-color: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
          📄 Revisar e Assinar Proposta
        </a>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
        <p>Caso tenha alguma dúvida ou precise de esclarecimentos, entre em contato conosco.</p>
        <p><strong>GladPros</strong><br>Email: contato@gladpros.com</p>
      </div>
    </body>
    </html>
    `
  }

  /**
   * Text template para lembrete
   */
  private static generateReminderText(
    proposta: PropostaWithRelations,
    proposalUrl: string,
    daysOverdue: number
  ): string {
    return `
Lembrete - Proposta Aguarda Sua Análise

Olá, ${proposta.contatoNome}!

Este é um lembrete amigável sobre a proposta ${proposta.numeroProposta} que enviamos.

Projeto: ${proposta.titulo}
Status: Aguardando análise há ${daysOverdue} dias

Para revisar e assinar a proposta, acesse:
${proposalUrl}

Caso tenha alguma dúvida ou precise de esclarecimentos, entre em contato conosco.

GladPros
Email: contato@gladpros.com
    `.trim()
  }

  /**
   * HTML template para notificação de assinatura
   */
  private static generateSignedHTML(
    proposta: PropostaWithRelations,
    signatureData: Record<string, unknown>
  ): string {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Proposta Assinada</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #059669; margin-bottom: 10px;">✅ Proposta Assinada!</h1>
        <h2 style="color: #666; font-weight: normal;">Nova Assinatura Recebida</h2>
      </div>

      <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #059669;">
        <h3 style="margin-top: 0; color: #065f46;">A proposta ${proposta.numeroProposta} foi assinada!</h3>
        
        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h4 style="margin: 0; color: #374151;">${proposta.titulo}</h4>
          <p style="margin: 10px 0 0 0; color: #6b7280;">Cliente: ${proposta.contatoNome} (${proposta.contatoEmail})</p>
        </div>

        <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px;">
          <h4 style="margin-top: 0;">Dados da Assinatura:</h4>
          <ul style="margin: 0; padding-left: 20px;">
            <li><strong>Assinado por:</strong> ${String(signatureData.clientName || 'N/A')}</li>
            <li><strong>Data/Hora:</strong> ${signatureData.signedAt ? new Date(signatureData.signedAt as string | Date).toLocaleString('pt-BR') : 'N/A'}</li>
            ${signatureData.ip ? `<li><strong>IP:</strong> ${String(signatureData.ip)}</li>` : ''}
          </ul>
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #059669; font-weight: bold; font-size: 18px;">🎉 Próximos passos:</p>
        <p>Revisar proposta e iniciar processo de aprovação interna</p>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
        <p>Esta é uma notificação automática do sistema GladPros.</p>
      </div>
    </body>
    </html>
    `
  }

  /**
   * Text template para notificação de assinatura
   */
  private static generateSignedText(
    proposta: PropostaWithRelations,
    signatureData: Record<string, unknown>
  ): string {
    return `
Proposta Assinada!

A proposta ${proposta.numeroProposta} foi assinada!

Projeto: ${proposta.titulo}
Cliente: ${proposta.contatoNome} (${proposta.contatoEmail})

Dados da Assinatura:
- Assinado por: ${String(signatureData.clientName || 'N/A')}
- Data/Hora: ${signatureData.signedAt ? new Date(signatureData.signedAt as string | Date).toLocaleString('pt-BR') : 'N/A'}
${signatureData.ip ? `- IP: ${String(signatureData.ip)}` : ''}

Próximos passos:
Revisar proposta e iniciar processo de aprovação interna.

Esta é uma notificação automática do sistema GladPros.
    `.trim()
  }

  /**
   * HTML template para aprovação interna
   */
  private static generateApprovedHTML(proposta: PropostaWithRelations): string {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Proposta Aprovada</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #7c3aed; margin-bottom: 10px;">🎉 Proposta Aprovada!</h1>
        <h2 style="color: #666; font-weight: normal;">Aprovação Interna Concluída</h2>
      </div>

      <div style="background-color: #f3e8ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #7c3aed;">
        <h3 style="margin-top: 0; color: #581c87;">A proposta ${proposta.numeroProposta} foi aprovada internamente!</h3>
        
        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h4 style="margin: 0; color: #374151;">${proposta.titulo}</h4>
          <p style="margin: 10px 0 0 0; color: #6b7280;">Cliente: ${proposta.contatoNome}</p>
          <p style="margin: 5px 0 0 0; color: #059669; font-weight: bold;">
            Valor: ${proposta.precoPropostaCliente ? `USD ${proposta.precoPropostaCliente.toFixed(2)}` : 'A definir'}
          </p>
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #7c3aed; font-weight: bold; font-size: 18px;">🚀 Próximo passo:</p>
        <p>Converter em projeto e iniciar planejamento de execução</p>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
        <p>Esta é uma notificação automática do sistema GladPros.</p>
      </div>
    </body>
    </html>
    `
  }

  /**
   * Text template para aprovação interna
   */
  private static generateApprovedText(proposta: PropostaWithRelations): string {
    return `
Proposta Aprovada!

A proposta ${proposta.numeroProposta} foi aprovada internamente!

Projeto: ${proposta.titulo}
Cliente: ${proposta.contatoNome}
Valor: ${proposta.precoPropostaCliente ? `USD ${proposta.precoPropostaCliente.toFixed(2)}` : 'A definir'}

Próximo passo:
Converter em projeto e iniciar planejamento de execução.

Esta é uma notificação automática do sistema GladPros.
    `.trim()
  }

  /**
   * Testa configuração de email
   */
  static async testEmailConfiguration(): Promise<{ success: boolean; error?: string }> {
    try {
      const transporter = this.getTransporter()
      await transporter.verify()
      
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }
}
