/**
 * Unit tests dos schemas Zod de usuários após o hotfix (.strict()).
 *
 * Trava: (a) o comportamento strict — rejeição de campos desconhecidos como
 * `nivel` (era o vetor do bug C4); (b) normalizações críticas de telefone,
 * data e CEP; (c) enums de role/status.
 */

import {
  userUpdateApiSchema,
  toggleUserStatusSchema,
} from '../../../shared/lib/validation';

describe('userUpdateApiSchema · strict mode', () => {
  it('aceita payload vazio (tudo opcional)', () => {
    const result = userUpdateApiSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('aceita atualização de role válida', () => {
    const result = userUpdateApiSchema.safeParse({ role: 'GERENTE' });
    expect(result.success).toBe(true);
  });

  it('REJEITA campo `nivel` (bug C4 — era silenciosamente descartado)', () => {
    const result = userUpdateApiSchema.safeParse({ nivel: 'ADMIN' });
    expect(result.success).toBe(false);
    if (!result.success) {
      // Zod strict emite um issue "unrecognized_keys" com o nome da chave
      // na lista `keys` e/ou na mensagem de erro.
      const flat = JSON.stringify(result.error.issues);
      expect(flat).toMatch(/nivel/);
    }
  });

  it('REJEITA campos arbitrários desconhecidos', () => {
    const result = userUpdateApiSchema.safeParse({
      nomeCompleto: 'Fulano Teste',
      isAdmin: true,
      superUser: 1,
    });
    expect(result.success).toBe(false);
  });

  it('REJEITA role inválida', () => {
    const result = userUpdateApiSchema.safeParse({ role: 'ROOT' });
    expect(result.success).toBe(false);
  });

  it('REJEITA status inválido', () => {
    const result = userUpdateApiSchema.safeParse({ status: 'SUSPENSO' });
    expect(result.success).toBe(false);
  });

  it('normaliza telefone de 10 dígitos para (XXX)XXX-XXXX', () => {
    const result = userUpdateApiSchema.safeParse({ telefone: '4693346918' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.telefone).toBe('(469)334-6918');
    }
  });

  it('rejeita telefone com formato inválido', () => {
    const result = userUpdateApiSchema.safeParse({ telefone: '123' });
    expect(result.success).toBe(false);
  });

  it('aceita data MM/DD/YYYY e normaliza para ISO', () => {
    const result = userUpdateApiSchema.safeParse({ dataNascimento: '05/18/1979' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dataNascimento).toBe('1979-05-18');
    }
  });

  it('rejeita data inválida', () => {
    const result = userUpdateApiSchema.safeParse({ dataNascimento: '99/99/9999' });
    expect(result.success).toBe(false);
  });

  it('CEP aceita 5-9 dígitos numéricos', () => {
    const ok = userUpdateApiSchema.safeParse({ cep: '01234567' });
    expect(ok.success).toBe(true);

    // CEP curto demais
    const tooShort = userUpdateApiSchema.safeParse({ cep: '12' });
    expect(tooShort.success).toBe(false);
  });

  // ── Expansão: ~20 combinações adicionais ──

  it('aceita todos os roles válidos', () => {
    for (const role of ['ADMIN', 'GERENTE', 'USUARIO', 'FINANCEIRO', 'ESTOQUE', 'CLIENTE']) {
      expect(userUpdateApiSchema.safeParse({ role }).success).toBe(true);
    }
  });

  it('aceita todos os status válidos', () => {
    for (const status of ['ATIVO', 'INATIVO']) {
      expect(userUpdateApiSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('aceita email válido', () => {
    expect(userUpdateApiSchema.safeParse({ email: 'test@example.com' }).success).toBe(true);
  });

  it('rejeita email inválido', () => {
    expect(userUpdateApiSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });

  it('aceita telefone formato (469) 334-6918', () => {
    const r = userUpdateApiSchema.safeParse({ telefone: '(469) 334-6918' });
    expect(r.success).toBe(true);
  });

  it('aceita telefone formato 469-334-6918', () => {
    const r = userUpdateApiSchema.safeParse({ telefone: '469-334-6918' });
    expect(r.success).toBe(true);
  });

  it('rejeita telefone com 9 dígitos', () => {
    expect(userUpdateApiSchema.safeParse({ telefone: '469334691' }).success).toBe(false);
  });

  it('rejeita telefone com 11 dígitos', () => {
    expect(userUpdateApiSchema.safeParse({ telefone: '46933469180' }).success).toBe(false);
  });

  it('rejeita telefone com letras', () => {
    expect(userUpdateApiSchema.safeParse({ telefone: 'abcdefghij' }).success).toBe(false);
  });

  it('aceita data YYYY-MM-DD', () => {
    const r = userUpdateApiSchema.safeParse({ dataNascimento: '1990-12-25' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.dataNascimento).toBe('1990-12-25');
  });

  it('rejeita data 13/40/2020 (mês/dia inválidos)', () => {
    expect(userUpdateApiSchema.safeParse({ dataNascimento: '13/40/2020' }).success).toBe(false);
  });

  it('rejeita data string aleatória', () => {
    expect(userUpdateApiSchema.safeParse({ dataNascimento: 'abc' }).success).toBe(false);
  });

  it('CEP aceita 5 dígitos', () => {
    expect(userUpdateApiSchema.safeParse({ cep: '75287' }).success).toBe(true);
  });

  it('CEP aceita 9 dígitos', () => {
    expect(userUpdateApiSchema.safeParse({ cep: '012345678' }).success).toBe(true);
  });

  it('CEP rejeita letras', () => {
    expect(userUpdateApiSchema.safeParse({ cep: 'ABCDE' }).success).toBe(false);
  });

  it('aceita múltiplos campos válidos juntos', () => {
    const r = userUpdateApiSchema.safeParse({
      nomeCompleto: 'João Silva',
      email: 'joao@test.com',
      role: 'GERENTE',
      status: 'ATIVO',
      telefone: '4693346918',
      dataNascimento: '05/18/1979',
      cep: '75287',
      cidade: 'Dallas',
      estado: 'TX',
    });
    expect(r.success).toBe(true);
  });

  it('aceita anotacoes string longa', () => {
    expect(userUpdateApiSchema.safeParse({ anotacoes: 'x'.repeat(2000) }).success).toBe(true);
  });

  it('aceita endereço campos', () => {
    expect(userUpdateApiSchema.safeParse({
      endereco1: '123 Main St',
      endereco2: 'Apt 4',
      cidade: 'Dallas',
      estado: 'TX',
    }).success).toBe(true);
  });

  it('REJEITA campo isAdmin (strict)', () => {
    expect(userUpdateApiSchema.safeParse({ isAdmin: true }).success).toBe(false);
  });

  it('REJEITA campo senha (não aceito no update API)', () => {
    // userUpdateApiSchema doesn't have senha field
    expect(userUpdateApiSchema.safeParse({ senha: 'hack123' }).success).toBe(false);
  });
});

describe('toggleUserStatusSchema · strict mode', () => {
  it('aceita ativo: true/false', () => {
    expect(toggleUserStatusSchema.safeParse({ ativo: true }).success).toBe(true);
    expect(toggleUserStatusSchema.safeParse({ ativo: false }).success).toBe(true);
  });

  it('rejeita ativo não-boolean', () => {
    expect(toggleUserStatusSchema.safeParse({ ativo: 'true' }).success).toBe(false);
    expect(toggleUserStatusSchema.safeParse({ ativo: 1 }).success).toBe(false);
  });

  it('rejeita campos extras (strict)', () => {
    const result = toggleUserStatusSchema.safeParse({ ativo: true, force: true });
    expect(result.success).toBe(false);
  });

  it('rejeita payload sem ativo', () => {
    expect(toggleUserStatusSchema.safeParse({}).success).toBe(false);
  });
});
