/**
 * Authentication Fixtures for Playwright Tests
 * Provides utility functions for testing API endpoints with different user roles
 */

import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { signAuthJWT } from '../../../src/shared/lib/jwt';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3007';

/**
 * Clears all in-memory rate limits on the test server.
 * Must be called in beforeEach to prevent 429 bleed-over between test runs.
 * Uses the QA admin email — DB operations are harmless, rate-limit clear is global.
 */
export async function resetRateLimits(request: APIRequestContext): Promise<void> {
  await request.post(`${BASE}/api/test-helpers/auth-state`, {
    data: { email: 'qa.admin.clientes@teste.local' },
  });
}

export interface AuthUser {
  id: string;
  email: string;
  nome: string;
  role: 'ADMIN' | 'GERENTE' | 'USUARIO' | 'ESTOQUE' | 'FINANCEIRO' | 'CLIENTE';
  status: 'ATIVO';
  tokenVersion: number;
}

// Mock users for testing
export const mockUsers = {
  admin: {
    id: '1',
    email: 'admin@test.com',
    nome: 'Admin Test',
    role: 'ADMIN' as const,
    status: 'ATIVO' as const,
    tokenVersion: 1,
  },
  gerente: {
    id: '2',
    email: 'gerente@test.com',
    nome: 'Gerente Test',
    role: 'GERENTE' as const,
    status: 'ATIVO' as const,
    tokenVersion: 1,
  },
  usuario: {
    id: '3',
    email: 'usuario@test.com',
    nome: 'Usuario Test',
    role: 'USUARIO' as const,
    status: 'ATIVO' as const,
    tokenVersion: 1,
  },
  estoque: {
    id: '4',
    email: 'estoque@test.com',
    nome: 'Estoque Test',
    role: 'ESTOQUE' as const,
    status: 'ATIVO' as const,
    tokenVersion: 1,
  },
  financeiro: {
    id: '5',
    email: 'financeiro@test.com',
    nome: 'Financeiro Test',
    role: 'FINANCEIRO' as const,
    status: 'ATIVO' as const,
    tokenVersion: 1,
  },
  cliente: {
    id: '6',
    email: 'cliente@test.com',
    nome: 'Cliente Test',
    role: 'CLIENTE' as const,
    status: 'ATIVO' as const,
    tokenVersion: 1,
  },
};

/**
 * Generate JWT token for a mock user
 */
export async function generateAuthToken(user: AuthUser): Promise<string> {
  const token = await signAuthJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    tokenVersion: user.tokenVersion,
  });
  const secretLen = process.env.JWT_SECRET?.length || 0;
  const secretPreview = process.env.JWT_SECRET?.substring(0, 20) + '...';
  console.log(
    `[Auth] Token for ${user.email}: JWT_SECRET length=${secretLen}, preview="${secretPreview}", token_length=${token.length}`,
  );
  return token;
}

/**
 * Get authorization headers with JWT token
 */
export async function getAuthHeaders(user: AuthUser): Promise<Record<string, string>> {
  const token = await generateAuthToken(user);
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Cookie: `authToken=${token}`,
  };
  console.log(
    `[Auth] Headers for ${user.email}: Authorization=${headers.Authorization.substring(0, 30)}..., Cookie=${headers.Cookie.substring(0, 30)}...`,
  );
  return headers;
}

/**
 * Extended test with authentication helpers
 */
export const test = base.extend<{
  adminHeaders: Record<string, string>;
  gerenteHeaders: Record<string, string>;
  usuarioHeaders: Record<string, string>;
  estoqueHeaders: Record<string, string>;
  financeiroHeaders: Record<string, string>;
  clienteHeaders: Record<string, string>;
}>({
  adminHeaders: async ({}, use) => {
    const headers = await getAuthHeaders(mockUsers.admin);
    await use(headers);
  },

  gerenteHeaders: async ({}, use) => {
    const headers = await getAuthHeaders(mockUsers.gerente);
    await use(headers);
  },

  usuarioHeaders: async ({}, use) => {
    const headers = await getAuthHeaders(mockUsers.usuario);
    await use(headers);
  },

  estoqueHeaders: async ({}, use) => {
    const headers = await getAuthHeaders(mockUsers.estoque);
    await use(headers);
  },

  financeiroHeaders: async ({}, use) => {
    const headers = await getAuthHeaders(mockUsers.financeiro);
    await use(headers);
  },

  clienteHeaders: async ({}, use) => {
    const headers = await getAuthHeaders(mockUsers.cliente);
    await use(headers);
  },
});

export { expect };
