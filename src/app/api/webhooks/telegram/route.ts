// POST /api/webhooks/telegram
// Webhook principal do bot GladPros
// Rota pública — validada por X-Telegram-Bot-Api-Secret-Token
//
// Comandos suportados:
//   /start {token}  → vincula conta Telegram ao Worker
//   /clockin        → solicita localização para iniciar turno
//   /clockout       → encerra turno aberto
//   /status         → mostra turno atual e tempo decorrido
//   /help           → lista de comandos

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// ─── Tipos Telegram ────────────────────────────────────────────────────────

interface TelegramUser {
  id: number
  first_name: string
  username?: string
}

interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: { id: number }
  text?: string
  location?: { latitude: number; longitude: number; horizontal_accuracy?: number }
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

// ─── Webhook Handler ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Valida secret token do Telegram
  const secret = request.headers.get("x-telegram-bot-api-secret-token")
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  try {
    const update: TelegramUpdate = await request.json()
    const message = update.message

    if (!message?.from) return NextResponse.json({ ok: true })

    const telegramId = BigInt(message.from.id)
    const chatId = message.chat.id
    const text = message.text?.trim() ?? ""

    // ── /start {token} ──────────────────────────────────────────────────
    if (text.startsWith("/start")) {
      const token = text.replace("/start", "").trim()
      if (!token) {
        await sendMessage(chatId, welcomeMessage(message.from.first_name))
        return NextResponse.json({ ok: true })
      }
      await handleStart(chatId, telegramId, message.from, token)
      return NextResponse.json({ ok: true })
    }

    // ── Verifica se o usuário está vinculado para os demais comandos ────
    const link = await prisma.telegramLink.findUnique({
      where: { telegramId },
      select: {
        workerId: true,
        worker: {
          select: {
            id: true,
            name: true,
            status: true,
            empresaId: true,
            usuarioId: true,
          },
        },
      },
    })

    if (!link) {
      await sendMessage(chatId, "❌ Sua conta não está vinculada ao GladPros.\n\nPeça ao seu administrador para gerar um link de vinculação.")
      return NextResponse.json({ ok: true })
    }

    // ── /clockin ────────────────────────────────────────────────────────
    if (text === "/clockin") {
      await handleClockInRequest(chatId, link.worker.name)
      return NextResponse.json({ ok: true })
    }

    // ── /clockout ───────────────────────────────────────────────────────
    if (text === "/clockout") {
      await handleClockOut(chatId, link.workerId, link.worker.name)
      return NextResponse.json({ ok: true })
    }

    // ── /status ─────────────────────────────────────────────────────────
    if (text === "/status") {
      await handleStatus(chatId, link.workerId, link.worker.name)
      return NextResponse.json({ ok: true })
    }

    // ── /help ────────────────────────────────────────────────────────────
    if (text === "/help") {
      await sendMessage(chatId, helpMessage())
      return NextResponse.json({ ok: true })
    }

    // ── Mensagem de localização (resposta ao /clockin) ──────────────────
    if (message.location) {
      await handleLocation(chatId, link.workerId, link.worker, message.location)
      return NextResponse.json({ ok: true })
    }

    // ── Mensagem desconhecida ────────────────────────────────────────────
    await sendMessage(chatId, `Não entendi. Use /help para ver os comandos disponíveis.`)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[Telegram Webhook]", error)
    return NextResponse.json({ ok: true }) // Sempre retorna 200 para o Telegram
  }
}

// ─── Handlers ──────────────────────────────────────────────────────────────

async function handleStart(
  chatId: number,
  telegramId: bigint,
  from: TelegramUser,
  token: string
) {
  const record = await prisma.telegramLinkToken.findUnique({
    where: { token },
    select: {
      id: true,
      workerId: true,
      used: true,
      expiresAt: true,
      empresaId: true,
      worker: { select: { name: true } },
    },
  })

  if (!record || record.used || new Date() > record.expiresAt) {
    await sendMessage(chatId, "❌ Este link é inválido ou expirou.\n\nPeça ao administrador para gerar um novo link.")
    return
  }

  // Vincula o Telegram ao Worker (upsert para re-vinculação)
  await prisma.$transaction([
    prisma.telegramLink.upsert({
      where: { workerId: record.workerId },
      create: {
        empresaId: record.empresaId,
        workerId: record.workerId,
        telegramId,
        username: from.username,
        firstName: from.first_name,
      },
      update: {
        telegramId,
        username: from.username,
        firstName: from.first_name,
        linkedAt: new Date(),
      },
    }),
    prisma.telegramLinkToken.update({
      where: { id: record.id },
      data: { used: true },
    }),
  ])

  await sendMessage(
    chatId,
    `✅ *Conta vinculada com sucesso!*\n\nOlá, ${record.worker.name}! 👋\n\nAgora você pode usar o bot para registrar seu ponto:\n\n📍 */clockin* — Iniciar turno\n🏁 */clockout* — Encerrar turno\n📊 */status* — Ver turno atual\n\nUse /help para mais informações.`,
    "Markdown"
  )
}

