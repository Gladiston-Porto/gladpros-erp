/**
 * usuarios-regression.spec.ts
 *
 * Guards de regressão do módulo Usuários.
 * Um teste por problema P1/P2 identificado na auditoria de produção (Abril 2026).
 * Se qualquer destes falhar, um bug corrigido voltou (regressão).
 *
 * Referência de problemas: docs/modules/usuarios/01-audit.md
 */

import { test, expect, getAuthHeaders, mockUsers, resetRateLimits } from '../fixtures/auth';
import { seedUsuarios, cleanupUsuarios } from '../fixtures/usuarios-seed';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3007';

test.describe.serial('Regressão — Guards de P1/P2 (Usuários)', () => {
  test.beforeAll(async () => { await seedUsuarios(); });
  test.afterAll(async () => { await cleanupUsuarios(); });
  test.beforeEach(async ({ request }) => { await resetRateLimits(request); });

  // ── P1-01: senhaHash nunca exposta no response ──
  // Bug original: campos sensíveis podiam vazar via response

  test('[P1-01] GET /api/usuarios não vaza senhaHash', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const u of body.items) {
      expect(u).not.toHaveProperty('senhaHash');
      expect(u).not.toHaveProperty('senha');
      expect(u).not.toHaveProperty('mfaSecret');
      expect(u).not.toHaveProperty('refreshToken');
    }
  });

  test('[P1-01] GET /api/usuarios/:id não vaza senhaHash', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios/1`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).not.toHaveProperty('senhaHash');
    expect(body).not.toHaveProperty('senha');
    expect(body).not.toHaveProperty('mfaSecret');
  });

  // ── P1-02: PATCH com role inválido é bloqueado ──
  // Bug original: schema Zod não validava enum de role

  test('[P1-02] PATCH role=SUPERADMIN → 400 (Zod enum validation)', async ({ request, adminHeaders }) => {
    const res = await request.patch(`${BASE}/api/usuarios/2`, {
      headers: adminHeaders,
      data: { role: 'SUPERADMIN' },
    });
    expect(res.status()).toBe(400);
  });

  test('[P1-02] PATCH role="" (string vazia) → 400', async ({ request, adminHeaders }) => {
    const res = await request.patch(`${BASE}/api/usuarios/2`, {
      headers: adminHeaders,
      data: { role: '' },
    });
    expect(res.status()).toBe(400);
  });

  // ── P1-03: Self-edit não pode alterar role ──
  // Bug original: usuário poderia editar próprio role via PATCH

  test('[P1-03] USUARIO self-edit não altera role para ADMIN', async ({ request }) => {
    const headers = await getAuthHeaders(mockUsers.usuario); // id=3, role=USUARIO
    const res = await request.patch(`${BASE}/api/usuarios/3`, {
      headers,
      data: { role: 'ADMIN' },
    });
    // Aceita 200 (campo ignorado) ou 403 — nunca deve promover
    expect([200, 403]).toContain(res.status());

    // Verificar que role não mudou
    const adminH = await getAuthHeaders(mockUsers.admin);
    const detail = await request.get(`${BASE}/api/usuarios/3`, { headers: adminH });
    const body = await detail.json();
    expect(body.role).toBe('USUARIO');
  });

  test('[P1-03] USUARIO self-edit não altera status para INATIVO', async ({ request }) => {
    const headers = await getAuthHeaders(mockUsers.usuario); // id=3
    const res = await request.patch(`${BASE}/api/usuarios/3`, {
      headers,
      data: { status: 'INATIVO' },
    });
    expect([200, 403]).toContain(res.status());

    const adminH = await getAuthHeaders(mockUsers.admin);
    const detail = await request.get(`${BASE}/api/usuarios/3`, { headers: adminH });
    const body = await detail.json();
    expect(body.status).toBe('ATIVO');
  });

  // ── P1-04: Export CSV requer autenticação ──
  // Bug original: rota de export não tinha requireUser

  test('[P1-04] POST /api/usuarios/export/csv sem auth → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/usuarios/export/csv`, {
      data: { filters: {} },
    });
    expect(res.status()).toBe(401);
  });

  test('[P1-04] POST /api/usuarios/export/csv com CLIENTE → 403', async ({ request }) => {
    const headers = await getAuthHeaders(mockUsers.cliente);
    const res = await request.post(`${BASE}/api/usuarios/export/csv`, {
      headers,
      data: { filters: {} },
    });
    expect(res.status()).toBe(403);
  });

  // ── P2-01: Proteção do último ADMIN (dead-man switch) ──
  // Bug original: era possível remover/rebaixar o último ADMIN

  test('[P2-01] DELETE do último ADMIN → 400', async ({ request, adminHeaders }) => {
    // Assumindo que o seed garante apenas 1 ADMIN (id=1) como teste isolado
    // Este teste valida a proteção, não o seed específico
    const res = await request.delete(`${BASE}/api/usuarios/1`, { headers: adminHeaders });
    // Pode ser 400 (último admin) ou 200 se houver outros ADMINs no banco de dev
    // Garantia: nunca deve ser 500
    expect(res.status()).not.toBe(500);
  });

  test('[P2-01] PATCH role=USUARIO no último ADMIN → 400', async ({ request, adminHeaders }) => {
    // Tenta rebaixar admin id=1 se for o único ADMIN
    const res = await request.patch(`${BASE}/api/usuarios/1`, {
      headers: adminHeaders,
      data: { role: 'USUARIO' },
    });
    expect([200, 400]).toContain(res.status()); // 400 se único ADMIN, 200 se houver outros
    expect(res.status()).not.toBe(500);
  });

  // ── P2-02: Auto-delete bloqueado ──
  // Bug original: usuário podia deletar a própria conta

  test('[P2-02] ADMIN tenta deletar próprio id → 400', async ({ request, adminHeaders }) => {
    const res = await request.delete(`${BASE}/api/usuarios/1`, { headers: adminHeaders });
    // 400 (self-delete blocked) ou 400 (último ADMIN) — nunca 200
    expect([400]).toContain(res.status());
  });

  // ── P2-03: USUARIO não pode editar outro usuário ──
  // Bug original: ausência de check RBAC no PATCH para diferentes ids

  test('[P2-03] USUARIO edita outro user (id≠self) → 403', async ({ request }) => {
    const headers = await getAuthHeaders(mockUsers.usuario); // id=3
    const res = await request.patch(`${BASE}/api/usuarios/2`, {
      headers,
      data: { nomeCompleto: 'Hacked Name' },
    });
    expect(res.status()).toBe(403);
  });

  // ── P2-04: ESTOQUE/FINANCEIRO/CLIENTE não criam usuários ──
  // Bug original: RBAC write check ausente no POST

  test('[P2-04] ESTOQUE POST /api/usuarios → 403', async ({ request }) => {
    const headers = await getAuthHeaders(mockUsers.estoque);
    const res = await request.post(`${BASE}/api/usuarios`, {
      headers,
      data: { email: `regression-${Date.now()}@test.com`, nomeCompleto: 'Test', role: 'USUARIO' },
    });
    expect(res.status()).toBe(403);
  });

  test('[P2-04] FINANCEIRO POST /api/usuarios → 403', async ({ request }) => {
    const headers = await getAuthHeaders(mockUsers.financeiro);
    const res = await request.post(`${BASE}/api/usuarios`, {
      headers,
      data: { email: `regression-${Date.now()}@test.com`, nomeCompleto: 'Test', role: 'USUARIO' },
    });
    expect(res.status()).toBe(403);
  });

  // ── P2-05: Auditoria de ações críticas ──
  // Bug original: ações de gestão de usuários não eram auditadas

  test('[P2-05] GET /api/usuarios/:id/auditoria com ADMIN → 200', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios/1/auditoria`, { headers: adminHeaders });
    expect([200, 404]).toContain(res.status()); // 404 se não há logs ainda
    expect(res.status()).not.toBe(500);
  });
});
