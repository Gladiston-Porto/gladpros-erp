/**
 * Empty State Component
 * Exibe mensagem quando não há dados
 */

import Link from 'next/link'
import { Button } from '@gladpros/ui/button'
import { EmptyState as UiEmptyState } from '@gladpros/ui/empty-state'
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

export default function EmptyState({ title, description, action, icon: Icon }: EmptyStateProps) {
  const actions = action ? (
    <Link href={action.href}>
      <Button>{action.label}</Button>
    </Link>
  ) : undefined

  return (
    <UiEmptyState
      title={title}
      description={description}
      icon={Icon ? <Icon className="h-10 w-10 text-muted-foreground" /> : undefined}
      actions={actions}
    />
  )
}
