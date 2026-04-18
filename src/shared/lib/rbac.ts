import type { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { verifyAuthJWT } from "./jwt"
import { prisma } from "@/lib/prisma"
import { hasTokenVersionColumn } from "@/shared/lib/db-metadata"
import { extractAccessToken } from "@/shared/lib/requireServerUser"
export type { ModuleKey, Action, Role } from "./rbac-core"
export { policy, can, routeToModule } from "./rbac-core"
import { can, type Role } from "./rbac-core"

export function hasRole(userRole: string, allowed: string[]) {
  if (!userRole) return false
  const norm = String(userRole).trim().toUpperCase()
  // Split composite role strings like "ADMIN,GERENTE" or "ADMIN|GERENTE" into parts
  const parts = norm.split(/[^A-Z0-9]+/).map((p) => p.trim()).filter(Boolean)
  return allowed.some((a) => {
    const an = String(a).trim().toUpperCase()
    return an === norm || parts.includes(an)
  })
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
  let cookie = extractAccessToken(req)

  // Fallback: Server Component context via cookies()
  if (!cookie && !req) {
    try {
      const cookieStore = await cookies()
      cookie = cookieStore.get('authToken')?.value
    } catch (error) {
      console.warn('cookies() not available in this context:', error)
      throw new Error("UNAUTHENTICATED")
    }
  }

  if (!cookie) throw new Error("UNAUTHENTICATED")
  
  // Fonte única de validação: jose/verifyAuthJWT
  let claims;
  try {
    claims = await verifyAuthJWT(cookie);
  } catch (error) {
    console.warn('JWT verification failed:', error)
    throw new Error("UNAUTHENTICATED")
  }

  const trustJwtOnly = process.env.RBAC_TRUST_JWT === '1'
  const tokenUser = {
    id: claims.sub,
    role: String(claims.role),
    status: claims.status ?? "ATIVO",
    email: (claims as unknown as { email?: string } | undefined)?.email,
    nome: (claims as unknown as { nome?: string } | undefined)?.nome,
  }

  if (trustJwtOnly) {
    return tokenUser
  }

  const shouldCheckTokenVersion = await hasTokenVersionColumn()
  let dbRow:
    | { nivel: string | null; status: string | null; tokenVersion: number | null }
    | { nivel: string | null; status: string | null }
    | undefined

  try {
    dbRow = shouldCheckTokenVersion
      ? (
          await prisma.$queryRaw<Array<{ nivel: string | null; status: string | null; tokenVersion: number | null }>>`
            SELECT nivel, status, tokenVersion FROM Usuario WHERE id = ${Number(claims.sub)} LIMIT 1
          `
        )[0]
      : (
          await prisma.$queryRaw<Array<{ nivel: string | null; status: string | null }>>`
            SELECT nivel, status FROM Usuario WHERE id = ${Number(claims.sub)} LIMIT 1
          `
        )[0]
  } catch {
    throw new Error("UNAUTHENTICATED")
  }

  if (!dbRow) {
    throw new Error("UNAUTHENTICATED")
  }

  if (shouldCheckTokenVersion) {
    const currentVersion = ("tokenVersion" in dbRow ? dbRow.tokenVersion : 0) ?? 0
    if ((claims.tokenVersion ?? 0) !== currentVersion) {
      throw new Error("UNAUTHENTICATED")
    }
  }

  const dbRole = dbRow.nivel ? String(dbRow.nivel).trim().toUpperCase() : undefined
  const dbStatus = dbRow.status ? String(dbRow.status) : undefined
  if (dbRole && String(claims.role).trim().toUpperCase() !== dbRole) {
    console.warn(`[RBAC] Token role mismatch for userId=${claims.sub}: token="${String(claims.role)}" db="${dbRole}" — using DB role`)
  }

  return {
    id: claims.sub,
    role: dbRole ?? tokenUser.role,
    status: dbStatus ?? tokenUser.status,
    email: tokenUser.email,
    nome: tokenUser.nome,
  }
}

export function requireRoles(userRole: string, roles: string[]) {
  if (!hasRole(userRole, roles)) throw new Error("FORBIDDEN")
}

/**
 * Permissões específicas para o módulo Cliente
 */
export const ClientePermissions = {
  canRead: (userRole: string) => can(String(userRole).trim().toUpperCase() as Role, "clientes", "read"),
  canCreate: (userRole: string) => can(String(userRole).trim().toUpperCase() as Role, "clientes", "create"),
  canUpdate: (userRole: string) => can(String(userRole).trim().toUpperCase() as Role, "clientes", "update"),
  canDelete: (userRole: string) => can(String(userRole).trim().toUpperCase() as Role, "clientes", "delete"),
  // Documentos: ADMIN e GERENTE podem ver documentos descriptografados
  canViewDocuments: (userRole: string) => hasRole(userRole, ['ADMIN', 'GERENTE'])
}

/**
 * Middleware para verificar permissões de Cliente
 */
export async function requireClientePermission(
  req: NextRequest | Request,
  action: keyof typeof ClientePermissions
) {
  const user = await requireUser(req)
  
  if (!ClientePermissions[action](user.role)) {
    // Log contextual info to help debugging intermittent permission issues
    try {
      // avoid exposing sensitive tokens; only log role and action
      console.warn(`[RBAC] Permission denied for action="${action}" role="${String(user.role)}" userId=${user.id}`)
    } catch {
      // ignore logging failures
    }
    throw new Error("FORBIDDEN")
  }
  
  return user
}

// server-only helpers remain here (depend on request/cookies)
