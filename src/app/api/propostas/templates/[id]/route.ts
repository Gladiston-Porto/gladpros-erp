import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'propostas', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const { id } = await params;
  const template = await prisma.propostaTemplate.findFirst({
    where: { id: parseInt(id), empresaId: user.empresaId, deletedAt: null },
  });
  if (!template) {
    return NextResponse.json({ error: 'Template não encontrado', message: 'Template não encontrado', success: false }, { status: 404 });
  }
  return NextResponse.json({ data: template, success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'propostas', 'update')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const { id } = await params;
  await prisma.propostaTemplate.update({
    where: { id: parseInt(id), empresaId: user.empresaId },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ data: { deleted: true }, success: true });
}
