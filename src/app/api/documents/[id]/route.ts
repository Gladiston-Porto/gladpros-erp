import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';

// IDs seguem o formato: prop-{numericId} ou proj-{numericId}
function parseDocumentId(id: string): { type: 'proposta' | 'projeto'; numericId: number } | null {
  if (id.startsWith('prop-')) {
    const num = parseInt(id.slice(5), 10);
    return isNaN(num) ? null : { type: 'proposta', numericId: num };
  }
  if (id.startsWith('proj-')) {
    const num = parseInt(id.slice(5), 10);
    return isNaN(num) ? null : { type: 'projeto', numericId: num };
  }
  return null;
}

export const GET = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) => {
  await requireUser(request);
  const { id } = await params;

  const parsed = parseDocumentId(id);
  if (!parsed) {
    return NextResponse.json({ error: 'ID de documento inválido', success: false }, { status: 400 });
  }

  if (parsed.type === 'proposta') {
    const anexo = await prisma.anexoProposta.findUnique({
      where: { id: parsed.numericId },
      include: { Proposta: { select: { numeroProposta: true } } },
    });
    if (!anexo) return NextResponse.json({ error: 'Documento não encontrado', success: false }, { status: 404 });
    return NextResponse.json({
      id,
      name: anexo.filename,
      type: anexo.mime ?? 'application/octet-stream',
      uploadedAt: anexo.criadoEm.toISOString(),
      category: 'propostas',
      reference: anexo.Proposta?.numeroProposta ?? '',
      status: 'active',
      success: true,
    });
  }

  const anexo = await prisma.projetoAnexo.findUnique({
    where: { id: parsed.numericId },
    include: { Projeto: { select: { titulo: true, numeroProjeto: true } } },
  });
  if (!anexo) return NextResponse.json({ error: 'Documento não encontrado', success: false }, { status: 404 });
  return NextResponse.json({
    id,
    name: anexo.rotulo ?? anexo.arquivoUrl.split('/').pop() ?? 'documento',
    type: 'application/octet-stream',
    uploadedAt: anexo.criadoEm.toISOString(),
    category: 'projetos',
    reference: anexo.Projeto?.titulo ?? anexo.Projeto?.numeroProjeto ?? '',
    status: 'active',
    success: true,
  });
});

export const PUT = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) => {
  await requireUser(request);
  const { id } = await params;
  const body = await request.json();

  const parsed = parseDocumentId(id);
  if (!parsed) {
    return NextResponse.json({ error: 'ID de documento inválido', success: false }, { status: 400 });
  }

  if (parsed.type === 'projeto' && body.name) {
    const updated = await prisma.projetoAnexo.update({
      where: { id: parsed.numericId },
      data: { rotulo: body.name },
    });
    return NextResponse.json({ id, name: updated.rotulo, success: true });
  }

  // AnexoProposta não tem campo de rótulo editável — operação não suportada
  return NextResponse.json(
    { error: 'Edição não suportada para este tipo de documento', success: false },
    { status: 501 }
  );
});

export const DELETE = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) => {
  await requireUser(request);
  const { id } = await params;

  const parsed = parseDocumentId(id);
  if (!parsed) {
    return NextResponse.json({ error: 'ID de documento inválido', success: false }, { status: 400 });
  }

  if (parsed.type === 'proposta') {
    await prisma.anexoProposta.delete({ where: { id: parsed.numericId } });
  } else {
    await prisma.projetoAnexo.delete({ where: { id: parsed.numericId } });
  }

  return NextResponse.json({ message: 'Documento removido com sucesso', id, success: true });
});
