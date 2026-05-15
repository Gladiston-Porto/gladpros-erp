/**
 * RBAC - Permissões do Módulo Projects
 * 
 * Define as regras de acesso para o módulo de Projetos baseado em roles.
 * Segue o padrão estabelecido em rbac.ts para consistência.
 */

import type { NextRequest } from "next/server"
import { requireUser, hasRole } from "./rbac"
import { prisma } from "@/lib/prisma"

/**
 * Matriz de Permissões - Módulo Projects
 * 
 * ADMIN: Acesso completo a todas as operações
 * GERENTE: Pode gerenciar projetos, etapas, tarefas e materiais
 * USUARIO: Pode visualizar e atualizar projetos atribuídos a ele
 * ESTOQUE: Pode gerenciar materiais e anexos de projetos
 * FINANCEIRO: Pode visualizar custos e métricas financeiras
 */
export const ProjectPermissions = {
  // ============================================
  // PROJETOS - CRUD básico
  // ============================================
  
  /**
   * Leitura de projetos
   * Todos os roles autenticados podem visualizar projetos
   */
  canRead: (userRole: string) => 
    hasRole(userRole, ['ADMIN', 'GERENTE', 'USUARIO', 'ESTOQUE', 'FINANCEIRO', 'CLIENTE']),
  
  /**
   * Criação de projetos
   * ADMIN e GERENTE podem criar novos projetos
   */
  canCreate: (userRole: string) => 
    hasRole(userRole, ['ADMIN', 'GERENTE']),
  
  /**
   * Atualização de projetos
   * ADMIN, GERENTE e USUARIO (próprios projetos) podem editar
   */
  canUpdate: (userRole: string) => 
    hasRole(userRole, ['ADMIN', 'GERENTE', 'USUARIO']),
  
  /**
   * Deleção de projetos
   * Apenas ADMIN pode excluir projetos
   */
  canDelete: (userRole: string) => 
    hasRole(userRole, ['ADMIN']),
  
  /**
   * Alteração de status de projetos
   * ADMIN e GERENTE podem alterar qualquer status
   * USUARIO pode alterar status de seus próprios projetos
   */
  canChangeStatus: (userRole: string) => 
    hasRole(userRole, ['ADMIN', 'GERENTE', 'USUARIO']),
  
  // ============================================
  // ETAPAS - Gestão de fases do projeto
  // ============================================
  
  /**
   * Gerenciar etapas (criar, editar, reordenar)
   * ADMIN, GERENTE e USUARIO podem gerenciar etapas
   */
  canManageStages: (userRole: string) => 
    hasRole(userRole, ['ADMIN', 'GERENTE', 'USUARIO']),
  
  // ============================================
  // TAREFAS - Gestão de atividades
  // ============================================
  
  /**
   * Gerenciar tarefas (criar, editar, atribuir)
   * ADMIN, GERENTE e USUARIO podem gerenciar tarefas
   */
  canManageTasks: (userRole: string) => 
    hasRole(userRole, ['ADMIN', 'GERENTE', 'USUARIO']),
  
  // ============================================
  // MATERIAIS - Gestão de recursos
  // ============================================
  
  /**
   * Gerenciar materiais (adicionar, remover, alterar status)
   * ADMIN, GERENTE e ESTOQUE podem gerenciar materiais
   */
  canManageMaterials: (userRole: string) => 
    hasRole(userRole, ['ADMIN', 'GERENTE', 'ESTOQUE']),
  
  // ============================================
  // ANEXOS - Gestão de arquivos
  // ============================================
  
  /**
   * Upload de anexos
   * ADMIN, GERENTE, USUARIO e ESTOQUE podem fazer upload
   */
  canUploadAttachments: (userRole: string) => 
    hasRole(userRole, ['ADMIN', 'GERENTE', 'USUARIO', 'ESTOQUE']),
  
  /**
   * Download de anexos
   * Todos os roles autenticados podem fazer download
   */
  canDownloadAttachments: (userRole: string) => 
    hasRole(userRole, ['ADMIN', 'GERENTE', 'USUARIO', 'ESTOQUE', 'FINANCEIRO', 'CLIENTE']),
  
  /**
   * Exclusão de anexos
   * ADMIN, GERENTE podem excluir anexos
   */
  canDeleteAttachments: (userRole: string) => 
    hasRole(userRole, ['ADMIN', 'GERENTE']),
  
  // ============================================
  // HISTÓRICO - Auditoria
  // ============================================
  
  /**
   * Visualizar histórico completo
   * ADMIN e GERENTE podem ver todo o histórico
   */
  canViewHistory: (userRole: string) => 
    hasRole(userRole, ['ADMIN', 'GERENTE']),
  
  // ============================================
  // DASHBOARD & MÉTRICAS
  // ============================================
  
  /**
   * Visualizar dashboard e métricas agregadas
   * ADMIN, GERENTE e FINANCEIRO podem ver métricas
   */
  canViewDashboard: (userRole: string) => 
    hasRole(userRole, ['ADMIN', 'GERENTE', 'FINANCEIRO']),
  
  /**
   * Visualizar dados financeiros (custos, orçamentos)
   * ADMIN, GERENTE e FINANCEIRO podem ver valores
   */
  canViewFinancials: (userRole: string) => 
    hasRole(userRole, ['ADMIN', 'GERENTE', 'FINANCEIRO']),
}

