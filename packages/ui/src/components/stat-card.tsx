"use client"

/**
 * StatCard — GladPros Design System v3.1
 *
 * Direção estética: "Precision Engineering"
 * Hierarquia clara: número domina, label discreto, tendência precisa.
 * Acento lateral colorido dá identidade sem poluição visual.
 *
 * Uso:
 *   <StatCard title="Materiais" value={248} icon={<Package />} variant="default" />
 *   <StatCard title="Receita" value={32500} currency="USD" change={12.4} variant="income" />
 */

import * as React from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../utils/cn"

/* ─────────────────────────────────────────────────────────────────── */
/* Accent border — identidade do tipo de métrica                       */
/* ─────────────────────────────────────────────────────────────────── */
const accentBorderVariants = cva("absolute inset-y-0 left-0 w-[3px] rounded-l-xl", {
  variants: {
    variant: {
      default:  "bg-[#0098DA]",
      income:   "bg-emerald-500",
      expense:  "bg-rose-500",
      warning:  "bg-amber-500",
      orange:   "bg-[#FF8C00]",
      purple:   "bg-violet-500",
      muted:    "bg-muted-foreground/30",
    },
  },
  defaultVariants: { variant: "default" },
})

/* ─────────────────────────────────────────────────────────────────── */
/* Icon — canto superior direito, sutil, na cor do acento              */
/* ─────────────────────────────────────────────────────────────────── */
const iconColorVariants = cva("[&_svg]:size-4 opacity-40", {
  variants: {
    variant: {
      default:  "text-[#0098DA]",
      income:   "text-emerald-500",
      expense:  "text-rose-500",
      warning:  "text-amber-500",
      orange:   "text-[#FF8C00]",
      purple:   "text-violet-500",
      muted:    "text-muted-foreground",
    },
  },
  defaultVariants: { variant: "default" },
})

/* ─────────────────────────────────────────────────────────────────── */
/* Props                                                                */
/* ─────────────────────────────────────────────────────────────────── */
export interface StatCardProps extends VariantProps<typeof accentBorderVariants> {
  /** Label da métrica */
  title: string
  /** Valor principal — string já formatada ou número */
  value: string | number
  /** Linha descritiva abaixo da variação */
  description?: string
  /**
   * Variação percentual — positivo = verde, negativo = vermelho.
   * ex: 12.5 = +12,5%
   */
  change?: number
  /** Texto junto ao change */
  changeLabel?: string
  /** Ícone Lucide */
  icon?: React.ReactNode
  /** Formatar value como moeda */
  currency?: string
  /** Formatar value como porcentagem */
  asPercent?: boolean
  /** Omitir linha de variação/descrição */
  compact?: boolean
  className?: string
}

/* ─────────────────────────────────────────────────────────────────── */
/* Componente                                                           */
/* ─────────────────────────────────────────────────────────────────── */
export function StatCard({
  title,
  value,
  description,
  change,
  changeLabel = "vs período anterior",
  icon,
  variant,
  currency,
  asPercent,
  compact = false,
  className,
}: StatCardProps) {
  /* Formatar valor principal */
  const displayValue = React.useMemo(() => {
    if (typeof value === "string") return value
    if (asPercent) return `${value.toFixed(1)}%`
    if (currency) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    }
    return value.toLocaleString("en-US")
  }, [value, currency, asPercent])

  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0

  return (
    <div
      className={cn(
        // Base
        "relative overflow-hidden rounded-xl border border-border bg-card",
        "pl-5 pr-4 pt-4 pb-4",
        "shadow-card transition-shadow duration-200 hover:shadow-card-hover",
        className
      )}
    >
      {/* Accent border esquerdo */}
      <div className={cn(accentBorderVariants({ variant }))} aria-hidden />

      {/* Ícone — canto superior direito, fantasma */}
      {icon && (
        <div
          className={cn(
            "absolute top-3.5 right-3.5",
            iconColorVariants({ variant })
          )}
          aria-hidden
        >
          {icon}
        </div>
      )}

      {/* Label — uppercase pequeno */}
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground pr-6">
        {title}
      </p>

      {/* Valor principal — domina o card */}
      <p className="mt-1.5 text-3xl font-bold text-foreground tabular-nums leading-none">
        {displayValue}
      </p>

      {/* Linha de tendência + descrição */}
      {!compact && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {change !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded",
                isPositive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : isNegative
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {isPositive
                ? <TrendingUp className="size-3" />
                : isNegative
                  ? <TrendingDown className="size-3" />
                  : <Minus className="size-3" />}
              {change > 0 ? "+" : ""}{change.toFixed(1)}%
            </span>
          )}
          {(description || (change !== undefined && changeLabel)) && (
            <p className="text-[11px] text-muted-foreground truncate">
              {description ?? changeLabel}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
