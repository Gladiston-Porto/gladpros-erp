import { NextRequest, NextResponse } from "next/server";
import { requireUser, can, type Role } from "@/shared/lib/rbac";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api/error-handler";
import { writeFile, mkdir } from "fs/promises";
import { resolve, join } from "path";

export const runtime = "nodejs";

const UPLOADS_BASE = resolve(process.cwd(), "uploads", "service-orders");

const ALLOWED_MIME = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "application/pdf",
]);

const MAX_SIZE = 15 * 1024 * 1024; // 15MB — PDFs e fotos de alta resolução

function extensionForMime(mime: string): string {
    switch (mime) {
        case "image/jpeg":
            return ".jpg";
        case "image/png":
            return ".png";
        case "image/webp":
            return ".webp";
        case "image/heic":
            return ".heic";
        case "application/pdf":
            return ".pdf";
        default:
            return ".bin";
    }
}

function hasValidMagicBytes(mime: string, bytes: Buffer): boolean {
    if (bytes.length === 0) return false;

    if (mime === "image/jpeg") {
        return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    }

    if (mime === "image/png") {
        return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }

    if (mime === "image/webp") {
        return bytes.length >= 12
            && bytes.subarray(0, 4).toString("ascii") === "RIFF"
            && bytes.subarray(8, 12).toString("ascii") === "WEBP";
    }

    if (mime === "image/heic") {
        const brand = bytes.length >= 12 ? bytes.subarray(8, 12).toString("ascii") : "";
        return bytes.length >= 12
            && bytes.subarray(4, 8).toString("ascii") === "ftyp"
            && ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand);
    }

    if (mime === "application/pdf") {
        return bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-";
    }

    return false;
}

const VALID_TYPES = new Set([
    "BEFORE_PHOTO",
    "AFTER_PHOTO",
    "RECEIPT",
    "RETURN_RECEIPT",
    "INVOICE_DOC",
    "OTHER",
]);

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/service-orders/[id]/attachments
// Returns all attachments for the order, with linked materials via junction
// ──────────────────────────────────────────────────────────────────────────────
export const GET = withErrorHandler(async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const user = await requireUser(req);
    if (!can(user.role as Role, 'service-orders', 'read')) {
        return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }
    const { id } = await params;
    const orderId = parseInt(id);
    if (isNaN(orderId)) return NextResponse.json({ error: "Validation failed", message: "ID inválido", success: false }, { status: 400 });

    const attachments = await prisma.serviceOrderAttachment.findMany({
        where: { serviceOrderId: orderId },
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            type: true,
            filename: true,
            filepath: true,
            mime: true,
            sizeBytes: true,
            caption: true,
            vendorName: true,
            receiptTotal: true,
            materialItemId: true,
            createdAt: true,
            UploadedBy: { select: { id: true, nomeCompleto: true } },
            materialItems: {
                select: {
                    materialItemId: true,
                    quantityOnReceipt: true,
                    unitCostOnReceipt: true,
                    hasTax: true,
                    taxRate: true,
                    materialItem: {
                        select: { id: true, name: true, unit: true, quantityPlanned: true },
                    },
                },
            },
        },
    });

    return NextResponse.json({ data: attachments, success: true });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/service-orders/[id]/attachments
