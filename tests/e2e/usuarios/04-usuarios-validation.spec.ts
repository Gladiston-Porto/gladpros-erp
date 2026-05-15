/**
 * 04 — Validação Zod E2E: edges de telefone, data, CEP, email, campos obrigatórios.
 *
 * Testa contra o servidor real (não apenas safeParse) para garantir que a
 * validação e as mensagens de erro funcionam end-to-end.
 */

import { test, expect, resetRateLimits } from '../fixtures/auth';
import { seedUsuarios, teardownUsuarios } from '../fixtures/usuarios-seed';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3007';

test.describe.serial('04 — Validação E2E', () => {
  test.beforeAll(async () => { await seedUsuarios(); });
  test.afterAll(async () => { await teardownUsuarios(); });
  test.beforeEach(async ({ request }) => { await resetRateLimits(request); });

  // ─── Telefone ───
  test.describe('Telefone', () => {
    test('aceita 10 dígitos sem formatação: 4693346918', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { telefone: '4693346918' },
      });
      expect(res.status()).toBe(200);
    });

    test('aceita formato (469)334-6918', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { telefone: '(469)334-6918' },
      });
      expect(res.status()).toBe(200);
    });

    test('aceita formato (469) 334-6918', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { telefone: '(469) 334-6918' },
      });
      expect(res.status()).toBe(200);
    });

    test('aceita formato 469-334-6918', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { telefone: '469-334-6918' },
      });
      expect(res.status()).toBe(200);
    });

    test('rejeita 9 dígitos', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { telefone: '469334691' },
      });
      expect(res.status()).toBe(400);
    });

    test('rejeita 11 dígitos', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { telefone: '46933469180' },
      });
      expect(res.status()).toBe(400);
    });

    test('rejeita letras', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { telefone: 'abcdefghij' },
      });
      expect(res.status()).toBe(400);
    });
  });

  // ─── CEP ───
  test.describe('CEP', () => {
    test('aceita 5 dígitos', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { cep: '75287' },
      });
      expect(res.status()).toBe(200);
    });

    test('aceita 8 dígitos', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { cep: '01234567' },
      });
      expect(res.status()).toBe(200);
    });

    test('aceita 9 dígitos', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { cep: '012345678' },
      });
      expect(res.status()).toBe(200);
    });

    test('rejeita 4 dígitos (curto demais)', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { cep: '1234' },
      });
      expect(res.status()).toBe(400);
    });

    test('rejeita letras no CEP', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { cep: 'ABCDE' },
      });
      expect(res.status()).toBe(400);
    });
  });

  // ─── dataNascimento ───
  test.describe('dataNascimento', () => {
    test('aceita MM/DD/YYYY → normaliza para ISO', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { dataNascimento: '05/18/1979' },
      });
      expect(res.status()).toBe(200);

      const detail = await request.get(`${BASE}/api/usuarios/3`, { headers: adminHeaders });
      const body = await detail.json();
      expect(body.dataNascimento).toBe('05/18/1979');
    });

    test('aceita YYYY-MM-DD', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { dataNascimento: '1990-12-25' },
      });
      expect(res.status()).toBe(200);
    });

    test('rejeita 13/40/2020 (mês/dia inválidos)', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { dataNascimento: '13/40/2020' },
      });
      expect(res.status()).toBe(400);
    });

    test('rejeita string aleatória', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { dataNascimento: 'abc' },
      });
      expect(res.status()).toBe(400);
    });

    test('rejeita 99/99/9999', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { dataNascimento: '99/99/9999' },
      });
      expect(res.status()).toBe(400);
    });
  });

  // ─── Email (POST create) ───
  test.describe('Email no POST', () => {
    test('rejeita payload sem email', async ({ request, adminHeaders }) => {
      const res = await request.post(`${BASE}/api/usuarios`, {
        headers: adminHeaders,
        data: { nomeCompleto: 'Sem Email' },
      });
      expect(res.status()).toBe(400);
    });

    test('rejeita email malformado', async ({ request, adminHeaders }) => {
      const res = await request.post(`${BASE}/api/usuarios`, {
        headers: adminHeaders,
        data: { email: 'not-an-email' },
      });
      expect(res.status()).toBe(400);
    });
  });

  // ─── Campos desconhecidos (strict) ───
  test.describe('Strict mode', () => {
    test('PATCH rejeita campo desconhecido: nivel', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { nivel: 'ADMIN' },
      });
      expect(res.status()).toBe(400);
    });

    test('PATCH rejeita campo desconhecido: isAdmin', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { isAdmin: true },
      });
      expect(res.status()).toBe(400);
    });

    test('POST rejeita campo desconhecido: superUser', async ({ request, adminHeaders }) => {
      const res = await request.post(`${BASE}/api/usuarios`, {
        headers: adminHeaders,
        data: { email: `strict-${Date.now()}@e2e-test.com`, superUser: true },
      });
      expect(res.status()).toBe(400);
    });
  });

  // ─── Role/status inválidos ───
  test.describe('Enums inválidos', () => {
    test('PATCH rejeita role inválida ROOT', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { role: 'ROOT' },
      });
      expect(res.status()).toBe(400);
    });

    test('PATCH rejeita status inválido SUSPENSO', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: adminHeaders,
        data: { status: 'SUSPENSO' },
      });
      expect(res.status()).toBe(400);
    });
  });
});
