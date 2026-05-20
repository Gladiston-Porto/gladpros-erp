// src/app/api/usuarios/delegacoes/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { withErrorHandler } from "@/lib/api/error-handler";
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import { UserRole } from "@/shared/lib/user-hierarchy";
import { AuditLogger } from "@/shared/lib/audit";

const criarDelegacaoSchema = z.object({
  delegatarioId: z.number().int().positive(),
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime(),
  motivo: z.string().max(500).optional(),
});

/* GET /api/usuarios/delegacoes — lista delegações (ADMIN vê todas; GERENTE vê as próprias) */
export const GET = withErrorHandler(async (req: Request) => {
  const authUser = await requireUser(req);

  if (!can(authUser.role as Role, "usuarios", "read")) {
    return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 });
  }

  const isAdmin = authUser.role === UserRole.ADMIN;
  const where = isAdmin ? {} : { deleganteId: Number(authUser.id) };

  const delegacoes = await prisma.delegacao.findMany({
    where,
    include: {
      delegante: { select: { id: true, nomeCompleto: true, email: true, nivel: true } },
      delegatario: { select: { id: true, nomeCompleto: true, email: true, nivel: true } },
    },
    orderBy: { criadoEm: "desc" },
    take: 50,
  });

  return NextResponse.json({ data: delegacoes, success: true });
});

/* POST /api/usuarios/delegacoes — criar delegação (apenas GERENTE ou ADMIN) */
export const POST = withErrorHandler(async (req: Request) => {
  const authUser = await requireUser(req);

  // BUG-07 fix: Only ADMIN can create delegations.
  // GERENTE has no 'usuarios' permission per rbac-core.ts matrix — removing the GERENTE exception.
  if (!can(authUser.role as Role, 'usuarios', 'read')) {
    return NextResponse.json(
      { error: "Forbidden", message: "Apenas ADMIN pode criar delegações.", success: false },
      { status: 403 }
    );
  }

  const body = criarDelegacaoSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json(
      { error: "Dados inválidos", message: body.error.issues[0]?.message ?? "Verifique os campos.", success: false },
      { status: 400 }
    );
  }

  const { delegatarioId, dataInicio, dataFim, motivo } = body.data;
  const deleganteId = Number(authUser.id);
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);

  if (fim <= inicio) {
    return NextResponse.json(
      { error: "Data de fim deve ser posterior à data de início.", success: false },
      { status: 400 }
    );
  }
  if (fim <= new Date()) {
    return NextResponse.json(
      { error: "Data de fim deve ser no futuro.", success: false },
      { status: 400 }
    );
  }
  if (delegatarioId === deleganteId) {
    return NextResponse.json(
      { error: "Não é possível delegar para si mesmo.", success: false },
      { status: 400 }
    );
  }

  // Verificar se delegatário existe e é ADMIN ou GERENTE
  const delegatario = await prisma.usuario.findUnique({
    where: { id: delegatarioId },
    select: { id: true, nivel: true, status: true, nomeCompleto: true },
  });

  if (!delegatario || delegatario.status !== "ATIVO") {
    return NextResponse.json(
      { error: "Usuário delegatário não encontrado ou inativo.", success: false },
      { status: 404 }
    );
  }

  const nivelDelegatario = String(delegatario.nivel).toUpperCase();
  if (nivelDelegatario !== UserRole.ADMIN && nivelDelegatario !== UserRole.GERENTE) {
    return NextResponse.json(
      { error: "Delegatário deve ser ADMIN ou GERENTE.", success: false },
      { status: 400 }
    );
  }

  // Impedir delegação ativa duplicada para o mesmo delegante
  const delegacaoAtiva = await prisma.delegacao.findFirst({
    where: { deleganteId, ativa: true, dataFim: { gt: new Date() } },
  });

  if (delegacaoAtiva) {
    return NextResponse.json(
      { error: "Já existe uma delegação ativa para este usuário. Cancele a anterior antes de criar uma nova.", success: false },
      { status: 409 }
    );
  }

  const delegacao = await prisma.delegacao.create({
    data: {
      deleganteId,
      delegatarioId,
      dataInicio: inicio,
      dataFim: fim,
      motivo: motivo ?? null,
      ativa: true,
    },
    include: {
      delegante: { select: { id: true, nomeCompleto: true, email: true } },
      delegatario: { select: { id: true, nomeCompleto: true, email: true } },
    },
  });

  // Auditoria — criação de delegação é operação crítica de segurança
  try {
    await AuditLogger.log({
      userId: Number(authUser.id),
      userEmail: authUser.email,
      action: "CREATE_DELEGACAO",
      resource: "Delegacao",
      resourceId: String(delegacao.id),
      details: {
        deleganteId,
        delegatarioId,
        delegatarioEmail: delegacao.delegatario.email,
        dataInicio: inicio.toISOString(),
        dataFim: fim.toISOString(),
        motivo: motivo ?? null,
      },
      status: "SUCCESS",
    });
  } catch {
    // auditoria não deve quebrar o fluxo
  }

  return NextResponse.json({ data: delegacao, success: true }, { status: 201 });
});
