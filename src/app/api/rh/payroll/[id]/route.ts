// src/app/api/rh/payroll/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

/**
 * GET /api/rh/payroll/[id]
 * Get payroll period detail with all entries. ADMIN, GERENTE, FINANCEIRO only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request)

  if (!can(user.role as Role, "rh", "read")) {
    return NextResponse.json(
      { error: "Forbidden", message: "Sem permissão para acessar payroll", success: false },
      { status: 403 }
    )
  }

  const { id } = await params
  const periodId = Number(id)
  if (isNaN(periodId)) {
    return NextResponse.json(
      { error: "Bad Request", message: "ID inválido", success: false },
      { status: 400 }
    )
  }

  const period = await prisma.payrollPeriod.findFirst({
    where: { id: periodId, empresaId: user.empresaId },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      status: true,
      closedAt: true,
      notes: true,
      createdAt: true,
      closedBy: { select: { nomeCompleto: true } },
      entries: {
        orderBy: { worker: { name: "asc" } },
        select: {
          id: true,
          workerId: true,
          hourlyRate: true,
          regularMinutes: true,
          overtimeMinutes: true,
          regularPay: true,
          overtimePay: true,
          penaltyDeductions: true,
          grossPay: true,
          status: true,
          notes: true,
          worker: {
            select: {
              id: true,
              name: true,
              classification: true,
              compensationModel: true,
            },
          },
        },
      },
    },
  })

  if (!period) {
    return NextResponse.json(
      { error: "Not Found", message: "Período não encontrado", success: false },
      { status: 404 }
    )
  }

  return NextResponse.json({ data: period, success: true })
}

const patchSchema = z.object({
  action: z.literal("close"),
})

/**
 * PATCH /api/rh/payroll/[id]
 * Close a payroll period. ADMIN only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request)

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden", message: "Apenas ADMIN pode fechar períodos de payroll", success: false },
      { status: 403 }
    )
  }

  const { id } = await params
  const periodId = Number(id)
  if (isNaN(periodId)) {
    return NextResponse.json(
      { error: "Bad Request", message: "ID inválido", success: false },
      { status: 400 }
    )
  }

  const body = patchSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json(
      { error: "Validation failed", message: body.error.issues[0]?.message ?? "Dados inválidos", success: false },
      { status: 400 }
    )
  }

  const period = await prisma.payrollPeriod.findFirst({
    where: { id: periodId, empresaId: user.empresaId },
    select: { id: true, status: true },
  })

  if (!period) {
    return NextResponse.json(
      { error: "Not Found", message: "Período não encontrado", success: false },
      { status: 404 }
    )
  }

  if (period.status === "CLOSED") {
    return NextResponse.json(
      { error: "Conflict", message: "Período já está fechado", success: false },
      { status: 409 }
    )
  }

  const updated = await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      closedById: user.id,
    },
    select: {
      id: true,
      status: true,
      closedAt: true,
      closedBy: { select: { nomeCompleto: true } },
    },
  })

  return NextResponse.json({ data: updated, success: true })
}
