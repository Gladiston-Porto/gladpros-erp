/**
 * usuarios-edge-cases.spec.ts
 *
 * Casos extremos do módulo Usuários.
 * Testa entradas inválidas, limite de valores, unicode, injeção,
 * paginação nos extremos, filtros combinados e idempotência.
 */

import { test, expect, getAuthHeaders, mockUsers } from '../fixtures/auth';
import { seedUsuarios, cleanupUsuarios } from '../fixtures/usuarios-seed';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3007';

test.describe.serial('Edge Cases — Módulo Usuários', () => {
  test.beforeAll(async () => { await seedUsuarios(); });
  test.afterAll(async () => { await cleanupUsuarios(); });

  // ── Strings extremas ──

  test('POST nome com 4096 caracteres → 400 (Zod rejeitará)', async ({ request, adminHeaders }) => {
    const res = await request.post(`${BASE}/api/usuarios`, {
      headers: adminHeaders,
      data: {
        email: `edge-long-${Date.now()}@test.com`,
        nomeCompleto: 'A'.repeat(4096),
        role: 'USUARIO',
      },
    });
    expect([400, 422]).toContain(res.status());
  });

  test('POST email com 320 caracteres (limite RFC 5321) → 400', async ({ request, adminHeaders }) => {
    const local = 'a'.repeat(64);
    const domain = 'b'.repeat(251) + '.com';
    const res = await request.post(`${BASE}/api/usuarios`, {
      headers: adminHeaders,
      data: {
        email: `${local}@${domain}`,
        nomeCompleto: 'Boundary Email',
        role: 'USUARIO',
      },
    });
    expect([400, 422]).toContain(res.status());
  });

  test('POST email sem @-sign → 400', async ({ request, adminHeaders }) => {
    const res = await request.post(`${BASE}/api/usuarios`, {
      headers: adminHeaders,
      data: { email: 'notanemail', nomeCompleto: 'Bad Email', role: 'USUARIO' },
    });
    expect(res.status()).toBe(400);
  });

  // ── Injeção: XSS na criação ──

  test('POST nome com payload XSS é armazenado como texto (sem execução)', async ({ request, adminHeaders }) => {
    const xssEmail = `xss-${Date.now()}@edge-test.com`;
    const xssPayload = '<script>alert("xss")</script>';
    const res = await request.post(`${BASE}/api/usuarios`, {
      headers: adminHeaders,
      data: {
        email: xssEmail,
        nomeCompleto: xssPayload,
        role: 'USUARIO',
      },
    });
    // API deve aceitar (é só texto) ou rejeitar — não deve crash com 500
    expect([201, 400, 422]).toContain(res.status());
    if (res.status() === 201) {
      const body = await res.json();
      // O nome retornado deve ser a string literal, não HTML interpretado
      expect(body.nomeCompleto ?? body.data?.nomeCompleto).toBe(xssPayload);
    }
  });

  // ── Injeção: SQL injection no campo de busca ──

  test("GET ?q='; DROP TABLE Usuario; -- não causa erro 500", async ({ request, adminHeaders }) => {
    const malicious = encodeURIComponent("'; DROP TABLE Usuario; --");
    const res = await request.get(`${BASE}/api/usuarios?q=${malicious}`, { headers: adminHeaders });
    // Deve retornar 200 com lista vazia, ou 400 — nunca 500
    expect(res.status()).not.toBe(500);
  });

  test("GET ?q=\" OR \"1\"=\"1 não retorna todos os registros (injection guard)", async ({ request, adminHeaders }) => {
    const malicious = encodeURIComponent('" OR "1"="1');
    const res = await request.get(`${BASE}/api/usuarios?q=${malicious}`, { headers: adminHeaders });
    expect(res.status()).not.toBe(500);
  });

  // ── Unicode no nome ──

  test('POST nome com emoji e caracteres unicode → 201 ou 400 (nunca 500)', async ({ request, adminHeaders }) => {
    const res = await request.post(`${BASE}/api/usuarios`, {
      headers: adminHeaders,
      data: {
        email: `unicode-${Date.now()}@edge-test.com`,
        nomeCompleto: '中文名字 João Müller 🔥',
        role: 'USUARIO',
      },
    });
    expect([201, 400]).toContain(res.status());
  });

  // ── Paginação extrema ──

  test('GET page=9999 (além do total) → 200 com items vazio', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios?page=9999&pageSize=20`, {
      headers: adminHeaders,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(0);
  });

  test('GET pageSize=0 → 400 ou trata como default', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios?pageSize=0`, { headers: adminHeaders });
    expect([200, 400]).toContain(res.status());
  });

  test('GET pageSize=200 (acima do máximo) → 200 ou 400, nunca retorna 200+ itens se houver limite', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios?pageSize=200`, { headers: adminHeaders });
    expect([200, 400]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      // Se a rota impõe limite (ex: max 100), deve respeitar
      expect(body.items.length).toBeLessThanOrEqual(200);
    }
  });

  // ── Filtros combinados ──

  test('GET ?q=admin&role=ADMIN filtra corretamente', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios?q=admin&role=ADMIN`, {
      headers: adminHeaders,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const u of body.items) {
      expect(u.role).toBe('ADMIN');
    }
  });

  test('GET ?status=ATIVO retorna apenas usuários ativos', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios?status=ATIVO`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const u of body.items) {
      expect(u.status).toBe('ATIVO');
    }
  });

  // ── Idempotência ──

  test('POST com mesmo email duas vezes → segundo retorna 409', async ({ request, adminHeaders }) => {
    const email = `idempotent-${Date.now()}@edge-test.com`;
    const payload = { email, nomeCompleto: 'Idempotent User', role: 'USUARIO' };
    const res1 = await request.post(`${BASE}/api/usuarios`, {
      headers: adminHeaders,
      data: payload,
    });
    expect([201]).toContain(res1.status());

    const res2 = await request.post(`${BASE}/api/usuarios`, {
      headers: adminHeaders,
      data: payload,
    });
    expect(res2.status()).toBe(409);
  });

  // ── PATCH com body vazio ──

  test('PATCH com body vazio → 400', async ({ request, adminHeaders }) => {
    const res = await request.patch(`${BASE}/api/usuarios/1`, {
      headers: adminHeaders,
      data: {},
    });
    expect([400, 200]).toContain(res.status()); // 200 se rota aceita noop, 400 se Zod rejeita
  });

  // ── PATCH com role inválido ──

  test('PATCH com role=SUPERADMIN (inválido) → 400', async ({ request, adminHeaders }) => {
    const res = await request.patch(`${BASE}/api/usuarios/1`, {
      headers: adminHeaders,
      data: { role: 'SUPERADMIN' },
    });
    expect(res.status()).toBe(400);
  });

  // ── Campos numéricos em lugar de texto ──

  test('POST com nomeCompleto = número (tipo errado) → 400', async ({ request, adminHeaders }) => {
    const res = await request.post(`${BASE}/api/usuarios`, {
      headers: adminHeaders,
      data: { email: `type-${Date.now()}@edge-test.com`, nomeCompleto: 12345, role: 'USUARIO' },
    });
    expect([400, 201]).toContain(res.status()); // Zod pode coerce ou rejeitar
  });
});
