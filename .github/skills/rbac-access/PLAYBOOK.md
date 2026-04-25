# GladPros — RBAC Access Control PLAYBOOK

> **Uso**: Checklist e guia passo a passo para implementar controle de acesso correto.
> Para a matriz de permissões completa, ver `SKILL.md` e `references/`.

---

## 1. Checklist de Proteção por Camada

Toda feature nova deve passar por este checklist em **todas as camadas**:

### Camada 1: API Route (Backend)
```typescript
// ✅ OBRIGATÓRIO em toda rota sensível
export async function GET(request: NextRequest) {
  // 1. Autenticação
  const user = await requireUser(request)

  // 2. RBAC
  if (!can(user.role as Role, 'modulo', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 })
  }

  // 3. Filtrar por empresaId (single-tenant)
  const data = await prisma.model.findMany({
    where: { empresaId: 1 }  // nunca confiar no input do usuário para isso
  })
}
```

### Camada 2: Server Component (Page)
```typescript
// ✅ OBRIGATÓRIO em toda page protegida
export default async function PaginaProtegida() {
  const user = await requireServerUser()
  const mod = routeToModule('/caminho-da-page')

  if (mod && !can(user.role as Role, mod, 'read')) {
    redirect('/403')
  }

  return <Conteudo user={user} />
}
```

### Camada 3: Client Component (UI)
```typescript
// ✅ OBRIGATÓRIO para botões e ações destrutivas
{can(user.role as Role, 'clientes', 'create') && (
  <Button>Novo Cliente</Button>
)}

{can(user.role as Role, 'clientes', 'delete') && (
  <Button variant="destructive">Excluir</Button>
)}

// ✅ Para seções inteiras condicionais
{can(user.role as Role, 'financeiro', 'read') && (
  <FinancialSummaryCard />
)}
```

### Camada 4: Middleware (Pré-autenticação)
```typescript
// middleware.ts já protege rotas por prefixo
// Adicionar nova rota protegida:
const protectedPrefixes = [
  '/dashboard',
  '/novo-modulo',  // ← adicionar aqui
]
```

---

## 2. Mapeamento Route → Module → Permission

Ao criar uma nova rota ou page, determinar:

| Pergunta | Exemplo |
|----------|---------|
| Qual módulo? | `invoices` |
| Qual ação? | `read` (GET), `create` (POST), `update` (PATCH), `delete` (DELETE) |
| Quais roles têm acesso? | ADMIN, GERENTE, FINANCEIRO |
| Precisa de filtro extra? | Só ver próprias invoices? |

```typescript
// Tradução para código:
// GET /api/invoices → module: 'invoices', action: 'read'
// POST /api/invoices → module: 'invoices', action: 'create'
// DELETE /api/invoices/[id] → module: 'invoices', action: 'delete'
```

---

## 3. Hierarquia de Gestão de Usuários

```
ADMIN → pode criar/editar/desativar qualquer role
GERENTE → pode criar/editar/desativar: USUARIO, FINANCEIRO, ESTOQUE
           NÃO PODE gerenciar: ADMIN, GERENTE, CLIENTE
Outros roles → NÃO PODEM gerenciar usuários
```

```typescript
import { canManageRole, getManageableRoles } from '@/shared/lib/user-hierarchy'

// Verificar se pode gerenciar
if (!canManageRole(currentUser.role as Role, targetUser.role as Role)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Listar roles que pode criar
const rolesDisponiveis = getManageableRoles(currentUser.role as Role)
// ADMIN → ['ADMIN', 'GERENTE', 'FINANCEIRO', 'ESTOQUE', 'USUARIO', 'CLIENTE']
// GERENTE → ['FINANCEIRO', 'ESTOQUE', 'USUARIO']
```

---

## 4. Filtros de Dados por Role

Alguns roles acessam o módulo mas com dados filtrados:

```typescript
// USUARIO vê apenas suas próprias service orders
const whereClause = user.role === 'USUARIO'
  ? { technicianId: user.id, empresaId: 1 }
  : { empresaId: 1 }

const ordens = await prisma.serviceOrder.findMany({ where: whereClause })
```

```typescript
// CLIENTE vê apenas suas próprias invoices
const whereClause = user.role === 'CLIENTE'
  ? { clienteId: user.clienteId, empresaId: 1 }
  : { empresaId: 1 }
```

---

## 5. Sidebar Filtering

```typescript
// Layout principal — filtrar nav por role
import { routeToModule } from '@/shared/lib/rbac-core'

const navItems = allNavItems.filter(item => {
  const mod = routeToModule(item.href)
  if (!mod) return true  // item público ou sem módulo associado
  return can(user.role as Role, mod, 'read')
})
```

---

## 6. Testes de RBAC — O Que Testar

Para cada rota/feature nova, testar no mínimo:

```typescript
// Template de teste RBAC
describe('RBAC — [módulo] [ação]', () => {
  const rolesComAcesso = ['ADMIN', 'GERENTE', 'FINANCEIRO']
  const rolesSemAcesso = ['ESTOQUE', 'USUARIO', 'CLIENTE']

  rolesComAcesso.forEach(role => {
    it(`${role} deve ter acesso (200)`, async () => {
      mockRequireUser.mockResolvedValue({ role, empresaId: 1 })
      mockCan.mockReturnValue(true)
      const res = await GET(mockRequest)
      expect(res.status).toBe(200)
    })
  })

  rolesSemAcesso.forEach(role => {
    it(`${role} deve ser bloqueado (403)`, async () => {
      mockRequireUser.mockResolvedValue({ role, empresaId: 1 })
      mockCan.mockReturnValue(false)
      const res = await GET(mockRequest)
      expect(res.status).toBe(403)
    })
  })
})
```

---

## 7. Armadilhas Comuns

| Problema | Causa | Solução |
|----------|-------|---------|
| ADMIN bloqueado | `can()` não está em uso, verificação manual de role | Sempre usar `can()` — tem short-circuit para ADMIN |
| RBAC no frontend mas não no backend | Proteção apenas visual | **Backend SEMPRE** — frontend é reforço |
| Role check com string hardcoded | `if (user.role === 'admin')` | Usar type `Role` e `can()` |
| Dados de outro tenant visíveis | WHERE sem `empresaId` | Sempre filtrar por `empresaId: 1` |
| 401 vs 403 confundidos | Retorna 403 sem verificar auth | 401 = sem auth; 403 = sem permissão |
