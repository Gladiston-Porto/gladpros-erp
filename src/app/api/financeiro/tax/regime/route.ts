/**
 * GET  /api/financeiro/tax/regime — Current tax regime info
 * PUT  /api/financeiro/tax/regime — Change tax regime (ADMIN only)
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/api/logger"

const updateRegimeSchema = z.object({
  tipoTributacao: z.enum(["LLC_DEFAULT", "S_CORP"]),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request)

    if (!can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 })
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: user.empresaId },
      select: {
        id: true,
        nome: true,
        tipoTributacao: true,
        tipoTributacaoDesde: true,
      },
    })

    if (!empresa) {
      return NextResponse.json({ error: "Empresa não encontrada", success: false }, { status: 404 })
    }

    return NextResponse.json({ data: empresa, success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    logger.error("[Financeiro] GET /api/financeiro/tax/regime", {}, error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser(request)

    if (!can(user.role as Role, "configuracoes", "update")) {
      return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 })
    }

    const body = updateRegimeSchema.safeParse(await request.json())
    if (!body.success) {
      return NextResponse.json(
        { error: "Validation failed", message: body.error.issues[0]?.message, success: false },
        { status: 400 }
      )
    }

    const currentEmpresa = await prisma.empresa.findUnique({
      where: { id: user.empresaId },
      select: { id: true, tipoTributacao: true },
    })

    if (!currentEmpresa) {
      return NextResponse.json({ error: "Empresa não encontrada", success: false }, { status: 404 })
    }

    const empresa = await prisma.empresa.update({
      where: { id: user.empresaId },
      data: {
        tipoTributacao: body.data.tipoTributacao,
        tipoTributacaoDesde: new Date(),
      },
      select: {
        id: true,
        nome: true,
        tipoTributacao: true,
        tipoTributacaoDesde: true,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: Number(user.id),
        entidade: "Empresa",
        entidadeId: String(empresa.id),
        acao: "UPDATE",
        diff: JSON.stringify({
          tipoTributacaoAnterior: currentEmpresa.tipoTributacao,
          tipoTributacaoNovo: body.data.tipoTributacao,
        }),
      },
    })

    return NextResponse.json({ data: empresa, success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    logger.error("[Financeiro] PUT /api/financeiro/tax/regime", {}, error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
