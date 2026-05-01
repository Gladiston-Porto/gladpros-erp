/**
 * EstimationPro.ai API client
 *
 * Free public API — no key required.
 * Rate limit: 100 req/day per server IP → aggressive caching is REQUIRED.
 * Cache: 24h success, 1h negative (rate-limit / network errors).
 * Dallas TX ZIP 75201, multiplier 0.90 (already applied in responses).
 * Attribution required per Terms of Use.
 */

import { z } from 'zod'
import type { EstimadorResult } from '@/components/propostas/estimador/types'

// ─── Schema ───────────────────────────────────────────────────────────────────

const EpItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  unit: z.string(),
  low: z.number(),
  typical: z.number(),
  high: z.number(),
  volatility: z.string().optional(),
  lastVerified: z.string().optional(),
  regionallyAdjusted: z.boolean().optional(),
})

const EpCostsResponseSchema = z.object({
  data: z.object({
    trade: z.string(),
    location: z.string().optional(),
    multiplier: z.number().optional(),
    itemCount: z.number().optional(),
    items: z.array(EpItemSchema),
  }),
})

export type EpItem = z.infer<typeof EpItemSchema>

// ─── Constants ────────────────────────────────────────────────────────────────

const EP_BASE_URL = 'https://estimationpro.ai/api/v1'
const EP_ZIP = '75201'
const EP_TIMEOUT_MS = 5_000
const EP_CACHE_TTL_MS = 24 * 60 * 60 * 1_000    // 24h — EP updates monthly
const EP_NEGATIVE_TTL_MS = 60 * 60 * 1_000      // 1h — back off after 429/errors

export const EP_ATTRIBUTION =
  'Preços de referência: EstimationPro.ai Construction Cost API (Dallas TX, ajustado regionalmente)'

// ─── In-memory cache ──────────────────────────────────────────────────────────
// Single-tenant, single-server deployment → module-level Map is sufficient.

interface CacheEntry<T> { data: T; ts: number }

const successCache = new Map<string, CacheEntry<EpItem[]>>()
const negativeCache = new Map<string, CacheEntry<string>>()

// ─── Trade mapping: our trade IDs → EP trade names ───────────────────────────

export const TRADE_MAP: Record<string, string> = {
  'electrical-residential': 'electrical',
  'electrical-commercial':  'electrical',
  'ev-charging':            'electrical',
  'panel-upgrade':          'electrical',
  'service-installation':   'electrical',
  'light-installation':     'electrical',
  'plumbing-residential':   'plumbing',
  'bathroom-remodel':       'bathroom-remodel',
  'water-heater-tank':      'plumbing',
  'tankless-water-heater':  'plumbing',
  'move-plumbing':          'plumbing',
  'kitchen-remodel':        'kitchen-remodel',
  'water-treatment':        'plumbing',
  'painting-interior':      'paint',
  'painting-exterior':      'paint',
  'painting-full':          'paint',
}

// ─── EP item match: trade + wizard answers → specific EP item ─────────────────
// Only set fonte:'hybrid' when a concrete item was matched (not just trade-level).

export interface EpItemMatch {
  epTradeId: string
  epItemId: string
  quantityKey?: string   // wizard answer key to use as quantity
  confidence: 'high' | 'medium'
}

type Respostas = Record<string, string | number | boolean>

