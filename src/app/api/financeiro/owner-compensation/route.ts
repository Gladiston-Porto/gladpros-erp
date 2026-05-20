/**
 * GET  /api/financeiro/owner-compensation — List compensations (with filters)
 * POST /api/financeiro/owner-compensation — Create draw/salary/distribution
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import {
  createCompensation,
  listCompensations,
} from "@/shared/services/ownerCompensationService"
import { logger } from "@/lib/api/logger"

const createSchema = z.object({
  workerId: z.number().int().positive(),
  tipo: z.enum(["OWNER_DRAW", "SALARY", "DISTRIBUTION"]),
  valor: z.number().positive(),
  data: z.string().transform((s) => new Date(s)),
  descricao: z.string().optional(),
  referencia: z.string().optional(),
  bankAccountId: z.number().int().positive(),
})

const listQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  tipo: z.enum(["OWNER_DRAW", "SALARY", "DISTRIBUTION"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request)

    if (user.role !== "ADMIN" || !can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json(
        { error: "Forbidden", message: "Apenas ADMIN pode acessar compensação do proprietário", success: false },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const parsedQuery = listQuerySchema.safeParse({
      year: searchParams.get("year") ?? undefined,
      tipo: searchParams.get("tipo") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    })
    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: "Validation failed", message: parsedQuery.error.issues[0]?.message, success: false },
        { status: 400 }
      )
    }
    const { year, tipo, page, pageSize } = parsedQuery.data

    const result = await listCompensations({
      empresaId: user.empresaId,
      year,
      tipo: tipo || undefined,
      page,
      pageSize,
    })

    return NextResponse.json({
      data: result.items,
      pagination: result.pagination,
      success: true,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    logger.error("[Financeiro] GET /api/financeiro/owner-compensation", {}, error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request)

    // Owner compensation affects owner draws/salary/distributions and is ADMIN-only.
    if (user.role !== "ADMIN" || !can(user.role as Role, "financeiro", "create")) {
      return NextResponse.json(
        { error: "Forbidden", message: "Apenas ADMIN pode registrar compensação do proprietário", success: false },
        { status: 403 }
      )
    }

    const body = createSchema.safeParse(await request.json())
    if (!body.success) {
      return NextResponse.json(
        { error: "Validation failed", message: body.error.issues[0]?.message, success: false },
        { status: 400 }
      )
    }

     
    const result = await createCompensation({
       
      empresaId: user.empresaId,
      workerId: body.data.workerId,
      tipo: body.data.tipo,
      valor: body.data.valor,
      data: body.data.data,
      descricao: body.data.descricao,
      referencia: body.data.referencia,
      bankAccountId: body.data.bankAccountId,
      criadoPor: Number(user.id),
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, success: false },
        { status: 422 }
      )
    }

    return NextResponse.json({ data: result.data, success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    logger.error("[Financeiro] POST /api/financeiro/owner-compensation", {}, error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
