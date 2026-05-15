import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';

const reimbursementSchema = z.object({
    attachmentId: z.number().int(),
});

/**
 * POST /api/service-orders/[id]/request-reimbursement
 *
 * Creates a reimbursement Expense from a RECEIPT attachment on a service order.
 * If the OS is linked to a project, projetoId is propagated to the expense so
 * that project cost calculations include field reimbursements.
 * The expense is created with status AGUARDANDO_APROVACAO.
 */
export const POST = withErrorHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) => {
    const user = await requireUser(request as NextRequest);
    if (!can(user.role as Role, 'service-orders', 'update')) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Sem permissão', success: false },
            { status: 403 }
        );
    }

    const empresaId = user.empresaId;

    const { id } = await params;
    const serviceOrderId = parseInt(id);
    if (isNaN(serviceOrderId)) {
        return NextResponse.json(
            { error: 'Validation failed', message: 'ID inválido', success: false },
            { status: 400 }
        );
    }

    const body = reimbursementSchema.safeParse(await request.json());
    if (!body.success) {
        return NextResponse.json(
            { error: 'Validation failed', message: body.error.issues[0]?.message ?? 'Dados inválidos', success: false },
            { status: 400 }
        );
    }

    const { attachmentId } = body.data;

    // Fetch attachment + OS projetoId in one query
    const attachment = await prisma.serviceOrderAttachment.findFirst({
        where: { id: attachmentId, serviceOrderId },
        select: {
            id: true,
            type: true,
            filename: true,
            receiptTotal: true,
            serviceOrder: { select: { projetoId: true } },
        },
    });

    if (!attachment) {
        return NextResponse.json(
            { error: 'Not found', message: 'Anexo não encontrado nesta ordem de serviço', success: false },
            { status: 404 }
        );
    }

    if (attachment.type !== 'RECEIPT') {
        return NextResponse.json(
            { error: 'Bad request', message: 'Apenas anexos do tipo RECEIPT podem gerar reembolso', success: false },
            { status: 400 }
        );
    }

    const amount = Number(attachment.receiptTotal ?? 0);
    const projetoId = attachment.serviceOrder.projetoId ?? null;

    // Find or create the reimbursement expense category
    let category = await prisma.expenseCategory.findFirst({
        where: {
            empresaId,
            OR: [
                { nome: { contains: 'Reimbolso' } },
                { nome: { contains: 'Reemb' } },
            ],
        },
        select: { id: true },
    });

    if (!category) {
        category = await prisma.expenseCategory.create({
            data: {
                empresaId,
                nome: 'Reembolsos de Campo',
                cor: '#F59E0B',
                scheduleCLine: null,
            },
            select: { id: true },
        });
    }

    const expense = await prisma.expense.create({
        data: {
            empresaId,
            categoriaId: category.id,
            descricao: `Reembolso - OS ${serviceOrderId} - ${attachment.filename}`,
            valor: amount,
            tipo: 'OPERACIONAL',
            formaPagamento: 'DINHEIRO',
            status: 'AGUARDANDO_APROVACAO',
            dataEmissao: new Date(),
            dataVencimento: new Date(),
            serviceOrderId,
            ...(projetoId ? { projetoId } : {}),
            requerAprovacao: true,
            isBillableToClient: false,
            costCategory: 'MATERIAL',
            observacoes: `Solicitado por ${user.email} via OS`,
        },
        select: { id: true },
    });

    return NextResponse.json(
        { data: { expenseId: expense.id, serviceOrderId, projetoId }, success: true },
        { status: 201 }
    );
});

/**
 * POST /api/service-orders/[id]/request-reimbursement
 *
 * Creates a reimbursement Expense from a RECEIPT attachment on a service order.
 * The expense is created with status AGUARDANDO_APROVACAO.
 */
export const POST = withErrorHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) => {
    const user = await requireUser(request as NextRequest);
    if (!can(user.role as Role, 'service-orders', 'update')) {
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

    const body = reimbursementSchema.safeParse(await request.json());
    if (!body.success) {
        return NextResponse.json(
            { error: 'Validation failed', message: body.error.issues[0]?.message ?? 'Dados inválidos', success: false },
            { status: 400 }
        );
    }

    const { attachmentId } = body.data;

    const attachment = await prisma.serviceOrderAttachment.findFirst({
        where: { id: attachmentId, serviceOrderId },
        select: { id: true, type: true, filename: true, receiptTotal: true },
    });

    if (!attachment) {
        return NextResponse.json(
            { error: 'Not found', message: 'Anexo não encontrado nesta ordem de serviço', success: false },
            { status: 404 }
        );
    }

    if (attachment.type !== 'RECEIPT') {
        return NextResponse.json(
            { error: 'Bad request', message: 'Apenas anexos do tipo RECEIPT podem gerar reembolso', success: false },
            { status: 400 }
        );
    }

    const amount = Number(attachment.receiptTotal ?? 0);

    // Find or create the reimbursement expense category
    let category = await prisma.expenseCategory.findFirst({
        where: {
            empresaId: EMPRESA_ID,
            OR: [
                { nome: { contains: 'Reimbolso' } },
                { nome: { contains: 'Reemb' } },
            ],
        },
        select: { id: true },
    });

    if (!category) {
        category = await prisma.expenseCategory.create({
            data: {
                empresaId: EMPRESA_ID,
                nome: 'Reembolsos de Campo',
                cor: '#F59E0B',
                scheduleCLine: null,
            },
            select: { id: true },
        });
    }

    const expense = await prisma.expense.create({
        data: {
            empresaId: EMPRESA_ID,
            categoriaId: category.id,
            descricao: `Reembolso - OS ${serviceOrderId} - ${attachment.filename}`,
            valor: amount,
            tipo: 'OPERACIONAL',
            formaPagamento: 'DINHEIRO',
            status: 'AGUARDANDO_APROVACAO',
            dataEmissao: new Date(),
            dataVencimento: new Date(),
            serviceOrderId,
            requerAprovacao: true,
            isBillableToClient: false,
            costCategory: 'MATERIAL',
            observacoes: `Solicitado por ${user.email} via OS`,
        },
        select: { id: true },
    });

    return NextResponse.json(
        { data: { expenseId: expense.id, serviceOrderId }, success: true },
        { status: 201 }
    );
});
