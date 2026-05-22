/**
 * QuickActions — Unit Tests
 *
 * [QA-01] Renderiza todos os botões quando userRole não fornecido (graceful degradation)
 * [QA-02] ADMIN vê todas as ações (propostas:write, clientes:write, reports:read, configuracoes:read)
 * [QA-03] USUARIO não vê "Configurações" (configuracoes sem acesso para USUARIO)
 * [QA-04] CLIENTE não vê nenhuma ação (sem acesso a propostas, clientes, reports, configuracoes)
 * [QA-05] GERENTE vê propostas, clientes, relatórios mas não configurações
 * [QA-06] Callback onNewProposal disparado ao clicar em "Nova Proposta"
 * [QA-07] aria-label presente em cada botão
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickActions } from '@/components/dashboard/QuickActions';

// Mock do @gladpros/ui
jest.mock('@gladpros/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

describe('QuickActions', () => {
  test('[QA-01] Renderiza todos os botões quando userRole não fornecido', () => {
    render(<QuickActions />);
    expect(screen.getByLabelText('Nova Proposta')).toBeInTheDocument();
    expect(screen.getByLabelText('Novo Cliente')).toBeInTheDocument();
    expect(screen.getByLabelText('Relatórios')).toBeInTheDocument();
    expect(screen.getByLabelText('Configurações')).toBeInTheDocument();
  });

  test('[QA-02] ADMIN vê todas as 4 ações', () => {
    render(<QuickActions userRole="ADMIN" />);
    expect(screen.getByLabelText('Nova Proposta')).toBeInTheDocument();
    expect(screen.getByLabelText('Novo Cliente')).toBeInTheDocument();
    expect(screen.getByLabelText('Relatórios')).toBeInTheDocument();
    expect(screen.getByLabelText('Configurações')).toBeInTheDocument();
  });

  test('[QA-03] USUARIO vê apenas Novo Cliente (propostas=NONE, reports=NONE, configuracoes=NONE)', () => {
    render(<QuickActions userRole="USUARIO" />);
    // USUARIO tem clientes:RW (create) — vê Novo Cliente
    expect(screen.getByLabelText('Novo Cliente')).toBeInTheDocument();
    // USUARIO não tem propostas (NONE), reports, configuracoes
    expect(screen.queryByLabelText('Nova Proposta')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Relatórios')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Configurações')).not.toBeInTheDocument();
  });

  test('[QA-04] CLIENTE não vê nenhuma ação', () => {
    render(<QuickActions userRole="CLIENTE" />);
    expect(screen.queryByLabelText('Nova Proposta')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Novo Cliente')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Relatórios')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Configurações')).not.toBeInTheDocument();
  });

  test('[QA-05] GERENTE vê todas as 4 ações (incluindo Configurações com RO)', () => {
    render(<QuickActions userRole="GERENTE" />);
    // GERENTE tem propostas:ALL, clientes:RW, reports:RO, configuracoes:RO
    expect(screen.getByLabelText('Nova Proposta')).toBeInTheDocument();
    expect(screen.getByLabelText('Novo Cliente')).toBeInTheDocument();
    expect(screen.getByLabelText('Relatórios')).toBeInTheDocument();
    expect(screen.getByLabelText('Configurações')).toBeInTheDocument();
  });

  test('[QA-06] Callback onNewProposal disparado ao clicar', () => {
    const onNewProposal = jest.fn();
    render(<QuickActions userRole="ADMIN" onNewProposal={onNewProposal} />);
    fireEvent.click(screen.getByLabelText('Nova Proposta'));
    expect(onNewProposal).toHaveBeenCalledTimes(1);
  });

  test('[QA-07] Todos os botões têm aria-label', () => {
    render(<QuickActions userRole="ADMIN" />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn).toHaveAttribute('aria-label');
    });
  });
});
