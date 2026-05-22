import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateInvoicePDFFromHTML } from '@/shared/lib/services/invoice-pdf-html';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser, can, type Role } from '@/shared/lib/rbac';

function canReadInternalInvoices(role: Role) {
  return role === 'ADMIN' || role === 'GERENTE' || role === 'FINANCEIRO';
}

function getSafePdfBaseUrl() {
  if (!process.env.APP_URL) {
    throw new Error('APP_URL is required for secure invoice PDF generation');
  }

  const url = new URL(process.env.APP_URL);
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('APP_URL must use HTTPS in production for invoice PDF generation');
  }

  return url.origin;
}

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
  const user = await requireUser(request);
  const role = user.role as Role;
  if (!can(role, 'invoices', 'read') || !canReadInternalInvoices(role)) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão', success: false },
      { status: 403 },
    );
  }

  const { id } = await params;
  const invoiceId = parseInt(id);

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, empresaId: user.empresaId },
    select: { id: true, numeroInvoice: true },
  });

  if (!invoice) {
    return NextResponse.json(
      { error: 'Not found', message: 'Invoice não encontrada', success: false },
      { status: 404 },
    );
  }

  const baseUrl = getSafePdfBaseUrl();

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
