/**
 * Empty State Component
 * Exibe mensagem quando não há dados
 */

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
  icon?: LucideIcon;
};

export function EmptyState({ title, description, action, icon: Icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6" role="status" aria-live="polite">
      <div className="mb-6 w-24 h-24 flex items-center justify-center mx-auto">
        {Icon ? (
          <Icon className="h-16 w-16 text-gray-300" />
        ) : (
          <svg className="w-24 h-24 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M16 3v4M8 3v4m-5 4h18" />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-600 max-w-xl">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          <Link
            href={action.href}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            {action.label}
          </Link>
        </div>
      )}
    </div>
  )
}