/**
 * Verificações de Propriedade (Ownership)
 * Usuários podem ter permissões adicionais em projetos onde são responsáveis
 */
export const ProjectOwnershipChecks = {
  /**
   * Verifica se o usuário é responsável pelo projeto
   */
  isResponsavel: (userId: number, responsavelId: number | null): boolean => {
    return responsavelId === userId
  },
  
  /**
   * Verifica se o usuário é responsável por uma tarefa
   */
  isResponsavelTarefa: (userId: number, responsavelTarefaId: number | null): boolean => {
    return responsavelTarefaId === userId
  },
  
  /**
   * Verifica se o usuário pode editar um projeto específico
   * ADMIN e GERENTE: sempre podem
   * USUARIO: apenas se for responsável
   */
  canUpdateProject: (userRole: string, userId: number, responsavelId: number | null): boolean => {
    if (hasRole(userRole, ['ADMIN', 'GERENTE'])) return true
    return ProjectOwnershipChecks.isResponsavel(userId, responsavelId)
  },
}

export type ProjectAuthUser = {
  id: string | number
  role: string
  email?: string
}

type ProjectScopedAction =
  | keyof typeof ProjectPermissions
  | "canDownloadAttachments"
  | "canDeleteAttachments"

type ProjectChildType = "etapa" | "tarefa" | "material" | "anexo"

async function resolveClientIdForUser(user: ProjectAuthUser): Promise<number> {
  const email =
    user.email ??
    (
      await prisma.usuario.findUnique({
        where: { id: Number(user.id) },
        select: { email: true },
      })
    )?.email

  if (!email) {
    throw new Error("FORBIDDEN")
  }

  const cliente = await prisma.cliente.findUnique({
    where: { email },
    select: { id: true },
  })

  if (!cliente) {
    throw new Error("FORBIDDEN")
  }

  return cliente.id
}

export async function getProjectListScopeForUser(user: ProjectAuthUser) {
  if (user.role === "CLIENTE") {
    return { clienteId: await resolveClientIdForUser(user) }
  }

  if (user.role === "USUARIO") {
    return { responsavelId: Number(user.id) }
  }

  return {}
}

export async function requireProjectAccess(
  user: ProjectAuthUser,
  projectId: number,
  action: ProjectScopedAction = "canRead"
) {
  const scope = await getProjectListScopeForUser(user)
  const projeto = await prisma.projeto.findFirst({
    where: { id: projectId, ...scope },
    select: {
      id: true,
      clienteId: true,
      responsavelId: true,
    },
  })

  if (!projeto) {
    console.warn(
      `[RBAC-Projects] Project access denied: action="${action}" role="${user.role}" userId=${user.id} projectId=${projectId}`
    )
    throw new Error("FORBIDDEN")
  }

  return projeto
}

