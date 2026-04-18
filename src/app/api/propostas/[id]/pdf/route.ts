import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePropostaPDFFromHTML } from '@/shared/lib/services/proposta-pdf-html';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

/**
 * GET /api/propostas/[id]/pdf — Gerar e baixar PDF da proposta
 *
 * Usa Playwright para renderizar a print page (/propostas/[id]/print)
 * em headless browser, gerando PDF idêntico ao layout da tela.
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser(request);

  if (!can(user.role as Role, 'propostas', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }

  const { id } = await params;
  const propostaId = parseInt(id, 10);

  if (isNaN(propostaId)) {
    return NextResponse.json({ error: 'Invalid ID', message: 'ID inválido', success: false }, { status: 400 });
  }

  const proposta = await prisma.proposta.findUnique({
    where: { id: propostaId },
    select: { id: true, numeroProposta: true },
  });

  if (!proposta) {
    return NextResponse.json({ error: 'Not found', message: 'Proposta não encontrada', success: false }, { status: 404 });
  }

  const proto = request.headers.get('x-forwarded-proto') ?? 'http';
  const host = request.headers.get('host') ?? 'localhost:3000';
  const baseUrl = `${proto}://${host}`;

  const cookie = request.headers.get('cookie') ?? undefined;

  const pdfBuffer = await generatePropostaPDFFromHTML({
    propostaId: proposta.id,
    baseUrl,
    cookie,
  });

  const filename = `${proposta.numeroProposta}.pdf`;

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
