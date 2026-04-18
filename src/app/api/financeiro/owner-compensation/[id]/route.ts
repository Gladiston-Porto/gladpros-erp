/**
 * DELETE /api/financeiro/owner-compensation/[id]
 * Delete a compensation entry (ADMIN only)
 */

import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { deleteCompensation } from "@/shared/services/ownerCompensationService"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request)

    if (!can(user.role as Role, "financeiro", "delete")) {
      return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 })
    }

    const { id } = await params
    const compensationId = Number(id)
    if (isNaN(compensationId)) {
      return NextResponse.json(
        { error: "ID inválido", success: false },
        { status: 400 }
      )
    }

    const result = await deleteCompensation(compensationId, Number(user.id))

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, success: false },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    console.error("[API] DELETE /api/financeiro/owner-compensation/[id] error:", error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
