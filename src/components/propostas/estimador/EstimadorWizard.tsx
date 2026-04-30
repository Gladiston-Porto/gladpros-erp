'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@gladpros/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@gladpros/ui/badge'
import { useToast } from '@gladpros/ui/toast'
import { TRADES, TRADES_BY_ID } from '@/config/estimador/trades'
import type { TradeConfig, WizardQuestion, EstimadorRespostas, EstimadorResult } from './types'
import { EstimadorStepQuestions } from './EstimadorStepQuestions'
import { EstimadorPreview } from './EstimadorPreview'

type WizardStep = 'trade-select' | 'questions' | 'preview'

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
  const [step, setStep] = useState<WizardStep>('trade-select')
  const [selectedTrade, setSelectedTrade] = useState<TradeConfig | null>(null)
  const [respostas, setRespostas] = useState<EstimadorRespostas>({})
  const [result, setResult] = useState<EstimadorResult | null>(null)
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const handleClose = useCallback(() => {
    setStep('trade-select')
    setSelectedTrade(null)
    setRespostas({})
    setResult(null)
    onClose()
  }, [onClose])

  const handleSelectTrade = useCallback((trade: TradeConfig) => {
    setSelectedTrade(trade)
    setRespostas({})
    setStep('questions')
  }, [])

  const handleAnswer = useCallback((questionId: string, value: string | number | boolean) => {
    setRespostas(prev => ({ ...prev, [questionId]: value }))
  }, [])

  const handleGenerateEstimate = useCallback(async () => {
    if (!selectedTrade) return

    // Check required questions
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

  const handleImport = useCallback(() => {
    if (!result) return
    onImport(result)
    handleClose()
    addToast({ title: 'Estimativa importada!', message: `${result.etapas.length} etapas e ${result.materiais.length} materiais adicionados à proposta.`, type: 'success' })
  }, [result, onImport, handleClose, addToast])

  const stepIndex = step === 'trade-select' ? 0 : step === 'questions' ? 1 : 2
  const stepLabels = ['Selecionar serviço', 'Detalhes', 'Revisão']

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-title text-brand-primary">
            ✨ Gerador de Estimativa
          </DialogTitle>
          <DialogDescription>
            Responda as perguntas para gerar um escopo detalhado e estimativa de custo para Dallas TX.
          </DialogDescription>
        </DialogHeader>

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

        {/* ── STEP 1: Select Trade ─────────────────────────────────────────── */}
        {step === 'trade-select' && (
          <div className="flex flex-col gap-3">
            {(['electrical', 'plumbing', 'remodel'] as const).map(cat => {
              const catTrades = TRADES.filter(t => t.category === cat)
              const catInfo = CATEGORY_LABELS[cat]
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

        {/* ── STEP 2: Questions ────────────────────────────────────────────── */}
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
            <EstimadorPreview result={result} />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep('questions')} className="flex-1">
                ← Ajustar
              </Button>
              <Button
                onClick={handleImport}
                className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white"
              >
                ✅ Importar para Proposta
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
