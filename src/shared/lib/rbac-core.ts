export type ModuleKey =
  | "usuarios"
  | "financeiro"
  | "clientes"
  | "projetos"
  | "propostas"
  | "estoque"
  // New modules (F1.5)
  | "service-orders"
  | "workforce"
  | "rh"
  | "invoices"
  | "reports"
  | "analytics"
  | "documents"
  | "aprovacoes"
  | "dashboard"
  | "notifications"
  | "configuracoes"

export type Action = "read" | "create" | "update" | "delete"
export type Role = "ADMIN" | "GERENTE" | "USUARIO" | "FINANCEIRO" | "ESTOQUE" | "CLIENTE"

const ALL: Action[] = ["read", "create", "update", "delete"]
const RW: Action[] = ["read", "create", "update"] // Read + Write, sem delete
const RO: Action[] = ["read"]
const NONE: Action[] = []

export const policy: Record<ModuleKey, Partial<Record<Role, Action[]>>> = {
  // ----- Original modules -----
  usuarios:      { ADMIN: ALL, GERENTE: ALL, USUARIO: RO },
  financeiro:    { ADMIN: ALL, FINANCEIRO: ALL, GERENTE: RO },
  clientes:      { ADMIN: ALL, GERENTE: RW, USUARIO: RW, FINANCEIRO: RO, ESTOQUE: RO },
  projetos:      { ADMIN: ALL, GERENTE: ALL, USUARIO: ALL, FINANCEIRO: ALL, ESTOQUE: ALL, CLIENTE: RO },
  propostas:     { ADMIN: ALL, GERENTE: ALL, FINANCEIRO: ALL, ESTOQUE: NONE, USUARIO: NONE, CLIENTE: NONE },
  estoque:       { ADMIN: ALL, ESTOQUE: ALL, GERENTE: RO, USUARIO: RO, FINANCEIRO: RO },

  // ----- New modules (Fase 1.5) -----
  "service-orders": { ADMIN: ALL, GERENTE: ALL, USUARIO: RW, FINANCEIRO: RO, ESTOQUE: RO },
  workforce:        { ADMIN: ALL, GERENTE: ALL, USUARIO: RO, FINANCEIRO: RO },
  rh:               { ADMIN: ALL, GERENTE: ALL, FINANCEIRO: RO },
  invoices:         { ADMIN: ALL, GERENTE: ALL, FINANCEIRO: ALL, USUARIO: RO, CLIENTE: RO },
  reports:          { ADMIN: ALL, GERENTE: RO, FINANCEIRO: RO },
  analytics:        { ADMIN: RO, GERENTE: RO },
  documents:        { ADMIN: ALL, GERENTE: ALL, USUARIO: RW, FINANCEIRO: RO, ESTOQUE: RO },
  aprovacoes:       { ADMIN: ALL, GERENTE: ALL, FINANCEIRO: RW, USUARIO: RO },
  dashboard:        { ADMIN: RO, GERENTE: RO, USUARIO: RO, FINANCEIRO: RO, ESTOQUE: RO },
  notifications:    { ADMIN: ALL, GERENTE: RO, USUARIO: RO, FINANCEIRO: RO, ESTOQUE: RO },
  configuracoes:    { ADMIN: ALL, GERENTE: RO },
}

export function can(role: Role, moduleKey: ModuleKey, action: Action): boolean {
  if (role === "ADMIN") return true
  const allowed = policy[moduleKey]?.[role] ?? NONE
  return allowed.includes(action)
}

// ── Field-level RBAC ─────────────────────────────────────────────────────────

export type FieldGroup = 'financials' | 'internal_estimates' | 'tax_details' | 'worker_pay'

export const fieldVisibility: Record<FieldGroup, Role[]> = {
  financials:         ['ADMIN', 'GERENTE', 'FINANCEIRO'],
  internal_estimates: ['ADMIN', 'GERENTE', 'FINANCEIRO'],
  tax_details:        ['ADMIN', 'FINANCEIRO'],
  worker_pay:         ['ADMIN', 'GERENTE', 'FINANCEIRO'],
}

/**
 * Check if a role can see a given field group.
 * ADMIN always has access (short-circuit).
 */
export function canSeeFieldGroup(role: Role, group: FieldGroup): boolean {
  if (role === 'ADMIN') return true
  return fieldVisibility[group].includes(role)
}

export function routeToModule(pathname: string): ModuleKey | null {
  // Order matters: more-specific prefixes first
  if (pathname.startsWith("/service-orders") || pathname.startsWith("/api/service-orders") || pathname.startsWith("/ordens-servico")) return "service-orders"
  if (pathname.startsWith("/workforce") || pathname.startsWith("/api/workforce")) return "workforce"
  if (pathname.startsWith("/rh") || pathname.startsWith("/api/rh")) return "rh"
  if (pathname.startsWith("/invoices") || pathname.startsWith("/api/invoices")) return "invoices"
  if (pathname.startsWith("/reports") || pathname.startsWith("/api/reports") || pathname.startsWith("/relatorios")) return "reports"
  if (pathname.startsWith("/analytics") || pathname.startsWith("/api/analytics") || pathname.startsWith("/api/insights")) return "analytics"
  if (pathname.startsWith("/documents") || pathname.startsWith("/api/documents") || pathname.startsWith("/documentos")) return "documents"
  if (pathname.startsWith("/aprovacoes") || pathname.startsWith("/api/aprovacoes")) return "aprovacoes"
  if (pathname.startsWith("/notifications") || pathname.startsWith("/api/notifications")) return "notifications"
  if (pathname.startsWith("/configuracoes")) return "configuracoes"
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api/dashboard")) return "dashboard"
  if (pathname.startsWith("/usuarios") || pathname.startsWith("/api/usuarios")) return "usuarios"
  if (pathname.startsWith("/financeiro") || pathname.startsWith("/api/financeiro") || pathname.startsWith("/dashboard/financeiro")) return "financeiro"
  if (pathname.startsWith("/clientes") || pathname.startsWith("/api/clientes") || pathname.startsWith("/api/clients")) return "clientes"
  if (pathname.startsWith("/projetos") || pathname.startsWith("/api/projetos") || pathname.startsWith("/meus-projetos") || pathname.startsWith("/api/meus-projetos")) return "projetos"
  if (pathname.startsWith("/propostas") || pathname.startsWith("/api/propostas") || pathname.startsWith("/proposta-modular")) return "propostas"
  if (pathname.startsWith("/estoque") || pathname.startsWith("/api/estoque") || pathname.startsWith("/api/inventory")) return "estoque"
  return null
}
