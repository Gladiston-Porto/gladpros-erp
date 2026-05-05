'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface EstoqueResult {
  id: number
  codigo: string
  nome: string
  saldoTotal: number
  custoMedio: number | null
  unidade?: { codigo: string; nome: string }
}

interface MaterialSearchComboboxProps {
  nome: string
  estoqueItemId?: number
  /** Called when user picks an item from the dropdown */
  onSelect: (item: {
    estoqueItemId: number
    codigo: string
    nome: string
    unidade: string
    precoSugerido: number | null
  }) => void
  /** Called when user types freely in the input (not selecting from dropdown) */
  onNomeChange: (nome: string) => void
  /** Called when user clicks "Desvincular" */
  onUnlink: () => void
  placeholder?: string
  ariaLabel?: string
}

export function MaterialSearchCombobox({
  nome,
  estoqueItemId,
  onSelect,
  onNomeChange,
  onUnlink,
  placeholder = 'Buscar no estoque ou digitar nome...',
  ariaLabel,
}: MaterialSearchComboboxProps) {
  const [query, setQuery] = useState(nome)
  const [results, setResults] = useState<EstoqueResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync internal query if external nome changes (e.g. form reset)
  useEffect(() => {
    if (!estoqueItemId) setQuery(nome)
  }, [nome, estoqueItemId])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/estoque/materiais?search=${encodeURIComponent(q)}&pageSize=10`)
      if (!res.ok) return
      const json = await res.json()
      const items: EstoqueResult[] = (json.data ?? []).map((m: Record<string, unknown>) => ({
        id: m.id as number,
        codigo: (m.codigo as string) ?? '',
        nome: m.nome as string,
        saldoTotal: Number(m.saldoTotal ?? 0),
        custoMedio: m.custoMedio != null ? Number(m.custoMedio) : null,
        unidade: m.unidade as { codigo: string; nome: string } | undefined,
      }))
      setResults(items)
      setOpen(items.length > 0)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInput = (value: string) => {
    setQuery(value)
    onNomeChange(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 300)
  }

  const handleSelect = (item: EstoqueResult) => {
    setOpen(false)
    setQuery(item.nome)
    onSelect({
      estoqueItemId: item.id,
      codigo: item.codigo,
      nome: item.nome,
      unidade: item.unidade?.codigo ?? '',
      precoSugerido: item.custoMedio,
    })
  }

  const handleUnlink = () => {
    onUnlink()
    setQuery(nome)
    setResults([])
    setOpen(false)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (estoqueItemId) {
    return (
      <div className="flex items-center gap-2 h-9">
        <span className="flex-1 text-sm font-medium truncate" title={nome}>{nome}</span>
        <Badge variant="outline" className="text-xs shrink-0 border-brand-primary text-brand-primary gap-1">
          🔗 vinculado
        </Badge>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
          onClick={handleUnlink}
          title="Desvincular do estoque (manter nome)"
        >
          Desvincular
        </Button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        className="h-9"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
      />
      {loading && (
        <span className="absolute right-2 top-2 text-xs text-muted-foreground">...</span>
      )}
      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-md max-h-60 overflow-auto text-sm"
        >
          {results.map((item) => (
            <li
              key={item.id}
              role="option"
              aria-selected={false}
              className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent gap-2"
              onMouseDown={(e) => {
                e.preventDefault() // keep focus on input until selection
                handleSelect(item)
              }}
            >
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{item.nome}</span>
                {item.codigo && (
                  <span className="text-xs text-muted-foreground">{item.codigo}</span>
                )}
              </div>
              <div className="flex flex-col items-end shrink-0 text-xs text-muted-foreground">
                <span className={item.saldoTotal > 0 ? 'text-green-600' : 'text-destructive'}>
                  {item.saldoTotal} {item.unidade?.codigo ?? 'un'}
                </span>
                {item.custoMedio != null && (
                  <span>${item.custoMedio.toFixed(2)}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
