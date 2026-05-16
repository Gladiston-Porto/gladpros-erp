/**
 * PUT /api/financeiro/expense-categories/[id] — Update category mapping
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/api/logger"

const updateCategorySchema = z.object({
  scheduleCLine: z.string().nullable().optional(),
  dedutivel: z.boolean().optional(),
  nome: z.string().min(1).optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request)

    if (!can(user.role as Role, "configuracoes", "update")) {
      return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 })
    }

    const { id } = await params
    const categoryId = Number(id)
    if (isNaN(categoryId)) {
      return NextResponse.json(
        { error: "ID inválido", success: false },
        { status: 400 }
      )
    }

    const body = updateCategorySchema.safeParse(await request.json())
    if (!body.success) {
      return NextResponse.json(
        { error: "Validation failed", message: body.error.issues[0]?.message, success: false },
        { status: 400 }
      )
    }

    const existing = await prisma.expenseCategory.findFirst({
       
       
      where: { id: categoryId, empresaId: user.empresaId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Categoria não encontrada", success: false },
        { status: 404 }
      )
    }

    const updated = await prisma.expenseCategory.update({
      where: { id: categoryId },
      data: body.data,
      select: {
        id: true,
        nome: true,
        slug: true,
        scheduleCLine: true,
        dedutivel: true,
        ativo: true,
      },
    })

    return NextResponse.json({ data: updated, success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    logger.error("[Financeiro] PUT /api/financeiro/expense-categories/[id]", {}, error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
