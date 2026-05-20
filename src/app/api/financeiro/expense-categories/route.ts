/**
 * GET /api/financeiro/expense-categories — List all with scheduleCLine mapping
 * POST /api/financeiro/expense-categories — Create expense category
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/api/logger"

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request)

    if (!can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get("page") ?? "1")
    const pageSize = Math.min(Number(searchParams.get("pageSize") ?? "50"), 200)

     
     
    const where = { empresaId: user.empresaId }

    const [total, categories] = await Promise.all([
      prisma.expenseCategory.count({ where }),
      prisma.expenseCategory.findMany({
        where,
        select: { id: true, nome: true, slug: true, scheduleCLine: true, dedutivel: true, ativo: true },
        orderBy: { nome: "asc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
    ])

    return NextResponse.json({
      data: categories,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      success: true,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    logger.error("[Financeiro] GET /api/financeiro/expense-categories", {}, error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}

const createExpenseCategorySchema = z.object({
  nome: z.string().min(2).max(100),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default("#EF4444"),
  descricao: z.string().max(5000).optional(),
  scheduleCLine: z.string().max(20).optional(),
  dedutivel: z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request)

    if (!can(user.role as Role, "financeiro", "create")) {
      return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 })
    }

    const body = createExpenseCategorySchema.safeParse(await request.json())
    if (!body.success) {
      return NextResponse.json(
        { error: "Validation failed", message: body.error.issues[0]?.message, success: false },
        { status: 400 }
      )
    }

    const { nome, cor, descricao, scheduleCLine, dedutivel } = body.data
    const empresaId = user.empresaId

    const existing = await prisma.expenseCategory.findFirst({
      where: { empresaId, nome },
    })
    if (existing) {
      return NextResponse.json(
        { error: "Conflict", message: "Category name already exists", success: false },
        { status: 409 }
      )
    }

    const category = await prisma.expenseCategory.create({
      data: { empresaId, nome, cor: cor ?? "#EF4444", descricao, scheduleCLine, dedutivel },
    })

    return NextResponse.json({ data: category, success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    logger.error("[Financeiro] POST /api/financeiro/expense-categories", {}, error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
