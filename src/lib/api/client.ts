// src/lib/api/client.ts
// Utilitários centralizados para chamadas API autenticadas (client-safe)

// Singleton promise to prevent concurrent refresh calls
let refreshTokenInFlight: Promise<boolean> | null = null;

/**
 * Tenta renovar o access token silenciosamente usando o refreshToken cookie.
 * Retorna true se o refresh foi bem-sucedido.
 */
async function tryRefreshToken(): Promise<boolean> {
  if (refreshTokenInFlight) return refreshTokenInFlight;
  refreshTokenInFlight = fetch('/api/auth/refresh', { method: 'POST' })
    .then(r => r.ok)
    .catch(() => false)
    .finally(() => { refreshTokenInFlight = null; });
  return refreshTokenInFlight;
}

/**
 * Wrapper para fetch autenticado (client-side).
 *
 * Em Next.js com cookies httpOnly, o browser envia cookies automaticamente
 * para requests same-origin. Quando recebe 401, tenta renovar o token
 * silenciosamente antes de redirecionar para login.
 *
 * @param options.noRedirectOn401 - Se true, não redireciona para login em 401.
 *   Use em formulários longos para preservar o estado do form (ex: PropostaForm).
 */
export async function authenticatedFetch(
  input: RequestInfo,
  init?: RequestInit,
  options?: { noRedirectOn401?: boolean }
): Promise<Response> {
  let res = await fetch(input, init);
  if (res.status === 401 && typeof window !== 'undefined') {
    // Try to refresh the token silently first (uses refreshToken httpOnly cookie)
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Token renewed — retry the original request once with new cookie
      res = await fetch(input, init);
    }
    // If still 401 and redirect is not suppressed, send to login
    if (res.status === 401 && !options?.noRedirectOn401) {
      window.location.href = '/login?e=session_expired';
    }
  }
  return res;
}

/**
 * API client para usuários
 */
export const usersApi = {
  async getUsers(params?: Record<string, any>, init?: RequestInit) {
    const query = new URLSearchParams(params || {});
    const res = await authenticatedFetch(`/api/usuarios?${query}`, init);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || 'Erro ao carregar usuários');
    }
    return res.json();
  },

  async deleteUser(id: string | number) {
    const res = await authenticatedFetch(`/api/usuarios/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao deletar usuário');
    return res.json();
  },

  async toggleUserStatus(id: string | number) {
    const res = await authenticatedFetch(`/api/usuarios/${id}/toggle-status`, { method: 'PUT' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || 'Erro ao alterar status');
    }
    return res.json();
  },

  async exportUsers(format: 'csv' | 'pdf', filters?: Record<string, any>) {
    const res = await authenticatedFetch(`/api/usuarios/export/${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters })
    });
    if (!res.ok) throw new Error(`Falha ao exportar ${format.toUpperCase()}`);
    return res.blob();
  }
};

/**
 * API client para projetos
 */
export const projectsApi = {
  async getMyProjects() {
    const res = await authenticatedFetch('/api/meus-projetos');
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || 'Erro ao carregar projetos');
    }
    return res.json();
  }
};

/**
 * API client para documentos
 */
export const documentsApi = {
  async getDocuments() {
    const res = await authenticatedFetch('/api/documents');
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || 'Erro ao carregar documentos');
    }
    return res.json();
  }
};

/**
 * API client para relatórios
 */
export const reportsApi = {
  async getReports() {
    const res = await authenticatedFetch('/api/reports');
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || 'Erro ao carregar relatórios');
    }
    return res.json();
  }
};

/**
 * API client para clientes
 */
export const clientsApi = {
  async getClients(init?: RequestInit) {
    const res = await authenticatedFetch('/api/clientes', init);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || 'Erro ao carregar clientes');
    }
    const payload = await res.json();
    if (payload.pagination) {
      return payload.data ?? [];
    }
    return payload.data ?? payload;
  },

  async createClient(data: any) {
    const res = await authenticatedFetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      const error = new Error(errorData.error || 'Erro ao criar cliente');
      (error as any).details = errorData.details;
      throw error;
    }
    const payload = await res.json();
    return payload.data ?? payload;
  }
};

/**
 * API client para projetos (geral)
 */
export const generalProjectsApi = {
  async getProjects(init?: RequestInit) {
    const res = await authenticatedFetch('/api/projetos', init);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || 'Erro ao carregar projetos');
    }
    const payload = await res.json();
    return payload.data ?? payload.projetos ?? payload;
  }
};

