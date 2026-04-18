import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';

/**
 * POST /api/webhooks/invoice-paid
 * 
 * Webhook triggered when an invoice is marked as PAID.
 * Automatically closes the associated Service Order (AWAITING_PAYMENT → CLOSED).
 * 
 * This can be called from:
 * - Payment gateway webhooks (Stripe, etc.)
 * - Manual invoice status update in the system
 * - Scheduled job that checks for paid invoices
 */
export const POST = withErrorHandler(async (request: Request) => {
        const body = await request.json();
        const { invoiceId, source = 'manual' } = body;

        if (!invoiceId) {
            return NextResponse.json(
                { error: 'invoiceId is required' },
                { status: 400 }
            );
        }

        // Find the invoice
        const invoice = await prisma.invoice.findUnique({
            where: { id: Number(invoiceId) },
            select: {
                id: true,
                numeroInvoice: true,
                status: true,
                ServiceOrder: {
                    select: {
                        id: true,
                        ticketNumber: true,
                        status: true
                    }
                }
            }
        });

        if (!invoice) {
            return NextResponse.json(
                { error: 'Invoice not found' },
                { status: 404 }
            );
        }

        // Check if invoice is PAID
        if (invoice.status !== 'PAID') {
            return NextResponse.json({
                success: false,
                message: `Invoice status is ${invoice.status}, not PAID. No action taken.`,
                invoiceId: invoice.id
            });
        }

        // Check if there's an associated Service Order
        if (!invoice.ServiceOrder) {
            return NextResponse.json({
                success: true,
                message: 'Invoice is PAID but has no associated Service Order.',
                invoiceId: invoice.id
            });
        }

        const serviceOrder = invoice.ServiceOrder;

        // Check if Service Order is in AWAITING_PAYMENT status
        if (serviceOrder.status !== 'AWAITING_PAYMENT') {
            return NextResponse.json({
                success: true,
                message: `Service Order ${serviceOrder.ticketNumber} is already in status ${serviceOrder.status}.`,
                invoiceId: invoice.id,
                serviceOrderId: serviceOrder.id
            });
        }

        // Transition Service Order to CLOSED
        await prisma.serviceOrder.update({
            where: { id: serviceOrder.id },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
                // closedById: userId // Would come from auth context
            }
        });

        // eslint-disable-next-line no-console
        console.log(`[Invoice PAID Webhook] Service Order ${serviceOrder.ticketNumber} → CLOSED (source: ${source})`);

        return NextResponse.json({
            success: true,
            message: `Service Order ${serviceOrder.ticketNumber} closed automatically.`,
            invoiceId: invoice.id,
            serviceOrderId: serviceOrder.id,
            previousStatus: 'AWAITING_PAYMENT',
            newStatus: 'CLOSED',
            source
        });
    });
