import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyAuthJWT, type AuthClaims } from './jwt'
import { prisma } from '@/lib/prisma'
import { hasTokenVersionColumn } from '@/shared/lib/db-metadata'
import { NextRequest } from 'next/server'

/**
 * extractAccessToken — Fonte única de extração de token.
 * 
 * Ordem de precedência:
 * 1. NextRequest cookies (req.cookies.get)
 * 2. Cookie header parsing manual (fallback)
 * 3. Authorization: Bearer header
 * 4. next/headers cookies() (server components, sem req)
 */
export function extractAccessToken(req?: NextRequest | Request): string | undefined {
  if (req) {
    // 1. NextRequest cookies API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ('cookies' in req && typeof (req as any).cookies?.get === 'function') {
      const val = (req as NextRequest).cookies.get("authToken")?.value
      if (val) return val
    }
    // 2. Cookie header parsing manual
    const header = req?.headers?.get?.("cookie") ?? ""
    const match = header.match(/authToken=([^;]+)/)
    if (match && match[1]) return decodeURIComponent(match[1])
    // 3. Authorization: Bearer
    const authHeader = req?.headers?.get?.("authorization") ?? ""
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
    if (bearerMatch && bearerMatch[1]) return bearerMatch[1]
  }
  return undefined
}

/**
 * extractAccessTokenAsync — versão que tenta cookies() como fallback.
 * Usada apenas em contextos server-side sem req.
 */
async function extractAccessTokenAsync(req?: NextRequest | Request): Promise<string | undefined> {
  const token = extractAccessToken(req)
  if (token) return token
  // Fallback: next/headers cookies() para Server Components
  if (!req) {
    try {
      const cookieStore = await cookies()
      return cookieStore.get('authToken')?.value
    } catch {
      return undefined
    }
  }
  return undefined
}

export type ServerUser = { id: string; role: string; email?: string; name?: string; avatarUrl?: string; empresaId: number }
export type ApiUser = { id: number; role: string; email: string; name?: string; avatarUrl?: string }

type AuthenticatedUserRow = {
  id: number;
  email: string;
  nomeCompleto: string | null;
  avatarUrl: string | null;
  tokenVersion?: number | null;
  status: string;
  empresaId: number | null;
};

const resolveServerUserFromToken = cache(async (token: string): Promise<ServerUser> => {
  const claims = await verifyAuthJWT(token);
  const userId = parseInt(claims.sub, 10);

  const shouldCheckTokenVersion = await hasTokenVersionColumn();
  const userRows = shouldCheckTokenVersion
    ? await prisma.$queryRaw<Array<AuthenticatedUserRow>>`
        SELECT id, email, nomeCompleto, avatarUrl, tokenVersion, status, empresaId
        FROM Usuario
        WHERE id = ${userId}
        LIMIT 1
      `
    : await prisma.$queryRaw<Array<AuthenticatedUserRow>>`
        SELECT id, email, nomeCompleto, avatarUrl, status, empresaId
        FROM Usuario
        WHERE id = ${userId}
        LIMIT 1
      `;

  if (!userRows.length) {
    throw new Error('USER_NOT_FOUND');
  }

  const usuario = userRows[0];

  if (shouldCheckTokenVersion) {
    const currentVersion = usuario.tokenVersion ?? 0;
    if ((claims.tokenVersion ?? 0) !== currentVersion) {
      throw new Error('TOKEN_VERSION_MISMATCH');
    }
  }

  if (claims.status !== 'ATIVO' || usuario.status !== 'ATIVO') {
    throw new Error('USER_INACTIVE');
  }

  return {
    id: claims.sub,
    role: claims.role,
    email: usuario.email || undefined,
    name: usuario.nomeCompleto || 'Usuário',
    avatarUrl: usuario.avatarUrl || undefined,
    empresaId: usuario.empresaId ?? 1,
  };
});

export async function requireServerUser(): Promise<ServerUser> {
  const cookie = await extractAccessTokenAsync()
  if (!cookie) {
    return redirect('/login')
  }

  try {
    return await resolveServerUserFromToken(cookie)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'USER_NOT_FOUND') return redirect('/login?e=user')
      if (error.message === 'TOKEN_VERSION_MISMATCH') return redirect('/login?e=tokenver')
      if (error.message === 'USER_INACTIVE') return redirect('/login?e=inactive')
    }
    console.error('[requireServerUser] Token validation failed:', error);
    return redirect('/login?e=token')
  }
}

/**
 * requireApiUser — Helper de auth para API routes.
 * Usa jose/verifyAuthJWT (mesma lib do middleware global).
 * Aceita cookie authToken E Authorization: Bearer.
 */
export async function requireApiUser(req?: NextRequest): Promise<ApiUser> {
  const token = await extractAccessTokenAsync(req)
  if (!token) {
    throw new Error("UNAUTHENTICATED")
  }

  try {
    // Validar token usando jose (mesma fonte de verdade do middleware global)
    const claims: AuthClaims = await verifyAuthJWT(token);
    const userId = parseInt(claims.sub ?? '0', 10);

    // Buscar dados do usuário no banco
    const userRows = await prisma.$queryRaw<Array<{
      id: number;
      email: string;
      nomeCompleto: string | null;
      avatarUrl: string | null;
      tokenVersion: number;
      status: string
    }>>`
      SELECT id, email, nomeCompleto, avatarUrl, tokenVersion, status
      FROM Usuario
      WHERE id = ${userId}
      LIMIT 1
    `

    if (!userRows.length) {
      throw new Error("USER_NOT_FOUND")
    }
    const usuario = userRows[0]

    if (usuario.status !== 'ATIVO') {
      throw new Error("USER_INACTIVE")
    }

    // tokenVersion check
    if (await hasTokenVersionColumn()) {
      try {
        const currentVersion = usuario.tokenVersion ?? 0
        if ((claims.tokenVersion ?? 0) !== currentVersion) throw new Error("UNAUTHENTICATED")
      } catch {
        // Falha transitória: não bloquear
      }
    }

    return {
      id: userId,
      role: String(claims.role || 'USUARIO'),
      email: usuario.email,
      name: usuario.nomeCompleto || 'Usuário',
      avatarUrl: usuario.avatarUrl || undefined,
    }
  } catch (error) {
    console.error('[requireApiUser] Token validation failed:', error);
    throw new Error("UNAUTHENTICATED")
  }
}
