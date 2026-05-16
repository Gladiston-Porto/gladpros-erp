// src/app/api/rh/time-entries/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api/error-handler";

export const runtime = "nodejs";

/**
 * GET /api/rh/time-entries
 *
 * Lista registros de ponto.
 * - Usuário comum: vê apenas os próprios (via Worker vinculado)
 * - GERENTE: vê todos os workers
 * - ADMIN: vê todos os workers
 *
 * Query params:
 *   workerId    — filtrar por worker (ADMIN/GERENTE)
 *   status      — OPEN | SUBMITTED | APPROVED | REJECTED
 *   dateFrom    — data início (YYYY-MM-DD)
 *   dateTo      — data fim (YYYY-MM-DD)
 *   page        — paginação (default 1)
 *   pageSize    — itens por página (default 20, max 50)
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser(req);

  const canManageRH = can(user.role as Role, "rh", "read");
  if (!canManageRH) {
    // Não tem acesso ao módulo RH — só pode ver os próprios
    const ownWorker = await prisma.worker.findUnique({
      where: { usuarioId: Number(user.id) },
      select: { id: true },
    });
    if (!ownWorker) {
      return NextResponse.json(
        { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 }, success: true },
        { status: 200 }
      );
    }
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Math.max(5, Number(url.searchParams.get("pageSize") ?? 20)));
  const skip = (page - 1) * pageSize;

  const workerIdParam = url.searchParams.get("workerId");
  const statusParam = url.searchParams.get("status");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  // Determinar quais workers mostrar
  let workerIdFilter: number | undefined;

  if (workerIdParam) {
    if (!canManageRH) {
      return NextResponse.json(
        { error: "Forbidden", message: "Sem permissão para ver ponto de outros workers", success: false },
        { status: 403 }
      );
    }
    workerIdFilter = Number(workerIdParam);
  } else if (!canManageRH) {
    // Usuário sem acesso a RH vê apenas os próprios
    const ownWorker = await prisma.worker.findUnique({
      where: { usuarioId: Number(user.id) },
      select: { id: true },
    });
    workerIdFilter = ownWorker?.id;
  }

  // Construir filtro de data
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (dateFrom) dateFilter.gte = new Date(dateFrom);
  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    dateFilter.lte = to;
  }

  const where = {
    ...(workerIdFilter !== undefined ? { workerId: workerIdFilter } : {}),
    ...(statusParam
      ? statusParam.includes(',')
        ? { status: { in: statusParam.split(',') as ("OPEN" | "SUBMITTED" | "APPROVED" | "REJECTED" | "AUTO_CLOSED" | "CORRECTION_PENDING")[] } }
        : { status: statusParam as "OPEN" | "SUBMITTED" | "APPROVED" | "REJECTED" | "AUTO_CLOSED" | "CORRECTION_PENDING" }
      : {}),
    ...(Object.keys(dateFilter).length ? { workDate: dateFilter } : {}),
  };

  const [total, entries] = await Promise.all([
    prisma.timeEntry.count({ where }),
    prisma.timeEntry.findMany({
      where,
      include: {
        activities: true,
        worker: { select: { id: true, name: true, compensationModel: true, defaultHourlyRate: true } },
        approvedBy: { select: { id: true, nomeCompleto: true } },
      },
      orderBy: { clockIn: "desc" },
      take: pageSize,
      skip,
    }),
  ]);

  return NextResponse.json(
    {
      data: entries,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      success: true,
    },
    { status: 200 }
  );
});
