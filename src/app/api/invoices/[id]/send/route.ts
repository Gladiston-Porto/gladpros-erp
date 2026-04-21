import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateInvoicePDF } from '@/shared/lib/services/invoice-pdf';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser, can, type Role } from '@/shared/lib/rbac';
import * as nodemailer from 'nodemailer';
import logger from '@/shared/lib/logger';

import { checkEmailRateLimit, EMAIL_RATE_LIMIT } from './email-rate-limit';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

/**
 * POST /api/invoices/[id]/send - Enviar invoice por email com PDF anexo
 */
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'invoices', 'update')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão para enviar invoices', success: false },
      { status: 403 },
    );
  }

  const { id } = await params;
  const invoiceId = parseInt(id);

  if (isNaN(invoiceId)) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'ID inválido', success: false },
      { status: 400 },
    );
  }

  // Rate limit: 5 emails/hora por usuário
  const rateCheck = checkEmailRateLimit(Number(user.id));
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too Many Requests', message: `Limite de ${EMAIL_RATE_LIMIT} emails por hora atingido. Tente novamente em ${rateCheck.retryAfterSecs}s.`, success: false },
      {
        status: 429,
        headers: { 'Retry-After': String(rateCheck.retryAfterSecs) },
      },
    );
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, empresaId: 1 },
    include: {
      itens: { orderBy: { ordem: 'asc' } },
      pagamentos: { orderBy: { dataPagamento: 'desc' } },
      cliente: {
        select: {
          nomeCompleto: true,
          nomeFantasia: true,
          nomeChave: true,
          email: true,
          telefone: true,
          addressStreet: true,
          addressCity: true,
          addressState: true,
          addressZip: true,
        },
      },
      projeto: { select: { titulo: true, numeroProjeto: true } },
    },
  });

  if (!invoice) {
    return NextResponse.json(
      { error: 'Not found', message: 'Invoice não encontrada', success: false },
      { status: 404 },
    );
  }

  if (invoice.status === 'CANCELLED') {
    return NextResponse.json(
      { error: 'Invalid operation', message: 'Não é possível enviar invoice cancelada', success: false },
      { status: 400 },
    );
  }

  if (!invoice.cliente.email) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'Cliente não possui email cadastrado', success: false },
      { status: 400 },
    );
  }

  // Generate PDF
  const invoiceData = {
    numeroInvoice: invoice.numeroInvoice,
    dataEmissao: invoice.dataEmissao,
    dataVencimento: invoice.dataVencimento,
    subtotal: invoice.subtotal,
    descontoValor: invoice.descontoValor,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    valorTotal: invoice.valorTotal,
    valorPago: invoice.valorPago,
    saldo: invoice.saldo,
    status: invoice.status,
    notas: invoice.notas,
    termos: invoice.termos,
    cliente: {
      nomeCompleto: invoice.cliente.nomeCompleto,
      nomeFantasia: invoice.cliente.nomeFantasia,
      nomeChave: invoice.cliente.nomeChave,
      email: invoice.cliente.email,
      telefone: invoice.cliente.telefone ?? '',
      addressStreet: invoice.cliente.addressStreet,
      addressCity: invoice.cliente.addressCity,
      addressState: invoice.cliente.addressState,
      addressZip: invoice.cliente.addressZip,
    },
    projeto: invoice.projeto ? { nome: invoice.projeto.titulo } : null,
    itens: invoice.itens.map((item) => ({
      descricao: item.descricao,
      quantidade: item.quantidade,
      unidade: item.unidade ?? 'UN',
      precoUnitario: item.precoUnitario,
      desconto: item.desconto ?? 0,
      subtotal: item.subtotal,
    })),
    pagamentos: invoice.pagamentos.map((p) => ({
      valor: p.valor,
      dataPagamento: p.dataPagamento ?? new Date(),
      metodoPagamento: p.metodoPagamento ?? 'OTHER',
      referencia: p.referencia,
    })),
  };

  const pdfBuffer = await generateInvoicePDF(invoiceData);
  const clienteNome = escapeHtml(invoice.cliente.nomeCompleto || invoice.cliente.nomeFantasia || invoice.cliente.nomeChave || '');
  const vencimento = new Date(invoice.dataVencimento).toLocaleDateString('pt-BR');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0098DA;">Invoice ${invoice.numeroInvoice}</h2>
      <p>Prezado(a) ${clienteNome},</p>
      <p>Segue em anexo a invoice <strong>${invoice.numeroInvoice}</strong> referente aos serviços prestados.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #f7f7f7;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Valor Total</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${formatCurrency(Number(invoice.valorTotal))}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Vencimento</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${vencimento}</td>
        </tr>
        <tr style="background: #f7f7f7;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Saldo</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${formatCurrency(Number(invoice.saldo))}</td>
        </tr>
      </table>
      ${invoice.projeto ? `<p><strong>Projeto:</strong> ${escapeHtml(invoice.projeto.titulo ?? '')}</p>` : ''}
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        Este é um email automático enviado pelo sistema GladPros.
      </p>
    </div>
  `;

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'GladPros <noreply@gladpros.com>',
      to: invoice.cliente.email,
      subject: `Invoice ${invoice.numeroInvoice} — ${formatCurrency(Number(invoice.valorTotal))}`,
      html,
      attachments: [{
        filename: `${invoice.numeroInvoice}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    // Update status + create reminder in transaction
    const newStatus = invoice.status === 'DRAFT' ? 'SENT' : invoice.status;

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus, atualizadoPor: Number(user.id) },
      });

      await tx.invoiceReminder.create({
        data: {
          invoiceId,
          tipo: 'INITIAL_SEND',
          diasAposVencimento: 0,
          dataEnvio: new Date(),
          metodo: 'EMAIL',
          destinatario: invoice.cliente.email!,
          assunto: `Invoice ${invoice.numeroInvoice}`,
          mensagem: 'Invoice enviada com PDF anexo',
          status: 'SENT',
        },
      });

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          userId: Number(user.id),
          entidade: 'Invoice',
          entidadeId: String(invoiceId),
          acao: 'SEND',
          diff: JSON.stringify({ numeroInvoice: invoice.numeroInvoice, sentTo: invoice.cliente.email, statusUpdated: newStatus }),
        },
      });
    });

    return NextResponse.json({
      data: {
        messageId: info.messageId,
        sentTo: invoice.cliente.email,
        statusUpdated: invoice.status === 'DRAFT' ? 'SENT' : null,
      },
      success: true,
    });
  } catch (error) {
    logger.error({ err: error, invoiceId }, 'Erro ao enviar email da invoice');
    return NextResponse.json(
      { error: 'Internal server error', message: 'Falha ao enviar email. Verifique a configuração SMTP.', success: false },
      { status: 500 },
    );
  }
});
