/**
 * Funções de formatação para o módulo de Projetos
 */

import type { Projeto, ProjetoFinanceiro } from './types';
import type { ProjetoStatus, ProjetoPrioridade } from './constants';
import { PROJETO_STATUS_LABELS, PROJETO_PRIORIDADE_LABELS } from './constants';

/**
 * Formata valor monetário em USD (en-US)
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

/**
 * Formata porcentagem
 */
export function formatPercentage(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '0%';
  
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formata data (America/Chicago timezone)
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Chicago',
  }).format(dateObj);
}

/**
 * Formata data e hora (America/Chicago timezone)
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  }).format(dateObj);
}

/**
 * Formata nome do cliente (PF ou PJ)
 */
export function formatClienteName(cliente: Projeto['Cliente']): string {
  if (!cliente) return '-';
  
  if (cliente.tipo === 'PJ') {
    return cliente.razaoSocial || cliente.nomeCompleto || '-';
  }
  
  return cliente.nomeCompleto || '-';
}

/**
 * Calcula dias entre duas datas
 */
export function daysBetween(start: string | Date, end: string | Date): number {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  
  const diff = endDate.getTime() - startDate.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Verifica se o projeto está atrasado
 */
export function isProjectDelayed(projeto: Projeto): boolean {
  if (!projeto.dataConclusaoPrevista) return false;
  if (projeto.status === 'concluido' || projeto.status === 'cancelado') return false;
  
  const today = new Date();
  const deadline = new Date(projeto.dataConclusaoPrevista);
  
  return today > deadline;
}

/**
 * Calcula dias de atraso
 */
export function daysDelayed(projeto: Projeto): number {
  if (!isProjectDelayed(projeto)) return 0;
  
  const today = new Date();
  const deadline = new Date(projeto.dataConclusaoPrevista!);
  
  return daysBetween(deadline, today);
}

/**
 * Calcula progresso do projeto (0-100)
 */
export function calculateProgress(projeto: Projeto): number {
  if (projeto.status === 'concluido') return 100;
  if (projeto.status === 'cancelado') return 0;
  if (projeto.status === 'planejado') return 0;
  
  // Se tiver etapas, calcular baseado nelas
  if (projeto.Etapas && projeto.Etapas.length > 0) {
    const totalProgress = projeto.Etapas.reduce(
      (sum, etapa) => sum + Number(etapa.porcentagem),
      0
    );
    return Math.round(totalProgress / projeto.Etapas.length);
  }
  
  // Se não tiver etapas, estimar baseado nas datas
  if (projeto.dataInicioReal && projeto.dataConclusaoPrevista) {
    const total = daysBetween(projeto.dataInicioReal, projeto.dataConclusaoPrevista);
    const elapsed = daysBetween(projeto.dataInicioReal, new Date());
    
    const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
    return Math.round(progress);
  }
  
  return 0;
}

/**
 * Formata tamanho de arquivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Formata duração em horas
 */
export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return '-';
  
  if (hours < 1) {
    return `${Math.round(hours * 60)}min`;
  }
  
  return `${hours.toFixed(1)}h`;
}

/**
 * Formata lista de tags
 */
export function formatTags(tags: string[]): string {
  if (!tags || tags.length === 0) return '-';
  
  return tags.join(', ');
}

/**
 * Gera iniciais do nome
 */
export function getInitials(name: string): string {
  if (!name) return '?';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Trunca texto
 */
export function truncate(text: string, maxLength: number = 50): string {
  if (!text || text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
}

/**
 * Formata número com separador de milhares
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  
  return new Intl.NumberFormat('pt-BR').format(value);
}

/**
 * Formata status para exibição — usa PROJETO_STATUS_LABELS de constants.ts
 */
export function formatStatus(status: ProjetoStatus): string {
  return PROJETO_STATUS_LABELS[status] ?? status;
}

/**
 * Formata prioridade para exibição — usa PROJETO_PRIORIDADE_LABELS de constants.ts
 */
export function formatPriority(prioridade: ProjetoPrioridade): string {
  return PROJETO_PRIORIDADE_LABELS[prioridade] ?? prioridade;
}

/**
 * Calcula cor do progresso
 */
export function getProgressColor(progress: number): string {
  if (progress >= 75) return 'bg-green-500';
  if (progress >= 50) return 'bg-blue-500';
  if (progress >= 25) return 'bg-yellow-500';
  return 'bg-orange-500';
}

/**
 * Formata período de datas
 */
export function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return '-';
  if (!start) return `Até ${formatDate(end)}`;
  if (!end) return `A partir de ${formatDate(start)}`;
  
  return `${formatDate(start)} - ${formatDate(end)}`;
}

/**
 * Calcula tempo restante
 */
export function timeRemaining(endDate: string | Date): string {
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const now = new Date();
  const days = daysBetween(now, end);
  
  if (days < 0) return 'Atrasado';
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  if (days <= 7) return `${days} dias`;
  if (days <= 30) return `${Math.ceil(days / 7)} semanas`;
  return `${Math.ceil(days / 30)} meses`;
}

/**
 * Formata resumo financeiro
 */
export function formatFinancialSummary(financeiro: ProjetoFinanceiro): {
  valorEstimado: string;
  custoTotal: string;
  margem: string;
  lucro: string;
  variacao: string;
} {
  const custoTotal = financeiro.custoReal || financeiro.custoPrevisto || 0;
  const margem = financeiro.margemReal !== null ? financeiro.margemReal : financeiro.margemPrevista || 0;
  const lucro = financeiro.lucroReal !== null ? financeiro.lucroReal : financeiro.lucroPrevisto || 0;
  const variacao = financeiro.custoReal && financeiro.custoPrevisto
    ? ((financeiro.custoReal - financeiro.custoPrevisto) / financeiro.custoPrevisto) * 100
    : 0;
  
  return {
    valorEstimado: formatCurrency(financeiro.valorEstimado),
    custoTotal: formatCurrency(custoTotal),
    margem: formatPercentage(margem),
    lucro: formatCurrency(lucro),
    variacao: `${variacao >= 0 ? '+' : ''}${formatPercentage(variacao)}`,
  };
}
