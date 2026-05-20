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

  // ─── RBAC_TRUST_JWT mode ────────────────────────────────────────────────────
  // Com RBAC_TRUST_JWT=1, o sistema confia 100% nas claims do JWT sem consultar
  // o banco de dados. Isso elimina 1 query por request autenticada, mas cria
  // uma janela de segurança onde usuários desativados ou com role alterado
  // continuam com acesso válido até o JWT expirar.
  //
  // Trade-off:
  //   Performance : -1 query/request (ganho real em produção com alto throughput)
  //   Segurança   : Desativação de usuário NÃO é imediata — window de até 8h
  //                 (cookie maxAge) ou 7 dias (JWT bruto sem cookie)
  //   tokenVersion: O incremento de tokenVersion feito pelo toggle-status NÃO
  //                 invalida tokens em uso quando RBAC_TRUST_JWT=1, pois o DB
  //                 nunca é consultado para validar a versão.
  //
  // Quando usar:
  //   ✅ Produção com alto throughput — aceita window de 8h após desativação
  //   ❌ Quando for necessário bloqueio imediato de usuários comprometidos
  //
  // Mitigação ao desativar usuário com flag ativa:
  //   • Chamar /api/auth/logout no contexto do usuário (invalida cookie)
  //   • OU aguardar o cookie expirar (8 horas por padrão)
  //   • OU rotacionar JWT_SECRET para invalidar todos os tokens (impacto global)
  const trustJwtOnly = process.env.RBAC_TRUST_JWT === '1'
  const tokenUser = {
    id: claims.sub,
    role: String(claims.role),
    status: claims.status ?? "ATIVO",
    email: (claims as unknown as { email?: string } | undefined)?.email,
    nome: (claims as unknown as { nome?: string } | undefined)?.nome,
    empresaId: 1 as const,
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

  // Bloquear imediatamente usuários desativados — sem depender do JWT
  if (dbStatus === 'INATIVO') {
    throw new Error("UNAUTHENTICATED")
  }

  if (dbRole && String(claims.role).trim().toUpperCase() !== dbRole) {
    console.warn(`[RBAC] Token role mismatch for userId=${claims.sub}: token="${String(claims.role)}" db="${dbRole}" — using DB role`)
  }

  return {
    id: claims.sub,
    role: dbRole ?? tokenUser.role,
    status: dbStatus ?? tokenUser.status,
    email: tokenUser.email,
    nome: tokenUser.nome,
    empresaId: 1 as const,
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
