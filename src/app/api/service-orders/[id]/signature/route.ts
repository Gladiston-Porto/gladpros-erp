import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { resolve, join } from 'path';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';

export const runtime = 'nodejs';

const UPLOADS_BASE = resolve(process.cwd(), 'uploads', 'service-orders');

// POST /api/service-orders/[id]/signature
// Aceita multipart/form-data (key: file) OU application/json { signatureData: string (data URL base64) }
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

    const order = await prisma.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        select: { id: true },
    });

    if (!order) {
        return NextResponse.json(
            { error: 'Not found', message: 'Ordem de serviço não encontrada', success: false },
            { status: 404 }
        );
    }

    const contentType = request.headers.get('content-type') ?? '';
    const signatureDir = resolve(UPLOADS_BASE, String(serviceOrderId), 'signature');
    await mkdir(signatureDir, { recursive: true });

    let relPath: string;

    if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'Nenhum arquivo enviado', success: false },
                { status: 400 }
            );
        }

        const allowed = new Set(['image/png', 'image/jpeg', 'image/webp']);
        if (!allowed.has(file.type)) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'Formato inválido. Use PNG ou JPEG.', success: false },
                { status: 400 }
            );
        }

        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'Arquivo muito grande. Máximo 5MB.', success: false },
                { status: 400 }
            );
        }

        const ext = file.type === 'image/jpeg' ? '.jpg' : file.type === 'image/webp' ? '.webp' : '.png';
        const filename = `signature-${serviceOrderId}-${Date.now()}${ext}`;
        const filePath = resolve(join(signatureDir, filename));

        if (!filePath.startsWith(UPLOADS_BASE)) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'Caminho inválido', success: false },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));
        relPath = `service-orders/${serviceOrderId}/signature/${filename}`;

    } else if (contentType.includes('application/json')) {
        const body = await request.json();
        const signatureData: string | undefined = body?.signatureData;

        if (!signatureData || typeof signatureData !== 'string') {
            return NextResponse.json(
                { error: 'Validation failed', message: 'Dados de assinatura inválidos', success: false },
                { status: 400 }
            );
        }

        // Extrai base64 da data URL: data:image/png;base64,<dados>
        const match = signatureData.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
        if (!match) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'Formato de assinatura inválido', success: false },
                { status: 400 }
            );
        }

        const mimeType = match[1];
        const base64Data = match[2];
        const ext = mimeType === 'image/jpeg' ? '.jpg' : mimeType === 'image/webp' ? '.webp' : '.png';
        const filename = `signature-${serviceOrderId}-${Date.now()}${ext}`;
        const filePath = resolve(join(signatureDir, filename));

        if (!filePath.startsWith(UPLOADS_BASE)) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'Caminho inválido', success: false },
                { status: 400 }
            );
        }

        await writeFile(filePath, Buffer.from(base64Data, 'base64'));
        relPath = `service-orders/${serviceOrderId}/signature/${filename}`;

    } else {
        return NextResponse.json(
            { error: 'Validation failed', message: 'Content-Type não suportado', success: false },
            { status: 415 }
        );
    }

    await prisma.serviceOrder.update({
        where: { id: serviceOrderId },
        data: { clientSignatureUrl: relPath },
    });

    return NextResponse.json(
        { data: { signatureUrl: relPath }, success: true },
        { status: 201 }
    );
});
