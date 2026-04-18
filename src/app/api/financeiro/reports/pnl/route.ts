/**
 * GET /api/financeiro/reports/pnl?year=2026&period=quarterly&format=json|excel|pdf
 * Profit & Loss report with Schedule C alignment
 */

import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { generatePnLReport } from "@/shared/services/pnlReportService"
import { generatePnLExcel, generatePnLPdf } from "@/shared/services/reportExportService"

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request)

    if (!can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const year = Number(searchParams.get("year")) || new Date().getFullYear()
    const period = (searchParams.get("period") || "quarterly") as "annual" | "quarterly" | "monthly"
    const format = searchParams.get("format") || "json"

    if (!["annual", "quarterly", "monthly"].includes(period)) {
      return NextResponse.json({ error: "Invalid period. Use: annual, quarterly, monthly", success: false }, { status: 400 })
    }

    const data = await generatePnLReport({ empresaId: 1, taxYear: year, period })

    if (format === "excel") {
      const buffer = await generatePnLExcel(data)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="pnl-${year}-${period}.xlsx"`,
        },
      })
    }

    if (format === "pdf") {
      const buffer = await generatePnLPdf(data)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="pnl-${year}-${period}.pdf"`,
        },
      })
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    console.error("[API] GET /api/financeiro/reports/pnl error:", error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
