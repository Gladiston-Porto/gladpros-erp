/**
 * E2E – Clientes Bulk Operations
 *
 * Tests bulk activate / deactivate / delete via the GladPros API.
 * Uses the direct API (not the UI) for reliability and speed.
 * Cleans up all test data in afterEach even if the test fails.
 */

import { test, expect } from '@playwright/test';
import { seedAuthenticatedSessionWithMFA } from '../helpers/auth';
import {
  apiCreateCliente,
  apiDeleteCliente,
  buildPfPayload,
  cleanupClienteByEmail,
  uniqueSuffix,
} from './helpers';

const ADMIN_EMAIL = process.env.CLIENTES_ADMIN_EMAIL || 'admin@gladpros.com';
const ADMIN_PASSWORD = process.env.CLIENTES_ADMIN_PASSWORD || 'Admin123!@#';
const TIMEOUT_MS = 120_000;

test.describe('Clientes – Bulk Operations', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  // ─── Bulk Activate ───────────────────────────────────────────────────────

  test('bulk activate: ativa múltiplos clientes INATIVO → ATIVO', async ({ page }) => {
    const suffixes = [uniqueSuffix('bulk-act-a'), uniqueSuffix('bulk-act-b')];
    const payloads = suffixes.map((s) => buildPfPayload(s));

    const auth = await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes');

    const ids: number[] = [];
    try {
      for (const p of payloads) {
        const c = await apiCreateCliente(page, auth.token, p);
        ids.push(c.data?.id ?? c.id);
      }

      // Deactivate so they start INATIVO before bulk activate
      for (const id of ids) {
        await page.request.put(`/api/clientes/${id}/toggle-status`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
      }

      // Bulk activate
      const res = await page.request.post('/api/clientes/bulk', {
        headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
        data: { action: 'activate', scope: 'selected', ids },
      });
      const json = await res.json();

      expect(res.status()).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.processed).toBeGreaterThan(0);
    } finally {
      for (const p of payloads) await cleanupClienteByEmail(p.email);
    }
  });

  // ─── Bulk Deactivate ─────────────────────────────────────────────────────

  test('bulk deactivate: inativa múltiplos clientes ATIVO → INATIVO', async ({ page }) => {
    const suffixes = [uniqueSuffix('bulk-deact-a'), uniqueSuffix('bulk-deact-b')];
    const payloads = suffixes.map((s) => buildPfPayload(s));

    const auth = await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes');

    const ids: number[] = [];
    try {
      for (const p of payloads) {
        const c = await apiCreateCliente(page, auth.token, p);
        ids.push(c.data?.id ?? c.id);
      }

      const res = await page.request.post('/api/clientes/bulk', {
        headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
        data: { action: 'deactivate', scope: 'selected', ids },
      });
      const json = await res.json();

      expect(res.status()).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.processed).toBe(ids.length);
    } finally {
      for (const p of payloads) await cleanupClienteByEmail(p.email);
    }
  });

  // ─── Bulk Deactivate Blocked ──────────────────────────────────────────────

  test('bulk deactivate: retorna 409 para clientes com dependências ativas', async ({ page }) => {
    const suffix = uniqueSuffix('bulk-blocked');
    const payload = buildPfPayload(suffix);

    const auth = await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes');

    let id: number | null = null;
    try {
      const c = await apiCreateCliente(page, auth.token, payload);
      id = c.data?.id ?? c.id;

      // Create a projeto dependency via API to block deactivation
      const projetoRes = await page.request.post('/api/projetos', {
        headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
        data: {
          nome: `Projeto Bloqueador ${suffix}`,
          clienteId: id,
          status: 'EM_ANDAMENTO',
          descricao: 'Projeto criado pelo E2E de bulk deactivate',
        },
      });

      if (projetoRes.status() !== 201 && projetoRes.status() !== 200) {
        test.skip(); // Skip if we can't create dependency (API may differ)
        return;
      }

      const res = await page.request.post('/api/clientes/bulk', {
        headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
        data: { action: 'deactivate', scope: 'selected', ids: [id] },
      });
      const json = await res.json();

      expect(res.status()).toBe(409);
      expect(json.success).toBe(false);
      expect(json.details.totalBlocked).toBeGreaterThan(0);
    } finally {
      if (id) await apiDeleteCliente(page, auth.token, id);
      await cleanupClienteByEmail(payload.email);
    }
  });

  // ─── Bulk Delete (Soft) ───────────────────────────────────────────────────

  test('bulk delete: inativa (soft delete) múltiplos clientes sem dependências', async ({ page }) => {
    const suffixes = [uniqueSuffix('bulk-del-a'), uniqueSuffix('bulk-del-b')];
    const payloads = suffixes.map((s) => buildPfPayload(s));

    const auth = await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes');

    const ids: number[] = [];
    try {
      for (const p of payloads) {
        const c = await apiCreateCliente(page, auth.token, p);
        ids.push(c.data?.id ?? c.id);
      }

      const res = await page.request.post('/api/clientes/bulk', {
        headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
        data: { action: 'delete', scope: 'selected', ids },
      });
      const json = await res.json();

      expect(res.status()).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.processed).toBe(ids.length);
    } finally {
      for (const p of payloads) await cleanupClienteByEmail(p.email);
    }
  });

  // ─── Validation Errors ───────────────────────────────────────────────────

  test('retorna 400 quando scope=selected e ids está vazio', async ({ page }) => {
    const auth = await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes');

    const res = await page.request.post('/api/clientes/bulk', {
      headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
      data: { action: 'activate', scope: 'selected', ids: [] },
    });

    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  test('retorna 401 sem token de autenticação', async ({ page }) => {
    const res = await page.request.post('/api/clientes/bulk', {
      headers: { 'Content-Type': 'application/json' },
      data: { action: 'activate', scope: 'selected', ids: [1] },
    });

    expect(res.status()).toBe(401);
  });

  test('allFiltered scope processa clientes sem ids explícitos', async ({ page }) => {
    const suffix = uniqueSuffix('bulk-filtered');
    const payload = buildPfPayload(suffix);

    const auth = await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes');

    try {
      await apiCreateCliente(page, auth.token, payload);

      const res = await page.request.post('/api/clientes/bulk', {
        headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
        data: {
          action: 'activate',
          scope: 'allFiltered',
          filters: { q: suffix },
        },
      });
      const json = await res.json();

      expect(res.status()).toBe(200);
      expect(json.success).toBe(true);
    } finally {
      await cleanupClienteByEmail(payload.email);
    }
  });
});