async function handleClockInRequest(chatId: number, nome: string) {
  // Envia botão para compartilhar localização
  await sendMessageWithKeyboard(
    chatId,
    `📍 Olá, ${nome}!\n\nPara registrar sua entrada, compartilhe sua localização:`,
    {
      keyboard: [[{ text: "📍 Compartilhar minha localização", request_location: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    }
  )
}

async function handleLocation(
  chatId: number,
  workerId: number,
  worker: { id: number; name: string; empresaId: number; usuarioId: number | null },
  location: { latitude: number; longitude: number; horizontal_accuracy?: number }
) {
  // Verifica se já há turno aberto
  const openEntry = await prisma.timeEntry.findFirst({
    where: { workerId, clockOutAt: null },
    select: { id: true, clockInAt: true },
  })

  if (openEntry) {
    const elapsed = formatElapsed(openEntry.clockInAt)
    await sendMessage(
      chatId,
      `⚠️ Você já tem um turno aberto há ${elapsed}.\n\nUse */clockout* para encerrar antes de iniciar um novo.`,
      "Markdown"
    )
    return
  }

  // Cria o TimeEntry
  const entry = await prisma.timeEntry.create({
    data: {
      empresaId: worker.empresaId,
      workerId,
      clockInAt: new Date(),
      clockInLat: location.latitude,
      clockInLng: location.longitude,
      status: "OPEN",
      workLocation: "FIELD",
      activities: {
        create: {
          activityType: "FIELD_WORK",
          durationMinutes: 0,
        },
      },
    },
    select: { id: true, clockInAt: true },
  })

  const timeStr = formatTime(entry.clockInAt)
  await removeKeyboard(chatId, `✅ *Turno iniciado!*\n\n👤 ${worker.name}\n⏰ ${timeStr} (CST)\n📍 Localização registrada\n\nUse */clockout* quando terminar.`, "Markdown")
}

async function handleClockOut(chatId: number, workerId: number, nome: string) {
  const openEntry = await prisma.timeEntry.findFirst({
    where: { workerId, clockOutAt: null },
    select: { id: true, clockInAt: true },
  })

  if (!openEntry) {
    await sendMessage(chatId, `⚠️ Você não tem turno aberto, ${nome}.\n\nUse */clockin* para iniciar um turno.`, "Markdown")
    return
  }

  const now = new Date()
  const totalMinutes = Math.round((now.getTime() - openEntry.clockInAt.getTime()) / 60000)
  const regularMinutes = Math.min(totalMinutes, 480)
  const overtimeMinutes = Math.max(0, totalMinutes - 480)

  await prisma.$transaction([
    prisma.timeEntry.update({
      where: { id: openEntry.id },
      data: {
        clockOutAt: now,
        totalMinutes,
        regularMinutes,
        overtimeMinutes,
        status: "SUBMITTED",
      },
    }),
    prisma.timeEntryActivity.updateMany({
      where: { timeEntryId: openEntry.id },
      data: { durationMinutes: totalMinutes },
    }),
  ])

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const clockInStr = formatTime(openEntry.clockInAt)
  const clockOutStr = formatTime(now)

  let summary = `✅ *Turno encerrado!*\n\n👤 ${nome}\n🕐 Entrada: ${clockInStr}\n🕑 Saída: ${clockOutStr}\n⏱ Total: ${hours}h ${minutes}min`

  if (overtimeMinutes > 0) {
    const otH = Math.floor(overtimeMinutes / 60)
    const otM = overtimeMinutes % 60
    summary += `\n⚡ Extras: ${otH > 0 ? `${otH}h ` : ""}${otM}min`
  }

  summary += `\n\nRegistro enviado para aprovação. Tenha um bom descanso! 🌙`

  await sendMessage(chatId, summary, "Markdown")
}

async function handleStatus(chatId: number, workerId: number, nome: string) {
  const openEntry = await prisma.timeEntry.findFirst({
    where: { workerId, clockOutAt: null },
    select: { id: true, clockInAt: true },
  })

  if (!openEntry) {
    await sendMessage(chatId, `📊 ${nome}, você não tem turno aberto no momento.\n\nUse */clockin* para iniciar.`, "Markdown")
    return
  }

  const elapsed = formatElapsed(openEntry.clockInAt)
  const totalMinutes = Math.round((Date.now() - openEntry.clockInAt.getTime()) / 60000)
  const overtimeFlag = totalMinutes > 480 ? "\n\n⚡ *Atenção: você está em horas extras!*" : ""

  await sendMessage(
    chatId,
    `📊 *Turno em andamento*\n\n👤 ${nome}\n🕐 Entrada: ${formatTime(openEntry.clockInAt)}\n⏱ Decorrido: ${elapsed}${overtimeFlag}`,
    "Markdown"
  )
}

// ─── Telegram API helpers ──────────────────────────────────────────────────

async function sendMessage(chatId: number, text: string, parseMode?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  })
}

async function sendMessageWithKeyboard(chatId: number, text: string, replyMarkup: object) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup: replyMarkup }),
  })
}

async function removeKeyboard(chatId: number, text: string, parseMode?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      reply_markup: { remove_keyboard: true },
    }),
  })
}

// ─── Formatters ────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    timeZone: "America/Chicago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

function formatElapsed(from: Date): string {
  const totalMinutes = Math.round((Date.now() - from.getTime()) / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

// ─── Messages ─────────────────────────────────────────────────────────────

function welcomeMessage(firstName: string): string {
  return `👋 Olá, ${firstName}!\n\nEste é o bot de ponto do GladPros ERP.\n\nPara começar, você precisa vincular sua conta. Peça ao seu administrador para gerar um link de vinculação.`
}

function helpMessage(): string {
  return `📋 *Comandos disponíveis:*\n\n📍 */clockin* — Iniciar turno (solicita localização)\n🏁 */clockout* — Encerrar turno\n📊 */status* — Ver turno atual\n❓ */help* — Esta mensagem\n\n_Dúvidas? Fale com o seu supervisor._`
}