// Multipart form with: file, type, caption?, vendorName?, receiptTotal?,
//   materialItemId? (legacy singular), materialItemIds? (comma-separated)
// ──────────────────────────────────────────────────────────────────────────────
export const POST = withErrorHandler(async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const user = await requireUser(req);
    if (!can(user.role as Role, 'service-orders', 'update')) {
        return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão para enviar anexos', success: false }, { status: 403 });
    }
    const { id } = await params;
    const orderId = parseInt(id);
    if (isNaN(orderId)) return NextResponse.json({ error: "Validation failed", message: "ID inválido", success: false }, { status: 400 });

    // Verify the service order exists
    const order = await prisma.serviceOrder.findUnique({
        where: { id: orderId },
        select: { id: true },
    });
    if (!order) return NextResponse.json({ error: "Not found", message: "Ordem não encontrada", success: false }, { status: 404 });

    // Parse multipart form
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string | null)?.toUpperCase();
    const caption = (formData.get("caption") as string | null)?.trim() || null;
    const vendorName = (formData.get("vendorName") as string | null)?.trim() || null;
    const receiptTotalRaw = formData.get("receiptTotal") as string | null;

    // Parse material links: new format { materialItemId, quantityOnReceipt?, unitCostOnReceipt?, hasTax?, taxRate? }[]
    // Also supports legacy materialItemIds CSV and singular materialItemId for backwards compat
    const materialLinksRaw = formData.get("materialLinks") as string | null;
    const materialItemIdsRaw = formData.get("materialItemIds") as string | null;
    const materialItemIdRaw = formData.get("materialItemId") as string | null;

    type MaterialLink = {
        materialItemId: number;
        quantityOnReceipt?: number | null;
        unitCostOnReceipt?: number | null;
        hasTax?: boolean | null;
        taxRate?: number | null;
    };
    let materialLinks: MaterialLink[] = [];

    if (materialLinksRaw) {
        try {
            const parsed = JSON.parse(materialLinksRaw);
            if (Array.isArray(parsed)) {
                materialLinks = parsed
                    .filter((l: unknown) => l && typeof l === 'object' && 'materialItemId' in (l as object))
                    .map((l: { materialItemId: unknown; quantityOnReceipt?: unknown; unitCostOnReceipt?: unknown; hasTax?: unknown; taxRate?: unknown }) => ({
                        materialItemId: parseInt(String(l.materialItemId)),
                        quantityOnReceipt: l.quantityOnReceipt != null ? parseFloat(String(l.quantityOnReceipt)) : null,
                        unitCostOnReceipt: l.unitCostOnReceipt != null ? parseFloat(String(l.unitCostOnReceipt)) : null,
                        hasTax: l.hasTax != null ? Boolean(l.hasTax) : null,
                        taxRate: l.taxRate != null ? parseFloat(String(l.taxRate)) : null,
                    }))
                    .filter(l => !isNaN(l.materialItemId) && l.materialItemId > 0);
            }
        } catch { /* invalid JSON — ignore */ }
    } else if (materialItemIdsRaw) {
        materialLinks = materialItemIdsRaw
            .split(",")
            .map((s) => parseInt(s.trim()))
            .filter((n) => !isNaN(n) && n > 0)
            .map(id => ({ materialItemId: id }));
    } else if (materialItemIdRaw) {
        const single = parseInt(materialItemIdRaw);
        if (!isNaN(single) && single > 0) materialLinks = [{ materialItemId: single }];
    }

    if (!file) return NextResponse.json({ error: "Validation failed", message: "Nenhum arquivo enviado", success: false }, { status: 400 });
    if (!type || !VALID_TYPES.has(type)) {
        return NextResponse.json(
            { error: "Validation failed", message: `Tipo inválido. Use: ${[...VALID_TYPES].join(", ")}`, success: false },
            { status: 400 }
        );
    }

    if (!ALLOWED_MIME.has(file.type)) {
        return NextResponse.json(
            { error: "Validation failed", message: "Formato não suportado. Use JPG, PNG, WEBP ou PDF.", success: false },
            { status: 400 }
        );
    }

    if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: "Validation failed", message: "Arquivo muito grande. Máximo 15MB.", success: false }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length > MAX_SIZE) {
        return NextResponse.json({ error: "Validation failed", message: "Arquivo muito grande. Máximo 15MB.", success: false }, { status: 400 });
    }
    if (!hasValidMagicBytes(file.type, bytes)) {
        return NextResponse.json(
            { error: "Validation failed", message: "Conteúdo do arquivo não corresponde ao formato informado.", success: false },
            { status: 400 }
        );
    }

    const safeFilename = `${type.toLowerCase()}-${orderId}-${Date.now()}${extensionForMime(file.type)}`;

    // Build upload dir: uploads/service-orders/{orderId}/{type}/
    const typeDir = type.toLowerCase().replace("_", "-");
    const orderDir = resolve(UPLOADS_BASE, String(orderId), typeDir);
    await mkdir(orderDir, { recursive: true });

    const filePath = resolve(join(orderDir, safeFilename));

    // Path traversal check
    if (!filePath.startsWith(UPLOADS_BASE)) {
        return NextResponse.json({ error: "Validation failed", message: "Caminho inválido", success: false }, { status: 400 });
    }

    await writeFile(filePath, bytes);

    // Relative path for DB + serving via /api/uploads/
    const relPath = `service-orders/${orderId}/${typeDir}/${safeFilename}`;

    const receiptTotal = receiptTotalRaw ? parseFloat(receiptTotalRaw) : null;

    // Compute taxAmount from linked materials (reference — does NOT override receiptTotal)
    // taxAmount = Σ(qty * unitCost * taxRate/100) for lines with hasTax=true
    const taxAmount = (() => {
        let sum = 0;
        for (const l of materialLinks) {
            if (l.hasTax && l.quantityOnReceipt != null && l.unitCostOnReceipt != null && l.taxRate != null) {
                sum += l.quantityOnReceipt * l.unitCostOnReceipt * l.taxRate / 100;
            }
        }
        return materialLinks.some(l => l.hasTax != null) ? Math.round(sum * 100) / 100 : null;
    })();

    const attachment = await prisma.serviceOrderAttachment.create({
        data: {
            serviceOrderId: orderId,
            materialItemId: null, // Legacy FK kept null — use junction table
            type: type as "BEFORE_PHOTO" | "AFTER_PHOTO" | "RECEIPT" | "RETURN_RECEIPT" | "INVOICE_DOC" | "OTHER",
            filename: file.name.slice(0, 255),
            filepath: relPath,
            mime: file.type,
            sizeBytes: file.size,
            caption,
            vendorName: vendorName?.slice(0, 200) || null,
            receiptTotal: receiptTotal && !isNaN(receiptTotal) ? receiptTotal : null,
            taxAmount,
            uploadedBy: parseInt(user.id as string),
            // Create junction records inline
            materialItems: materialLinks.length > 0
                ? {
                    createMany: {
                        data: materialLinks.map((l) => ({
                            materialItemId: l.materialItemId,
                            quantityOnReceipt: (l.quantityOnReceipt != null && !isNaN(l.quantityOnReceipt)) ? l.quantityOnReceipt : null,
                            unitCostOnReceipt: (l.unitCostOnReceipt != null && !isNaN(l.unitCostOnReceipt)) ? l.unitCostOnReceipt : null,
                            hasTax: l.hasTax ?? null,
                            taxRate: (l.taxRate != null && !isNaN(l.taxRate)) ? l.taxRate : null,
                        })),
                    },
                }
                : undefined,
        },
        select: {
            id: true,
            type: true,
            filename: true,
            filepath: true,
            mime: true,
            sizeBytes: true,
            caption: true,
            vendorName: true,
            receiptTotal: true,
            taxAmount: true,
            materialItemId: true,
            createdAt: true,
            UploadedBy: { select: { id: true, nomeCompleto: true } },
            materialItems: {
                select: {
                    materialItemId: true,
                    quantityOnReceipt: true,
                    unitCostOnReceipt: true,
                    hasTax: true,
                    taxRate: true,
                    materialItem: {
                        select: { id: true, name: true, unit: true },
                    },
                },
            },
        },
    });

    return NextResponse.json({ data: attachment, success: true }, { status: 201 });
});
