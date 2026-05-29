import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAuthJWT } from './jwt';
import { prisma } from '@/lib/prisma';
import { hasTokenVersionColumn } from '@/shared/lib/db-metadata';
import { extractAccessToken } from '@/shared/lib/requireServerUser';
import { hashAuthToken } from '@/shared/lib/auth-token-hash';
export type { ModuleKey, Action, Role } from './rbac-core';
export { policy, can, routeToModule } from './rbac-core';
import { can, type Role } from './rbac-core';

export function hasRole(userRole: string, allowed: string[]) {
  if (!userRole) return false;
  const norm = String(userRole).trim().toUpperCase();
  // Split composite role strings like "ADMIN,GERENTE" or "ADMIN|GERENTE" into parts
  const parts = norm
    .split(/[^A-Z0-9]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return allowed.some((a) => {
    const an = String(a).trim().toUpperCase();
    return an === norm || parts.includes(an);
  });
}

/**
 * requireUser — Helper principal de autenticação.
 *
 * Fonte única de verdade: jose/verifyAuthJWT com JWT_SECRET.
 * Extração de token: extractAccessToken (cookie + Bearer + header).
 * Fallback: cookies() do next/headers para Server Components sem req.
 *
 * SEMPRE passe `req` em API routes para suportar Bearer token.
 */
export async function requireUser(req?: NextRequest | Request) {
  // Extrair token de forma padronizada
  let cookie = extractAccessToken(req);
  let sessionToken: string | undefined;

  // Fallback: Server Component context via cookies()
  if (!cookie && !req) {
    try {
      const cookieStore = await cookies();
      cookie = cookieStore.get('authToken')?.value;
      sessionToken = cookieStore.get('sessionToken')?.value;
    } catch (error) {
      console.warn('cookies() not available in this context:', error);
      throw new Error('UNAUTHENTICATED');
    }
  } else if (req && 'cookies' in req && typeof (req as NextRequest).cookies?.get === 'function') {
    sessionToken = (req as NextRequest).cookies.get('sessionToken')?.value;
  }

  if (!cookie) throw new Error('UNAUTHENTICATED');

  // Fonte única de validação: jose/verifyAuthJWT
  let claims;
  try {
    claims = await verifyAuthJWT(cookie);
  } catch (error) {
    console.warn('JWT verification failed:', error);
    throw new Error('UNAUTHENTICATED');
  }

  // ─── RBAC_TRUST_JWT mode ────────────────────────────────────────────────────
  // Com RBAC_TRUST_JWT=1, tokens legados sem sessionId ainda usam as claims do
  // JWT sem consultar o banco. Tokens vinculados a sessão sempre consultam DB
  // para bloquear revogação, alteração de role/status e tokenVersion em seguida.
  //
  // Trade-off:
  //   Performance : -1 query/request (ganho real em produção com alto throughput)
  //   Segurança   : Tokens novos com sessionId têm revogação imediata.
  //   tokenVersion: Tokens novos com sessionId validam a versão no DB.
  //
  // Quando usar:
  //   ✅ Produção com alto throughput para tokens legados/sem sessão.
  //   ✅ Sessões modernas com revogação imediata preservada.
  const trustJwtOnly = process.env.RBAC_TRUST_JWT === '1';
  const tokenUser = {
    id: claims.sub,
    role: String(claims.role),
    status: claims.status ?? 'ATIVO',
    email: (claims as unknown as { email?: string } | undefined)?.email,
    nome: (claims as unknown as { nome?: string } | undefined)?.nome,
    empresaId: 1 as const,
  };

  const claimedSessionId = typeof claims.sessionId === 'number' ? claims.sessionId : undefined;

  if (trustJwtOnly && claimedSessionId === undefined) {
    return tokenUser;
  }

  const shouldCheckTokenVersion = await hasTokenVersionColumn();
  let dbRow:
    | {
        nivel: string | null;
        status: string | null;
        tokenVersion: number | null;
        empresaId: number | null;
      }
    | { nivel: string | null; status: string | null; empresaId: number | null }
    | undefined;

  try {
    dbRow = shouldCheckTokenVersion
      ? (
          await prisma.$queryRaw<
            Array<{
              nivel: string | null;
              status: string | null;
              tokenVersion: number | null;
              empresaId: number | null;
            }>
          >`
            SELECT nivel, status, tokenVersion, empresaId FROM Usuario WHERE id = ${Number(claims.sub)} LIMIT 1
          `
        )[0]
      : (
          await prisma.$queryRaw<
            Array<{ nivel: string | null; status: string | null; empresaId: number | null }>
          >`
            SELECT nivel, status, empresaId FROM Usuario WHERE id = ${Number(claims.sub)} LIMIT 1
          `
        )[0];
  } catch {
    throw new Error('UNAUTHENTICATED');
  }

  if (!dbRow) {
    throw new Error('UNAUTHENTICATED');
  }

  if (claimedSessionId !== undefined) {
    if (!sessionToken) {
      throw new Error('UNAUTHENTICATED');
    }

    const sessionTokenHash = hashAuthToken(sessionToken);

    const sessionRows = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM SessaoAtiva
      WHERE id = ${claimedSessionId}
        AND usuarioId = ${Number(claims.sub)}
        AND tokenHash = ${sessionTokenHash}
      LIMIT 1
    `;

    if (!sessionRows.length) {
      throw new Error('UNAUTHENTICATED');
    }
  }

  if (shouldCheckTokenVersion) {
    const currentVersion = ('tokenVersion' in dbRow ? dbRow.tokenVersion : 0) ?? 0;
    if ((claims.tokenVersion ?? 0) !== currentVersion) {
      throw new Error('UNAUTHENTICATED');
    }
  }

  const dbRole = dbRow.nivel ? String(dbRow.nivel).trim().toUpperCase() : undefined;
  const dbStatus = dbRow.status ? String(dbRow.status) : undefined;

  // Bloquear imediatamente usuários desativados — sem depender do JWT
  if (dbStatus === 'INATIVO') {
    throw new Error('UNAUTHENTICATED');
  }

  if (dbRole && String(claims.role).trim().toUpperCase() !== dbRole) {
    console.warn(
      `[RBAC] Token role mismatch for userId=${claims.sub}: token="${String(claims.role)}" db="${dbRole}" — using DB role`,
    );
  }

  return {
    id: claims.sub,
    role: dbRole ?? tokenUser.role,
    status: dbStatus ?? tokenUser.status,
    email: tokenUser.email,
    nome: tokenUser.nome,
    empresaId: dbRow.empresaId ?? 1,
  };
}

export function requireRoles(userRole: string, roles: string[]) {
  if (!hasRole(userRole, roles)) throw new Error('FORBIDDEN');
}

/**
 * Permissões específicas para o módulo Cliente
 */
export const ClientePermissions = {
  canRead: (userRole: string) =>
    can(String(userRole).trim().toUpperCase() as Role, 'clientes', 'read'),
  canCreate: (userRole: string) =>
    can(String(userRole).trim().toUpperCase() as Role, 'clientes', 'create'),
  canUpdate: (userRole: string) =>
    can(String(userRole).trim().toUpperCase() as Role, 'clientes', 'update'),
  canDelete: (userRole: string) =>
    can(String(userRole).trim().toUpperCase() as Role, 'clientes', 'delete'),
  // Documentos: ADMIN e GERENTE podem ver documentos descriptografados
  canViewDocuments: (userRole: string) => hasRole(userRole, ['ADMIN', 'GERENTE']),
};

/**
 * Middleware para verificar permissões de Cliente
 */
export async function requireClientePermission(
  req: NextRequest | Request,
  action: keyof typeof ClientePermissions,
) {
  const user = await requireUser(req);

  if (!ClientePermissions[action](user.role)) {
    // Log contextual info to help debugging intermittent permission issues
    try {
      // avoid exposing sensitive tokens; only log role and action
      console.warn(
        `[RBAC] Permission denied for action="${action}" role="${String(user.role)}" userId=${user.id}`,
      );
    } catch {
      // ignore logging failures
    }
    throw new Error('FORBIDDEN');
  }

  return user;
}

// server-only helpers remain here (depend on request/cookies)
