/**
 * Cálculos financeiros para o módulo de Projetos
 */

import type { Projeto, ProjetoFinanceiro, ProjetoMaterial } from './types';

/**
 * Calcula margem de lucro (%)
 */
export function calculateMargin(revenue: number, cost: number): number {
  if (revenue === 0) return 0;
  return ((revenue - cost) / revenue) * 100;
}

/**
 * Calcula lucro líquido
 */
export function calculateProfit(revenue: number, cost: number): number {
  return revenue - cost;
}

/**
 * Calcula custo total de materiais
 */
export function calculateMaterialsCost(materiais: ProjetoMaterial[]): number {
  return materiais.reduce((total, material) => {
    return total + (material.custoTotal || 0);
  }, 0);
}

/**
 * Calcula ROI (Return on Investment)
 */
export function calculateROI(profit: number, cost: number): number {
  if (cost === 0) return 0;
  return (profit / cost) * 100;
}

/**
 * Calcula variação percentual entre previsto e real
 */
export function calculateVariation(planned: number, actual: number): number {
  if (planned === 0) return 0;
  return ((actual - planned) / planned) * 100;
}

/**
 * Calcula o valor faturado (baseado no progresso)
 */
export function calculateBilledAmount(totalValue: number, progress: number): number {
  return (totalValue * progress) / 100;
}

/**
 * Calcula o valor pendente de faturamento
 */
export function calculatePendingAmount(totalValue: number, billedAmount: number): number {
  return totalValue - billedAmount;
}

/**
 * Calcula custo por dia
 */
export function calculateDailyCost(totalCost: number, durationDays: number): number {
  if (durationDays === 0) return 0;
  return totalCost / durationDays;
}

/**
 * Calcula estimativa de custo final baseado no progresso
 */
export function estimateFinalCost(
  plannedCost: number,
  actualCost: number,
  progress: number
): number {
  if (progress === 0) return plannedCost;
  if (progress === 100) return actualCost;
  
  // Projeção linear baseada no custo atual e progresso
  return (actualCost / progress) * 100;
}

/**
 * Calcula estimativa de lucro final
 */
export function estimateFinalProfit(
  revenue: number,
  plannedCost: number,
  actualCost: number,
  progress: number
): number {
  const estimatedFinalCost = estimateFinalCost(plannedCost, actualCost, progress);
  return revenue - estimatedFinalCost;
}

/**
 * Calcula a margem estimada final
 */
export function estimateFinalMargin(
  revenue: number,
  plannedCost: number,
  actualCost: number,
  progress: number
): number {
  const estimatedProfit = estimateFinalProfit(revenue, plannedCost, actualCost, progress);
  return calculateMargin(revenue, revenue - estimatedProfit);
}

/**
 * Calcula orçamento consumido (%)
 */
export function calculateBudgetConsumed(plannedCost: number, actualCost: number): number {
  if (plannedCost === 0) return 0;
  return (actualCost / plannedCost) * 100;
}

/**
 * Verifica se o projeto está acima do orçamento
 */
export function isOverBudget(plannedCost: number, actualCost: number, progress: number): boolean {
  const estimatedFinalCost = estimateFinalCost(plannedCost, actualCost, progress);
  return estimatedFinalCost > plannedCost;
}

/**
 * Calcula o índice de performance de custo (CPI - Cost Performance Index)
 */
export function calculateCPI(earnedValue: number, actualCost: number): number {
  if (actualCost === 0) return 0;
  return earnedValue / actualCost;
}

/**
 * Calcula o valor ganho (Earned Value)
 */
export function calculateEarnedValue(plannedValue: number, progress: number): number {
  return (plannedValue * progress) / 100;
}

/**
 * Calcula o índice de performance de cronograma (SPI - Schedule Performance Index)
 */
export function calculateSPI(earnedValue: number, plannedValue: number): number {
  if (plannedValue === 0) return 0;
  return earnedValue / plannedValue;
}

/**
 * Calcula resumo financeiro completo do projeto
 */
