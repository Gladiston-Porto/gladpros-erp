/**
 * GET /api/financeiro/tax/schedule-c?year=2026
 * Schedule C preview — line-by-line expense breakdown
 */

import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { generateScheduleCReport } from "@/shared/services/scheduleCExportService"
import { logger } from "@/lib/api/logger"

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request)

    if (!can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const year = Number(searchParams.get("year")) || new Date().getFullYear()

     
     
    const report = await generateScheduleCReport({ empresaId: user.empresaId, taxYear: year })

    return NextResponse.json({ data: report, success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    logger.error("[Financeiro] GET /api/financeiro/tax/schedule-c", {}, error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
