/**
 * Hierarquia de Usuários - Sistema GladPros
 *
 * Define os níveis de acesso e funções para verificação hierárquica.
 * Baseado na proposta: ADMIN → GERENTE → FINANCEIRO → ESTOQUE → USUARIO → CLIENTE
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  GERENTE = 'GERENTE',
  FINANCEIRO = 'FINANCEIRO',
  ESTOQUE = 'ESTOQUE',
  USUARIO = 'USUARIO',
  CLIENTE = 'CLIENTE',
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 1,
  [UserRole.GERENTE]: 2,
  [UserRole.FINANCEIRO]: 3,
  [UserRole.ESTOQUE]: 4,
  [UserRole.USUARIO]: 5,
  [UserRole.CLIENTE]: 6,
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrador do Sistema - Controle total',
  [UserRole.GERENTE]: 'Gerente Geral - Supervisão de operações',
  [UserRole.FINANCEIRO]: 'Responsável Financeiro - Gestão financeira',
  [UserRole.ESTOQUE]: 'Responsável por Estoque - Controle de inventário',
  [UserRole.USUARIO]: 'Usuário de Campo - Operações diárias',
  [UserRole.CLIENTE]: 'Cliente Externo - Acesso limitado',
};

/**
 * Verifica se um papel tem nível superior ou igual a outro
 * @param userRole Papel do usuário
 * @param requiredRole Papel requerido
 * @returns true se userRole >= requiredRole na hierarquia
 */
export function hasRoleLevel(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] <= ROLE_HIERARCHY[requiredRole];
}

/**
 * Verifica se um papel pode gerenciar outro (ex.: GERENTE pode gerenciar USUARIO)
 * @param managerRole Papel do gerente
 * @param targetRole Papel do alvo
 * @returns true se managerRole pode gerenciar targetRole
 */
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  // ADMIN pode gerenciar todos
  if (managerRole === UserRole.ADMIN) return true;

  // GERENTE pode gerenciar: USUARIO, FINANCEIRO, ESTOQUE
  if (managerRole === UserRole.GERENTE) {
    return [UserRole.USUARIO, UserRole.FINANCEIRO, UserRole.ESTOQUE].includes(targetRole);
  }

  // Outros papéis não podem gerenciar ninguém
  return false;
}

/**
 * Retorna a lista de papéis que um usuário pode gerenciar
 * @param userRole Papel do usuário
 * @returns Array de papéis gerenciáveis
 */
export function getManageableRoles(userRole: UserRole): UserRole[] {
  if (userRole === UserRole.ADMIN) {
    return Object.values(UserRole);
  }

  if (userRole === UserRole.GERENTE) {
    return [UserRole.USUARIO, UserRole.FINANCEIRO, UserRole.ESTOQUE];
  }

  return [];
}

/**
 * Verifica se um papel tem acesso a módulos financeiros
 * @param userRole Papel do usuário
 * @returns true se tem acesso a valores/finanças
 */
export function hasFinancialAccess(userRole: UserRole): boolean {
  return [UserRole.ADMIN, UserRole.FINANCEIRO].includes(userRole);
}

/**
 * Retorna módulos visíveis no sidebar/menu para um papel
 * @param userRole Papel do usuário
 * @returns Array de módulos permitidos
 */
export function getVisibleModules(userRole: UserRole): string[] {
  const baseModules = ['dashboard'];

  // Baseado na matriz de permissões em AGENTS.md (seção 6.6)
  // Módulos listados são aqueles onde o role tem acesso RO ou superior
  switch (userRole) {
    case UserRole.ADMIN:
      return [
        ...baseModules,
        'usuarios',
        'clientes',
        'propostas',
        'projetos',
        'service-orders',
        'estoque',
        'financeiro',
        'invoices',
        'rh',
        'workforce',
        'relatorios',
        'analytics',
        'documents',
        'aprovacoes',
        'configuracoes',
      ];
    case UserRole.GERENTE:
      return [
        ...baseModules,
        'clientes',
        'propostas',
        'projetos',
        'service-orders',
        'estoque',
        'financeiro',
        'invoices',
        'rh',
        'workforce',
        'relatorios',
        'analytics',
        'documents',
        'aprovacoes',
        'configuracoes',
      ];
    case UserRole.FINANCEIRO:
      return [
        ...baseModules,
        'clientes',
        'propostas',
        'projetos',
        'service-orders',
        'estoque',
        'financeiro',
        'invoices',
        'rh',
        'workforce',
        'relatorios',
        'documents',
        'aprovacoes',
      ];
    case UserRole.ESTOQUE:
      return [...baseModules, 'clientes', 'projetos', 'service-orders', 'estoque', 'documents'];
    case UserRole.USUARIO:
      return [
        ...baseModules,
        'clientes',
        'projetos',
        'service-orders',
        'estoque',
        'invoices',
        'workforce',
        'documents',
        'aprovacoes',
      ];
    case UserRole.CLIENTE:
      return ['projetos', 'invoices'];
    default:
      return baseModules;
  }
}
