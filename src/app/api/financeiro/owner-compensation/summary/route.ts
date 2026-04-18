/**
 * GET /api/financeiro/owner-compensation/summary?year=2026
 * YTD owner compensation summary
 */

import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { getCompensationSummary } from "@/shared/services/ownerCompensationService"

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request)

    if (!can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const year = Number(searchParams.get("year")) || new Date().getFullYear()

    const summary = await getCompensationSummary(1, year)

    return NextResponse.json({ data: summary, success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    console.error("[API] GET /api/financeiro/owner-compensation/summary error:", error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
