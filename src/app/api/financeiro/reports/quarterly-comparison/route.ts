/**
 * GET /api/financeiro/reports/quarterly-comparison?year=2026&format=json|excel
 * Quarterly estimated tax vs actual comparison
 */

import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { generateScheduleCReport } from "@/shared/services/scheduleCExportService"
import { generateQuarterlyComparisonExcel } from "@/shared/services/reportExportService"
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

     
     
    const report = await generateScheduleCReport({ empresaId: user.empresaId, taxYear: year })

    if (format === "excel") {
       
      const empresa = await prisma.empresa.findUniqueOrThrow({
         
        where: { id: user.empresaId },
        select: { nome: true, razaoSocial: true },
      })
      const buffer = await generateQuarterlyComparisonExcel(
        report,
        empresa.nome ?? empresa.razaoSocial ?? "GladPros"
      )
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="quarterly-comparison-${year}.xlsx"`,
        },
      })
    }

    // JSON: return just the quarterly payment comparison data
    return NextResponse.json({
      data: {
        taxYear: year,
        totalEstimatedTax: report.estimatedTax.totalEstimatedTax,
        totalPaid: report.quarterlyPayments.reduce((s, q) => s + q.paidAmount, 0),
        quarters: report.quarterlyPayments.map((qp) => ({
          quarter: qp.quarter,
          estimated: qp.estimatedAmount,
          paid: qp.paidAmount,
          difference: qp.paidAmount - qp.estimatedAmount,
          status: qp.status,
        })),
      },
      success: true,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    logger.error("[Financeiro] GET /api/financeiro/reports/quarterly-comparison", {}, error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
