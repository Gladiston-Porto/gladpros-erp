'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import React from 'react'

interface BreadcrumbItem {
  label: string
  href: string
  current?: boolean
}

interface BreadcrumbsProps {
  customItems?: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ customItems, className = '' }: BreadcrumbsProps) {
  // Basic generation: if custom items not provided, return null (apps should pass breadcrumbs)
  const items = customItems || []
  if (items.length === 0) return null

  return (
    <nav aria-label="Navegação estrutural" className={`flex items-center space-x-2 text-sm text-muted-foreground ${className}`}>
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground/50" />}

            {index === 0 ? (
              <Link href={item.href} className="flex items-center hover:text-foreground transition-colors" aria-label={`Ir para ${item.label}`}>
                <Home className="h-4 w-4" />
                <span className="sr-only">{item.label}</span>
              </Link>
            ) : item.current ? (
              <span className="font-medium text-foreground" aria-current="page">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-foreground transition-colors" aria-label={`Ir para ${item.label}`}>
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
