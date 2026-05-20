/**
 * DELETE /api/financeiro/owner-compensation/[id]
 * Delete a compensation entry (ADMIN only)
 */

import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { deleteCompensation } from "@/shared/services/ownerCompensationService"
import { withErrorHandler } from "@/lib/api/error-handler"

export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser(request)

  if (user.role !== "ADMIN" || !can(user.role as Role, "financeiro", "delete")) {
    return NextResponse.json(
      { error: "Forbidden", message: "Apenas ADMIN pode excluir compensação do proprietário", success: false },
      { status: 403 }
    )
  }

  const { id } = await params
  const compensationId = Number(id)
  if (isNaN(compensationId)) {
    return NextResponse.json(
      { error: "ID inválido", success: false },
      { status: 400 }
    )
  }

  const result = await deleteCompensation(compensationId, Number(user.id), user.empresaId)

  if (!result.success) {
    const status = result.error.code === "BANK_LINKED_DELETE_BLOCKED" ? 409 : 404
    return NextResponse.json(
      { error: result.error, success: false },
      { status }
    )
  }

  return NextResponse.json({ success: true })
})
