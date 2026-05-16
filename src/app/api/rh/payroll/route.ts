// src/app/api/rh/payroll/route.ts
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

/**
 * GET /api/rh/payroll
 * List payroll periods (paginated). ADMIN, GERENTE, FINANCEIRO only.
 */
export async function GET(request: NextRequest) {
  const user = await requireUser(request)

  if (!can(user.role as Role, "rh", "read")) {
    return NextResponse.json(
      { error: "Forbidden", message: "Sem permissão para acessar payroll", success: false },
      { status: 403 }
    )
  }

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1))
  const pageSize = Math.min(50, Math.max(5, Number(url.searchParams.get("pageSize") ?? 20)))
  const skip = (page - 1) * pageSize

  const where = { empresaId: user.empresaId }

  const [total, periods] = await Promise.all([
    prisma.payrollPeriod.count({ where }),
    prisma.payrollPeriod.findMany({
      where,
      orderBy: { startDate: "desc" },
      take: pageSize,
      skip,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
        closedAt: true,
        notes: true,
        createdAt: true,
        closedBy: { select: { nomeCompleto: true } },
        _count: { select: { entries: true } },
      },
    }),
  ])

  return NextResponse.json({
    data: periods,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    success: true,
  })
}

const createPeriodSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
  notes: z.string().optional(),
})

/**
 * POST /api/rh/payroll
 * Create a new payroll period. ADMIN only.
 */
export async function POST(request: NextRequest) {
  const user = await requireUser(request)

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden", message: "Apenas ADMIN pode criar períodos de payroll", success: false },
      { status: 403 }
    )
  }

  const body = createPeriodSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json(
      { error: "Validation failed", message: body.error.issues[0]?.message ?? "Dados inválidos", success: false },
      { status: 400 }
    )
  }

  const { startDate, endDate, notes } = body.data
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (end <= start) {
    return NextResponse.json(
      { error: "Validation failed", message: "endDate deve ser após startDate", success: false },
      { status: 400 }
    )
  }

  // Check for overlapping open periods
  const overlap = await prisma.payrollPeriod.findFirst({
    where: {
      empresaId: user.empresaId,
      status: "OPEN",
      startDate: { lte: end },
      endDate: { gte: start },
    },
    select: { id: true },
  })

  if (overlap) {
    return NextResponse.json(
      { error: "Conflict", message: "Já existe um período aberto que sobrepõe esse intervalo", success: false },
      { status: 409 }
    )
  }

  const period = await prisma.payrollPeriod.create({
    data: {
      empresaId: user.empresaId,
      startDate: start,
      endDate: end,
      notes,
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      status: true,
      notes: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ data: period, success: true }, { status: 201 })
}
