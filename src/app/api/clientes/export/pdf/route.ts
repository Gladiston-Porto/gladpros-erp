import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateReportPDFFromHTML } from '@/shared/lib/services/report-pdf-html';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireClientePermission } from '@/shared/lib/rbac';
import { apiRateLimit } from '@/shared/lib/rate-limit';
import { AuditService } from '@/shared/lib/audit';

const exportBodySchema = z.object({
  filters: z.record(z.string(), z.unknown()).optional(),
  selectedIds: z.array(z.number().int().positive()).max(500).optional(),
  filename: z.string().max(100).optional(),
});

const exportFiltersSchema = z.object({
  q: z.string().optional(),
  tipo: z.string().optional().default(''),
  ativo: z.union([z.string(), z.literal('all')]).optional().default('all'),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressCounty: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(2000).optional().default(12),
  sortKey: z.enum(['nome', 'tipo', 'email', 'telefone', 'documento', 'cidadeEstado', 'status', 'criadoEm']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

/**
 * POST /api/clientes/export/pdf
 *
 * Generates a professional PDF report of clients by rendering
 * the print page (/reports/clients) via Playwright headless browser.
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const rateLimitResult = await apiRateLimit.isAllowed(request, 'clientes:export:pdf');
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', message: rateLimitResult.message ?? 'Muitas requisições', success: false },
      { status: 429 }
    );
  }

  const user = await requireClientePermission(request, 'canRead');

  const rawBody = await request.json().catch(() => ({}));
  const { filters: rawFilters, selectedIds, filename: rawFilename } = exportBodySchema.parse(rawBody);
  const filters = rawFilters ? exportFiltersSchema.partial().parse(rawFilters) : {};

  const filename = rawFilename
    ? rawFilename.replace(/[^\w\-_.]/g, '_').replace(/\.{2,}/g, '_').substring(0, 100)
    : 'clientes';

  // Build query string from filters to pass to the print page
  const params = new URLSearchParams();
  if (filters) {
    if (filters.q) params.set('search', String(filters.q));
    if (filters.tipo && filters.tipo !== 'all') params.set('tipo', String(filters.tipo));
    if (filters.ativo !== undefined && filters.ativo !== 'all') {
      const isAtivo = String(filters.ativo) === 'true';
      params.set('status', isAtivo ? 'ATIVO' : 'INATIVO');
    }
    if (filters.addressCity) params.set('addressCity', String(filters.addressCity));
    if (filters.addressState) params.set('addressState', String(filters.addressState));
    if (filters.addressCounty) params.set('addressCounty', String(filters.addressCounty));
  }
  if (selectedIds && selectedIds.length > 0) {
    params.set('selectedIds', selectedIds.join(','));
  }

  const baseUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const authToken = request.cookies.get('authToken')?.value;
  const cookie = authToken ? `authToken=${authToken}` : undefined;

  const pdfBuffer = await generateReportPDFFromHTML({
    printPath: '/reports/clients',
    baseUrl,
    queryString: params.toString() || undefined,
    cookie,
  });

  // Auditoria de exportação
  AuditService.logAction(
    Number(user.id),
    'Cliente',
    0,
    'EXPORT_PDF',
    { filters: rawFilters ?? {}, selectedIds: selectedIds ?? [] }
  ).catch((err) => console.error('[clientes/export/pdf] AuditLog error:', err));

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
