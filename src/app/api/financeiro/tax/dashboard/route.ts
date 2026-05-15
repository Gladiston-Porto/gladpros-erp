/**
 * GET /api/financeiro/tax/dashboard
 * Fiscal dashboard — YTD income, tax estimate, quarterly status, alerts
 */

import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { calculateYTDTax } from "@/shared/services/taxCalculationEngine"
import { getQuarterlyEstimates, getFiscalAlerts } from "@/shared/services/estimatedTaxService"
import { logger } from "@/lib/api/logger"

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request)

    if (!can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 })
    }

     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const empresaId = user.empresaId
    const currentYear = new Date().getFullYear()

    const [taxSummary, quarterlyEstimates, alerts] = await Promise.all([
      calculateYTDTax(empresaId),
      getQuarterlyEstimates(empresaId, currentYear),
      getFiscalAlerts(empresaId),
    ])

    return NextResponse.json({
      data: {
        taxSummary,
        quarterlyEstimates,
        alerts,
        year: currentYear,
      },
      success: true,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    logger.error("[Financeiro] GET /api/financeiro/tax/dashboard", {}, error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
