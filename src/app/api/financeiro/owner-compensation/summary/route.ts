/**
 * GET /api/financeiro/owner-compensation/summary?year=2026
 * YTD owner compensation summary
 */

import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { getCompensationSummary } from "@/shared/services/ownerCompensationService"
import { logger } from "@/lib/api/logger"

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
    const year = Number(searchParams.get("year")) || new Date().getFullYear()

     
     
    const summary = await getCompensationSummary(user.empresaId, year)

    return NextResponse.json({ data: summary, success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    logger.error("[Financeiro] GET /api/financeiro/owner-compensation/summary", {}, error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
