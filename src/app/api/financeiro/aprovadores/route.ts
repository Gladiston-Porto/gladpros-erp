import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request)

    if (!can(user.role as Role, "financeiro", "create")) {
      return NextResponse.json(
        { error: "Forbidden", message: "Sem permissão para listar aprovadores", success: false },
        { status: 403 }
      )
    }

    const approvers = await prisma.usuario.findMany({
      where: {
        status: "ATIVO",
        nivel: { in: ["ADMIN", "GERENTE", "FINANCEIRO"] },
        empresaId: user.empresaId,
      },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        nivel: true,
      },
      orderBy: [
        { nivel: "asc" },
        { nomeCompleto: "asc" },
      ],
      take: 100,
    })

    return NextResponse.json({ data: approvers, success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { error: "Unauthorized", message: "Autenticação necessária", success: false },
        { status: 401 }
      )
    }

    console.error("[GET /api/financeiro/aprovadores]", error)
    return NextResponse.json(
      { error: "Internal server error", message: "Erro ao listar aprovadores", success: false },
      { status: 500 }
    )
  }
}