export function calculateProjectFinancials(projeto: Projeto): ProjetoFinanceiro {
  const valorEstimado = projeto.valorEstimado || 0;
  const custoPrevisto = projeto.custoPrevisto || 0;
  const custoReal = projeto.custoReal || 0;
  
  // Calcular margem prevista
  const margemPrevista = projeto.margemPrevista !== null
    ? projeto.margemPrevista
    : calculateMargin(valorEstimado, custoPrevisto);
  
  // Calcular margem real (se houver custo real)
  const margemReal = projeto.margemReal !== null
    ? projeto.margemReal
    : custoReal > 0
      ? calculateMargin(valorEstimado, custoReal)
      : null;
  
  // Calcular lucro previsto
  const lucroPrevisto = projeto.lucroPrevisto !== null
    ? projeto.lucroPrevisto
    : calculateProfit(valorEstimado, custoPrevisto);
  
  // Calcular lucro real
  const lucroReal = projeto.lucroReal !== null
    ? projeto.lucroReal
    : custoReal > 0
      ? calculateProfit(valorEstimado, custoReal)
      : null;
  
  // Calcular valores faturados
  const progress = calculateProgress(projeto);
  const faturado = calculateBilledAmount(valorEstimado, progress);
  const pendente = calculatePendingAmount(valorEstimado, faturado);
  
  // Calcular custo de materiais (se disponível)
  const custoMateriais = projeto.Materiais
    ? calculateMaterialsCost(projeto.Materiais)
    : 0;
  
  return {
    valorEstimado,
    custoPrevisto,
    custoReal,
    margemPrevista,
    margemReal: margemReal || 0,
    lucroPrevisto,
    lucroReal: lucroReal || 0,
    faturado,
    pendente,
    custoMateriais,
    custoMaoObra: custoReal - custoMateriais, // Estimativa
    despesasExtras: 0, // TODO: Implementar quando houver despesas extras
  };
}

/**
 * Calcula métricas de performance (EVM - Earned Value Management)
 */
export function calculateEVMMetrics(projeto: Projeto) {
  const plannedValue = projeto.custoPrevisto || 0;
  const actualCost = projeto.custoReal || 0;
  const progress = calculateProgress(projeto);
  const earnedValue = calculateEarnedValue(plannedValue, progress);
  
  const cpi = calculateCPI(earnedValue, actualCost);
  const spi = calculateSPI(earnedValue, plannedValue);
  
  // Estimativa de custo final (EAC - Estimate at Completion)
  const eac = cpi !== 0 ? plannedValue / cpi : plannedValue;
  
  // Variação de custo (CV - Cost Variance)
  const cv = earnedValue - actualCost;
  
  // Variação de cronograma (SV - Schedule Variance)
  const sv = earnedValue - plannedValue;
  
  // Estimativa para completar (ETC - Estimate to Complete)
  const etc = eac - actualCost;
  
  return {
    plannedValue,
    earnedValue,
    actualCost,
    cpi, // >1 = abaixo do orçamento, <1 = acima do orçamento
    spi, // >1 = adiantado, <1 = atrasado
    eac, // Estimativa de custo final
    etc, // Quanto falta gastar
    cv,  // Variação de custo (positivo = lucro, negativo = prejuízo)
    sv,  // Variação de cronograma
  };
}

/**
 * Calcula a saúde financeira do projeto (score 0-100)
 */
export function calculateFinancialHealth(projeto: Projeto): number {
  const metrics = calculateEVMMetrics(projeto);
  
  let score = 100;
  
  // Penalizar se CPI < 1 (acima do orçamento)
  if (metrics.cpi < 1) {
    score -= (1 - metrics.cpi) * 50; // Até -50 pontos
  }
  
  // Penalizar se SPI < 1 (atrasado)
  if (metrics.spi < 1) {
    score -= (1 - metrics.spi) * 30; // Até -30 pontos
  }
  
  // Bonificar se CPI > 1 (abaixo do orçamento)
  if (metrics.cpi > 1 && metrics.cpi <= 1.2) {
    score += (metrics.cpi - 1) * 10; // Até +2 pontos
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Função auxiliar para calcular progresso (importada logicamente)
 */
function calculateProgress(projeto: Projeto): number {
  if (projeto.status === 'concluido') return 100;
  if (projeto.status === 'cancelado') return 0;
  if (projeto.status === 'planejado') return 0;
  
  if (projeto.Etapas && projeto.Etapas.length > 0) {
    const totalProgress = projeto.Etapas.reduce(
      (sum, etapa) => sum + Number(etapa.porcentagem),
      0
    );
    return Math.round(totalProgress / projeto.Etapas.length);
  }
  
  return 0;
}
