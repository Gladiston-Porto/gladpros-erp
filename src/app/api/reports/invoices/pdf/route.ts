import { NextRequest, NextResponse } from 'next/server';
import { generateReportPDFFromHTML } from '@/shared/lib/services/report-pdf-html';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';

/**
 * GET /api/reports/invoices/pdf - Generate and download invoice report as PDF
 *
 * Uses Playwright to render the print page (/reports/invoices)
 * in a headless browser, generating a PDF identical to the screen layout.
 *
 * Forwards all query params (filters) to the print page.
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireUser(request);

  const proto = request.headers.get('x-forwarded-proto') ?? 'http';
  const host = request.headers.get('host') ?? 'localhost:3000';
  const baseUrl = `${proto}://${host}`;

  const cookie = request.headers.get('cookie') ?? undefined;

  // Forward all search params (status, dataInicio, dataFim, clienteId, etc.)
  const queryString = request.nextUrl.searchParams.toString();

  const pdfBuffer = await generateReportPDFFromHTML({
    printPath: '/reports/invoices',
    baseUrl,
    queryString: queryString || undefined,
    cookie,
  });

  const now = new Date();
  const filename = `Invoice-Report-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`;

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdfBuffer.length),
      'Cache-Control': 'no-cache',
    },
  });
});
