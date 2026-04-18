'use client'

/**
 * PageHeader Component - Design System v2.0
 * Versão inline no projeto para garantir que os estilos funcionem
 */

import * as React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface Breadcrumb {
  label: string
  href?: string
}

export interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: Breadcrumb[]
  /**
   * @deprecated Use `actions` instead. Kept for backwards compatibility.
   * This prop will be removed in a future major release.
   */
  action?: React.ReactNode
  /**
   * Preferred prop for header actions (e.g. primary CTA button).
   */
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  action,
  actions,
  className = '',
}: PageHeaderProps) {
  // Prefer the new prop, fallback to legacy prop.
  const finalAction = actions ?? action
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-sm" role="navigation" aria-label="breadcrumbs">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors duration-150 font-medium"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Header Content */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1.5">
          <h1
            className="text-2xl font-bold text-foreground tracking-wide font-display sm:text-3xl"
          >
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground max-w-3xl sm:text-base">{description}</p>
          )}
        </div>
        {finalAction && <div className="shrink-0">{finalAction}</div>}
      </div>
    </div>
  )
}
