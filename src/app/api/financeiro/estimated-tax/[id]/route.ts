/**
 * PUT /api/financeiro/estimated-tax/[id] — Update a payment
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { updatePayment } from "@/shared/services/estimatedTaxService"
import { logger } from "@/lib/api/logger"

const updateSchema = z.object({
  paidAmount: z.number().nonnegative().optional(),
  paidDate: z.string().transform((s) => new Date(s)).optional(),
  notas: z.string().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request)

    if (!can(user.role as Role, "financeiro", "update")) {
      return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 })
    }

    const { id } = await params
    const paymentId = Number(id)
    if (isNaN(paymentId)) {
      return NextResponse.json(
        { error: "ID inválido", success: false },
        { status: 400 }
      )
    }

    const body = updateSchema.safeParse(await request.json())
    if (!body.success) {
      return NextResponse.json(
        { error: "Validation failed", message: body.error.issues[0]?.message, success: false },
        { status: 400 }
      )
    }

    const result = await updatePayment(paymentId, body.data, Number(user.id))

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, success: false },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: result.data, success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    logger.error("[Financeiro] PUT /api/financeiro/estimated-tax/[id]", {}, error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
