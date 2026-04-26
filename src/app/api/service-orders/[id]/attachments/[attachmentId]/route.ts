import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';
import { unlink } from 'fs/promises';
import { resolve } from 'path';

export const runtime = 'nodejs';

const VALID_TYPES = new Set([
    'BEFORE_PHOTO', 'AFTER_PHOTO', 'RECEIPT',
    'RETURN_RECEIPT', 'INVOICE_DOC', 'OTHER',
]);

const editSchema = z.object({
    caption:       z.string().max(500).optional().nullable(),
    type:          z.string().optional(),
    vendorName:    z.string().max(200).optional().nullable(),
    receiptTotal:  z.coerce.number().nonnegative().optional().nullable(),
    // Full replacement: desired final set of material links with optional qty/cost/tax
    materialLinks: z.array(z.object({
        materialItemId:    z.number().int().positive(),
        quantityOnReceipt: z.coerce.number().nonnegative().nullable().optional(),
        unitCostOnReceipt: z.coerce.number().nonnegative().nullable().optional(),
        hasTax:            z.boolean().nullable().optional(),
        taxRate:           z.coerce.number().min(0).max(100).nullable().optional(),
    })).optional(),
    // Legacy delta fields (kept for backwards compat — ignored if materialLinks present)
    addMaterialIds:    z.array(z.number().int().positive()).optional(),
    removeMaterialIds: z.array(z.number().int().positive()).optional(),
});

/**
 * PATCH /api/service-orders/[id]/attachments/[attachmentId]
 * Two modes:
 *   - { action: 'approve' | 'reject' } → NF approval (ADMIN/GERENTE only)
 *   - edit fields → update caption, type, vendorName, receiptTotal
 */
