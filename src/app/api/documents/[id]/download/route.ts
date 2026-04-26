import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { prisma } from '@/lib/prisma';

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
  const user = await requireUser(request);
  if (!can(user.role as Role, 'documents', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const { id } = await params;

  const parsed = parseDocumentId(id);
  if (!parsed) {
    return NextResponse.json({ error: 'ID de documento inválido', success: false }, { status: 400 });
  }

  let fileUrl: string | null = null;
  let fileName: string | null = null;

  if (parsed.type === 'proposta') {
    const anexo = await prisma.anexoProposta.findUnique({
      where: { id: parsed.numericId },
      select: { filename: true, filepath: true },
    });
    if (!anexo) return NextResponse.json({ error: 'Documento não encontrado', success: false }, { status: 404 });
    fileUrl = anexo.filepath;
    fileName = anexo.filename;
  } else {
    const anexo = await prisma.projetoAnexo.findUnique({
      where: { id: parsed.numericId },
      select: { arquivoUrl: true, rotulo: true },
    });
    if (!anexo) return NextResponse.json({ error: 'Documento não encontrado', success: false }, { status: 404 });
    fileUrl = anexo.arquivoUrl;
    fileName = anexo.rotulo ?? anexo.arquivoUrl.split('/').pop() ?? 'documento';
  }

  // Redireciona para a URL do arquivo (local /uploads/ ou storage externo)
  return NextResponse.json({
    id,
    name: fileName,
    url: fileUrl,
    success: true,
  });
});
