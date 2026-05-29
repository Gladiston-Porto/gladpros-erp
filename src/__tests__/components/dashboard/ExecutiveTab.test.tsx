import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ExecutiveTab from '@/components/dashboard/ExecutiveTab';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock('@gladpros/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock('@gladpros/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@gladpros/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@gladpros/ui/finance-card', () => ({
  FinanceCard: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock('@gladpros/ui/page-header', () => ({
  PageHeader: ({ title, action }: { title: string; action?: React.ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {action}
    </header>
  ),
}));

const buildExecutivePayload = (currentUserRole: string) => ({
  data: {
    period: '30d',
    permissions: { canViewFinancials: currentUserRole !== 'USUARIO', currentUserRole },
    kpis: {
      receitaTotal: 1000,
      despesaTotal: 500,
      saldoPeriodo: 500,
      saldoContas: 2000,
      crescimentoReceita: 10,
      projetosAtivos: 2,
      projetosAtrasados: 0,
      projetosSobreOrcamento: 0,
      workersAtivos: 3,
      clientesAtivos: 4,
      propostasTotal: 5,
      propostasAprovadas: 2,
      propostasPendentes: 1,
      produtosTotal: 6,
      estoqueTotal: 20,
      movimentacoesRecentes: 1,
      invoicesTotal: 7,
      invoicesFaturamento: 1500,
    },
    projetos: [],
    alertas: [],
  },
  success: true,
});

describe('ExecutiveTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test('@bug:DASHBOARD-P2-001 — USUARIO não vê links rápidos sem permissão', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => buildExecutivePayload('USUARIO'),
    });

    render(<ExecutiveTab period="30d" />);

    await waitFor(() => expect(screen.getByText('Acesso Rápido')).toBeInTheDocument());
    expect(screen.queryByLabelText('Financeiro')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('RH')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Propostas')).not.toBeInTheDocument();
    expect(screen.queryByText('Ver relatório')).not.toBeInTheDocument();

    expect(screen.getByLabelText('Projetos')).toBeInTheDocument();
    expect(screen.getByLabelText('Clientes')).toBeInTheDocument();
    expect(screen.getByLabelText('Estoque')).toBeInTheDocument();
    expect(screen.getByLabelText('Invoices')).toBeInTheDocument();
  });

  test('@bug:DASHBOARD-P2-003 — relatório aponta para rota existente', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => buildExecutivePayload('GERENTE'),
    });

    render(<ExecutiveTab period="30d" />);

    await waitFor(() => expect(screen.getByText('Ver relatório')).toBeInTheDocument());
    expect(screen.getByText('Ver relatório').closest('a')).toHaveAttribute(
      'href',
      '/relatorios/financeiro-executivo',
    );
  });
});
