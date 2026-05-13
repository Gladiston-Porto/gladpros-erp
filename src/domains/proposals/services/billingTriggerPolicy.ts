import type { Proposta_gatilhoFaturamento } from '@prisma/client';

const SUPPORTED_BILLING_TRIGGERS = new Set<Proposta_gatilhoFaturamento>(['NA_APROVACAO']);

export function getUnsupportedBillingTrigger(trigger?: string | null): Proposta_gatilhoFaturamento | null {
  if (!trigger) return null;
  const normalized = trigger as Proposta_gatilhoFaturamento;
  return SUPPORTED_BILLING_TRIGGERS.has(normalized) ? null : normalized;
}

export function unsupportedBillingTriggerMessage(trigger: Proposta_gatilhoFaturamento) {
  return `Gatilho de faturamento "${trigger}" ainda não está habilitado em produção. Use "NA_APROVACAO" até o fluxo de invoice por marcos, entrega ou customizado estar implementado.`;
}
