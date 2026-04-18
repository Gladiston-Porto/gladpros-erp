import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/cron/check-invoices
 * 
 * Scheduled job to:
 * 1. Find PAID invoices with AWAITING_PAYMENT service orders → Close them
 * 2. Find overdue invoices → Log/notify (can extend to send reminders)
 * 
 * Should be called by a cron scheduler (Vercel Cron, external service, etc.)
 * 
 * Security: In production, add API key validation
 */
export async function POST(request: Request) {
    try {
        // Optional: Validate cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const results = {
            closedServiceOrders: [] as string[],
            overdueInvoices: [] as string[],
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
                // eslint-disable-next-line no-console
                // eslint-disable-next-line no-console
                console.log(`[Cron] Auto-closed: ${invoice.ServiceOrder.ticketNumber}`);
            } catch (err) {
                results.errors.push(`Failed to close ${invoice.ServiceOrder.ticketNumber}`);
            }
        }

        // 2. Find overdue invoices
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdueInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ['DRAFT', 'OVERDUE'] },
                dataVencimento: { lt: today }
            },
            select: {
                id: true,
                status: true,
                numeroInvoice: true,
                valorTotal: true,
                dataVencimento: true,
                cliente: {
                    select: { nomeFantasia: true, nomeCompleto: true, email: true }
                },
                ServiceOrder: {
                    select: { ticketNumber: true }
                }
            }
        });

        // Mark as OVERDUE if not already
        for (const invoice of overdueInvoices) {
            results.overdueInvoices.push(invoice.numeroInvoice);

            // Update status to OVERDUE if currently PENDING
            if (invoice.status === 'DRAFT') {
                try {
                    await prisma.invoice.update({
                        where: { id: invoice.id },
                        data: { status: 'OVERDUE' }
                    });
                } catch {
                    // Ignore - field might not have OVERDUE as valid status
                }
            }

            // TODO: Send reminder notification
            // await sendPaymentReminder(invoice);
        }

        // eslint-disable-next-line no-console
        // eslint-disable-next-line no-console
        console.log(`[Cron] Check complete: ${results.closedServiceOrders.length} closed, ${results.overdueInvoices.length} overdue`);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            summary: {
                closedCount: results.closedServiceOrders.length,
                overdueCount: results.overdueInvoices.length,
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