export async function requireProjectChildAccess(
  user: ProjectAuthUser,
  projectId: number,
  childType: ProjectChildType,
  childId: number,
  action: ProjectScopedAction = "canRead"
) {
  await requireProjectAccess(user, projectId, action)

  const child = await findProjectChild(childType, projectId, childId)
  if (!child) {
    console.warn(
      `[RBAC-Projects] Child access denied: action="${action}" role="${user.role}" userId=${user.id} projectId=${projectId} ${childType}Id=${childId}`
    )
    throw new Error("FORBIDDEN")
  }

  return child
}

async function findProjectChild(
  childType: ProjectChildType,
  projectId: number,
  childId: number
): Promise<{ id: number; projetoId: number } | null> {
  switch (childType) {
    case "etapa":
      return prisma.projetoEtapa.findFirst({
        where: { id: childId, projetoId: projectId },
        select: { id: true, projetoId: true },
      })
    case "tarefa":
      return prisma.projetoTarefa.findFirst({
        where: { id: childId, projetoId: projectId },
        select: { id: true, projetoId: true },
      })
    case "material":
      return prisma.projetoMaterial.findFirst({
        where: { id: childId, projetoId: projectId },
        select: { id: true, projetoId: true },
      })
    case "anexo":
      return prisma.projetoAnexo.findFirst({
        where: { id: childId, projetoId: projectId },
        select: { id: true, projetoId: true },
      })
  }
}

/**
 * Middleware para verificar permissões de Projects
 * 
 * @param req - Request do Next.js
 * @param action - Ação que o usuário está tentando realizar
 * @returns User com role e id
 * @throws Error('FORBIDDEN') se não tiver permissão
 */
export async function requireProjectPermission(
  req: NextRequest | Request,
  action: keyof typeof ProjectPermissions
) {
  const user = await requireUser(req)
  
  if (!ProjectPermissions[action](user.role)) {
    console.warn(
      `[RBAC-Projects] Permission denied: action="${action}" role="${user.role}" userId=${user.id}`
    )
    throw new Error("FORBIDDEN")
  }
  
  return user
}

/**
 * Middleware para verificar permissões com ownership
 * 
 * @param req - Request do Next.js
 * @param action - Ação que o usuário está tentando realizar
 * @param responsavelId - ID do responsável pelo projeto (para ownership check)
 * @returns User com role e id
 * @throws Error('FORBIDDEN') se não tiver permissão
 */
export async function requireProjectOwnershipPermission(
  req: NextRequest | Request,
  action: 'canUpdate' | 'canChangeStatus',
  responsavelId: number | null
) {
  const user = await requireUser(req)
  
  // Verifica permissão base
  if (!ProjectPermissions[action](user.role)) {
    console.warn(
      `[RBAC-Projects] Permission denied (base): action="${action}" role="${user.role}" userId=${user.id}`
    )
    throw new Error("FORBIDDEN")
  }
  
  // Se for USUARIO, verifica ownership
  if (user.role === 'USUARIO') {
    if (!ProjectOwnershipChecks.isResponsavel(Number(user.id), responsavelId)) {
      console.warn(
        `[RBAC-Projects] Permission denied (ownership): userId=${user.id} not responsible for project`
      )
      throw new Error("FORBIDDEN")
    }
  }
  
  return user
}

/**
 * Função auxiliar para mascarar dados financeiros
 * USUARIO não vê valores de orçamento e custos
 */
export function shouldMaskFinancials(userRole: string): boolean {
  return !ProjectPermissions.canViewFinancials(userRole)
}

export function maskProjectFinancials<T extends Record<string, unknown>>(projeto: T): T {
  return {
    ...projeto,
    orcamento: undefined,
    custoTotal: undefined,
    valorOrcado: undefined,
    valorRealizado: undefined,
    valorEstimado: undefined,
    custoPrevisto: undefined,
    custoReal: undefined,
    margemPrevista: undefined,
    margemReal: undefined,
    lucroPrevisto: undefined,
    lucroReal: undefined,
  }
}
