// POST /api/webhooks/telegram
// Webhook principal do bot GladPros
// Rota pública — validada por X-Telegram-Bot-Api-Secret-Token
//
// Interação via botões inline (UX principal) e comandos de texto como fallback:
//   /start {token}  → vincula conta Telegram ao Worker
//   Botão ▶️ ou /clockin   → solicita localização para iniciar turno
//   Botão ⏹ ou /clockout  → encerra turno aberto
//   Botão 📊 ou /status   → mostra turno atual e tempo decorrido

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

interface TelegramCallbackQuery {
  id: string
  from: TelegramUser
  message?: TelegramMessage
  data?: string
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

// ─── Inline keyboard principal ─────────────────────────────────────────────

const MAIN_MENU = {
  inline_keyboard: [
    [
      { text: "▶️ Iniciar Turno", callback_data: "clockin" },
      { text: "⏹ Encerrar Turno", callback_data: "clockout" },
    ],
    [
      { text: "📊 Ver Status", callback_data: "status" },
    ],
  ],
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

    // ── Callback query (botão pressionado) ─────────────────────────────
    if (update.callback_query) {
      const cb = update.callback_query
      const chatId = cb.message?.chat.id
      if (!chatId || !cb.from) {
        await answerCallback(cb.id)
        return NextResponse.json({ ok: true })
      }

      const telegramId = BigInt(cb.from.id)

      const link = await prisma.telegramLink.findUnique({
        where: { telegramId },
        select: {
          workerId: true,
          empresaId: true,
          worker: { select: { id: true, name: true, status: true, usuarioId: true } },
        },
      })

      if (!link) {
        await answerCallback(cb.id, "Conta não vinculada")
        await sendMessage(chatId, "❌ Sua conta não está vinculada ao GladPros.\n\nPeça ao administrador para gerar um link de vinculação.")
        return NextResponse.json({ ok: true })
      }

      await answerCallback(cb.id)

      if (cb.data === "clockin") {
        await handleClockInRequest(chatId, link.worker.name)
      } else if (cb.data === "clockout") {
        await handleClockOut(chatId, link.workerId, link.worker.name)
        await sendMainMenu(chatId)
      } else if (cb.data === "status") {
        await handleStatus(chatId, link.workerId, link.worker.name)
        await sendMainMenu(chatId)
      }

      return NextResponse.json({ ok: true })
    }

    // ── Mensagem de texto ──────────────────────────────────────────────
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

    // ── Verifica vinculação para os demais comandos ─────────────────────
    const link = await prisma.telegramLink.findUnique({
      where: { telegramId },
      select: {
        workerId: true,
        empresaId: true,
        worker: { select: { id: true, name: true, status: true, usuarioId: true } },
      },
    })

    if (!link) {
      await sendMessage(chatId, "❌ Sua conta não está vinculada ao GladPros.\n\nPeça ao seu administrador para gerar um link de vinculação.")
      return NextResponse.json({ ok: true })
    }

    // ── Comandos de texto (fallback) ────────────────────────────────────
    if (text === "/clockin") {
      await handleClockInRequest(chatId, link.worker.name)
      return NextResponse.json({ ok: true })
    }

    if (text === "/clockout") {
      await handleClockOut(chatId, link.workerId, link.worker.name)
      await sendMainMenu(chatId)
      return NextResponse.json({ ok: true })
    }

    if (text === "/status") {
      await handleStatus(chatId, link.workerId, link.worker.name)
      await sendMainMenu(chatId)
      return NextResponse.json({ ok: true })
    }

    if (text === "/help") {
      await sendMessage(chatId, helpMessage(), "Markdown")
      await sendMainMenu(chatId)
      return NextResponse.json({ ok: true })
    }

    // ── Localização (resposta ao pedido de clock-in) ────────────────────
    if (message.location) {
      await handleLocation(chatId, link.workerId, { ...link.worker, empresaId: link.empresaId }, message.location)
      await sendMainMenu(chatId)
      return NextResponse.json({ ok: true })
    }

    // ── Qualquer outra mensagem → mostra o menu ─────────────────────────
    await sendMainMenu(chatId, `Olá, ${link.worker.name}! 👋 O que deseja fazer?`)
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
    `✅ *Conta vinculada com sucesso!*\n\nBem-vindo ao GladPros, ${record.worker.name}! 👋\n\nUse os botões abaixo para registrar seu ponto:`,
    "Markdown"
  )
  await sendMainMenu(chatId)
}

