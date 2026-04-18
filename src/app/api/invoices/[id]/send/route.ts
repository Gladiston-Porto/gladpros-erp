import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateInvoicePDF } from '@/shared/lib/services/invoice-pdf';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import * as nodemailer from 'nodemailer';

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
  const { id } = await params;
  const invoiceId = parseInt(id);

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
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
    return NextResponse.json({ error: 'Invoice não encontrada' }, { status: 404 });
  }

  if (invoice.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Não é possível enviar invoice cancelada' }, { status: 400 });
  }

  if (!invoice.cliente.email) {
    return NextResponse.json({ error: 'Cliente não possui email cadastrado' }, { status: 400 });
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
  const clienteNome = invoice.cliente.nomeCompleto || invoice.cliente.nomeFantasia || invoice.cliente.nomeChave;
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
      ${invoice.projeto ? `<p><strong>Projeto:</strong> ${invoice.projeto.titulo}</p>` : ''}
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
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      sentTo: invoice.cliente.email,
      statusUpdated: invoice.status === 'DRAFT' ? 'SENT' : null,
    });
  } catch (error) {
    console.error('Erro ao enviar email da invoice:', error);
    return NextResponse.json(
      { error: 'Falha ao enviar email. Verifique a configuração SMTP.' },
      { status: 500 }
    );
  }
});