/**
 * API client para financeiro
 */
export const financeiroApi = {
  async getReceitasCategories(empresaId: number = 1) {
    const res = await authenticatedFetch(`/api/financeiro/receitas/categorias?empresaId=${empresaId}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || 'Erro ao carregar categorias de receitas');
    }
    return res.json();
  },

  async createReceita(data: any) {
    const res = await authenticatedFetch('/api/financeiro/receitas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      const error = new Error(errorData.error || 'Erro ao criar receita');
      (error as any).details = errorData.details;
      throw error;
    }
    return res.json();
  },

  async getDespesasCategories(empresaId: number = 1) {
    const res = await authenticatedFetch(`/api/financeiro/despesas/categorias?empresaId=${empresaId}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || 'Erro ao carregar categorias de despesas');
    }
    return res.json();
  },

  async createDespesa(data: any) {
    const res = await authenticatedFetch('/api/financeiro/despesas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      const error = new Error(errorData.error || 'Erro ao criar despesa');
      (error as any).details = errorData.details;
      throw error;
    }
    return res.json();
  },

  async createConta(data: any) {
    const res = await authenticatedFetch('/api/financeiro/contas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      const error = new Error(errorData.error || 'Erro ao criar conta');
      (error as any).details = errorData.details;
      throw error;
    }
    return res.json();
  }
};

/**
 * API client para invoices
 */
export const invoicesApi = {
  async createInvoice(data: any) {
    const res = await authenticatedFetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      const error = new Error(errorData.message || errorData.error || 'Erro ao criar invoice');
      (error as any).details = errorData.details;
      throw error;
    }
    const json = await res.json();
    return json.data ?? json;
  }
};

/**
 * API client para autenticação
 */
export const authApi = {
  async getMe() {
    const res = await authenticatedFetch('/api/auth/me');
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || 'Erro ao carregar dados do usuário');
    }
    return res.json();
  },

  async resendMFA(data: { userId: number; tipoAcao?: 'LOGIN' | 'PRIMEIRO_ACESSO' | 'RESET_PASSWORD' | 'RESET' | 'DESBLOQUEIO' }) {
    const res = await authenticatedFetch('/api/auth/mfa/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || 'Erro ao reenviar MFA');
    }
    return res.json();
  },

  async setupFirstAccess(data: any) {
    const res = await authenticatedFetch('/api/auth/first-access/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      const error = new Error(errorData.error || 'Erro ao configurar primeiro acesso');
      (error as any).details = errorData.details;
      throw error;
    }
    return res.json();
  },

  async getUserStatus(data?: any) {
    const res = await authenticatedFetch('/api/auth/user-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || 'Erro ao verificar status do usuário');
    }
    return res.json();
  },

  async unlockUser(data: any) {
    const res = await authenticatedFetch('/api/auth/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      const error = new Error(errorData.error || 'Erro ao desbloquear usuário');
      (error as any).details = errorData.details;
      throw error;
    }
    return res.json();
  },

  async updateMe(data: Record<string, string | null>) {
    const res = await authenticatedFetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || 'Erro ao atualizar perfil');
    }
    return res.json();
  },

  async uploadAvatar(file: File) {
    const form = new FormData();
    form.append('file', file);
    const res = await authenticatedFetch('/api/auth/me/avatar', {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || 'Erro ao enviar foto');
    }
    return res.json() as Promise<{ ok: boolean; avatarUrl: string }>;
  },

  async removeAvatar() {
    const res = await authenticatedFetch('/api/auth/me/avatar', { method: 'DELETE' });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || 'Erro ao remover foto');
    }
    return res.json();
  },

  async changePassword(senhaAtual: string, novaSenha: string) {
    const res = await authenticatedFetch('/api/auth/me/security', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change-password', senhaAtual, novaSenha }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || 'Erro ao alterar senha');
    }
    return res.json();
  },

  async changePin(senhaAtual: string, novoPIN: string) {
    const res = await authenticatedFetch('/api/auth/me/security', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change-pin', senhaAtual, novoPIN }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || 'Erro ao alterar PIN');
    }
    return res.json();
  },

  async changeSecurityQuestion(senhaAtual: string, perguntaSecreta: string, respostaSecreta: string) {
    const res = await authenticatedFetch('/api/auth/me/security', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change-security', senhaAtual, perguntaSecreta, respostaSecreta }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || 'Erro ao atualizar pergunta de segurança');
    }
    return res.json();
  },
};
