import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateInvoicePDF } from '@/shared/lib/services/invoice-pdf';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser, can, type Role } from '@/shared/lib/rbac';
import { EmailService } from '@/shared/lib/email';
import { renderBaseTemplate } from '@/shared/lib/emails/template-base';
import logger from '@/shared/lib/logger';
import { validateTaxBeforeSend } from '@/shared/services/salesTaxService';
import { postLedgerTransaction } from '@/shared/services/ledgerPostingService';
import { Decimal } from '@prisma/client/runtime/client';

import { checkEmailRateLimit, EMAIL_RATE_LIMIT } from './email-rate-limit';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

/**
 * POST /api/invoices/[id]/send - Enviar invoice por email com PDF anexo
 */
export const POST = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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
        {
          error: 'Too Many Requests',
          message: `Limite de ${EMAIL_RATE_LIMIT} emails por hora atingido. Tente novamente em ${rateCheck.retryAfterSecs}s.`,
          success: false,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfterSecs) },
        },
      );
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, empresaId: user.empresaId },
      include: {
        itens: { orderBy: { ordem: 'asc' } },
        pagamentos: { where: { estornadoEm: null }, orderBy: { dataPagamento: 'desc' } },
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
        ServiceOrder: { select: { agreedClientPrice: true } },
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
        {
          error: 'Invalid operation',
          message: 'Não é possível enviar invoice cancelada',
          success: false,
        },
        { status: 400 },
      );
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json(
        {
          error: 'Invalid operation',
          message: 'Não é possível enviar invoice já paga',
          success: false,
        },
        { status: 400 },
      );
    }

    if (!invoice.itens || invoice.itens.length === 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Invoice não pode ser enviada sem itens',
          success: false,
        },
        { status: 422 },
      );
    }

    if (!invoice.cliente.email) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Cliente não possui email cadastrado',
          success: false,
        },
        { status: 400 },
      );
    }

    // Validate: if linked OS has agreedClientPrice, invoice total must match
    if (invoice.ServiceOrder?.agreedClientPrice) {
      const agreed = Number(invoice.ServiceOrder.agreedClientPrice);
      const invoiceTotal = Number(invoice.valorTotal);
      if (Math.abs(agreed - invoiceTotal) > 0.01) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            message: `O valor do invoice (${invoiceTotal.toFixed(2)}) não corresponde ao valor acordado com o cliente na OS (${agreed.toFixed(2)}). Atualize o invoice antes de enviar.`,
            success: false,
          },
          { status: 422 },
        );
      }
    }

    // Block send if tax classification requires manual review and override not set
    const taxBlockers = validateTaxBeforeSend({
      taxMode: invoice.taxMode,
      manualTaxOverride: invoice.manualTaxOverride,
      propertyType: invoice.propertyType,
      serviceCategory: invoice.serviceCategory,
      contractType: invoice.contractType,
    });
    if (taxBlockers.length > 0) {
      return NextResponse.json(
        {
          error: 'Tax review required',
          message: taxBlockers[0],
          success: false,
        },
        { status: 422 },
      );
    }

    const statusUpdated = invoice.status === 'DRAFT' ? 'SENT' : null;

    if (invoice.status === 'DRAFT') {
      const claimed = await prisma.$transaction(async (tx) => {
        const updated = await tx.invoice.updateMany({
          where: { id: invoiceId, empresaId: user.empresaId, status: 'DRAFT' },
          data: { status: 'SENT', atualizadoPor: Number(user.id) },
        });

        if (updated.count === 0) {
          return false;
        }

        if (!invoice.ledgerTransactionId) {
          const invoiceLedger = await postLedgerTransaction(
            {
              empresaId: invoice.empresaId,
              data: new Date(),
              descricao: `Invoice #${invoiceId} reconhecida`,
              sourceType: 'INVOICE',
              sourceId: invoiceId,
              entries: [
                {
                  accountCode: 'ACCOUNTS_RECEIVABLE',
                  debit: new Decimal(invoice.valorTotal),
                  memo: `Invoice #${invoiceId}`,
                },
                {
                  accountCode: 'REVENUE',
                  credit: new Decimal(invoice.valorTotal),
                  memo: `Invoice #${invoiceId}`,
                },
              ],
            },
            tx,
          );

          await tx.invoice.update({
            where: { id: invoiceId },
            data: { ledgerTransactionId: invoiceLedger.id },
            select: { id: true },
          });
        }

        return true;
      });

      if (!claimed) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Invoice já está em envio ou foi enviada', success: false },
          { status: 409 },
        );
      }
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
    const clienteNome =
      invoice.cliente.nomeCompleto ||
      invoice.cliente.nomeFantasia ||
      invoice.cliente.nomeChave ||
      '';
    const dueDateFormatted = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(invoice.dataVencimento));

    const content = `
    <p>Dear ${escapeHtml(clienteNome)},</p>
    <p>Please find attached invoice <strong>${escapeHtml(invoice.numeroInvoice)}</strong> for services rendered.</p>

    <div class="card">
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0; color:#6B7280; font-size:14px;">Total Amount</td>
          <td style="padding:8px 0; text-align:right; font-weight:700; font-size:16px; color:#111827;">${formatCurrency(Number(invoice.valorTotal))}</td>
        </tr>
        <tr style="border-top:1px solid #E5E7EB;">
          <td style="padding:8px 0; color:#6B7280; font-size:14px;">Due Date</td>
          <td style="padding:8px 0; text-align:right; color:#111827;">${escapeHtml(dueDateFormatted)}</td>
        </tr>
        <tr style="border-top:1px solid #E5E7EB;">
          <td style="padding:8px 0; color:#6B7280; font-size:14px;">Balance Due</td>
          <td style="padding:8px 0; text-align:right; font-weight:700; color:${Number(invoice.saldo) > 0 ? '#B91C1C' : '#15803D'};">${formatCurrency(Number(invoice.saldo))}</td>
        </tr>
        ${
          invoice.projeto
            ? `
        <tr style="border-top:1px solid #E5E7EB;">
          <td style="padding:8px 0; color:#6B7280; font-size:14px;">Project</td>
          <td style="padding:8px 0; text-align:right; color:#111827;">${escapeHtml(invoice.projeto.titulo ?? '')}</td>
        </tr>`
            : ''
        }
      </table>
    </div>

    <p style="color:#6B7280; font-size:13px;">
      The PDF is attached to this email. If you have any questions about this invoice, please don't hesitate to contact us.
    </p>
  `;

    const subject = `Invoice ${invoice.numeroInvoice} — ${formatCurrency(Number(invoice.valorTotal))}`;

    const html = renderBaseTemplate({
      subject,
      preheader: `Invoice ${invoice.numeroInvoice} for ${formatCurrency(Number(invoice.valorTotal))} — due ${dueDateFormatted}`,
      title: `Invoice ${escapeHtml(invoice.numeroInvoice)}`,
      subtitle: `Due ${dueDateFormatted}`,
      content,
      supportEmail: 'office@gladpros.com',
      footerNote: 'This is an automated email sent by GladPros billing system.',
    });

    try {
      const result = await EmailService.send({
        to: invoice.cliente.email!,
        subject,
        html,
        bcc: process.env.INVOICE_BCC_EMAIL || 'office@gladpros.com',
        attachments: [
          {
            filename: `${invoice.numeroInvoice}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      if (!result.success) {
        logger.error({ error: result.error, invoiceId }, 'Erro ao enviar email da invoice');
        return NextResponse.json(
          {
            error: 'Internal server error',
            message: 'Falha ao enviar email. Verifique a configuração SMTP.',
            success: false,
          },
          { status: 500 },
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.invoiceReminder.create({
          data: {
            invoiceId,
            tipo: 'INITIAL_SEND',
            diasAposVencimento: 0,
            dataEnvio: new Date(),
            metodo: 'EMAIL',
            destinatario: invoice.cliente.email!,
            assunto: `Invoice ${invoice.numeroInvoice}`,
            mensagem: 'Invoice sent with PDF attachment',
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
            diff: JSON.stringify({
              numeroInvoice: invoice.numeroInvoice,
              sentTo: invoice.cliente.email,
              statusUpdated,
            }),
          },
        });
      });

      return NextResponse.json({
        data: {
          messageId: result.messageId,
          sentTo: invoice.cliente.email,
          statusUpdated,
        },
        success: true,
      });
    } catch (error) {
      logger.error({ err: error, invoiceId }, 'Erro ao enviar email da invoice');
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'Falha ao enviar email. Verifique a configuração SMTP.',
          success: false,
        },
        { status: 500 },
      );
    }
  },
);
