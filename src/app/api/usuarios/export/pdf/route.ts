import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateReportPDFFromHTML } from '@/shared/lib/services/report-pdf-html';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';

const FiltersSchema = z.object({
  q: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
}).optional();

const exportBodySchema = z.object({
  filters: FiltersSchema,
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
  if (!['ADMIN', 'GERENTE'].includes(authUser.role)) {
    return NextResponse.json({ message: 'Acesso negado' }, { status: 403 });
  }

  const raw = await request.json().catch(() => ({}));
  const { filters, filename: rawFilename } = exportBodySchema.parse(raw);

  const filename = rawFilename
    ? rawFilename.replace(/[^\w\-_.]/g, '_').substring(0, 100)
    : 'usuarios';

  // Build query string from filters to pass to the print page
  const params = new URLSearchParams();
  if (filters) {
    if (filters.q) params.set('search', filters.q);
    if (filters.role && filters.role.trim()) params.set('role', filters.role);
    if (filters.status && filters.status.trim()) {
      // Handle both "ATIVO"/"INATIVO" and "true"/"false" formats
      if (filters.status === 'true') params.set('status', 'ATIVO');
      else if (filters.status === 'false') params.set('status', 'INATIVO');
      else params.set('status', filters.status);
    }
  }

  const proto = request.headers.get('x-forwarded-proto') ?? 'http';
  const host = request.headers.get('host') ?? 'localhost:3000';
  const baseUrl = `${proto}://${host}`;
  const cookie = request.headers.get('cookie') ?? undefined;

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