async function handleClockInRequest(chatId: number, nome: string) {
  await sendMessageWithKeyboard(
    chatId,
    `📍 ${nome}, para iniciar o turno compartilhe sua localização:`,
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
  _location: { latitude: number; longitude: number; horizontal_accuracy?: number }
) {
  const openEntry = await prisma.timeEntry.findFirst({
    where: { workerId, clockOut: null },
    select: { id: true, clockIn: true },
  })

  if (openEntry) {
    const elapsed = formatElapsed(openEntry.clockIn)
    await removeKeyboard(
      chatId,
      `⚠️ Você já tem um turno aberto há ${elapsed}.\n\nUse ⏹ Encerrar Turno para fechar antes de iniciar um novo.`
    )
    return
  }

  const now = new Date()
  const entry = await prisma.timeEntry.create({
    data: {
      workerId,
      clockIn: now,
      workDate: now,
      workLocation: "PROJECT_SITE",
      status: "OPEN",
      activities: {
        create: { activityType: "FIELD_WORK", durationMinutes: 0 },
      },
    },
    select: { id: true, clockIn: true },
  })

  const timeStr = formatTime(entry.clockIn)
  await removeKeyboard(
    chatId,
    `✅ Turno iniciado!\n\n👤 ${worker.name}\n⏰ ${timeStr} (CST)\n📍 Localização registrada`
  )
}

async function handleClockOut(chatId: number, workerId: number, nome: string) {
  const openEntry = await prisma.timeEntry.findFirst({
    where: { workerId, clockOut: null },
    select: { id: true, clockIn: true },
  })

  if (!openEntry) {
    await sendMessage(chatId, `⚠️ ${nome}, você não tem turno aberto no momento.`)
    return
  }

  const now = new Date()
  const totalMinutes = Math.round((now.getTime() - openEntry.clockIn.getTime()) / 60000)
  const regularMinutes = Math.min(totalMinutes, 480)
  const overtimeMinutes = Math.max(0, totalMinutes - 480)

  await prisma.$transaction([
    prisma.timeEntry.update({
      where: { id: openEntry.id },
      data: { clockOut: now, totalMinutes, regularMinutes, overtimeMinutes, status: "SUBMITTED" },
    }),
    prisma.timeEntryActivity.updateMany({
      where: { timeEntryId: openEntry.id },
      data: { durationMinutes: totalMinutes },
    }),
  ])

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  let summary = `✅ Turno encerrado!\n\n👤 ${nome}\n🕐 Entrada: ${formatTime(openEntry.clockIn)}\n🕑 Saída: ${formatTime(now)}\n⏱ Total: ${hours}h ${minutes}min`

  if (overtimeMinutes > 0) {
    const otH = Math.floor(overtimeMinutes / 60)
    const otM = overtimeMinutes % 60
    summary += `\n⚡ Extras: ${otH > 0 ? `${otH}h ` : ""}${otM}min`
  }

  summary += `\n\nRegistro enviado para aprovação. Bom descanso! 🌙`
  await sendMessage(chatId, summary)
}

async function handleStatus(chatId: number, workerId: number, nome: string) {
  const openEntry = await prisma.timeEntry.findFirst({
    where: { workerId, clockOut: null },
    select: { id: true, clockIn: true },
  })

  if (!openEntry) {
    await sendMessage(chatId, `📊 ${nome}, sem turno aberto no momento.`)
    return
  }

  const elapsed = formatElapsed(openEntry.clockIn)
  const totalMinutes = Math.round((Date.now() - openEntry.clockIn.getTime()) / 60000)
  const overtimeFlag = totalMinutes > 480 ? "\n\n⚡ Atenção: você está em horas extras!" : ""

  await sendMessage(
    chatId,
    `📊 Turno em andamento\n\n👤 ${nome}\n🕐 Entrada: ${formatTime(openEntry.clockIn)}\n⏱ Decorrido: ${elapsed}${overtimeFlag}`
  )
}

// ─── Telegram API helpers ──────────────────────────────────────────────────

async function tgPost(method: string, body: object) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

async function sendMessage(chatId: number, text: string, parseMode?: string) {
  await tgPost("sendMessage", { chat_id: chatId, text, ...(parseMode && { parse_mode: parseMode }) })
}

async function sendMainMenu(chatId: number, text?: string) {
  await tgPost("sendMessage", {
    chat_id: chatId,
    text: text ?? "O que deseja fazer?",
    reply_markup: MAIN_MENU,
  })
}

async function sendMessageWithKeyboard(chatId: number, text: string, replyMarkup: object) {
  await tgPost("sendMessage", { chat_id: chatId, text, reply_markup: replyMarkup })
}

async function removeKeyboard(chatId: number, text: string) {
  await tgPost("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: { remove_keyboard: true },
  })
}

async function answerCallback(callbackQueryId: string, text?: string) {
  await tgPost("answerCallbackQuery", { callback_query_id: callbackQueryId, ...(text && { text }) })
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
  return `👋 Olá, ${firstName}!\n\nEste é o bot de ponto do GladPros.\n\nPara começar, peça ao seu administrador para gerar um link de vinculação.`
}

function helpMessage(): string {
  return `📋 *Ajuda — GladPros Bot*\n\nUse os botões abaixo da conversa para:\n\n▶️ *Iniciar Turno* — registra entrada com GPS\n⏹ *Encerrar Turno* — fecha o turno e calcula horas\n📊 *Ver Status* — mostra tempo decorrido\n\n_Dúvidas? Fale com seu supervisor._`
}
