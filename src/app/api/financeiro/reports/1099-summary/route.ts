/**
 * GET /api/financeiro/reports/1099-summary?year=2026&format=json|excel
 * Contractor payments summary for 1099 filing
 */

import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { getContractor1099Summary } from "@/shared/services/scheduleCExportService"
import { generate1099Excel } from "@/shared/services/reportExportService"
import { prisma } from "@/lib/prisma"
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

    const summary = await getContractor1099Summary((user as any).empresaId ?? 1, year)

    if (format === "excel") {
      const empresa = await prisma.empresa.findUniqueOrThrow({
        where: { id: (user as any).empresaId ?? 1 },
        select: { nome: true, razaoSocial: true },
      })
      const buffer = await generate1099Excel(
        summary,
        empresa.nome ?? empresa.razaoSocial ?? "GladPros",
        year
      )
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="1099-summary-${year}.xlsx"`,
        },
      })
    }

    return NextResponse.json({ data: summary, success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    logger.error("[Financeiro] GET /api/financeiro/reports/1099-summary", {}, error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
