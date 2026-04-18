"use client"

/**
 * ModulePageHeader — GladPros Design System v3.1
 *
 * Direção estética: "Precision Engineering"
 * Inspirado em dashboards aeroespaciais e Linear.app.
 * Identidade por módulo via accent color. Sem hero genérico.
 *
 * Uso:
 *   <ModulePageHeader
 *     title="Estoque"
 *     description="Materiais, equipamentos e movimentações"
 *     icon={<Package />}
 *     accentColor="#0098DA"
 *     breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Estoque' }]}
 *     actions={<Button>Nova Compra</Button>}
 *   />
 */

import * as React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "../utils/cn"

export interface ModuleBreadcrumb {
  label: string
  href?: string
}

export interface ModulePageHeaderProps {
  /** Título do módulo — fonte Neuropol */
  title: string
  /** Subtítulo/descrição curta */
  description?: string
  /** Ícone Lucide do módulo */
  icon?: React.ReactNode
  /**
   * Cor de acento do módulo — usada na barra superior e no ícone.
   * Usar as CSS variables da marca: ex: "var(--color-brand-primary)"
   * ou hex direto: "#0098DA"
   * @default "var(--color-brand-primary)"
   */
  accentColor?: string
  /** Breadcrumbs de navegação */
  breadcrumbs?: ModuleBreadcrumb[]
  /** Slot de ações (botões CTA) */
  actions?: React.ReactNode
  /** Badges/status extras ao lado do título */
  badges?: React.ReactNode
  className?: string
}

export function ModulePageHeader({
  title,
  description,
  icon,
  accentColor = "var(--color-brand-primary)",
  breadcrumbs,
  actions,
  badges,
  className,
}: ModulePageHeaderProps) {
  return (
    <div className={cn("relative", className)}>
      {/* ── Barra de acento superior (identidade do módulo) ──────────── */}
      <div
        className="absolute inset-x-0 top-0 h-[3px] rounded-t-sm"
        style={{ background: accentColor }}
        aria-hidden
      />

      {/* ── Container principal ──────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card pt-5 pb-4 px-5 shadow-card">

        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            className="mb-3 flex items-center gap-1 text-[11px] font-medium tracking-wide"
            aria-label="Navegação"
          >
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
                {i < breadcrumbs.length - 1 && (
                  <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Linha principal: ícone + título + ações */}
        <div className="flex items-start gap-4">
          {/* Ícone do módulo */}
          {icon && (
            <div
              className="shrink-0 grid place-content-center size-11 rounded-lg [&_svg]:size-5 text-white shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${accentColor}cc 0%, ${accentColor} 100%)`,
              }}
            >
              {icon}
            </div>
          )}

          {/* Título + descrição + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1
                className="font-display text-2xl font-bold text-foreground tracking-wide leading-tight sm:text-3xl"
                style={{ fontFamily: "'Neuropol', Impact, 'Arial Black', sans-serif" }}
              >
                {title}
              </h1>
              {badges && (
                <div className="flex items-center gap-1.5">{badges}</div>
              )}
            </div>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground max-w-2xl">{description}</p>
            )}
          </div>

          {/* Slot de ações */}
          {actions && (
            <div className="shrink-0 flex items-center gap-2">{actions}</div>
          )}
        </div>

        {/* Linha de separação inferior — sutil */}
        <div className="mt-4 h-px bg-border/50" />
      </div>
    </div>
  )
}
