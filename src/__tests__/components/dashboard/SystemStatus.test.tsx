/**
 * SystemStatus — Unit Tests
 *
 * [SS-01] Renderiza ícone e badge "Online" para status online
 * [SS-02] Renderiza ícone e badge "Aviso" para status warning
 * [SS-03] Renderiza ícone e badge "Offline" para status offline
 * [SS-04] Não renderiza lastBackup ou uptime (removidos — eram dados falsos)
 * [SS-05] Mostra Database e API como únicos itens de status
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SystemStatus } from '@/components/dashboard/SystemStatus';

jest.mock('@gladpros/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@gladpros/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  ),
}));

describe('SystemStatus', () => {
  test('[SS-01] Renderiza badges Online para database e api online', () => {
    render(<SystemStatus database="online" api="online" />);
    const badges = screen.getAllByText('Online');
    expect(badges).toHaveLength(2);
  });

  test('[SS-02] Renderiza badge Aviso para status warning', () => {
    render(<SystemStatus database="warning" api="online" />);
    expect(screen.getByText('Aviso')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  test('[SS-03] Renderiza badge Offline para status offline', () => {
    render(<SystemStatus database="offline" api="online" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  test('[SS-04] Não renderiza campos lastBackup ou uptime', () => {
    const { container } = render(<SystemStatus database="online" api="online" />);
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain('backup');
    expect(html).not.toContain('uptime');
  });

  test('[SS-05] Exibe Database e API como status items', () => {
    render(<SystemStatus database="online" api="warning" />);
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('API')).toBeInTheDocument();
  });
});
