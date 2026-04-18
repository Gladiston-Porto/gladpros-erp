import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';

/**
 * GET /api/documents - Listar documentos reais (anexos de propostas e projetos)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireUser(request);

  // Fetch real document attachments from proposal and project tables
  const [propostaAnexos, projetoAnexos] = await Promise.all([
    prisma.anexoProposta.findMany({
      orderBy: { criadoEm: 'desc' },
      take: 50,
      include: {
        Proposta: { select: { numeroProposta: true } },
      },
    }),
    prisma.projetoAnexo.findMany({
      orderBy: { criadoEm: 'desc' },
      take: 50,
      include: {
        Projeto: { select: { numeroProjeto: true, titulo: true } },
      },
    }),
  ]);

  const documents = [
    ...propostaAnexos.map((a) => ({
      id: `prop-${a.id}`,
      name: a.filename,
      type: a.mime ?? 'application/octet-stream',
      size: 0,
      uploadedAt: a.criadoEm.toISOString(),
      category: 'propostas',
      reference: a.Proposta?.numeroProposta ?? '',
      status: 'active' as const,
    })),
    ...projetoAnexos.map((a) => ({
      id: `proj-${a.id}`,
      name: a.rotulo ?? a.arquivoUrl,
      type: 'application/octet-stream',
      size: 0,
      uploadedAt: a.criadoEm.toISOString(),
      category: 'projetos',
      reference: a.Projeto?.titulo ?? a.Projeto?.numeroProjeto ?? '',
      status: 'active' as const,
    })),
  ].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  return NextResponse.json({ documents, total: documents.length });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireUser(request);
  return NextResponse.json(
    { error: 'Upload de documentos deve ser feito via formulários de Proposta ou Projeto' },
    { status: 501 }
  );
});
