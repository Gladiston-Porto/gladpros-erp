/**
 * GET /api/financeiro/reports/owner-compensation?year=2026&format=json|excel
 * Owner compensation summary export
 */

import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { prisma } from "@/lib/prisma"
import { generateOwnerCompExcel } from "@/shared/services/reportExportService"
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

    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59)
     
     
    const empresaId = user.empresaId

    const [compensations, empresa] = await Promise.all([
      prisma.ownerCompensation.findMany({
        where: {
          empresaId,
          data: { gte: startOfYear, lte: endOfYear },
        },
        orderBy: { data: "asc" },
      }),
      prisma.empresa.findUniqueOrThrow({
        where: { id: empresaId },
        select: { nome: true, razaoSocial: true, tipoTributacao: true },
      }),
    ])

    const rows = compensations.map((c) => ({
      date: c.data.toISOString().split("T")[0],
      type: c.tipo,
      amount: Number(c.valor),
      description: c.descricao,
    }))

    if (format === "excel") {
      const buffer = await generateOwnerCompExcel(
        rows,
        empresa.nome ?? empresa.razaoSocial ?? "GladPros",
        year,
        empresa.tipoTributacao
      )
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="owner-compensation-${year}.xlsx"`,
        },
      })
    }

    return NextResponse.json({
      data: {
        year,
        regime: empresa.tipoTributacao,
        items: rows,
        total: rows.reduce((s, r) => s + r.amount, 0),
      },
      success: true,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    logger.error("[Financeiro] GET /api/financeiro/reports/owner-compensation", {}, error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
