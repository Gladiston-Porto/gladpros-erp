import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { checkRateLimit } from "@/domains/portal/security/rate-limit";
import { getClientIp } from "@/domains/portal/security/get-client-ip";
import { hashPortalAccessToken } from "@/domains/projects/services/portal-token";
import { PortalCloseoutService } from "@/domains/portal/services/PortalCloseoutService";
import { PortalCloseoutStorageService } from "@/domains/portal/services/PortalCloseoutStorageService";

export const dynamic = "force-dynamic";

const PORTAL_CLOSEOUT_PDF_RATE_LIMIT = {
  limit: 10,
  windowMs: 60_000,
} as const;

function notFoundResponse() {
  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

function checkPortalCloseoutPdfRateLimit(token: string, ip: string): boolean {
  const ipLimit = checkRateLimit(`portal:closeoutpdf:ip:${ip}`, PORTAL_CLOSEOUT_PDF_RATE_LIMIT);
  if (!ipLimit.allowed) {
    return false;
  }

  const tokenHashPrefix = hashPortalAccessToken(token).slice(0, 12);
  const ipTokenLimit = checkRateLimit(
    `portal:closeoutpdf:iptoken:${ip}:${tokenHashPrefix}`,
    PORTAL_CLOSEOUT_PDF_RATE_LIMIT
  );

  return ipTokenLimit.allowed;
}

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  noStore();

  try {
    const [{ token }, headerStore] = await Promise.all([context.params, headers()]);
    const ip = getClientIp(headerStore);

    if (!checkPortalCloseoutPdfRateLimit(token, ip)) {
      return notFoundResponse();
    }

    const service = new PortalCloseoutService();
    const downloadMeta = await service.getDownloadMetaByToken(token);

    if (!downloadMeta) {
      return notFoundResponse();
    }

    const storageService = new PortalCloseoutStorageService();
    const fileBuffer = await storageService.getFileBuffer(downloadMeta.documentUrl);

    if (!fileBuffer) {
      return notFoundResponse();
    }

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="closeout-package.pdf"',
        "Content-Length": String(fileBuffer.byteLength),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return notFoundResponse();
  }
}
