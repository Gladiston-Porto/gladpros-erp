'use client'

import React from 'react'
import { Input } from '@gladpros/ui/input'
import { Label } from '@gladpros/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@gladpros/ui/select'
import type { WizardQuestion, EstimadorRespostas } from './types'

interface EstimadorStepQuestionsProps {
  questions: WizardQuestion[]
  respostas: EstimadorRespostas
  onChange: (questionId: string, value: string | number | boolean) => void
}

export function EstimadorStepQuestions({ questions, respostas, onChange }: EstimadorStepQuestionsProps) {
  const visibleQuestions = questions.filter(q => {
    if (!q.dependsOn) return true
    return respostas[q.dependsOn.questionId] === q.dependsOn.value
  })

  return (
    <div className="flex flex-col gap-4">
      {visibleQuestions.map(q => (
        <div key={q.id} className="flex flex-col gap-1.5">
          <Label htmlFor={`q-${q.id}`} className="text-sm font-medium">
            {q.label}
            {q.required && <span className="text-destructive ml-1">*</span>}
          </Label>

          {q.type === 'select' && q.options && (
            <Select
              value={String(respostas[q.id] ?? '')}
              onValueChange={(v) => onChange(q.id, v)}
            >
              <SelectTrigger id={`q-${q.id}`} className="bg-background">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {q.options.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {(q.type === 'number' || q.type === 'sqft') && (
            <div className="relative flex items-center">
              <Input
                id={`q-${q.id}`}
                type="number"
                min={q.min}
                max={q.max}
                placeholder={q.placeholder || '0'}
                value={respostas[q.id] !== undefined ? String(respostas[q.id]) : ''}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v)) onChange(q.id, v)
                  else if (e.target.value === '') onChange(q.id, '')
                }}
                className="bg-background pr-16"
              />
              {q.unit && (
                <span className="absolute right-3 text-xs text-muted-foreground font-medium pointer-events-none">
                  {q.unit}
                </span>
              )}
            </div>
          )}

          {q.type === 'boolean' && (
            <div className="flex gap-2">
              {[
                { value: true, label: 'Sim' },
                { value: false, label: 'Não' },
              ].map(opt => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => onChange(q.id, opt.value)}
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                    respostas[q.id] === opt.value
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-background border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {q.type === 'text' && (
            <Input
              id={`q-${q.id}`}
              type="text"
              placeholder={q.placeholder || ''}
              value={String(respostas[q.id] ?? '')}
              onChange={(e) => onChange(q.id, e.target.value)}
              className="bg-background"
            />
          )}

          {(q.type === 'number' || q.type === 'sqft') && q.min !== undefined && q.max !== undefined && (
            <p className="text-xs text-muted-foreground">
              Entre {q.min.toLocaleString()} e {q.max.toLocaleString()} {q.unit || ''}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
