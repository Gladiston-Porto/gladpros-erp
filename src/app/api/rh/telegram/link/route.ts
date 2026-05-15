// POST /api/rh/telegram/link
// ADMIN/GERENTE gera token de vinculação para um worker
// O token é enviado ao worker como deep link: https://t.me/GladProsBot?start={token}

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"

const schema = z.object({
  workerId: z.number().int().positive(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request)

    if (!can(user.role as Role, "rh", "write")) {
      return NextResponse.json(
        { error: "Forbidden", message: "Sem permissão para vincular Telegram", success: false },
        { status: 403 }
      )
    }

    const body = schema.safeParse(await request.json())
    if (!body.success) {
      return NextResponse.json(
        { error: "Validation failed", message: body.error.issues[0]?.message ?? "Dados inválidos", success: false },
        { status: 400 }
      )
    }

    const { workerId } = body.data

    const worker = await prisma.worker.findFirst({
      where: { id: workerId, empresaId: user.empresaId, deletadoEm: null },
      select: { id: true, name: true, telegramLink: { select: { telegramId: true, username: true } } },
    })

    if (!worker) {
      return NextResponse.json(
        { error: "Not Found", message: "Worker não encontrado", success: false },
        { status: 404 }
      )
    }

    // Invalida tokens anteriores não utilizados
    await prisma.telegramLinkToken.updateMany({
      where: { workerId, used: false },
      data: { used: true },
    })

    const token = randomBytes(24).toString("hex")
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    await prisma.telegramLinkToken.create({
      data: {
        empresaId: user.empresaId,
        workerId,
        token,
        expiresAt,
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "GladProsBot"
    const deepLink = `https://t.me/${botUsername}?start=${token}`
    const webLink = `${appUrl}/api/rh/telegram/link/${token}`

    return NextResponse.json({
      data: {
        workerId,
        workerNome: worker.name,
        alreadyLinked: !!worker.telegramLink,
        currentTelegramUsername: worker.telegramLink?.username ?? null,
        deepLink,
        webLink,
        expiresAt,
        message: worker.telegramLink
          ? "Worker já possui Telegram vinculado. Novo link irá substituir."
          : "Link gerado com sucesso. Envie ao worker para vinculação.",
      },
      success: true,
    })
  } catch (error) {
    console.error("[POST /api/rh/telegram/link]", error)
    return NextResponse.json(
      { error: "Internal Server Error", message: "Erro ao gerar link", success: false },
      { status: 500 }
    )
  }
}
