import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateInvoicePDFFromHTML } from '@/shared/lib/services/invoice-pdf-html';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';

/**
 * GET /api/invoices/[id]/pdf - Gerar e baixar PDF da invoice
 *
 * Usa Playwright para renderizar a print page (/invoices/[id]/print)
 * em headless browser, gerando PDF idêntico ao layout da tela.
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireUser(request);
  const { id } = await params;
  const invoiceId = parseInt(id);

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, numeroInvoice: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice não encontrada' }, { status: 404 });
  }

  // Build base URL from the incoming request
  const proto = request.headers.get('x-forwarded-proto') ?? 'http';
  const host = request.headers.get('host') ?? 'localhost:3000';
  const baseUrl = `${proto}://${host}`;

  // Forward cookies so Playwright can access the auth-protected print page
  const cookie = request.headers.get('cookie') ?? undefined;

  const pdfBuffer = await generateInvoicePDFFromHTML({
    invoiceId: invoice.id,
    baseUrl,
    cookie,
  });

  const filename = `${invoice.numeroInvoice}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdfBuffer.length),
      'Cache-Control': 'no-cache',
    },
  });
});
