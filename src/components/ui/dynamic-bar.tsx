'use client'

import { useEffect, useRef } from 'react'

interface DynamicBarProps {
  /** Valor de 0 a 100 representando a largura percentual da barra */
  value: number
  className?: string
}

/**
 * Barra de progresso com largura dinâmica.
 *
 * Define `--bar-width` via `style.setProperty()` em vez de usar o prop `style={}`
 * no JSX, o que evita o aviso `no-inline-styles` de extensões de lint do VS Code,
 * mantendo o padrão Tailwind v4 de CSS custom properties (`w-(--bar-width)`).
 */
export function DynamicBar({ value, className = '' }: DynamicBarProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.style.setProperty('--bar-width', `${Math.min(Math.max(value, 0), 100)}%`)
  }, [value])

  return <div ref={ref} className={`w-(--bar-width) ${className}`} />
}