export function getEpItemMatch(tradeId: string, respostas: Respostas): EpItemMatch | null {
  switch (tradeId) {

    // ── Electrical ──────────────────────────────────────────────────────────
    case 'panel-upgrade':
      return { epTradeId: 'electrical', epItemId: 'panel-upgrade-200amp', confidence: 'high' }

    case 'ev-charging':
      return { epTradeId: 'electrical', epItemId: 'ev-charger-level2', confidence: 'high' }

    case 'light-installation': {
      const tipo = String(respostas.light_type ?? '')
      if (tipo === 'ceiling-fan') return { epTradeId: 'electrical', epItemId: 'ceiling-fan-install', quantityKey: 'quantity', confidence: 'high' }
      if (tipo === 'recessed')    return { epTradeId: 'electrical', epItemId: 'recessed-lighting-fixture', quantityKey: 'quantity', confidence: 'high' }
      return { epTradeId: 'electrical', epItemId: 'light-fixture-install', quantityKey: 'quantity', confidence: 'medium' }
    }

    case 'electrical-residential': {
      const scope = String(respostas.scope ?? '')
      if (scope === 'rewire') return { epTradeId: 'electrical', epItemId: 'whole-house-rewire', confidence: 'high' }
      return null
    }

    // ── Plumbing ────────────────────────────────────────────────────────────
    case 'water-heater-tank':
      return { epTradeId: 'plumbing', epItemId: 'water-heater-install', confidence: 'high' }

    case 'tankless-water-heater':
      return { epTradeId: 'plumbing', epItemId: 'tankless-water-heater-install', confidence: 'high' }

    case 'water-treatment':
      return { epTradeId: 'plumbing', epItemId: 'water-filtration-system', confidence: 'high' }

    case 'plumbing-residential': {
      const scope = String(respostas.scope ?? '')
      if (scope === 'full-repipe')    return { epTradeId: 'plumbing', epItemId: 'whole-house-repipe-pex', confidence: 'high' }
      if (scope === 'fixture-install') return { epTradeId: 'plumbing', epItemId: 'fixture-install', confidence: 'high' }
      if (scope === 'repair')          return { epTradeId: 'plumbing', epItemId: 'pipe-repair', confidence: 'medium' }
      return null
    }

    // ── Remodel ─────────────────────────────────────────────────────────────
    case 'bathroom-remodel': {
      const scope = String(respostas.scope ?? '')
      if (scope === 'tub-to-shower') return { epTradeId: 'bathroom-remodel', epItemId: 'tub-to-shower-conversion', confidence: 'high' }
      if (scope === 'full')          return { epTradeId: 'bathroom-remodel', epItemId: 'bathroom-highend-project', confidence: 'high' }
      if (scope === 'partial')       return { epTradeId: 'bathroom-remodel', epItemId: 'bathroom-midrange-project', confidence: 'high' }
      return { epTradeId: 'bathroom-remodel', epItemId: 'bathroom-budget-project', confidence: 'medium' }
    }

    default:
      return null
  }
}

// ─── Fetch EP costs ────────────────────────────────────────────────────────────

export async function fetchEpCosts(trade: string, zip: string = EP_ZIP): Promise<EpItem[] | null> {
  const key = `${trade}:${zip}`
  const now = Date.now()

  // Check negative cache first — don't retry until TTL expires
  const neg = negativeCache.get(key)
  if (neg && now - neg.ts < EP_NEGATIVE_TTL_MS) return null

  // Check success cache
  const hit = successCache.get(key)
  if (hit && now - hit.ts < EP_CACHE_TTL_MS) return hit.data

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), EP_TIMEOUT_MS)

    const res = await fetch(
      `${EP_BASE_URL}/costs?trade=${encodeURIComponent(trade)}&zip=${encodeURIComponent(zip)}`,
      { signal: ctrl.signal, next: { revalidate: 0 } }
    )
    clearTimeout(timer)

    if (res.status === 429) {
      negativeCache.set(key, { data: 'rate_limited', ts: now })
      return null
    }
    if (!res.ok) {
      negativeCache.set(key, { data: `http_${res.status}`, ts: now })
      return null
    }

    const json: unknown = await res.json()
    const parsed = EpCostsResponseSchema.safeParse(json)
    if (!parsed.success) {
      negativeCache.set(key, { data: 'parse_error', ts: now })
      return null
    }

    const items = parsed.data.data.items
    successCache.set(key, { data: items, ts: now })
    return items
  } catch {
    negativeCache.set(key, { data: 'network_error', ts: now })
    return null
  }
}

// ─── Enrich wizard result with EP reference data ──────────────────────────────
// Does NOT override internal prices — adds EP data as a note only.
// Sets fonte:'hybrid' only when a concrete item match was found.

export async function enrichWithEp(
  result: EstimadorResult,
  tradeId: string,
  respostas: Respostas
): Promise<EstimadorResult> {
  const match = getEpItemMatch(tradeId, respostas)
  if (!match) return result

  const items = await fetchEpCosts(match.epTradeId)
  if (!items) return result

  const item = items.find(i => i.id === match.epItemId)
  if (!item) return result

  const qty = match.quantityKey ? Number(respostas[match.quantityKey] ?? 1) : 1
  const fmtUSD = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

  const epNote =
    `EstimationPro ref — ${item.description}: ` +
    `${fmtUSD(item.low * qty)} – ${fmtUSD(item.high * qty)} ` +
    `(típico: ${fmtUSD(item.typical * qty)}) · ${item.unit}`

  return {
    ...result,
    fonte: 'hybrid',
    notas: [...(result.notas ?? []), epNote, EP_ATTRIBUTION],
  }
}

// ─── Keyword-based trade detection for free-text scope ───────────────────────