export const PATCH = withErrorHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string; attachmentId: string }> }
) => {
    const user = await requireUser(request as NextRequest);
    if (!can(user.role as Role, 'service-orders', 'read')) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Sem permissão', success: false },
            { status: 403 }
        );
    }

    const { id, attachmentId } = await params;
    const serviceOrderId = parseInt(id);
    const attId = parseInt(attachmentId);

    if (isNaN(serviceOrderId) || isNaN(attId)) {
        return NextResponse.json(
            { error: 'Validation failed', message: 'ID inválido', success: false },
            { status: 400 }
        );
    }

    const attachment = await prisma.serviceOrderAttachment.findUnique({
        where: { id: attId },
    });

    if (!attachment || attachment.serviceOrderId !== serviceOrderId) {
        return NextResponse.json(
            { error: 'Not found', message: 'Anexo não encontrado', success: false },
            { status: 404 }
        );
    }

    const raw = await request.json();

    // ── Approval mode ─────────────────────────────────────────────────────────
    if ('action' in raw) {
        // Approval fields (approvalStatus, approvedBy, approvalNote) are not yet
        // in the DB schema — return 501 to indicate not implemented at DB level.
        return NextResponse.json(
            { error: 'Not implemented', message: 'Aprovação de NF ainda não implementada no banco de dados', success: false },
            { status: 501 }
        );
    }

    // ── Edit mode ─────────────────────────────────────────────────────────────
    if (!can(user.role as Role, 'service-orders', 'update')) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Sem permissão para editar', success: false },
            { status: 403 }
        );
    }

    const body = editSchema.safeParse(raw);
    if (!body.success) {
        return NextResponse.json(
            { error: 'Validation failed', message: body.error.issues[0]?.message ?? 'Dados inválidos', success: false },
            { status: 400 }
        );
    }

    const { caption, type, vendorName, receiptTotal, materialLinks, addMaterialIds, removeMaterialIds } = body.data;

    if (type !== undefined && !VALID_TYPES.has(type)) {
        return NextResponse.json(
            { error: 'Validation failed', message: 'Tipo de anexo inválido', success: false },
            { status: 400 }
        );
    }

    // Recompute taxAmount when materialLinks is provided (aggregate then round)
    const newTaxAmount = materialLinks !== undefined ? (() => {
        let sum = 0;
        for (const l of materialLinks) {
            if (l.hasTax && l.quantityOnReceipt != null && l.unitCostOnReceipt != null && l.taxRate != null) {
                sum += l.quantityOnReceipt * l.unitCostOnReceipt * l.taxRate / 100;
            }
        }
        return materialLinks.some(l => l.hasTax != null) ? Math.round(sum * 100) / 100 : null;
    })() : undefined;

    // Run all mutations atomically
    const ops: Prisma.PrismaPromise<unknown>[] = [
        prisma.serviceOrderAttachment.update({
            where: { id: attId },
            data: {
                ...(caption !== undefined    ? { caption: caption ?? null }          : {}),
                ...(type !== undefined       ? { type: type as never }               : {}),
                ...(vendorName !== undefined ? { vendorName: vendorName ?? null }    : {}),
                ...(receiptTotal !== undefined
                    ? { receiptTotal: receiptTotal !== null ? receiptTotal : null }
                    : {}),
                ...(newTaxAmount !== undefined ? { taxAmount: newTaxAmount } : {}),
            },
        }),
    ];

    if (materialLinks !== undefined) {
        // Full replacement: delete all, recreate with new data including tax fields
        ops.push(
            prisma.attachmentMaterial.deleteMany({
                where: { attachmentId: attId },
            }) as never
        );
        if (materialLinks.length > 0) {
            ops.push(
                prisma.attachmentMaterial.createMany({
                    data: materialLinks.map((l) => ({
                        attachmentId: attId,
                        materialItemId: l.materialItemId,
                        quantityOnReceipt: l.quantityOnReceipt ?? null,
                        unitCostOnReceipt: l.unitCostOnReceipt ?? null,
                        hasTax: l.hasTax ?? null,
                        taxRate: l.taxRate ?? null,
                    })),
                }) as never
            );
        }
    } else {
        // Legacy delta mode
        if (removeMaterialIds?.length) {
            ops.push(
                prisma.attachmentMaterial.deleteMany({
                    where: { attachmentId: attId, materialItemId: { in: removeMaterialIds } },
                }) as never
            );
        }
        if (addMaterialIds?.length) {
            ops.push(
                prisma.attachmentMaterial.createMany({
                    data: addMaterialIds.map((mid) => ({ attachmentId: attId, materialItemId: mid })),
                    skipDuplicates: true,
                }) as never
            );
        }
    }

    const [updated] = await prisma.$transaction(ops);

    return NextResponse.json({ data: updated, success: true }, { status: 200 });
});

/**
 * DELETE /api/service-orders/[id]/attachments/[attachmentId]
 * Removes attachment record and associated file from disk.
 */
export const DELETE = withErrorHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string; attachmentId: string }> }
) => {
    const user = await requireUser(request as NextRequest);
    if (!can(user.role as Role, 'service-orders', 'update')) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Sem permissão', success: false },
            { status: 403 }
        );
    }

    const { id, attachmentId } = await params;
    const serviceOrderId = parseInt(id);
    const attId = parseInt(attachmentId);

    if (isNaN(serviceOrderId) || isNaN(attId)) {
        return NextResponse.json(
            { error: 'Validation failed', message: 'ID inválido', success: false },
            { status: 400 }
        );
    }

    const attachment = await prisma.serviceOrderAttachment.findUnique({
        where: { id: attId },
    });

    if (!attachment || attachment.serviceOrderId !== serviceOrderId) {
        return NextResponse.json(
            { error: 'Not found', message: 'Anexo não encontrado', success: false },
            { status: 404 }
        );
    }

    // Delete DB record first
    await prisma.serviceOrderAttachment.delete({ where: { id: attId } });

    // Best-effort file deletion — don't fail the request if the file is missing
    try {
        const filePath = resolve(process.cwd(), 'uploads', attachment.filepath);
        await unlink(filePath);
    } catch {
        // File may already be gone — ignore
    }

    return NextResponse.json({ success: true }, { status: 200 });
});
