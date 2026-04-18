'use client'
import React from 'react'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  small?: boolean
}

export function EmptyState({
  title = 'Nada encontrado',
  description = 'Não há itens para mostrar no momento.',
  icon,
  actions,
  className = '',
  small = false
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`} role="status" aria-live="polite">
      <div className={`${small ? 'mb-4 w-14 h-14' : 'mb-6 w-20 h-20'} rounded-2xl bg-muted/50 flex items-center justify-center`}>
        {icon ? (
          <div className="mx-auto text-muted-foreground">{icon}</div>
        ) : (
          <svg className={`${small ? 'w-8 h-8' : 'w-10 h-10'} text-muted-foreground/60`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M16 3v4M8 3v4m-5 4h18" />
          </svg>
        )}
      </div>

      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-muted-foreground max-w-md">{description}</p>}

      {actions && <div className="mt-6">{actions}</div>}
    </div>
  )
}

export default EmptyState
