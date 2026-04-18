/**
 * GET  /api/financeiro/estimated-tax?year=2026 — All quarters for year
 * POST /api/financeiro/estimated-tax — Record a payment
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import {
  getQuarterlyEstimates,
  recordPayment,
} from "@/shared/services/estimatedTaxService"

const recordPaymentSchema = z.object({
  taxYear: z.number().int().min(2020).max(2100),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  paidAmount: z.number().nonnegative(),
  paidDate: z.string().transform((s) => new Date(s)).optional(),
  notas: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request)

    if (!can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const year = Number(searchParams.get("year")) || new Date().getFullYear()

    const estimates = await getQuarterlyEstimates(1, year)

    return NextResponse.json({ data: estimates, success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    console.error("[API] GET /api/financeiro/estimated-tax error:", error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request)

    if (!can(user.role as Role, "financeiro", "create")) {
      return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 })
    }

    const body = recordPaymentSchema.safeParse(await request.json())
    if (!body.success) {
      return NextResponse.json(
        { error: "Validation failed", message: body.error.issues[0]?.message, success: false },
        { status: 400 }
      )
    }

    const result = await recordPayment({
      empresaId: 1,
      taxYear: body.data.taxYear,
      quarter: body.data.quarter,
      paidAmount: body.data.paidAmount,
      paidDate: body.data.paidDate,
      notas: body.data.notas,
      userId: Number(user.id),
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, success: false },
        { status: 422 }
      )
    }

    return NextResponse.json({ data: result.data, success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    console.error("[API] POST /api/financeiro/estimated-tax error:", error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
