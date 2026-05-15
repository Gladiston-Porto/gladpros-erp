// src/app/api/rh/time-entries/clock-in/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/shared/lib/rbac";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api/error-handler";

export const runtime = "nodejs";

const ClockInSchema = z.object({
  workerId: z.number().int().positive(),
  workLocation: z.enum(["OFFICE", "REMOTE", "PROJECT_SITE", "CLIENT_SITE", "IN_TRANSIT"]),
  // Pelo menos uma atividade inicial obrigatória
  activityType: z.enum([
    "PROJECT_MANAGEMENT",
    "FIELD_WORK",
    "ADMINISTRATIVE",
    "FINANCIAL",
    "INVENTORY",
    "MEETING",
    "TRAINING",
    "TRAVEL",
    "SUPERVISION",
    "OTHER",
  ]),
  projetoId: z.number().int().positive().optional(),
  serviceOrderId: z.number().int().positive().optional(),
  description: z.string().max(500).optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/rh/time-entries/clock-in
 *
 * Registra entrada do turno de trabalho.
 * Qualquer usuário autenticado pode fazer clock-in para seu próprio Worker.
 * ADMIN e GERENTE podem fazer clock-in para qualquer Worker.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser(req);

  const body = ClockInSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "Validation failed", message: body.error.issues[0]?.message ?? "Dados inválidos", success: false },
      { status: 400 }
    );
  }

  const { workerId, workLocation, activityType, projetoId, serviceOrderId, description, notes } = body.data;

  // Verificar se o worker existe
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    select: { id: true, usuarioId: true, name: true, status: true },
  });

  if (!worker) {
    return NextResponse.json({ error: "Not found", message: "Worker não encontrado", success: false }, { status: 404 });
  }

  if (worker.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Forbidden", message: "Worker inativo não pode registrar ponto", success: false },
      { status: 403 }
    );
  }

  // Controle de acesso: usuário comum só pode fazer clock-in para seu próprio worker
  const isAdminOrGerente = user.role === "ADMIN" || user.role === "GERENTE";
  if (!isAdminOrGerente && worker.usuarioId !== Number(user.id)) {
    return NextResponse.json(
      { error: "Forbidden", message: "Você só pode registrar ponto para si mesmo", success: false },
      { status: 403 }
    );
  }

  // Verificar se já tem um turno OPEN para este worker hoje
  const hoje = new Date();
  const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);

  const entradaAberta = await prisma.timeEntry.findFirst({
    where: {
      workerId,
      status: "OPEN",
    },
    select: { id: true, clockIn: true },
  });

  if (entradaAberta) {
    return NextResponse.json(
      {
        error: "Conflict",
        message: `Já existe um turno aberto desde ${entradaAberta.clockIn.toLocaleString("en-US", { timeZone: "America/Chicago" })}. Faça clock-out primeiro.`,
        success: false,
      },
      { status: 409 }
    );
  }

  // Validar vínculo com projeto (se informado)
  if (projetoId) {
    const projeto = await prisma.projeto.findUnique({ where: { id: projetoId }, select: { id: true } });
    if (!projeto) {
      return NextResponse.json({ error: "Not found", message: "Projeto não encontrado", success: false }, { status: 404 });
    }
  }

  // Validar vínculo com OS (se informado)
  if (serviceOrderId) {
    const os = await prisma.serviceOrder.findUnique({ where: { id: serviceOrderId }, select: { id: true } });
    if (!os) {
      return NextResponse.json({ error: "Not found", message: "Ordem de Serviço não encontrada", success: false }, { status: 404 });
    }
  }

  const agora = new Date();
  const workDate = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

  // Criar TimeEntry + primeira TimeEntryActivity atomicamente
  const timeEntry = await prisma.timeEntry.create({
    data: {
      workerId,
      clockIn: agora,
      workLocation,
      workDate,
      status: "OPEN",
      notes: notes ?? null,
      activities: {
        create: {
          activityType,
          durationMinutes: 0, // será atualizado no clock-out
          projetoId: projetoId ?? null,
          serviceOrderId: serviceOrderId ?? null,
          description: description ?? null,
        },
      },
    },
    include: {
      activities: true,
      worker: {
        select: { id: true, name: true, compensationModel: true },
      },
    },
  });

  return NextResponse.json({ data: timeEntry, success: true }, { status: 201 });
});
