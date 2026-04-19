/**
 * GET /api/financeiro/reports/schedule-c?year=2026&format=json|excel|pdf
 * Schedule C export — JSON data, Excel spreadsheet, or PDF document
 */

import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { generateScheduleCReport } from "@/shared/services/scheduleCExportService"
import { generateScheduleCExcel, generateScheduleCPdf } from "@/shared/services/reportExportService"
import { logger } from "@/lib/api/logger"

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request)

    if (!can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const year = Number(searchParams.get("year")) || new Date().getFullYear()
    const format = searchParams.get("format") || "json"

    const report = await generateScheduleCReport({ empresaId: (user as any).empresaId ?? 1, taxYear: year })

    if (format === "excel") {
      const buffer = await generateScheduleCExcel(report)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="schedule-c-${year}.xlsx"`,
        },
      })
    }

    if (format === "pdf") {
      const buffer = await generateScheduleCPdf(report)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="schedule-c-${year}.pdf"`,
        },
      })
    }

    return NextResponse.json({ data: report, success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    logger.error("[Financeiro] GET /api/financeiro/reports/schedule-c", {}, error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
