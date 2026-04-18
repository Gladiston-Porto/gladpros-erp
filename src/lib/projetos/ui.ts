import type { ComponentProps } from 'react'
import { Badge } from '@gladpros/ui/badge'

import type { ProjetoPrioridade, ProjetoStatus } from './constants'

export type BadgeVariant = ComponentProps<typeof Badge>['variant']

export const STATUS_BADGE_VARIANTS: Record<ProjetoStatus, BadgeVariant> = {
  planejado: 'projectPlanning',
  em_andamento: 'projectActive',
  pausado: 'projectOnHold',
  concluido: 'projectCompleted',
  cancelado: 'projectCancelled',
}

export const PRIORITY_BADGE_VARIANTS: Record<ProjetoPrioridade, BadgeVariant> = {
  baixa: 'secondary',
  media: 'info',
  alta: 'warning',
  urgente: 'error',
}

export function getHealthBadge(
  { delayed, daysLate, overBudget }: { delayed: boolean; daysLate: number; overBudget: boolean }
): { variant: BadgeVariant; label: string } {
  if (overBudget || (delayed && daysLate > 7)) {
    return { variant: 'error', label: `Crítico • ${daysLate || 0}d` }
  }

  if (delayed || daysLate > 0) {
    return { variant: 'warning', label: `Atenção • ${daysLate}d` }
  }

  return { variant: 'success', label: 'No prazo' }
}
