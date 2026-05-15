// GET /api/rh/telegram/link/[token]
// Rota pública — valida token e redireciona para o deep link do Telegram
// Worker clica no link → abre Telegram → /start {token} → conta vinculada

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const record = await prisma.telegramLinkToken.findUnique({
    where: { token },
    select: {
      id: true,
      used: true,
      expiresAt: true,
      worker: { select: { nome: true } },
    },
  })

  if (!record) {
    return new NextResponse(linkPageHtml("Link inválido", "Este link não existe ou foi removido.", "❌"), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    })
  }

  if (record.used) {
    return new NextResponse(linkPageHtml("Link já utilizado", "Este link já foi usado. Peça ao administrador para gerar um novo.", "⚠️"), {
      status: 410,
      headers: { "Content-Type": "text/html" },
    })
  }

  if (new Date() > record.expiresAt) {
    return new NextResponse(linkPageHtml("Link expirado", "Este link expirou após 24 horas. Peça ao administrador para gerar um novo.", "⏰"), {
      status: 410,
      headers: { "Content-Type": "text/html" },
    })
  }

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "GladProsBot"
  const deepLink = `https://t.me/${botUsername}?start=${token}`

  // Redireciona imediatamente para abrir o Telegram
  return new NextResponse(
    linkPageHtml(
      "Abrindo Telegram...",
      `Olá, ${record.worker.nome}! Clique no botão abaixo para vincular sua conta ao GladPros.`,
      "📱",
      deepLink
    ),
    {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }
  )
}

function linkPageHtml(title: string, message: string, icon: string, deepLink?: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GladPros — Vincular Telegram</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif;
           background: #0f172a; color: #f1f5f9; min-height: 100vh;
           display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #1e293b; border-radius: 16px; padding: 40px 32px;
            max-width: 400px; width: 100%; text-align: center; }
    .icon { font-size: 56px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 12px; color: #0098DA; }
    p { font-size: 15px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
    a.btn { display: block; background: #0098DA; color: white; text-decoration: none;
            padding: 14px 24px; border-radius: 12px; font-weight: 600; font-size: 16px; }
    a.btn:hover { background: #006899; }
  </style>
  ${deepLink ? `<meta http-equiv="refresh" content="1;url=${deepLink}">` : ""}
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    ${deepLink ? `<a class="btn" href="${deepLink}">🔗 Abrir no Telegram</a>` : ""}
  </div>
</body>
</html>`
}
