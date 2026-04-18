"use client"

/**
 * DataTableHeader — GladPros Design System v3.1
 *
 * Header de seção para tabelas/listas de módulo.
 * Direção estética: "Precision Engineering"
 *
 * Uso:
 *   <DataTableHeader
 *     title="Materiais"
 *     total={248}
 *     onSearch={setQuery}
 *     actions={<Button><Plus /> Novo</Button>}
 *   />
 */

import * as React from "react"
import { Search, X } from "lucide-react"
import { cn } from "../utils/cn"

export interface DataTableHeaderProps {
  /** Título da seção */
  title: string
  /** Contagem total de registros (opcional) */
  total?: number
  /** Placeholder do campo de busca */
  searchPlaceholder?: string
  /** Callback ao digitar na busca */
  onSearch?: (value: string) => void
  /** Valor controlado da busca */
  searchValue?: string
  /** Slot de ações (botões: Novo, Exportar, Filtrar…) */
  actions?: React.ReactNode
  /** Slot de filtros avançados abaixo da linha principal */
  filters?: React.ReactNode
  /**
   * Cor de acento do indicador do título.
   * @default "var(--color-brand-primary)"
   */
  accentColor?: string
  className?: string
}

export function DataTableHeader({
  title,
  total,
  searchPlaceholder = "Buscar…",
  onSearch,
  searchValue,
  actions,
  filters,
  accentColor = "var(--color-brand-primary)",
  className,
}: DataTableHeaderProps) {
  const [internalValue, setInternalValue] = React.useState("")
  const isControlled = searchValue !== undefined
  const currentValue = isControlled ? searchValue : internalValue

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) setInternalValue(e.target.value)
    onSearch?.(e.target.value)
  }

  const handleClear = () => {
    if (!isControlled) setInternalValue("")
    onSearch?.("")
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Linha principal ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Título da seção com indicador colorido */}
        <div className="flex items-center gap-2.5 mr-auto">
          <div
            className="size-1.5 rounded-full shrink-0"
            style={{ background: accentColor }}
            aria-hidden
          />
          <h2 className="text-sm font-semibold text-foreground tracking-wide">
            {title}
          </h2>
          {total !== undefined && (
            <span className="text-[11px] font-medium text-muted-foreground tabular-nums bg-muted px-1.5 py-0.5 rounded">
              {total.toLocaleString("en-US")}
            </span>
          )}
        </div>

        {/* Campo de busca ─────────────────────────────────────────── */}
        {onSearch !== undefined && (
          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={currentValue}
              onChange={handleChange}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className={cn(
                // Base
                "h-8 w-[200px] pl-8 pr-7 text-sm",
                "rounded-lg border border-border bg-muted/40 text-foreground",
                "placeholder:text-muted-foreground/60",
                // Focus
                "outline-none transition-all duration-150",
                "focus:w-[260px] focus:border-[color:var(--color-brand-primary)]/50",
                "focus:bg-background focus:ring-2 focus:ring-[color:var(--color-brand-primary)]/15",
              )}
              style={{ "--color-brand-primary": "var(--color-brand-primary)" } as React.CSSProperties}
            />
            {currentValue && (
              <button
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Limpar busca"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Slot de ações */}
        {actions && (
          <div className="flex items-center gap-2">{actions}</div>
        )}
      </div>

      {/* Filtros avançados (slot opcional) ──────────────────────── */}
      {filters && (
        <div className="flex flex-wrap items-center gap-2">
          {filters}
        </div>
      )}
    </div>
  )
}
