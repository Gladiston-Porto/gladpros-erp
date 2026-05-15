// POST /api/rh/telegram/link
// ADMIN/GERENTE gera token de vinculação para um worker
// O token é enviado ao worker como deep link: https://t.me/GladProsBot?start={token}
// Se o worker tiver email cadastrado, o link é enviado por email automaticamente

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { sendMail } from "@/shared/lib/mailer"

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
      where: { id: workerId, deletadoEm: null },
      select: {
        id: true,
        name: true,
        email: true,
        telegramLink: { select: { telegramId: true, username: true } },
        usuario: { select: { email: true } },
      },
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

    // Envia email automaticamente se tiver endereço disponível
    const workerEmail = worker.email ?? worker.usuario?.email ?? null
    let emailSent = false

    if (workerEmail) {
      try {
        await sendMail(
          workerEmail,
          "GladPros — Vincule seu Telegram ao Ponto Eletrônico",
          `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
            <div style="background: linear-gradient(135deg, #0098DA, #006899); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
              <h1 style="color: white; font-size: 22px; margin: 0 0 8px;">GladPros Bot</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 14px;">Ponto Eletrônico via Telegram</p>
            </div>

            <p style="color: #333; font-size: 16px;">Olá, <strong>${worker.name}</strong>!</p>
            <p style="color: #555; font-size: 14px; line-height: 1.6;">
              Você foi convidado para usar o <strong>Ponto Eletrônico</strong> da GladPros pelo Telegram.
              Com ele você registra entrada e saída com um toque — sem precisar abrir o sistema.
            </p>

            <div style="background: #f5f5f5; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
              <p style="color: #555; font-size: 13px; margin: 0 0 16px;">Clique no botão abaixo para vincular sua conta:</p>
              <a href="${deepLink}"
                style="display: inline-block; background: #0098DA; color: white; text-decoration: none;
                       padding: 14px 32px; border-radius: 10px; font-weight: bold; font-size: 15px;">
                ✈️ Vincular ao Telegram
              </a>
              <p style="color: #999; font-size: 12px; margin: 16px 0 0;">
                Este link expira em 24 horas
              </p>
            </div>

            <p style="color: #888; font-size: 12px;">
              Se não conseguir abrir o link, acesse: <a href="${webLink}" style="color: #0098DA;">${webLink}</a>
            </p>
          </div>
          `
        )
        emailSent = true
      } catch (err) {
        console.error("[Telegram link] Falha ao enviar email:", err)
      }
    }

    return NextResponse.json({
      data: {
        workerId,
        workerNome: worker.name,
        alreadyLinked: !!worker.telegramLink,
        currentTelegramUsername: worker.telegramLink?.username ?? null,
        deepLink,
        webLink,
        expiresAt,
        emailSent,
        emailTo: workerEmail,
        message: worker.telegramLink
          ? "Worker já possui Telegram vinculado. Novo link irá substituir."
          : emailSent
          ? `Link enviado por email para ${workerEmail}.`
          : "Link gerado. Envie manualmente ao worker.",
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
