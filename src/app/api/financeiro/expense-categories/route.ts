/**
 * GET /api/financeiro/expense-categories — List all with scheduleCLine mapping
 */

import { NextRequest, NextResponse } from "next/server"
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

    const where = { empresaId: (user as any).empresaId ?? 1 }

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
