import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';
import { resolveUnitPrice } from '@/server/services/serviceOrderTotals';
import { calculateInvoiceTax } from '@/shared/services/salesTaxService';

// Helper: Add business days (skip weekends)
function addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    let addedDays = 0;

    while (addedDays < days) {
        result.setDate(result.getDate() + 1);
        const dayOfWeek = result.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            addedDays++;
        }
    }

    return result;
}

// POST /api/service-orders/[id]/generate-invoice - Idempotent invoice generation [V3.1 AJUSTE #4]
export const POST = withErrorHandler(async (request: Request,
    { params }: { params: Promise<{ id: string }> }) => {
        const user = await requireUser(request as NextRequest);
        const canUpdateOrder = can(user.role as Role, 'service-orders', 'update');
        const canCreateInvoice = can(user.role as Role, 'invoices', 'create');
        if (!canUpdateOrder && !canCreateInvoice) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Sem permissão', success: false },
                { status: 403 }
            );
        }

        const { id } = await params;
        const serviceOrderId = parseInt(id);

        if (isNaN(serviceOrderId)) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'ID inválido', success: false },
                { status: 400 }
            );
        }

        // Get order with all related data
        const order = await prisma.serviceOrder.findUnique({
            where: { id: serviceOrderId },
            include: {
                Cliente: { select: { id: true, nomeFantasia: true, nomeCompleto: true } },
                Invoice: { select: { id: true, numeroInvoice: true, status: true } },
                materials: {
                    where: { status: 'CONSUMED' }
                },
                workEntries: {
                    include: { Worker: { select: { name: true } } }
                }
            },
        });

        if (!order) {
            return NextResponse.json(
                { error: 'Not found', message: 'Ordem de serviço não encontrada', success: false },
                { status: 404 }
            );
        }

        // [V3.1 AJUSTE #4] Idempotency: Check if invoice already exists
        if (order.invoiceId && order.Invoice) {
            if (order.Invoice.status !== 'CANCELLED') {
                return NextResponse.json({
                    data: {
                        isExisting: true,
                        message: 'Fatura já existe para esta OS',
                        invoice: {
                            id: order.Invoice.id,
                            numero: order.Invoice.numeroInvoice,
                            status: order.Invoice.status
                        }
                    },
                    success: true
                }, { status: 200 });
            }
        }

        // Check order status
        if (order.status !== 'COMPLETED') {
            return NextResponse.json(
                { error: 'Validation failed', message: 'A OS deve estar com status COMPLETED para gerar fatura', success: false },
                { status: 400 }
            );
        }

        // Calculate totals
        const laborTotal = order.workEntries.reduce((sum, w) => sum + Number(w.totalCost), 0);

        let materialTotal = 0;
        if (order.materialSupply === 'COMPANY_PROVIDES') {
            materialTotal = order.materials.reduce((sum, m) => {
                return sum + (Number(m.quantityUsed || m.quantityPlanned) * resolveUnitPrice(m));
            }, 0);
        }

        // Use agreedClientPrice as valorTotal when set (fixed-price contract)
        const valorTotal = order.agreedClientPrice
            ? Number(order.agreedClientPrice)
            : laborTotal + materialTotal;
        const grandTotal = valorTotal;
        const dueDate = addBusinessDays(new Date(), 5); // Net 5

        // Calculate sales tax (Fase 2) — inherit classification from OS
        const lineItems = [
            ...(laborTotal > 0 ? [{ tipo: 'SERVICE', total: laborTotal }] : []),
            ...(materialTotal > 0 ? [{ tipo: 'MATERIAL', total: materialTotal }] : []),
        ];
        const taxResult = calculateInvoiceTax({
            subtotal: grandTotal,
            lineItems,
            classification: {
                propertyType: order.propertyType,
                serviceCategory: order.serviceCategory,
                contractType: order.contractType,
                serviceAddressState: order.serviceState ?? 'TX',
            },
        });

        // C14 + C18: Wrap all mutations in a single transaction to prevent orphan invoices
        // and ensure history is recorded for the COMPLETED → AWAITING_PAYMENT transition.
        // C13: Re-check idempotency inside the transaction (serializable) to prevent
        // duplicate invoices when the playbook fires concurrently.
        const result = await prisma.$transaction(async (tx) => {
            // Re-check idempotency inside the transaction
            const freshOrder = await tx.serviceOrder.findUnique({
                where: { id: serviceOrderId },
                select: { invoiceId: true }
            });
            if (freshOrder?.invoiceId) {
                const existing = await tx.invoice.findUnique({
                    where: { id: freshOrder.invoiceId },
                    select: { id: true, numeroInvoice: true, status: true }
                });
                if (existing && existing.status !== 'CANCELLED') {
                    return { isExisting: true, invoice: existing };
                }
            }

            // Generate invoice number inside transaction to prevent duplicates
            const year = new Date().getFullYear();
            const lastInvoice = await tx.invoice.findFirst({
                where: { numeroInvoice: { startsWith: `INV-${year}-` } },
                orderBy: { id: 'desc' }
            });
            let invoiceNumber = `INV-${year}-0001`;
            if (lastInvoice) {
                const parts = lastInvoice.numeroInvoice.split('-');
                const nextNum = parseInt(parts[2]) + 1;
                invoiceNumber = `INV-${year}-${String(nextNum).padStart(4, '0')}`;
            }

            // Create invoice
            const invoice = await tx.invoice.create({
                data: {
                    numeroInvoice: invoiceNumber,
                    clienteId: order.clienteId,
                    projetoId: order.projetoId,
                    valorTotal: taxResult.taxMode === 'NON_TAXABLE'
                        ? grandTotal
                        : grandTotal + taxResult.taxAmount,
                    subtotal: grandTotal,
                    descontoValor: 0,
                    saldo: taxResult.taxMode === 'NON_TAXABLE'
                        ? grandTotal
                        : grandTotal + taxResult.taxAmount,
                    valorPago: 0,
                    // Tax fields (Fase 2)
                    taxRate: taxResult.taxRate,
                    taxAmount: taxResult.taxAmount,
                    propertyType: order.propertyType,
                    serviceCategory: order.serviceCategory,
                    contractType: order.contractType,
                    taxMode: taxResult.taxMode,
                    taxScenario: taxResult.scenario,
                    taxableAmount: taxResult.taxableAmount,
                    nonTaxableAmount: taxResult.nonTaxableAmount,
                    taxExplanation: taxResult.taxExplanation,
                    taxAddressCity: order.serviceCity,
                    taxAddressState: order.serviceState ?? 'TX',
                    taxAddressZip: order.serviceZip,
                    dataEmissao: new Date(),
                    dataVencimento: dueDate,
                    status: 'DRAFT',
                    notas: `OS: ${order.ticketNumber}`,
                    criadoPor: Number(user.id),
                }
            });

            // Build invoice items
            if (order.agreedClientPrice) {
                // Fixed-price contract: single flat line item
                await tx.invoiceItem.create({
                    data: {
                        invoiceId: invoice.id,
                        tipo: 'SERVICE',
                        descricao: order.title,
                        quantidade: 1,
                        unidade: 'SV',
                        precoUnitario: grandTotal,
                        subtotal: grandTotal,
                        taxavel: false,
                        ordem: 1,
                    }
                });
            } else {
                const items = [];

                if (laborTotal > 0) {
                    const totalHours = order.workEntries.reduce((sum, w) => sum + w.totalMinutes, 0) / 60;
                    items.push({
                        invoiceId: invoice.id,
                        tipo: 'SERVICE' as const,
                        descricao: `Mão de obra especializada (${totalHours.toFixed(1)} horas)`,
                        quantidade: 1,
                        unidade: 'SV',
                        precoUnitario: laborTotal,
                        subtotal: laborTotal,
                        ordem: 1
                    });
                }

                if (materialTotal > 0) {
                    const materialList = order.materials.map(m =>
                        `${m.name} (${m.quantityUsed || m.quantityPlanned} ${m.unit || 'un'})`
                    ).join(', ');
                    const rawDesc = `Materiais: ${materialList}`;
                    const descMaterial = rawDesc.length > 497 ? rawDesc.substring(0, 494) + '...' : rawDesc;

                    items.push({
                        invoiceId: invoice.id,
                        tipo: 'MATERIAL' as const,
                        descricao: descMaterial,
                        quantidade: 1,
                        unidade: 'KIT',
                        precoUnitario: materialTotal,
                        subtotal: materialTotal,
                        ordem: 2
                    });
                }

                if (items.length > 0) {
                    await tx.invoiceItem.createMany({ data: items });
                }
            }

            // C18: Record the COMPLETED → AWAITING_PAYMENT transition in history
            await tx.serviceOrderHistory.create({
                data: {
                    serviceOrderId,
                    eventType: 'INVOICE_GENERATED',
                    fromStatus: 'COMPLETED',
                    toStatus: 'AWAITING_PAYMENT',
                    reason: 'Fatura gerada',
                    createdById: Number(user.id),
                }
            });

            // Update service order
            await tx.serviceOrder.update({
                where: { id: serviceOrderId },
                data: {
                    invoiceId: invoice.id,
                    status: 'AWAITING_PAYMENT',
                    laborTotal,
                    materialTotal,
                    total: grandTotal
                }
            });

            return { isExisting: false, invoice };
        }, { isolationLevel: 'Serializable' });

        if (result.isExisting) {
            return NextResponse.json({
                data: {
                    isExisting: true,
                    message: 'Fatura já existe para esta OS',
                    invoice: {
                        id: result.invoice.id,
                        numero: result.invoice.numeroInvoice,
                        status: result.invoice.status
                    }
                },
                success: true
            }, { status: 200 });
        }

        return NextResponse.json({
            data: {
                isExisting: false,
                message: 'Fatura gerada com sucesso',
                invoice: {
                    id: result.invoice.id,
                    numero: result.invoice.numeroInvoice,
                    total: grandTotal,
                    dueDate,
                    status: 'DRAFT'
                }
            },
            success: true
        }, { status: 201 });
    });
