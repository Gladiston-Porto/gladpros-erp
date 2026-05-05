/**
 * Project Health Score — pure calculation utilities (zero external deps)
 *
 * Score breakdown (100 pts total):
 *   40 pts — Stage progress (avg porcentagem of all stages)
 *   40 pts — Schedule adherence (stages past fimPrevisto and NOT concluded)
 *   20 pts — Budget (custoReal vs custoPrevisto ratio)
 *
 * Labels:
 *   Verde    → score ≥ 75
 *   Amarelo  → score 50–74
 *   Vermelho → score < 50
 */

export type HealthLabel = 'verde' | 'amarelo' | 'vermelho';

export interface ProjectHealthResult {
  score: number;
  label: HealthLabel;
  progresso: number;        // 0-100 — avg stage porcentagem
  etapasConcluidas: number;
  etapasAtrasadas: number;
}

export interface EtapaHealthData {
  status: string;
  porcentagem: number | null;
  fimPrevisto: Date | string | null;
}

/**
 * Computes the Project Health Score from raw stage + financial data.
 * Returns null for cancelled projects (no meaningful score to show).
 */
export function calcularHealthScore(
  projeto: {
    status: string;
    custoPrevisto?: number | null;
    custoReal?: number | null;
  },
  etapas: EtapaHealthData[]
): ProjectHealthResult | null {
  if (projeto.status === 'cancelado') return null;

  if (projeto.status === 'concluido') {
    return {
      score: 100,
      label: 'verde',
      progresso: 100,
      etapasConcluidas: etapas.filter((e) => e.status === 'concluida').length,
      etapasAtrasadas: 0,
    };
  }

  const now = new Date();

  // ── Component 1: Stage progress (40 pts) ─────────────────────────────────
  const etapasConcluidas = etapas.filter((e) => e.status === 'concluida').length;
  const totalEtapas = etapas.length;
  let progresso = 0;
  let progressScore: number;

  if (totalEtapas > 0) {
    const totalPorcentagem = etapas.reduce(
      (sum, e) => sum + (Number(e.porcentagem) || 0),
      0
    );
    progresso = Math.round(totalPorcentagem / totalEtapas);
    progressScore = (progresso / 100) * 40;
  } else {
    // No stages defined → no penalty, give full marks
    progressScore = 40;
  }

  // ── Component 2: Schedule adherence (40 pts) ─────────────────────────────
  const etapasComPrazo = etapas.filter((e) => e.fimPrevisto !== null);
  let etapasAtrasadas = 0;
  let prazoScore: number;

  if (etapasComPrazo.length > 0) {
    etapasAtrasadas = etapasComPrazo.filter((e) => {
      const fim = new Date(e.fimPrevisto!);
      return fim < now && e.status !== 'concluida' && e.status !== 'cancelada';
    }).length;
    const ratioOnTime = 1 - etapasAtrasadas / etapasComPrazo.length;
    prazoScore = Math.round(ratioOnTime * 40);
  } else {
    // No stage deadlines → no penalty
    prazoScore = 40;
  }

  // ── Component 3: Budget adherence (20 pts) ───────────────────────────────
  const custoPrevisto = Number(projeto.custoPrevisto) || 0;
  const custoReal = Number(projeto.custoReal) || 0;
  let orcamentoScore = 20;

  if (custoPrevisto > 0 && custoReal > 0) {
    const ratio = custoReal / custoPrevisto;
    if (ratio <= 1.0) orcamentoScore = 20;
    else if (ratio <= 1.1) orcamentoScore = 15;
    else if (ratio <= 1.25) orcamentoScore = 10;
    else if (ratio <= 1.5) orcamentoScore = 5;
    else orcamentoScore = 0;
  }

  const score = Math.round(progressScore + prazoScore + orcamentoScore);
  const label: HealthLabel = score >= 75 ? 'verde' : score >= 50 ? 'amarelo' : 'vermelho';

  return { score, label, progresso, etapasConcluidas, etapasAtrasadas };
}

/**
 * Calculates the % progress of a project from its stages.
 * Falls back to 0 if no stages are present.
 */
export function calcularProgresso(etapas: EtapaHealthData[], status: string): number {
  if (status === 'concluido') return 100;
  if (status === 'cancelado' || status === 'planejado') return 0;
  if (etapas.length === 0) return 0;

  const total = etapas.reduce((sum, e) => sum + (Number(e.porcentagem) || 0), 0);
  return Math.round(total / etapas.length);
}
