// src/app/api/rh/time-entries/current/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/shared/lib/rbac";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api/error-handler";

export const runtime = "nodejs";

/**
 * GET /api/rh/time-entries/current
 *
 * Retorna o turno OPEN do usuário atual (ou workerId via query param para ADMIN/GERENTE).
 * Retorna null se nenhum turno aberto.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser(req);

  const url = new URL(req.url);
  const workerIdParam = url.searchParams.get("workerId");

  let workerId: number | null = null;

  if (workerIdParam) {
    // Apenas ADMIN/GERENTE podem consultar turno de outro worker
    if (user.role !== "ADMIN" && user.role !== "GERENTE") {
      return NextResponse.json(
        { error: "Forbidden", message: "Sem permissão para consultar ponto de outro worker", success: false },
        { status: 403 }
      );
    }
    workerId = Number(workerIdParam);
    if (isNaN(workerId) || workerId <= 0) {
      return NextResponse.json({ error: "Bad request", message: "workerId inválido", success: false }, { status: 400 });
    }
  } else {
    // Buscar o Worker vinculado ao usuário logado
    const worker = await prisma.worker.findUnique({
      where: { usuarioId: Number(user.id) },
      select: { id: true },
    });

    if (!worker) {
      // Usuário não tem Worker vinculado — retorna null sem erro
      return NextResponse.json({ data: null, success: true }, { status: 200 });
    }
    workerId = worker.id;
  }

  const entry = await prisma.timeEntry.findFirst({
    where: { workerId, status: "OPEN" },
    include: {
      activities: true,
      worker: { select: { id: true, name: true, compensationModel: true } },
    },
    orderBy: { clockIn: "desc" },
  });

  if (!entry) {
    return NextResponse.json({ data: null, success: true }, { status: 200 });
  }

  // Calcular tempo decorrido até agora
  const minutosDecorridos = Math.round((Date.now() - entry.clockIn.getTime()) / 60000);

  return NextResponse.json(
    {
      data: {
        ...entry,
        elapsed: {
          minutes: minutosDecorridos,
          hours: (minutosDecorridos / 60).toFixed(2),
          isOvertime: minutosDecorridos > 480,
        },
      },
      success: true,
    },
    { status: 200 }
  );
});
