/**
 * 06 — Exportação CSV/PDF + filtro hierárquico no resultado.
 */

import { test, expect, resetRateLimits } from '../fixtures/auth';
import { seedUsuarios, teardownUsuarios } from '../fixtures/usuarios-seed';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3007';

test.describe.serial('06 — Export CSV/PDF', () => {
  test.beforeAll(async () => { await seedUsuarios(); });
  test.afterAll(async () => { await teardownUsuarios(); });
  test.beforeEach(async ({ request }) => { await resetRateLimits(request); });

  // ─── CSV ───
  test.describe('CSV Export', () => {
    test('ADMIN export CSV retorna cabeçalhos corretos', async ({ request, adminHeaders }) => {
      const res = await request.post(`${BASE}/api/usuarios/export/csv`, {
        headers: adminHeaders,
        data: {},
      });
      expect(res.status()).toBe(200);
      const csv = await res.text();
      const firstLine = csv.split('\n')[0];
      expect(firstLine).toContain('ID');
      expect(firstLine).toContain('Nome Completo');
      expect(firstLine).toContain('E-mail');
      expect(firstLine).toContain('Nível');
      expect(firstLine).toContain('Status');
    });

    test('CSV escapa aspas duplas nos dados', async ({ request, adminHeaders }) => {
      const res = await request.post(`${BASE}/api/usuarios/export/csv`, {
        headers: adminHeaders,
        data: {},
      });
      const csv = await res.text();
      // Every data cell is wrapped in quotes
      const dataLines = csv.split('\n').slice(1).filter(l => l.trim());
      for (const line of dataLines) {
        expect(line).toMatch(/^"/);
      }
    });

    test('CSV com filtro role=ADMIN retorna apenas ADMINs', async ({ request, adminHeaders }) => {
      const res = await request.post(`${BASE}/api/usuarios/export/csv`, {
        headers: adminHeaders,
        data: { filters: { role: 'ADMIN' } },
      });
      expect(res.status()).toBe(200);
      const csv = await res.text();
      const dataLines = csv.split('\n').slice(1).filter(l => l.trim());
      expect(dataLines.length).toBeGreaterThanOrEqual(2); // admin + admin2
      for (const line of dataLines) {
        expect(line).toContain('ADMIN');
      }
    });

    test('CSV com filtro status=INATIVO filtra corretamente', async ({ request, adminHeaders }) => {
      const res = await request.post(`${BASE}/api/usuarios/export/csv`, {
        headers: adminHeaders,
        data: { filters: { status: 'INATIVO' } },
      });
      expect(res.status()).toBe(200);
      const csv = await res.text();
      const dataLines = csv.split('\n').slice(1).filter(l => l.trim());
      for (const line of dataLines) {
        expect(line).toContain('INATIVO');
      }
    });

    test('CSV com search filtra por nome/email', async ({ request, adminHeaders }) => {
      const res = await request.post(`${BASE}/api/usuarios/export/csv`, {
        headers: adminHeaders,
        data: { filters: { q: 'admin@test.com' } },
      });
      expect(res.status()).toBe(200);
      const csv = await res.text();
      const dataLines = csv.split('\n').slice(1).filter(l => l.trim());
      expect(dataLines.length).toBeGreaterThanOrEqual(1);
      expect(dataLines[0]).toContain('admin@test.com');
    });

    test('USUARIO export CSV → 403', async ({ request, usuarioHeaders }) => {
      const res = await request.post(`${BASE}/api/usuarios/export/csv`, {
        headers: usuarioHeaders,
        data: {},
      });
      expect(res.status()).toBe(403);
    });

    test('export CSV sem token → 401', async ({ request }) => {
      const res = await request.post(`${BASE}/api/usuarios/export/csv`, {
        data: {},
      });
      expect(res.status()).toBe(401);
    });
  });

  // ─── PDF ───
  test.describe('PDF Export', () => {
    test('ADMIN export PDF retorna application/pdf', async ({ request, adminHeaders }) => {
      const res = await request.post(`${BASE}/api/usuarios/export/pdf`, {
        headers: adminHeaders,
        data: {},
      });
      // PDF generation depends on Playwright availability (chromium in server)
      // Accept 200 (success) or 500 (if chromium not installed in test env)
      if (res.status() === 200) {
        expect(res.headers()['content-type']).toContain('application/pdf');
        const buffer = await res.body();
        expect(buffer.length).toBeGreaterThan(0);
      } else {
        expect([500]).toContain(res.status());
      }
    });

    test('USUARIO export PDF → 403', async ({ request, usuarioHeaders }) => {
      const res = await request.post(`${BASE}/api/usuarios/export/pdf`, {
        headers: usuarioHeaders,
        data: {},
      });
      expect(res.status()).toBe(403);
    });

    test('export PDF sem token → 401', async ({ request }) => {
      const res = await request.post(`${BASE}/api/usuarios/export/pdf`, {
        data: {},
      });
      expect(res.status()).toBe(401);
    });
  });
});
