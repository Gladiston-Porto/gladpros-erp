// src/app/api/usuarios/delegacoes/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { UserRole } from '@/shared/lib/user-hierarchy';
import { AuditLogger } from '@/shared/lib/audit';

/* PATCH /api/usuarios/delegacoes/:id — cancelar delegação */
export const PATCH = withErrorHandler(async (req: Request, context: unknown) => {
  const authUser = await requireUser(req);

  // @bug:USUARIOS-P2-004 — RBAC obrigatório: apenas quem pode gerenciar usuarios pode cancelar
  if (!can(authUser.role as Role, 'usuarios', 'update')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão para gerenciar delegações.', success: false },
      { status: 403 },
    );
  }

  const params = await (context as { params: Promise<{ id: string }> }).params;
  const id = Number(params.id);

  if (!id) {
    return NextResponse.json({ error: 'ID inválido.', success: false }, { status: 400 });
  }

  const empresaId = Number(authUser.empresaId);

  // @bug:USUARIOS-P2-005 — empresaId no where para prevenir IDOR cross-tenant
  // findFirst garante que ambas as condições são aplicadas (findUnique ignora campos extras sem @@unique composto)
  const delegacao = await prisma.delegacao.findFirst({
    where: { id, empresaId },
    select: { id: true, deleganteId: true, delegatarioId: true, ativa: true },
  });

  if (!delegacao) {
    return NextResponse.json(
      { error: 'Delegação não encontrada.', success: false },
      { status: 404 },
    );
  }

  if (!delegacao.ativa) {
    return NextResponse.json(
      { error: 'Delegação já está cancelada.', success: false },
      { status: 409 },
    );
  }

  const userId = Number(authUser.id);
  const isAdmin = authUser.role === UserRole.ADMIN;
  const isDelegante = delegacao.deleganteId === userId;

  // Apenas o próprio delegante ou um ADMIN pode cancelar
  if (!isAdmin && !isDelegante) {
    return NextResponse.json(
      { error: 'Apenas o delegante ou um ADMIN pode cancelar esta delegação.', success: false },
      { status: 403 },
    );
  }

  // updateMany garante filtro por empresaId sem depender de @@unique composto
  const result = await prisma.delegacao.updateMany({
    where: { id, empresaId },
    data: {
      ativa: false,
      canceladaEm: new Date(),
      canceladaPorId: userId,
    },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: 'Delegação não encontrada ou já cancelada.', success: false },
      { status: 404 },
    );
  }

  // Buscar o registro atualizado com as relações para resposta e auditoria
  // updateMany já garantiu que o registro existe e pertence a esta empresa
  const cancelada = (await prisma.delegacao.findFirst({
    where: { id, empresaId },
    include: {
      delegante: { select: { id: true, nomeCompleto: true, email: true } },
      delegatario: { select: { id: true, nomeCompleto: true, email: true } },
    },
  }))!;

  // Auditoria — cancelamento de delegação é operação crítica de segurança
  try {
    await AuditLogger.log({
      userId: Number(authUser.id),
      userEmail: authUser.email,
      action: 'CANCEL_DELEGACAO',
      resource: 'Delegacao',
      resourceId: String(id),
      details: {
        deleganteId: cancelada.delegante.id,
        deleganteEmail: cancelada.delegante.email,
        delegatarioId: cancelada.delegatario.id,
        delegatarioEmail: cancelada.delegatario.email,
        canceladoPor: userId,
      },
      status: 'SUCCESS',
    });
  } catch {
    // auditoria não deve quebrar o fluxo
  }

  return NextResponse.json({ data: cancelada, success: true });
});

/* GET /api/usuarios/delegacoes/:id — detalhe de uma delegação */
export const GET = withErrorHandler(async (req: Request, context: unknown) => {
  const authUser = await requireUser(req);

  // @bug:USUARIOS-P2-004 — RBAC obrigatório: apenas quem lê usuarios pode consultar delegações
  if (!can(authUser.role as Role, 'usuarios', 'read')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão para consultar delegações.', success: false },
      { status: 403 },
    );
  }

  const params = await (context as { params: Promise<{ id: string }> }).params;
  const id = Number(params.id);

  if (!id) {
    return NextResponse.json({ error: 'ID inválido.', success: false }, { status: 400 });
  }

  // @bug:USUARIOS-P2-005 — empresaId no where para prevenir IDOR cross-tenant
  // findFirst garante que ambas as condições são aplicadas (findUnique ignora campos extras sem @@unique composto)
  const delegacao = await prisma.delegacao.findFirst({
    where: { id, empresaId: Number(authUser.empresaId) },
    include: {
      delegante: { select: { id: true, nomeCompleto: true, email: true, nivel: true } },
      delegatario: { select: { id: true, nomeCompleto: true, email: true, nivel: true } },
      canceladaPor: { select: { id: true, nomeCompleto: true, email: true } },
    },
  });

  if (!delegacao) {
    return NextResponse.json(
      { error: 'Delegação não encontrada.', success: false },
      { status: 404 },
    );
  }

  const userId = Number(authUser.id);
  const isAdmin = authUser.role === UserRole.ADMIN;
  const isParticipante = delegacao.deleganteId === userId || delegacao.delegatarioId === userId;

  if (!isAdmin && !isParticipante) {
    return NextResponse.json({ error: 'Forbidden.', success: false }, { status: 403 });
  }

  return NextResponse.json({ data: delegacao, success: true });
});
