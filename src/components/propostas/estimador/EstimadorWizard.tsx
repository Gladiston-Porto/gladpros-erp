'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@gladpros/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@gladpros/ui/toast'
import { TRADES } from '@/config/estimador/trades'
import type { TradeConfig, EstimadorRespostas, EstimadorResult } from './types'
import { EstimadorStepQuestions } from './EstimadorStepQuestions'
import { EstimadorPreview } from './EstimadorPreview'

type WizardStep   = 'trade-select' | 'questions' | 'preview' | 'ai-scope'
type WizardMode   = 'wizard' | 'ai'
type AiSource     = 'ep' | 'gpt4o'

interface EstimadorWizardProps {
  open: boolean
  onClose: () => void
  onImport: (result: EstimadorResult) => void
}

const CATEGORY_LABELS = {
  electrical: { label: 'Elétrica', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  plumbing:   { label: 'Hidráulica', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  remodel:    { label: 'Reforma', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
}

export function EstimadorWizard({ open, onClose, onImport }: EstimadorWizardProps) {
  const [mode, setMode]               = useState<WizardMode>('wizard')
  const [step, setStep]               = useState<WizardStep>('trade-select')
  const [selectedTrade, setSelected]  = useState<TradeConfig | null>(null)
  const [respostas, setRespostas]     = useState<EstimadorRespostas>({})
  const [result, setResult]           = useState<EstimadorResult | null>(null)
  const [loading, setLoading]         = useState(false)
  const [aiScope, setAiScope]         = useState('')
  const [aiSource, setAiSource]       = useState<AiSource>('ep')
  const [margin, setMargin]           = useState(0)
  const [applyMargin, setApplyMargin] = useState(false)
  const { addToast } = useToast()

  const handleClose = useCallback(() => {
    setMode('wizard')
    setStep('trade-select')
    setSelected(null)
    setRespostas({})
    setResult(null)
    setAiScope('')
    setAiSource('ep')
    setMargin(0)
    setApplyMargin(false)
    onClose()
  }, [onClose])

  const handleSelectTrade = useCallback((trade: TradeConfig) => {
    setSelected(trade)
    setRespostas({})
    setStep('questions')
  }, [])

  const handleAnswer = useCallback((questionId: string, value: string | number | boolean) => {
    setRespostas(prev => ({ ...prev, [questionId]: value }))
  }, [])

  const handleGenerateEstimate = useCallback(async () => {
    if (!selectedTrade) return

    const unanswered = selectedTrade.questions.filter(q => {
      if (!q.required) return false
      if (q.dependsOn) {
        const depValue = respostas[q.dependsOn.questionId]
        if (depValue !== q.dependsOn.value) return false
      }
      return respostas[q.id] === undefined || respostas[q.id] === ''
    })

    if (unanswered.length > 0) {
      addToast({ title: 'Campo obrigatório', message: `Preencha: ${unanswered[0].label}`, type: 'warning' })
      return
    }

    setLoading(true)
    try {
      const { authenticatedFetch } = await import('@/lib/api/client')
      const res = await authenticatedFetch('/api/propostas/estimador', {
        method: 'POST',
        body: JSON.stringify({ tradeId: selectedTrade.id, respostas }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Erro ao gerar estimativa')
      }
      const json = await res.json()
      setResult(json.data)
      setStep('preview')
    } catch (err) {
      addToast({ title: 'Erro', message: err instanceof Error ? err.message : 'Erro ao gerar estimativa', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [selectedTrade, respostas, addToast])

  const handleGenerateAI = useCallback(async () => {
    if (!aiScope.trim()) {
      addToast({ title: 'Campo obrigatório', message: 'Descreva o escopo do serviço.', type: 'warning' })
      return
    }
    setLoading(true)
    try {
      const { authenticatedFetch } = await import('@/lib/api/client')
      const endpoint = aiSource === 'ep'
        ? '/api/propostas/estimador/ep-scope'
        : '/api/propostas/estimador/ai-scope'

      const res = await authenticatedFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ scope: aiScope }),
      })
      if (!res.ok) {
        const err = await res.json()
        // If EP couldn't detect trade, suggest GPT-4o automatically
        if (res.status === 422 && aiSource === 'ep') {
          addToast({
            title: 'Trade não identificado',
            message: 'Tente o modo GPT-4o para escopos complexos.',
            type: 'warning',
          })
          setAiSource('gpt4o')
          return
        }
        throw new Error(err.message || 'Erro ao gerar estimativa com IA')
      }
      const json = await res.json()
      setResult(json.data)
      setStep('preview')
    } catch (err) {
      addToast({ title: 'Erro IA', message: err instanceof Error ? err.message : 'Erro ao processar escopo com IA', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [aiScope, aiSource, addToast])

  const handleImport = useCallback(() => {
    if (!result) return

    let finalResult = result
    if (applyMargin && margin > 0) {
      const factor = 1 + margin / 100
      finalResult = {
        ...result,
        estimativaBaixa:  Math.round(result.estimativaBaixa  * factor),
        estimativaAlta:   Math.round(result.estimativaAlta   * factor),
        estimativaMedia:  Math.round(result.estimativaMedia  * factor),
      }
    }

    onImport(finalResult)
    handleClose()
    const marginNote = applyMargin && margin > 0 ? ` (com ${margin}% de margem)` : ''
    addToast({
      title: 'Estimativa importada!',
      message: `${result.etapas.length} etapas e ${result.materiais.length} materiais adicionados${marginNote}.`,
      type: 'success',
    })
  }, [result, margin, applyMargin, onImport, handleClose, addToast])

  const stepIndex = step === 'trade-select' ? 0 : step === 'questions' ? 1 : 2
  const stepLabels = mode === 'ai'
    ? ['Modo IA', 'Descrever Escopo', 'Revisão']
    : ['Selecionar serviço', 'Detalhes', 'Revisão']

  const switchMode = (m: WizardMode) => {
    setMode(m)
    setResult(null)
    setStep(m === 'ai' ? 'ai-scope' : 'trade-select')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-title text-brand-primary">
            ✨ Gerador de Estimativa
          </DialogTitle>
          <DialogDescription>
            Gere um escopo detalhado e estimativa de custo para Dallas TX 2025.
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl mb-2">
          <button
            type="button"
            onClick={() => switchMode('wizard')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
              mode === 'wizard' ? 'bg-card text-brand-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            📋 Por Trade
          </button>
          <button
            type="button"
            onClick={() => switchMode('ai')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
              mode === 'ai' ? 'bg-card text-brand-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            🤖 Descrever Escopo
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-4">
          {stepLabels.map((label, i) => (
            <React.Fragment key={label}>
              <div className={`flex items-center gap-1.5 text-sm ${i <= stepIndex ? 'text-brand-primary font-medium' : 'text-muted-foreground'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < stepIndex ? 'bg-brand-primary text-white' : i === stepIndex ? 'bg-brand-primary/20 text-brand-primary border-2 border-brand-primary' : 'bg-muted text-muted-foreground'}`}>
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < stepIndex ? 'bg-brand-primary' : 'bg-border'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── STEP 1 (wizard): Select Trade ────────────────────────────────── */}
        {step === 'trade-select' && (
          <div className="flex flex-col gap-3">
            {(['electrical', 'plumbing', 'remodel'] as const).map(cat => {
              const catTrades = TRADES.filter(t => t.category === cat)
              const catInfo   = CATEGORY_LABELS[cat]
              return (
                <div key={cat}>
                  <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold mb-2 ${catInfo.color}`}>
                    {catInfo.label}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {catTrades.map(trade => (
                      <button
                        key={trade.id}
                        onClick={() => handleSelectTrade(trade)}
                        className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:bg-brand-primary/5 hover:border-brand-primary transition-colors text-left group"
                      >
                        <span className="text-2xl">{trade.icon}</span>
                        <div>
                          <p className="font-medium text-sm text-foreground group-hover:text-brand-primary">{trade.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{trade.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── STEP 1 (AI): Describe Scope ──────────────────────────────────── */}
        {step === 'ai-scope' && (
          <div className="flex flex-col gap-4">
            {/* Source selector */}
            <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
              <button
                type="button"
                onClick={() => setAiSource('ep')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  aiSource === 'ep'
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400 shadow-sm border border-green-500/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🆓 EstimationPro (grátis)
              </button>
              <button
                type="button"
                onClick={() => setAiSource('gpt4o')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  aiSource === 'gpt4o'
                    ? 'bg-card text-brand-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🤖 GPT-4o
              </button>
            </div>

            <div className="rounded-xl bg-brand-primary/5 border border-brand-primary/20 p-3">
              {aiSource === 'ep' ? (
                <>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">🆓 EstimationPro.ai — sem custo</p>
                  <p className="text-xs text-muted-foreground">
                    Descreva o escopo. O sistema detecta o trade automaticamente e busca preços regionais atualizados para Dallas TX. Ideal para serviços diretos (water heater, bathroom remodel, panel upgrade, etc.).
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-brand-primary mb-1">🤖 GPT-4o — escopos complexos</p>
                  <p className="text-xs text-muted-foreground">
                    Use para escopos mistos ou muito detalhados. A IA interpreta linguagem natural e gera etapas completas com materiais. ~$0.02 por estimativa.
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="ai-scope-text" className="text-sm font-medium text-foreground">
                Descreva o escopo do serviço
              </label>
              <textarea
                id="ai-scope-text"
                value={aiScope}
                onChange={(e) => setAiScope(e.target.value)}
                placeholder={
                  aiSource === 'ep'
                    ? 'Ex: "Instalar um tankless water heater Navien 11 GPM a gás natural, remover os dois water heaters tank existentes."'
                    : 'Ex: "O cliente tem dois water heaters de 50 galões a gás em bypass. Vamos remover os dois e instalar um tankless Navien 11 GPM a gás natural. Também incluir um filtro de sedimento whole-house na linha principal."'
                }
                className="min-h-[120px] w-full rounded-xl border border-border bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                aria-label="Descrição do escopo do serviço"
              />
              <p className="text-xs text-muted-foreground">
                {aiSource === 'ep'
                  ? '💡 Mencione o tipo de serviço claramente. Se o trade não for detectado, o modo GPT-4o será sugerido.'
                  : '💡 Quanto mais detalhado, mais precisa será a estimativa. Inclua: tipo de serviço, quantidade, material específico, condições do local.'
                }
              </p>
            </div>

            <Button
              onClick={handleGenerateAI}
              disabled={loading || !aiScope.trim()}
              className={`${aiSource === 'ep' ? 'bg-green-600 hover:bg-green-700' : 'bg-brand-primary hover:bg-brand-primary/90'} text-white`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {aiSource === 'ep' ? 'Consultando EstimationPro...' : 'Processando com GPT-4o...'}
                </span>
              ) : aiSource === 'ep' ? '🆓 Gerar com EstimationPro' : '🤖 Gerar com GPT-4o'}
            </Button>
          </div>
        )}

        {/* ── STEP 2 (wizard): Questions ───────────────────────────────────── */}
        {step === 'questions' && selectedTrade && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <span className="text-2xl">{selectedTrade.icon}</span>
              <div>
                <h3 className="font-semibold text-foreground">{selectedTrade.label}</h3>
                <p className="text-xs text-muted-foreground">{selectedTrade.description}</p>
              </div>
            </div>

            <EstimadorStepQuestions
              questions={selectedTrade.questions}
              respostas={respostas}
              onChange={handleAnswer}
            />

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep('trade-select')} className="flex-1">
                ← Voltar
              </Button>
              <Button
                onClick={handleGenerateEstimate}
                disabled={loading}
                className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white"
              >
                {loading ? 'Gerando...' : '✨ Gerar Estimativa'}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Preview ──────────────────────────────────────────────── */}
        {step === 'preview' && result && (
          <div className="flex flex-col gap-4">
            <EstimadorPreview
              result={result}
              onMarginChange={(m, a) => { setMargin(m); setApplyMargin(a) }}
            />

            {result.fonte === 'ai' && (
              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-2 text-xs text-yellow-600 dark:text-yellow-400">
                ⚠️ Estimativa gerada por IA — revise os valores antes de importar para a proposta.
              </div>
            )}

            {result.referenceOnly && (
              <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-2 text-xs text-orange-600 dark:text-orange-400">
                ⚠️ Estimativa de referência EstimationPro.ai — sem etapas detalhadas nem materiais. Revise antes de importar.
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(mode === 'ai' ? 'ai-scope' : 'questions')}
                className="flex-1"
              >
                ← Ajustar
              </Button>
              <Button
                onClick={handleImport}
                disabled={!!result.referenceOnly}
                title={result.referenceOnly ? 'Estimativa de referência — use o modo Por Trade para importar com detalhes completos' : undefined}
                className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {result.referenceOnly
                  ? '⚠️ Somente referência'
                  : applyMargin && margin > 0
                    ? `✅ Importar com ${margin}% margem`
                    : '✅ Importar para Proposta'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
