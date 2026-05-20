import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateReportPDFFromHTML } from '@/shared/lib/services/report-pdf-html';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { apiRateLimit } from '@/shared/lib/rate-limit';

const FiltersSchema = z.object({
  q: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
}).optional();

const exportBodySchema = z.object({
  filters: FiltersSchema,
  ids: z.array(z.number().int().positive()).max(500).optional(),
  filename: z.string().max(100).optional(),
});

/**
 * POST /api/usuarios/export/pdf
 *
 * Generates a professional PDF report of users by rendering
 * the print page (/reports/users) via Playwright headless browser.
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const authUser = await requireUser(request);
  const rateCheck = await apiRateLimit.isAllowed(request);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too Many Requests', message: rateCheck.message, success: false },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)) } }
    );
  }
  if (!can(authUser.role as Role, 'usuarios', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Acesso negado', success: false }, { status: 403 });
  }

  const raw = await request.json().catch(() => ({}));
  const { filters, ids, filename: rawFilename } = exportBodySchema.parse(raw);

  const filename = rawFilename
    ? rawFilename.replace(/[^\w\-_.]/g, '_').substring(0, 100)
    : 'usuarios';

  // Build query string from filters/ids to pass to the print page
  const params = new URLSearchParams();
  if (ids && ids.length > 0) {
    params.set('ids', ids.join(','));
  } else if (filters) {
    if (filters.q) params.set('search', filters.q);
    if (filters.role && filters.role.trim()) params.set('role', filters.role);
    if (filters.status && filters.status.trim()) {
      if (filters.status === 'true') params.set('status', 'ATIVO');
      else if (filters.status === 'false') params.set('status', 'INATIVO');
      else params.set('status', filters.status);
    }
  }

  const baseUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: 'Configuration error', message: 'APP_URL não configurado', success: false },
      { status: 500 }
    );
  }
  const authToken = request.cookies.get('authToken')?.value;
  const cookie = authToken ? `authToken=${authToken}` : undefined;

  const pdfBuffer = await generateReportPDFFromHTML({
    printPath: '/reports/users',
    baseUrl,
    queryString: params.toString() || undefined,
    cookie,
  });

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
      'Cache-Control': 'no-cache',
    },
  });
});
