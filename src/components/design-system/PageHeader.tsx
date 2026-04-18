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
  action?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  action,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm" role="navigation" aria-label="breadcrumbs">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-brand-primary hover:text-brand-primary-dark transition-colors font-medium"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-500 dark:text-gray-400 font-medium">{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && (
                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Header Content */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <h1
            className="text-3xl font-bold text-gray-900 dark:text-white tracking-wide font-title"
          >
            {title}
          </h1>
          {description && (
            <p className="text-base text-gray-600 dark:text-gray-300 max-w-3xl">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}
