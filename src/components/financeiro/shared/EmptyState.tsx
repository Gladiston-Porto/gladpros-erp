/**
 * EmptyState Component para Financeiro
 * Reutilizável para todas as listagens vazias
 */

import Link from 'next/link'
import { Button } from '@gladpros/ui/button'
import { EmptyState as UiEmptyState } from '@gladpros/ui/empty-state'
import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
};

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  const actions = action ? (
    <Link href={action.href}>
      <Button size="lg">{action.label}</Button>
    </Link>
  ) : undefined

  return (
    <UiEmptyState
      title={title}
      description={description}
      icon={Icon ? <Icon className="h-8 w-8" /> : undefined}
      actions={actions}
    />
  )
}
