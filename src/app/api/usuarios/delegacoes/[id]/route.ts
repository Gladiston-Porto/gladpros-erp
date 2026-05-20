// src/app/api/usuarios/delegacoes/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api/error-handler";
import { requireUser } from "@/shared/lib/rbac";
import { UserRole } from "@/shared/lib/user-hierarchy";
import { AuditLogger } from "@/shared/lib/audit";

/* PATCH /api/usuarios/delegacoes/:id — cancelar delegação */
export const PATCH = withErrorHandler(async (req: Request, context: unknown) => {
  const authUser = await requireUser(req);
  const params = await (context as { params: Promise<{ id: string }> }).params;
  const id = Number(params.id);

  if (!id) {
    return NextResponse.json({ error: "ID inválido.", success: false }, { status: 400 });
  }

  const delegacao = await prisma.delegacao.findUnique({
    where: { id },
    select: { id: true, deleganteId: true, delegatarioId: true, ativa: true },
  });

  if (!delegacao) {
    return NextResponse.json({ error: "Delegação não encontrada.", success: false }, { status: 404 });
  }

  if (!delegacao.ativa) {
    return NextResponse.json({ error: "Delegação já está cancelada.", success: false }, { status: 409 });
  }

  const userId = Number(authUser.id);
  const isAdmin = authUser.role === UserRole.ADMIN;
  const isDelegante = delegacao.deleganteId === userId;

  // Apenas o próprio delegante ou um ADMIN pode cancelar
  if (!isAdmin && !isDelegante) {
    return NextResponse.json(
      { error: "Apenas o delegante ou um ADMIN pode cancelar esta delegação.", success: false },
      { status: 403 }
    );
  }

  const cancelada = await prisma.delegacao.update({
    where: { id },
    data: {
      ativa: false,
      canceladaEm: new Date(),
      canceladaPorId: userId,
    },
    include: {
      delegante: { select: { id: true, nomeCompleto: true, email: true } },
      delegatario: { select: { id: true, nomeCompleto: true, email: true } },
    },
  });

  // Auditoria — cancelamento de delegação é operação crítica de segurança
  try {
    await AuditLogger.log({
      userId: Number(authUser.id),
      userEmail: authUser.email,
      action: "CANCEL_DELEGACAO",
      resource: "Delegacao",
      resourceId: String(id),
      details: {
        deleganteId: cancelada.delegante.id,
        deleganteEmail: cancelada.delegante.email,
        delegatarioId: cancelada.delegatario.id,
        delegatarioEmail: cancelada.delegatario.email,
        canceladoPor: userId,
      },
      status: "SUCCESS",
    });
  } catch {
    // auditoria não deve quebrar o fluxo
  }

  return NextResponse.json({ data: cancelada, success: true });
});

/* GET /api/usuarios/delegacoes/:id — detalhe de uma delegação */
export const GET = withErrorHandler(async (req: Request, context: unknown) => {
  const authUser = await requireUser(req);
  const params = await (context as { params: Promise<{ id: string }> }).params;
  const id = Number(params.id);

  if (!id) {
    return NextResponse.json({ error: "ID inválido.", success: false }, { status: 400 });
  }

  const delegacao = await prisma.delegacao.findUnique({
    where: { id },
    include: {
      delegante: { select: { id: true, nomeCompleto: true, email: true, nivel: true } },
      delegatario: { select: { id: true, nomeCompleto: true, email: true, nivel: true } },
      canceladaPor: { select: { id: true, nomeCompleto: true, email: true } },
    },
  });

  if (!delegacao) {
    return NextResponse.json({ error: "Delegação não encontrada.", success: false }, { status: 404 });
  }

  const userId = Number(authUser.id);
  const isAdmin = authUser.role === UserRole.ADMIN;
  const isParticipante = delegacao.deleganteId === userId || delegacao.delegatarioId === userId;

  if (!isAdmin && !isParticipante) {
    return NextResponse.json({ error: "Forbidden.", success: false }, { status: 403 });
  }

  return NextResponse.json({ data: delegacao, success: true });
});
