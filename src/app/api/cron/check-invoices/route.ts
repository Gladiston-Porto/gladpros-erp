import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/shared/lib/email';
import { renderBaseTemplate } from '@/shared/lib/emails/template-base';

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'long', day: 'numeric', year: 'numeric' }).format(d);
}

/** Send overdue payment reminder email to client */
async function sendPaymentReminder(invoice: {
  id: number;
  numeroInvoice: string;
  valorTotal: unknown;
  saldo: unknown;
  dataVencimento: Date | null;
  cliente: { nomeCompleto: string | null; nomeFantasia: string | null; nomeChave: string | null; email: string | null };
}): Promise<void> {
  if (!invoice.cliente.email) return;

  const clientName = invoice.cliente.nomeCompleto || invoice.cliente.nomeFantasia || invoice.cliente.nomeChave || 'Valued Client';
  const total = fmt.format(Number(invoice.valorTotal));
  const balance = fmt.format(Number(invoice.saldo));
  const dueDate = invoice.dataVencimento ? fmtDate(invoice.dataVencimento) : 'N/A';
  const subject = `Payment Reminder — Invoice ${invoice.numeroInvoice}`;

  const content = `
    <p>Dear ${clientName},</p>
    <p>This is a friendly reminder that invoice <strong>${invoice.numeroInvoice}</strong> is past due.</p>

    <div class="card warning-card">
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0; font-size:14px;">Invoice</td>
          <td style="padding:8px 0; text-align:right; font-weight:700;">${invoice.numeroInvoice}</td>
        </tr>
        <tr style="border-top:1px solid rgba(0,0,0,0.08);">
          <td style="padding:8px 0; font-size:14px;">Total Amount</td>
          <td style="padding:8px 0; text-align:right;">${total}</td>
        </tr>
        <tr style="border-top:1px solid rgba(0,0,0,0.08);">
          <td style="padding:8px 0; font-size:14px;">Due Date</td>
          <td style="padding:8px 0; text-align:right;">${dueDate}</td>
        </tr>
        <tr style="border-top:1px solid rgba(0,0,0,0.08);">
          <td style="padding:8px 0; font-size:14px; font-weight:700;">Balance Due</td>
          <td style="padding:8px 0; text-align:right; font-weight:700;">${balance}</td>
        </tr>
      </table>
    </div>

    <p>Please arrange payment at your earliest convenience. If you have already submitted payment, please disregard this notice.</p>
    <p>If you have any questions or concerns about this invoice, please don't hesitate to contact us.</p>
  `;

  const html = renderBaseTemplate({
    subject,
    preheader: `Payment reminder for invoice ${invoice.numeroInvoice} — balance ${balance} past due`,
    title: 'Payment Reminder',
    subtitle: `Invoice ${invoice.numeroInvoice} is past due`,
    content,
    supportEmail: 'office@gladpros.com',
    footerNote: 'This is an automated payment reminder from GladPros.',
  });

  await EmailService.send({
    to: invoice.cliente.email,
    subject,
    html,
    bcc: process.env.INVOICE_BCC_EMAIL || 'office@gladpros.com',
  });

  // Record reminder in DB
  await prisma.invoiceReminder.create({
    data: {
      invoiceId: invoice.id,
      tipo: 'REMINDER',
      diasAposVencimento: invoice.dataVencimento
        ? Math.floor((Date.now() - invoice.dataVencimento.getTime()) / 86_400_000)
        : 0,
      dataEnvio: new Date(),
      metodo: 'EMAIL',
      destinatario: invoice.cliente.email,
      assunto: subject,
      mensagem: `Payment reminder sent for overdue invoice ${invoice.numeroInvoice}`,
      status: 'SENT',
    },
  });
}

/**
 * POST /api/cron/check-invoices
 *
 * Scheduled daily at 08:00 CT (vercel.json: "0 8 * * *") to:
 * 1. Find PAID invoices with AWAITING_PAYMENT service orders → Close them
 * 2. Find overdue invoices → Mark OVERDUE + send client reminder (once per day)
 *
 * Security: validated via CRON_SECRET env var (set in Vercel dashboard)
 */
export async function POST(request: Request) {
    try {
        // Validate cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const results = {
            closedServiceOrders: [] as string[],
            overdueInvoices: [] as string[],
            remindersSent: [] as string[],
            errors: [] as string[]
        };

        // 1. Auto-close Service Orders for PAID invoices
        const paidInvoicesWithPendingOS = await prisma.invoice.findMany({
            where: {
                status: 'PAID',
                ServiceOrder: {
                    status: 'AWAITING_PAYMENT'
                }
            },
            include: {
                ServiceOrder: {
                    select: { id: true, ticketNumber: true }
                }
            }
        });

        for (const invoice of paidInvoicesWithPendingOS) {
            if (!invoice.ServiceOrder) continue;

            try {
                await prisma.serviceOrder.update({
                    where: { id: invoice.ServiceOrder.id },
                    data: {
                        status: 'CLOSED',
                        closedAt: new Date()
                    }
                });
                results.closedServiceOrders.push(invoice.ServiceOrder.ticketNumber);
            } catch (err) {
                results.errors.push(`Failed to close ${invoice.ServiceOrder.ticketNumber}`);
            }
        }

        // 2. Find overdue invoices
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Only send reminders to invoices that haven't been reminded today
        const overdueInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ['DRAFT', 'SENT', 'OVERDUE'] },
                dataVencimento: { lt: today },
                empresaId: 1,
            },
            select: {
                id: true,
                status: true,
                numeroInvoice: true,
                valorTotal: true,
                saldo: true,
                dataVencimento: true,
                cliente: {
                    select: { nomeFantasia: true, nomeCompleto: true, nomeChave: true, email: true }
                },
                ServiceOrder: {
                    select: { ticketNumber: true }
                },
                lembretes: {
                    where: { dataEnvio: { gte: today } },
                    select: { id: true },
                    take: 1,
                },
            }
        });

        for (const invoice of overdueInvoices) {
            results.overdueInvoices.push(invoice.numeroInvoice);

            // Mark as OVERDUE if still in earlier status
            if (invoice.status === 'DRAFT' || invoice.status === 'SENT') {
                try {
                    await prisma.invoice.update({
                        where: { id: invoice.id },
                        data: { status: 'OVERDUE' }
                    });
                } catch {
                    // Ignore - status may already be updated concurrently
                }
            }

            // Send reminder only if not already sent today
            if (invoice.lembretes.length === 0 && invoice.cliente.email) {
                try {
                    await sendPaymentReminder(invoice);
                    results.remindersSent.push(invoice.numeroInvoice);
                } catch (err) {
                    results.errors.push(`Reminder failed for ${invoice.numeroInvoice}: ${err instanceof Error ? err.message : String(err)}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            summary: {
                closedCount: results.closedServiceOrders.length,
                overdueCount: results.overdueInvoices.length,
                remindersSent: results.remindersSent.length,
                errorCount: results.errors.length
            },
            details: results
        });
    } catch (error) {
        console.error('Error running invoice check cron:', error);
        return NextResponse.json(
            { error: 'Cron job failed' },
            { status: 500 }
        );
    }
}

// Also support GET for easy testing
export async function GET(request: Request) {
    return POST(request);
}
