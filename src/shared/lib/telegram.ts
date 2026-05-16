/**
 * Shared Telegram utility — send messages from server-side code
 * (crons, domain logic, etc.) without importing the full webhook handler.
 */

const TELEGRAM_API = 'https://api.telegram.org/bot'

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: 'Markdown' | 'HTML' = 'Markdown'
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  }).catch((err) => {
    console.error('[telegram] sendTelegramMessage failed:', err)
  })
}
