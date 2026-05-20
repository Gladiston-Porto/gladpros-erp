/**
 * KPICard — Unit Tests
 *
 * [KPI-01] Exibe título passado como prop
 * [KPI-02] Formata valor >= 1M com sufixo $M
 * [KPI-03] Formata valor >= 1K com sufixo $K
 * [KPI-04] Formata "Taxa de Conversão" com sufixo %
 * [KPI-05] KPIGrid — Receita Total usa trend baseado em monthlyGrowth positivo → 'up'
 * [KPI-06] KPIGrid — Receita Total usa trend baseado em monthlyGrowth negativo → 'down'
 * [KPI-07] KPIGrid — Taxa de Conversão não tem trend hardcoded (P3-A corrigido)
 * [KPI-08] KPIGrid renderiza 4 cards quando todos os KPIs presentes
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { KPICard, KPIGrid } from '@/components/dashboard/KPICard';

jest.mock('@gladpros/ui/stat-card', () => ({
  StatCard: ({ title, value, change }: { title: string; value: string | number; change?: number }) => (
    <div data-testid="stat-card" data-title={title} data-change={change}>
      <span>{title}</span>
      <span data-testid="stat-value">{value}</span>
    </div>
  ),
}));

const DEFAULT_KPIS = {
  totalRevenue: 50000,
  totalClients: 12,
  totalProposals: 8,
  conversionRate: 62.5,
  monthlyGrowth: 5.2,
  activeClients: 10,
};

describe('KPICard', () => {
  test('[KPI-01] Exibe título passado como prop', () => {
    render(<KPICard title="Receita Total" value={1000} icon={<span />} />);
    expect(screen.getByText('Receita Total')).toBeInTheDocument();
  });

  test('[KPI-02] Formata valor >= 1M como $M', () => {
    render(<KPICard title="Receita" value={2500000} icon={<span />} />);
    expect(screen.getByTestId('stat-value').textContent).toBe('$2.5M');
  });

  test('[KPI-03] Formata valor >= 1K como $K', () => {
    render(<KPICard title="Receita" value={50000} icon={<span />} />);
    expect(screen.getByTestId('stat-value').textContent).toBe('$50K');
  });

  test('[KPI-04] Formata "Taxa de Conversão" com %', () => {
    render(<KPICard title="Taxa de Conversão" value={65.3} icon={<span />} />);
    expect(screen.getByTestId('stat-value').textContent).toBe('65.3%');
  });
});

describe('KPIGrid', () => {
  test('[KPI-08] Renderiza 4 cards', () => {
    render(<KPIGrid kpis={DEFAULT_KPIS} />);
    expect(screen.getAllByTestId('stat-card')).toHaveLength(4);
  });

  test('[KPI-05] Receita Total com monthlyGrowth positivo recebe change positivo', () => {
    render(<KPIGrid kpis={{ ...DEFAULT_KPIS, monthlyGrowth: 5.2 }} />);
    const receitaCard = screen.getAllByTestId('stat-card').find(
      el => el.getAttribute('data-title') === 'Receita Total'
    );
    expect(receitaCard).toBeDefined();
    expect(Number(receitaCard!.getAttribute('data-change'))).toBeGreaterThan(0);
  });

  test('[KPI-06] Receita Total com monthlyGrowth negativo recebe change negativo', () => {
    render(<KPIGrid kpis={{ ...DEFAULT_KPIS, monthlyGrowth: -3.1 }} />);
    const receitaCard = screen.getAllByTestId('stat-card').find(
      el => el.getAttribute('data-title') === 'Receita Total'
    );
    expect(Number(receitaCard!.getAttribute('data-change'))).toBeLessThan(0);
  });

  test('[KPI-07] Taxa de Conversão não tem change hardcoded (sem trend fictício)', () => {
    render(<KPIGrid kpis={DEFAULT_KPIS} />);
    const convCard = screen.getAllByTestId('stat-card').find(
      el => el.getAttribute('data-title') === 'Taxa de Conversão'
    );
    // change deve ser undefined (attr não presente) — não deve ser hardcoded como positivo
    const changeAttr = convCard!.getAttribute('data-change');
    expect(changeAttr).toBeNull();
  });
});
