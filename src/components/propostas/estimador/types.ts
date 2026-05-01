// Types for the Smart Cost Estimator Wizard

export type QuestionType = 'number' | 'select' | 'boolean' | 'sqft' | 'text'

export interface WizardQuestion {
  id: string
  label: string
  type: QuestionType
  required: boolean
  placeholder?: string
  unit?: string
  min?: number
  max?: number
  defaultValue?: string | number | boolean
  helpText?: string
  options?: Array<{ value: string; label: string }>
  dependsOn?: { questionId: string; value: string | boolean | number }
}

export interface TradeConfig {
  id: string
  label: string
  icon: string
  category: 'electrical' | 'plumbing' | 'remodel'
  description: string
  questions: WizardQuestion[]
}

export interface EstimadorRespostas {
  [questionId: string]: string | number | boolean
}

export interface EstimadorMaterial {
  codigo: string
  nome: string
  quantidade: number
  unidade: string
  preco: number
  status: 'necessario' | 'opcional' | 'condicional'
  obs?: string
}

export interface EstimadorEtapa {
  servico: string
  descricao: string
  quantidade: number
  unidade: string
  duracaoHoras?: number
  custoMO?: number
  status: 'planejada' | 'opcional'
}

export interface EstimadorResult {
  tradeId: string
  tradeLabel: string
  escopoTexto: string
  etapas: EstimadorEtapa[]
  materiais: EstimadorMaterial[]
  estimativaBaixa: number
  estimativaAlta: number
  estimativaMedia: number
  custoMO: number
  custoMaterial: number
  fonte: 'internal' | 'estimationpro' | 'hybrid' | 'ai'
  notas?: string[]
  /** When true: reference-only result — direct import is disabled, user must review. */
  referenceOnly?: boolean
}

export interface EstimadorRequest {
  tradeId: string
  respostas: EstimadorRespostas
}

export interface EstimadorApiResponse {
  data: EstimadorResult
  success: true
}

