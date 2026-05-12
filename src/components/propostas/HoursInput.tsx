'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@gladpros/ui/input'

/** Converte decimal de horas para "H:MM" (ex: 2.5 → "2:30") */
export function hoursToTime(hours: number | undefined): string {
  if (!hours || isNaN(hours) || hours < 0) return ''
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}:${m.toString().padStart(2, '0')}`
}

/** Converte "H:MM" para decimal de horas (ex: "2:30" → 2.5). Retorna 0 se inválido. */
export function timeToHours(value: string): number {
  const clean = value.trim()
  if (!clean) return 0
  // Aceita "2:30", "2.5", "2", "230" (sem separador)
  if (clean.includes(':')) {
    const [hStr, mStr] = clean.split(':')
    const h = parseInt(hStr || '0', 10)
    const m = parseInt((mStr || '0').substring(0, 2).padEnd(2, '0'), 10)
    if (isNaN(h) || isNaN(m) || m >= 60) return 0
    return h + m / 60
  }
  // Número puro (ex: "2.5" ou "3")
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}

interface HoursInputProps {
  value?: number        // armazenado em horas decimais
  onChange: (hours: number) => void
  className?: string
  'aria-label'?: string
  disabled?: boolean
}

/**
 * Input de horas no formato "H:MM".
 * Internamente armazena e retorna horas decimais (ex: 2.5 para 2:30).
 */
export function HoursInput({ value, onChange, className, 'aria-label': ariaLabel, disabled }: HoursInputProps) {
  const [display, setDisplay] = useState<string>(() => hoursToTime(value))
  const [focused, setFocused] = useState(false)
  const lastValueRef = useRef(value)

  // Sincroniza quando o valor externo muda (ex: ao aplicar template)
  useEffect(() => {
    if (!focused && value !== lastValueRef.current) {
      setDisplay(hoursToTime(value))
      lastValueRef.current = value
    }
  }, [value, focused])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setDisplay(raw)
    // Converte e notifica a cada keystroke para manter estado sincronizado
    onChange(timeToHours(raw))
  }

  const handleBlur = () => {
    setFocused(false)
    const hours = timeToHours(display)
    lastValueRef.current = hours
    setDisplay(hoursToTime(hours)) // Formata ao perder foco (ex: "2:3" → "2:30")
    onChange(hours)
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true)
    e.target.select()
  }

  return (
    <Input
      className={className}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder="0:00"
      inputMode="numeric"
      aria-label={ariaLabel}
      disabled={disabled}
    />
  )
}
