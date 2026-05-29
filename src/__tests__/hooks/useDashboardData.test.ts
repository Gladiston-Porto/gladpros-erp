/**
 * useDashboardData — Unit Tests
 *
 * [HOOK-01] Estado inicial: loading=true quando enabled=true
 * [HOOK-02] enabled=false: loading=false imediatamente, sem fetch
 * [HOOK-03] Fetch bem-sucedido: stats, canReadAnalytics, currentUserRole setados
 * [HOOK-04] currentUserRole extraído de permissions.currentUserRole
 * [HOOK-05] canReadAnalytics=false quando permissions.canReadAnalytics ausente
 * [HOOK-06] Fetch com erro HTTP: error setado, loading=false
 * [HOOK-07] AbortError ignorado — não seta error
 * [HOOK-08] refetch re-executa fetch
 * [HOOK-09] Mudança de period re-executa fetch com novo valor
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDashboardData } from '@/shared/hooks/useDashboardData';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const ANALYTICS_RESPONSE = {
  data: {
    overview: {
      totalUsers: 5,
      activeUsers: 3,
      totalProposals: 10,
      propostasAprovadas: 4,
      propostasPendentes: 6,
      totalClients: 8,
      loginAttempts: null,
      failedLogins: null,
      auditEvents: null,
      systemHealth: 'good',
      lastActivityAt: null,
    },
    charts: {
      usersByRole: [
        { role: 'ADMIN', count: 1 },
        { role: 'USUARIO', count: 4 },
      ],
      userMetrics: [],
      loginAttemptsByDay: [],
    },
    recentActivity: [],
    permissions: {
      canReadAnalytics: true,
      currentUserRole: 'ADMIN',
    },
  },
};

function mockSuccess(body = ANALYTICS_RESPONSE) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: jest.fn().mockResolvedValue(body),
  });
}

function mockError(status = 500) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: jest.fn().mockResolvedValue({ error: 'Server error' }),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('useDashboardData', () => {
  test('[HOOK-01] Estado inicial: loading=true quando enabled=true', async () => {
    mockSuccess();
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  test('[HOOK-02] enabled=false: loading=false imediatamente, sem fetch', () => {
    const { result } = renderHook(() => useDashboardData({ enabled: false }));
    expect(result.current.loading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('[HOOK-03] Fetch bem-sucedido: stats populado e loading=false', async () => {
    mockSuccess();
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats).not.toBeNull();
    expect(result.current.stats?.totalUsers).toBe(5);
    expect(result.current.error).toBeNull();
  });

  test('[HOOK-04] currentUserRole extraído de permissions.currentUserRole', async () => {
    mockSuccess();
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.currentUserRole).toBe('ADMIN');
  });

  test('[HOOK-05] canReadAnalytics=false quando campo ausente na resposta', async () => {
    const body = {
      data: {
        ...ANALYTICS_RESPONSE.data,
        permissions: { currentUserRole: 'USUARIO' },
      },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(body),
    });

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canReadAnalytics).toBe(false);
  });

  test('[HOOK-06] Erro HTTP: error setado, loading=false', async () => {
    mockError(500);
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Erro ao carregar dados do dashboard');
    expect(result.current.stats).toBeNull();
  });

  test('[HOOK-08] refetch re-executa fetch', async () => {
    mockSuccess();
    mockSuccess(); // segunda chamada para refetch

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  test('[HOOK-09] Mudança de period re-executa fetch', async () => {
    mockSuccess();
    mockSuccess();

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setPeriod('7d');
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const secondCall = mockFetch.mock.calls[1][0] as string;
    expect(secondCall).toContain('period=7d');
  });
});
