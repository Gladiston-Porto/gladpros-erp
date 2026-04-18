/**
 * Unit tests da hierarquia de usuários (Fase 2 do hotfix do módulo Usuários).
 *
 * Cobre o contrato em src/shared/lib/user-hierarchy.ts — a base das checagens
 * aplicadas em PATCH/DELETE/toggle-status e /[id]/status após o hotfix.
 * Qualquer mudança acidental aqui quebra os endpoints críticos, então o
 * objetivo deste arquivo é travar o comportamento esperado.
 */

import {
  UserRole,
  canManageRole,
  getManageableRoles,
  hasRoleLevel,
  hasFinancialAccess,
} from '../../../shared/lib/user-hierarchy';

describe('user-hierarchy · canManageRole', () => {
  it('ADMIN gerencia qualquer papel, inclusive outro ADMIN', () => {
    for (const role of Object.values(UserRole)) {
      expect(canManageRole(UserRole.ADMIN, role)).toBe(true);
    }
  });

  it('GERENTE gerencia apenas USUARIO, FINANCEIRO e ESTOQUE', () => {
    expect(canManageRole(UserRole.GERENTE, UserRole.USUARIO)).toBe(true);
    expect(canManageRole(UserRole.GERENTE, UserRole.FINANCEIRO)).toBe(true);
    expect(canManageRole(UserRole.GERENTE, UserRole.ESTOQUE)).toBe(true);
  });

  it('GERENTE NÃO gerencia ADMIN, outro GERENTE ou CLIENTE', () => {
    expect(canManageRole(UserRole.GERENTE, UserRole.ADMIN)).toBe(false);
    expect(canManageRole(UserRole.GERENTE, UserRole.GERENTE)).toBe(false);
    expect(canManageRole(UserRole.GERENTE, UserRole.CLIENTE)).toBe(false);
  });

  it('demais papéis não podem gerenciar ninguém', () => {
    const powerless = [
      UserRole.FINANCEIRO,
      UserRole.ESTOQUE,
      UserRole.USUARIO,
      UserRole.CLIENTE,
    ];
    for (const manager of powerless) {
      for (const target of Object.values(UserRole)) {
        expect(canManageRole(manager, target)).toBe(false);
      }
    }
  });
});

describe('user-hierarchy · getManageableRoles', () => {
  it('ADMIN retorna todos os papéis', () => {
    const roles = getManageableRoles(UserRole.ADMIN);
    expect(roles).toEqual(expect.arrayContaining(Object.values(UserRole)));
    expect(roles).toHaveLength(Object.values(UserRole).length);
  });

  it('GERENTE retorna exatamente USUARIO/FINANCEIRO/ESTOQUE', () => {
    const roles = getManageableRoles(UserRole.GERENTE);
    expect(roles.sort()).toEqual(
      [UserRole.ESTOQUE, UserRole.FINANCEIRO, UserRole.USUARIO].sort()
    );
  });

  it('papéis sem poder retornam array vazio', () => {
    expect(getManageableRoles(UserRole.FINANCEIRO)).toEqual([]);
    expect(getManageableRoles(UserRole.ESTOQUE)).toEqual([]);
    expect(getManageableRoles(UserRole.USUARIO)).toEqual([]);
    expect(getManageableRoles(UserRole.CLIENTE)).toEqual([]);
  });

  it('é consistente com canManageRole', () => {
    for (const manager of Object.values(UserRole)) {
      const list = getManageableRoles(manager);
      for (const target of Object.values(UserRole)) {
        expect(list.includes(target)).toBe(canManageRole(manager, target));
      }
    }
  });
});

describe('user-hierarchy · hasRoleLevel', () => {
  it('ADMIN tem nível superior a todos', () => {
    expect(hasRoleLevel(UserRole.ADMIN, UserRole.GERENTE)).toBe(true);
    expect(hasRoleLevel(UserRole.ADMIN, UserRole.CLIENTE)).toBe(true);
  });

  it('USUARIO não tem nível de GERENTE', () => {
    expect(hasRoleLevel(UserRole.USUARIO, UserRole.GERENTE)).toBe(false);
  });
});

describe('user-hierarchy · hasFinancialAccess', () => {
  it('apenas ADMIN e FINANCEIRO têm acesso financeiro', () => {
    expect(hasFinancialAccess(UserRole.ADMIN)).toBe(true);
    expect(hasFinancialAccess(UserRole.FINANCEIRO)).toBe(true);
    expect(hasFinancialAccess(UserRole.GERENTE)).toBe(false);
    expect(hasFinancialAccess(UserRole.ESTOQUE)).toBe(false);
    expect(hasFinancialAccess(UserRole.USUARIO)).toBe(false);
    expect(hasFinancialAccess(UserRole.CLIENTE)).toBe(false);
  });
});

describe('user-hierarchy · canManageRole · matriz 6×6 exaustiva', () => {
  const expected: Record<string, Record<string, boolean>> = {
    ADMIN: { ADMIN: true, GERENTE: true, FINANCEIRO: true, ESTOQUE: true, USUARIO: true, CLIENTE: true },
    GERENTE: { ADMIN: false, GERENTE: false, FINANCEIRO: true, ESTOQUE: true, USUARIO: true, CLIENTE: false },
    FINANCEIRO: { ADMIN: false, GERENTE: false, FINANCEIRO: false, ESTOQUE: false, USUARIO: false, CLIENTE: false },
    ESTOQUE: { ADMIN: false, GERENTE: false, FINANCEIRO: false, ESTOQUE: false, USUARIO: false, CLIENTE: false },
    USUARIO: { ADMIN: false, GERENTE: false, FINANCEIRO: false, ESTOQUE: false, USUARIO: false, CLIENTE: false },
    CLIENTE: { ADMIN: false, GERENTE: false, FINANCEIRO: false, ESTOQUE: false, USUARIO: false, CLIENTE: false },
  };

  for (const manager of Object.values(UserRole)) {
    for (const target of Object.values(UserRole)) {
      it(`${manager} → ${target} = ${expected[manager][target]}`, () => {
        expect(canManageRole(manager, target)).toBe(expected[manager][target]);
      });
    }
  }
});
