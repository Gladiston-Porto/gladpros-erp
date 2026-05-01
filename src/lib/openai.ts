import OpenAI from 'openai'

let _client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada. Adicione ao .env.local')
    _client = new OpenAI({ apiKey })
  }
  return _client
}

/** Estimated token cost (USD) for logging/monitoring */
export function estimateCost(inputTokens: number, outputTokens: number, model: string): number {
  // GPT-4o pricing (2025): $2.50/1M input, $10/1M output
  if (model.startsWith('gpt-4o-mini')) return (inputTokens * 0.00015 + outputTokens * 0.0006) / 1000
  if (model.startsWith('gpt-4o'))     return (inputTokens * 0.0025  + outputTokens * 0.010)  / 1000
  return 0
}
