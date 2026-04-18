import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/domains/portal/security/rate-limit";
import { getClientIp } from "@/domains/portal/security/get-client-ip";
import { hashPortalAccessToken } from "@/domains/projects/services/portal-token";
import { PortalTokenService } from "@/domains/projects/services/PortalTokenService";
import { PortalInvoicePdfStorageService } from "@/domains/portal/services/PortalInvoicePdfStorageService";

export const dynamic = "force-dynamic";

const PORTAL_INVOICE_PDF_RATE_LIMIT = {
  limit: 10,
  windowMs: 60_000,
} as const;

function notFoundResponse() {
  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

function checkPortalInvoicePdfRateLimit(token: string, ip: string): boolean {
  const ipLimit = checkRateLimit(`portal:invpdf:ip:${ip}`, PORTAL_INVOICE_PDF_RATE_LIMIT);
  if (!ipLimit.allowed) {
    return false;
  }

  const tokenHashPrefix = hashPortalAccessToken(token).slice(0, 12);
  const ipTokenLimit = checkRateLimit(
    `portal:invpdf:iptoken:${ip}:${tokenHashPrefix}`,
    PORTAL_INVOICE_PDF_RATE_LIMIT
  );

  return ipTokenLimit.allowed;
}

function sanitizeFilename(fileName: string | null | undefined, invoiceId: number): string {
  const fallback = `invoice-${invoiceId}.pdf`;
  if (!fileName || typeof fileName !== "string") {
    return fallback;
  }

  const sanitized = fileName
    .trim()
    .replace(/[\r\n"\\/]/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 120);

  if (!sanitized) {
    return fallback;
  }

  return sanitized.toLowerCase().endsWith(".pdf") ? sanitized : `${sanitized}.pdf`;
}

type RouteContext = {
  params: Promise<{
    token: string;
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  noStore();

  try {
    const [{ token, id }, headerStore] = await Promise.all([context.params, headers()]);
    const ip = getClientIp(headerStore);

    if (!checkPortalInvoicePdfRateLimit(token, ip)) {
      return notFoundResponse();
    }

    const invoiceId = Number(id);
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return notFoundResponse();
    }

    const project = await new PortalTokenService().resolveSafeProjectByToken(token);
    if (!project) {
      return notFoundResponse();
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        projetoId: project.id,
      },
      select: {
        pdfStorageKey: true,
        pdfMimeType: true,
        pdfFileName: true,
        pdfSizeBytes: true,
        pdfGeneratedAt: true,
      },
    });

    if (!invoice?.pdfStorageKey) {
      return notFoundResponse();
    }

    const pdfBuffer = await new PortalInvoicePdfStorageService().getPdfBufferByStorageKey(invoice.pdfStorageKey);
    if (!pdfBuffer) {
      return notFoundResponse();
    }

    const contentType = invoice.pdfMimeType || "application/pdf";
    const fileName = sanitizeFilename(invoice.pdfFileName, invoiceId);

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(invoice.pdfSizeBytes ?? pdfBuffer.byteLength),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return notFoundResponse();
  }
}
