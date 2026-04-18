/**
 * GET /api/financeiro/expense-categories — List all with scheduleCLine mapping
 */

import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request)

    if (!can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 })
    }

    const categories = await prisma.expenseCategory.findMany({
      where: { empresaId: 1 },
      select: {
        id: true,
        nome: true,
        slug: true,
        scheduleCLine: true,
        dedutivel: true,
        ativo: true,
      },
      orderBy: { nome: "asc" },
    })

    return NextResponse.json({ data: categories, success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    console.error("[API] GET /api/financeiro/expense-categories error:", error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
