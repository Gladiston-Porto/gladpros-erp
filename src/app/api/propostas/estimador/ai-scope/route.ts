import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/shared/lib/rbac'
import { can } from '@/shared/lib/rbac-core'
import type { Role } from '@/shared/lib/rbac-core'
import { getOpenAIClient, estimateCost } from '@/lib/openai'
import type { EstimadorResult } from '@/components/propostas/estimador/types'

const bodySchema = z.object({
  scope: z.string().min(10, 'Descreva o escopo com pelo menos 10 caracteres.').max(2000),
})

const SYSTEM_PROMPT = `You are a professional construction cost estimator for GladPros LLC, a construction and services company based in Dallas, Texas.

COMPANY TRADES: Electrical, Plumbing, Remodeling (painting, flooring, tile, drywall, bathroom, kitchen). No HVAC.

DALLAS TX 2025 LABOR RATES:
- Master Electrician: $95/hr
- Journeyman Electrician: $75/hr
- Master Plumber: $95/hr
- Journeyman Plumber: $75/hr
- Remodeling Crew (per person): $65/hr
- Painter: $55/hr

PRICING CONTEXT:
- Tankless water heater (gas, 11 GPM, Navien/Rinnai): unit $1,590 + install labor + vent kit $280 + permit $200
- Tank water heater (50 gal electric): unit $450–550 + labor 3h
- Full bathroom remodel (100 sqft): $8,000–18,000
- Panel upgrade 200A: $2,800–5,500
- Interior painting (per sqft wall area): $1.50–4.00/sqft
- Exterior painting (per sqft facade): $1.80–4.80/sqft
- Sediment filter whole-house: $350–650 installed

RULES:
1. Always respond in JSON only — no markdown, no explanation outside the JSON.
2. Base all estimates on Dallas TX 2025 market rates.
3. Be accurate and realistic — do NOT underestimate. Clients use this for proposals.
4. Include permits, disposal, and minor consumables in the estimate.
5. "estimativaMedia" should equal average of low and high.
6. All monetary values are integers (no decimals).

OUTPUT FORMAT (strict JSON):
{
  "tradeId": "string — one of: electrical-residential, electrical-commercial, ev-charging, panel-upgrade, service-installation, light-installation, plumbing-residential, bathroom-remodel, water-heater-tank, tankless-water-heater, move-plumbing, kitchen-remodel, water-treatment, painting-interior, painting-exterior, painting-full, or 'general' if mixed",
  "tradeLabel": "string — human label in Portuguese",
  "escopoTexto": "string — full scope description in Portuguese, 2–4 sentences",
  "etapas": [
    {
      "servico": "string",
      "descricao": "string",
      "quantidade": number,
      "unidade": "string",
      "duracaoHoras": number,
      "custoMO": number,
      "status": "planejada"
    }
  ],
  "materiais": [
    {
      "codigo": "string — short code like MAT-001",
      "nome": "string",
      "quantidade": number,
      "unidade": "string",
      "preco": number,
      "status": "necessario",
      "obs": "string or null"
    }
  ],
  "estimativaBaixa": number,
  "estimativaAlta": number,
  "estimativaMedia": number,
  "custoMO": number,
  "custoMaterial": number,
  "notas": ["string"]
}`

export async function POST(request: NextRequest) {
  const user = await requireUser(request)
  if (!can(user.role as Role, 'propostas', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 })
  }

  const rawBody = await request.json()
  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: parsed.error.issues[0]?.message ?? 'Dados inválidos', success: false },
      { status: 400 }
    )
  }

  const { scope } = parsed.data

  let openai: ReturnType<typeof getOpenAIClient>
  try {
    openai = getOpenAIClient()
  } catch {
    return NextResponse.json(
      { error: 'Config error', message: 'OpenAI API key não configurada. Contate o administrador.', success: false },
      { status: 503 }
    )
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      max_tokens: 2000,
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Generate a detailed cost estimate for the following scope:\n\n${scope}`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) throw new Error('OpenAI returned empty response')

    let parsed: Omit<EstimadorResult, 'fonte'>
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error('OpenAI returned invalid JSON')
    }

    // Validate required numeric fields are positive
    const result: EstimadorResult = {
      ...parsed,
      fonte: 'ai',
      estimativaBaixa: Math.max(0, Number(parsed.estimativaBaixa) || 0),
      estimativaAlta:  Math.max(0, Number(parsed.estimativaAlta)  || 0),
      estimativaMedia: Math.max(0, Number(parsed.estimativaMedia) || 0),
      custoMO:         Math.max(0, Number(parsed.custoMO)         || 0),
      custoMaterial:   Math.max(0, Number(parsed.custoMaterial)   || 0),
      etapas:          Array.isArray(parsed.etapas)   ? parsed.etapas   : [],
      materiais:       Array.isArray(parsed.materiais) ? parsed.materiais : [],
      notas:           Array.isArray(parsed.notas)    ? parsed.notas    : [],
    }

    if (result.estimativaMedia === 0 && result.estimativaBaixa > 0 && result.estimativaAlta > 0) {
      result.estimativaMedia = Math.round((result.estimativaBaixa + result.estimativaAlta) / 2)
    }

    // Log cost for monitoring (fire-and-forget)
    if (completion.usage) {
      const cost = estimateCost(completion.usage.prompt_tokens, completion.usage.completion_tokens, 'gpt-4o')
       
      // eslint-disable-next-line no-console
      console.info('[AI Estimator] tokens=%d cost=$%s user=%s', completion.usage.total_tokens, cost.toFixed(4), user.id)
    }

    return NextResponse.json({ data: result, success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao processar com IA'
    console.error('[AI Estimator] error:', msg)
    return NextResponse.json(
      { error: 'AI error', message: 'Erro ao gerar estimativa com IA. Tente novamente ou use o wizard por trade.', success: false },
      { status: 500 }
    )
  }
}