const TRADE_KEYWORDS: Array<{ tradeId: string; keywords: string[] }> = [
  { tradeId: 'panel-upgrade',         keywords: ['panel upgrade', 'electrical panel', '200amp', '200 amp', 'painel eletrico', 'painel elétrico', 'breaker box'] },
  { tradeId: 'ev-charging',           keywords: ['ev charger', 'electric vehicle', 'tesla charger', 'carregador ev', 'level 2 charger', 'evse'] },
  { tradeId: 'tankless-water-heater', keywords: ['tankless', 'on-demand water heater', 'navien', 'rinnai', 'noritz', 'aquecedor instantaneo', 'aquecedor instantâneo'] },
  { tradeId: 'water-heater-tank',     keywords: ['water heater', 'aquecedor', 'hot water tank', '50 gallon', '40 gallon'] },
  { tradeId: 'bathroom-remodel',      keywords: ['bathroom remodel', 'bathroom renovation', 'reforma banheiro', 'banheiro', 'bath remodel', 'shower remodel', 'vanity replacement', 'tub to shower'] },
  { tradeId: 'kitchen-remodel',       keywords: ['kitchen remodel', 'kitchen renovation', 'reforma cozinha', 'cozinha', 'cabinet install', 'countertop', 'bancada'] },
  { tradeId: 'water-treatment',       keywords: ['water filter', 'water softener', 'filtro de agua', 'filtro de água', 'water treatment', 'filtration system', 'sediment filter'] },
  { tradeId: 'painting-interior',     keywords: ['interior paint', 'interior painting', 'pintura interna', 'pintar quarto', 'pintar sala', 'wall paint'] },
  { tradeId: 'painting-exterior',     keywords: ['exterior paint', 'exterior painting', 'pintura externa', 'pintar fachada', 'house painting'] },
  { tradeId: 'plumbing-residential',  keywords: ['plumbing repair', 'pipe repair', 'faucet install', 'toilet install', 'drain', 'hidraulica', 'encanamento', 'repipe'] },
  { tradeId: 'electrical-residential', keywords: ['electrical work', 'wiring', 'outlet install', 'circuit install', 'electrician', 'eletrica', 'elétrica'] },
]

export function detectTradeFromScope(scope: string): string | null {
  const lower = scope.toLowerCase()
  for (const { tradeId, keywords } of TRADE_KEYWORDS) {
    if (keywords.some(kw => lower.includes(kw))) return tradeId
  }
  return null
}

// ─── Build EP result for free-text scope ─────────────────────────────────────
// Returns a simplified EstimadorResult marked referenceOnly = true.
// No materials — EP gives unit prices, not full BOM.

const TRADE_LABELS: Record<string, string> = {
  electrical:          'Elétrica',
  plumbing:            'Hidráulica',
  'bathroom-remodel':  'Reforma de Banheiro',
  'kitchen-remodel':   'Reforma de Cozinha',
  paint:               'Pintura',
}

export async function buildEpResultFromScope(
  scope: string,
  zip: string = EP_ZIP
): Promise<(EstimadorResult & { referenceOnly: true }) | null> {
  const tradeId = detectTradeFromScope(scope)
  if (!tradeId) return null

  const epTrade = TRADE_MAP[tradeId]
  if (!epTrade) return null

  const items = await fetchEpCosts(epTrade, zip)
  if (!items || items.length === 0) return null

  // Prefer project-level items for the top-line estimate
  const projectItems = items.filter(i => i.unit === 'project')
  const top = projectItems.length > 0 ? projectItems.slice(0, 3) : items.slice(0, 3)
  if (top.length === 0) return null

  const primary = top[0]
  const fmtUSD = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

  const etapas = top.map(item => ({
    servico: item.description,
    descricao: `Faixa TX: ${fmtUSD(item.low)} – ${fmtUSD(item.high)} · unidade: ${item.unit}`,
    quantidade: 1,
    unidade: item.unit,
    status: 'planejada' as const,
    custoMO: Math.round(item.typical * 0.6),
  }))

  const tradeLabel = TRADE_LABELS[epTrade] ?? epTrade

  return {
    tradeId,
    tradeLabel,
    escopoTexto:
      `Referência de preços EstimationPro.ai para ${tradeLabel} em Dallas TX. ` +
      `Scope informado: "${scope.slice(0, 200)}${scope.length > 200 ? '…' : ''}"`,
    etapas,
    materiais: [],
    estimativaBaixa: Math.round(primary.low),
    estimativaAlta:  Math.round(primary.high),
    estimativaMedia: Math.round(primary.typical),
    custoMO:        Math.round(primary.typical * 0.6),
    custoMaterial:  Math.round(primary.typical * 0.4),
    fonte: 'estimationpro',
    notas: [
      EP_ATTRIBUTION,
      '⚠️ Estimativa de referência — menos detalhada que a análise por trade. Revise antes de importar para a proposta.',
    ],
    referenceOnly: true,
  }
}
