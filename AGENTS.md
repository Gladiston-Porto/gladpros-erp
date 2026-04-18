# AGENTS.md — GladPros ERP

> Instruções para agentes de código autônomos (OpenAI Codex CLI, Claude Code, Codex no VS Code, etc.).
> Leia este arquivo inteiro antes de qualquer ação no projeto.

---

## 1. O que é este sistema

Sistema ERP real de uma empresa de construção e serviços no Texas (GladPros LLC).

**Não é demo. Não é exercício.**
Código errado aqui impacta operação real, atendimento ao cliente, fluxo financeiro, controle de materiais, segurança e produtividade da empresa.

A GladPros atua com:
- elétrica;
- hidráulica;
- remodeling;
- manutenção residencial e comercial;
- propostas;
- projetos;
- ordens de serviço;
- estoque e equipamentos;
- invoices;
- controle financeiro;
- usuários, permissões e operação interna.

**Localização operacional**: Dallas, Texas, USA.

---

## 2. Missão do sistema

Construir um sistema profissional, confiável, seguro, intuitivo e escalável para gerenciar a GladPros no dia a dia.

Este sistema deve:
- reduzir trabalho manual;
- organizar dados e processos;
- melhorar controle operacional;
- garantir rastreabilidade;
- respeitar níveis de acesso;
- apoiar crescimento futuro;
- ser forte o suficiente para uso real da empresa;
- ser estruturado o suficiente para possível comercialização futura.

---

## 3. Stack técnica

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Banco | MySQL 8 + Prisma ORM 6.x |
| UI | `@gladpros/ui` (43 componentes) + shadcn/ui (new-york) + Tailwind CSS **v4** |
| Auth | JWT (`jose`), MFA via TOTP, RBAC com hierarquia de roles |
| Validação | Zod schemas em toda fronteira (API + forms) |
| Charts | Recharts (dashboards), Chart.js (relatórios complexos) |
| Animações | Framer Motion |
| Tests | Jest (unit), Playwright (E2E) |

### ⚠️ Tailwind v4 — sintaxe diferente

Este projeto usa **Tailwind CSS v4**. Não gere código v3.

- Sem `tailwind.config.js` para temas — configuração em `app/globals.css`
- CSS variables dinâmicas: usar `w-(--var)` e `h-(--var)` (não `w-[var(--var)]`)
- Inline style com CSS custom property → `style={{ '--bar': '50%' } as React.CSSProperties}` + classe `w-(--bar)`
- Arbitrário estático: `w-[200px]` — OK; valores dinâmicos: via CSS custom property

---

## 4. Contexto operacional

- **Moeda**: USD
- **Locale**: `en-US`
- **Formação monetária**:
  ```ts
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
  ```
- **Timezone**: `America/Chicago` — nunca exibir UTC diretamente para o usuário
- **Idioma da interface**: pt-BR — i18n planejado para o futuro
- **Single-tenant**: `empresaId = 1` sempre — não criar lógica multi-tenant
- **Entidade jurídica**: GladPros LLC (Texas), com possibilidade de eleição S-Corp ativa

---

## 5. Princípios absolutos do projeto

Toda implementação deve priorizar, nesta ordem:

1. segurança
2. funcionamento correto
3. integridade dos dados
4. controle de acesso
5. manutenção futura
6. consistência entre módulos
7. experiência do usuário
8. performance

Regras gerais:
- não tratar o sistema como projeto de portfólio;
- não usar atalhos de “demo” em módulos reais;
- não enfraquecer auth, MFA, RBAC, sessão, cookies, tokens ou proteção de dados;
- não quebrar fluxo existente sem necessidade;
- não fazer refatoração ampla se uma mudança pequena resolver;
- não alterar schema, permissões ou lógica fiscal sem explicar impacto.

---

## 6. Convenções críticas de código

### 6.1 Prisma — único caminho válido

```typescript
import { prisma } from "@/lib/prisma"
```

**NUNCA usar**: `@/server/db`, `@/server/db-temp`, `@/shared/lib/prisma`.
Se encontrar esses imports, migrar para `@/lib/prisma`.

### 6.2 Autenticação

**Em API routes** (tem `request: NextRequest`):
```typescript
import { requireUser } from "@/shared/lib/rbac"
const user = await requireUser(request)
```

**Em Server Components** (sem request):
```typescript
import { requireServerUser } from "@/shared/lib/requireServerUser"
const user = await requireServerUser()
```

**Legado — não usar**: `requireAuth` de `@/lib/api/auth`, `requireApiUser`. São deprecated.

### 6.3 RBAC — verificação obrigatória

```typescript
import { can, type Role } from "@/shared/lib/rbac-core"

if (!can(user.role as Role, "financeiro", "read")) {
  return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 })
}
```

Regras:
- toda rota sensível precisa de autenticação;
- toda rota sensível precisa de checagem RBAC após autenticação;
- ADMIN sempre tem acesso via short-circuit na função `can()`;
- proteção deve existir no backend e, quando aplicável, também no frontend.

### 6.4 Hierarquia de roles

```
ADMIN (1)      → Controle total do sistema
GERENTE (2)    → Supervisão operacional
FINANCEIRO (3) → Gestão financeira
ESTOQUE (4)    → Controle de estoque
USUARIO (5)    → Operações diárias
CLIENTE (6)    → Acesso externo limitado
```

### 6.5 Gestão de usuários
- ADMIN gerencia todos
- GERENTE gerencia apenas USUARIO, FINANCEIRO, ESTOQUE
- demais roles não podem gerenciar usuários

### 6.6 Matriz de permissões por módulo

| Módulo | ADMIN | GERENTE | FINANCEIRO | ESTOQUE | USUARIO | CLIENTE |
|--------|-------|---------|------------|---------|---------|---------|
| dashboard | ALL | RO | RO | RO | RO | — |
| usuarios | ALL | — | — | — | — | — |
| clientes | ALL | RW | RO | RO | RW | — |
| propostas | ALL | ALL | ALL | — | — | — |
| projetos | ALL | ALL | ALL | ALL | ALL | RO |
| service-orders | ALL | ALL | RO | RO | RW | — |
| estoque | ALL | RO | RO | ALL | RO | — |
| financeiro | ALL | RO | ALL | — | — | — |
| invoices | ALL | ALL | ALL | — | RO | RO |
| rh | ALL | ALL | RO | — | — | — |
| workforce | ALL | ALL | RO | — | RO | — |
| reports | ALL | RO | RO | — | — | — |
| analytics | ALL | RO | — | — | — | — |
| documents | ALL | ALL | RO | RO | RW | — |
| aprovacoes | ALL | ALL | RW | — | RO | — |
| configuracoes | ALL | RO | — | — | — | — |

**Legenda**: ALL = CRUD | RW = Read+Create+Update | RO = Read Only | — = Sem acesso

---

## 7. Formato obrigatório de resposta de API

```typescript
// Sucesso
return NextResponse.json({ data, success: true }, { status: 200 })

// Sucesso com paginação
return NextResponse.json({
  data,
  pagination: { page, pageSize, total, totalPages },
  success: true
}, { status: 200 })

// Erro
return NextResponse.json({
  error: "Validation failed",
  message: "Campo obrigatório ausente",
  success: false
}, { status: 400 })
```
  data: T[],
  pagination: { page: number, pageSize: number, total: number, totalPages: number },
  success: true
}, { status: 200 })

// Erro
return NextResponse.json({ error: string, message: string, success: false }, { status: 4xx })
```

**Status codes**:
- `400` — validação falhou
- `401` — não autenticado
- `403` — sem permissão
- `404` — recurso não encontrado
- `409` — conflito / duplicata
- `500` — erro interno

---

## 8. Design system — regras absolutas

### 8.1 Cores — nunca hardcode

```tsx
// ❌ ERRADO
<div className="bg-white text-gray-700 border-gray-200">

// ✅ CERTO
<div className="bg-card text-foreground border-border">
```

| Contexto | Classe correta |
|----------|---------------|
| Fundo principal | `bg-background` |
| Cards / superfícies | `bg-card` |
| Texto principal | `text-foreground` |
| Texto secundário | `text-muted-foreground` |
| Bordas | `border-border` |
| Botão primário | `bg-brand-primary` |
| Botão destrutivo | `bg-destructive` |
| Badge success | `bg-green-500/10 text-green-600` |
| Badge warning | `bg-yellow-500/10 text-yellow-600` |
| Badge error | `bg-destructive/10 text-destructive` |

### 8.2 Brand colors

- **Primary**: `#0098DA` → `bg-brand-primary`, `text-brand-primary`
- **Secondary**: `#FF8C00` → `bg-brand-secondary`, `text-brand-secondary`
- **Hero gradient**: `bg-hero-gradient` = `linear-gradient(135deg, #0098DA 0%, #006899 100%)`

### 8.3 Tipografia

- H1 / títulos de páginas: `font-title` (Neuropol)
- resto da interface: Roboto

### 8.4 Forma e espaçamento

- border radius padrão: `rounded-2xl`
- grid de espaçamento: múltiplos de 8px
- touch targets mínimos: 48px (tablet-first)

### 8.5 Dark mode

- Class-based (`.dark` em `<html>`) — default é dark
- Usar CSS variables — nunca hardcode dark: com cores fixas

---

## 9. Estrutura esperada de páginas

Toda página principal deve, quando aplicável, seguir esta ordem:

```tsx
{/* 1. Hero com gradiente da marca */}
<div className="bg-hero-gradient">
  <PageHeader title="Título" font="font-title" />
</div>

{/* 2. Stat cards */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard ... />
</div>

{/* 3. Conteúdo principal */}
{isLoading ? <LoadingSpinner /> : isEmpty ? <EmptyState /> : <Conteudo />}
```

Regras:
- responsividade com `md:` e `lg:`;
- usar estados claros de loading, empty e error;
- não criar páginas bonitas porém vazias de utilidade;
- priorizar hierarquia visual e navegação clara.

---

## 10. Validação com Zod

```typescript
import { z } from "zod"

const schema = z.object({ ... })
const body = schema.safeParse(await request.json())

if (!body.success) {
  return NextResponse.json(
    {
      error: "Validation failed",
      message: body.error.issues[0]?.message ?? "Dados inválidos",
      success: false
    },
    { status: 400 }
  )
}
```

Regras:
- não usar body cru sem validação;
- validar entrada em API e formulários;
- mensagens devem ser úteis;
- erros devem ser explícitos.

---

## 11. Dados sensíveis — tratamento obrigatório

| Dado | Regra |
|------|-------|
| Documentos fiscais (SSN, ITIN, EIN) | Criptografados com AES-GCM via `src/shared/lib/crypto.ts`; armazenar `documentoEnc` + `docLast4` + `docHash`; nunca expor valor completo |
| Tokens JWT / refresh tokens | Nunca em localStorage; apenas httpOnly cookies |
| Senhas | bcrypt com salt ≥ 12; nunca logar, nunca retornar |
| Dados financeiros restritos | Retornar apenas com RBAC válido; ADMIN e FINANCEIRO para valores internos |
| Logs de auditoria | Toda ação crítica deve gerar `AuditLog` |

Regras adicionais:
- não logar payload sensível;
- não retornar campos internos desnecessários;
- sempre mascarar o que não precisa ser exibido;
- proteger backend antes de “esconder” frontend.

---

## 12. Campos de endereço de clientes

A API retorna os campos **novos** (padrão atual):

```typescript
addressStreet    // Rua, número
addressUnit      // Apt / Suite
addressCity      // Cidade
addressState     // Estado (2 letras, ex: TX)
addressZip       // ZIP code
addressCounty    // County (ex: Dallas County)
```

**Campos legados** `cidade`, `estado`, `zipcode` — podem existir em dados antigos.
Sempre usar fallback: `addressCity || cidade`.

---

## 13. Contexto fiscal — LLC / S-Corp

GladPros é uma **LLC no Texas** com possibilidade de eleição S-Corp ativa.

O modelo `Empresa` possui `tipoTributacao: TipoTributacao`:
- `LLC_DEFAULT` — Schedule C, self-employment tax, owner draw (não dedutível)
- `S_CORP` — Form 1120-S, K-1, salário razoável obrigatório, FICA sobre salary

### Regras de negócio fiscais

| Campo/Modelo | Descrição |
|---|---|
| `Empresa.tipoTributacao` | Define regime fiscal ativo |
| `Worker.classification = OWNER_OPERATOR` | único por empresa; dono que também trabalha |
| `OwnerCompensation.tipo` | `OWNER_DRAW` (LLC) ou `SALARY` / `DISTRIBUTION` (S-Corp) |
| `ExpenseCategory.scheduleCLine` | mapeamento fiscal |
| `Expense.dedutivel` / `percentualDedutivel` | padrão 100%; refeições = 50% |

### Validações críticas

- LLC: apenas `OWNER_DRAW` é permitido
- S-Corp: `SALARY` deve existir antes de `DISTRIBUTION`
- S-Corp: se salary YTD = 0 e houver distribution > 0 → **BLOQUEAR** (IRS violation)
- S-Corp: se salary YTD < 30% do net income → gerar warning
- troca de regime gera `AuditLog`
- troca de regime **não retroage** sobre transações anteriores

> Para qualquer feature fiscal → consultar `.github/skills/financial-tax-compliance/SKILL.md`

---

## 14. Módulos críticos do sistema

| Módulo | Status | Path principal |
|--------|--------|----------------|
| Auth / MFA | Ativo | `src/app/auth/` |
| Dashboard | Ativo | `src/app/dashboard/` |
| Clientes | Ativo | `src/app/clientes/` |
| Propostas | Ativo | `src/app/propostas/` |
| Projetos | Ativo | `src/app/projetos/` |
| Estoque | Ativo | `src/app/estoque/` |
| Financeiro | Ativo | `src/app/financeiro/` |
| Invoices | Ativo | `src/app/invoices/` |
| RH / Workforce | Ativo | `src/app/rh/` |
| Service Orders | Ativo | `src/app/service-orders/` |
| Usuários | Ativo | `src/app/usuarios/` |

### Regras de negócio centrais

- propostas podem virar projetos;
- proposta e projeto devem manter relação e rastreabilidade;
- materiais, etapas e histórico precisam ser preservados;
- estoque, financeiro e invoices fazem parte do fluxo central;
- módulos não devem ser tratados como silos isolados.

---

## 15. Anti-patterns — nunca fazer

```typescript
// ❌ Import errado do Prisma
import { db } from "@/server/db"

// ❌ Auth legado
import { requireAuth } from "@/lib/api/auth"

// ❌ Cores hardcoded
className="bg-white dark:bg-gray-900 text-gray-700"

// ❌ Rota sem auth
export async function GET(req: NextRequest) {
  const data = await prisma.cliente.findMany()
  return NextResponse.json(data)
}

// ❌ Rota sem validação
const body = await request.json()

// ❌ Rota sem RBAC
const user = await requireUser(request)
// faltou can(...)

// ❌ Formato de resposta não padronizado
return NextResponse.json(data)

// ❌ UTC para exibição
new Date().toISOString()

// ❌ Tailwind v3 em projeto v4
w-[var(--size)]
```

### 15.1 Anti-patterns de performance — nunca fazer

```typescript
// ❌ await dentro de .map() — cria N queries sequenciais (N+1 problem)
const items = await prisma.proposta.findMany()
const result = await Promise.all(items.map(async (item) => {
  const cliente = await prisma.cliente.findUnique({ where: { id: item.clienteId } })
  return { ...item, cliente }
}))

// ✅ CORRETO — 1 query com include
const result = await prisma.proposta.findMany({
  include: { cliente: true }
})

// ❌ findMany sem paginação — retorna tabela inteira (lento com volume)
const todos = await prisma.ordemServico.findMany()

// ✅ CORRETO — sempre paginar
const dados = await prisma.ordemServico.findMany({
  take: pageSize,
  skip: page * pageSize,
  orderBy: { criadoEm: 'desc' }
})

// ❌ SELECT sem select — retorna todas as colunas (inclui campos grandes)
const usuario = await prisma.$queryRaw`SELECT * FROM Usuario WHERE id = ${id}`

// ✅ CORRETO — selecionar apenas o necessário
const usuario = await prisma.$queryRaw`
  SELECT id, email, nomeCompleto, nivel, status FROM Usuario WHERE id = ${id} LIMIT 1
`

// ❌ Queries sequenciais independentes — tempo total = soma de cada uma
const propostas = await prisma.proposta.findMany({ where: { clienteId: id } })
const projetos  = await prisma.projeto.findMany({ where: { clienteId: id } })
const invoices  = await prisma.invoice.findMany({ where: { clienteId: id } })

// ✅ CORRETO — paralelo com Promise.all (tempo total = a mais lenta)
const [propostas, projetos, invoices] = await Promise.all([
  prisma.proposta.findMany({ where: { clienteId: id } }),
  prisma.projeto.findMany({ where: { clienteId: id } }),
  prisma.invoice.findMany({ where: { clienteId: id } }),
])

// ❌ Queries sequenciais quando a segunda depende do resultado da primeira desnecessariamente
const user = await prisma.$queryRaw`SELECT id FROM Usuario WHERE email = ${email} LIMIT 1`
const perms = await prisma.$queryRaw`SELECT nivel FROM Usuario WHERE id = ${user[0].id} LIMIT 1`
// Se precisava de email+nivel, buscar na primeira query mesmo.

// ❌ Buscar count + dados em queries separadas quando o banco pode fazer junto
const total = await prisma.cliente.count({ where: filtros })
const dados  = await prisma.cliente.findMany({ where: filtros, take, skip })
// Aceitável com Promise.all; problemático se feitos sequencialmente.

// ✅ CORRETO — count + dados em paralelo
const [total, dados] = await Promise.all([
  prisma.cliente.count({ where: filtros }),
  prisma.cliente.findMany({ where: filtros, take, skip })
])

// ❌ Criar campo filtrável sem índice no schema Prisma
model OrdemServico {
  status  String  // sem @@index — lento em tabelas grandes
}

// ✅ CORRETO
model OrdemServico {
  status  String
  @@index([status])
  @@index([clienteId, status])  // índice composto quando filtrado junto
}

// ❌ Chamar requireServerUser() ou requireUser() múltiplas vezes na mesma request
// (Server Components — ok pois usa cache(); API routes — evitar)
const user1 = await requireUser(req)  // query 1
// ... mais código ...
const user2 = await requireUser(req)  // query 2 desnecessária

// ✅ CORRETO — chamar uma vez e reutilizar
const user = await requireUser(req)
```

Evitar também:
- lógica duplicada entre módulos;
- dependência nova sem justificativa;
- mock permanente em fluxo real;
- esconder problema estrutural com gambiarra visual;
- abstração prematura sem necessidade;
- queries dentro de loops de renderização;
- `include` excessivo que traz dados não usados na resposta.

### 15.2 Padrões seguros para criar novas queries

Ao criar qualquer nova query ou rota de dados, seguir esta ordem:

1. **Definir quais campos realmente precisam ser retornados** — nunca `SELECT *` ou `include` sem necessidade
2. **Verificar se já existe índice** no campo usado no `WHERE` — se não existir, criar migration
3. **Verificar se há queries independentes** — se sim, usar `Promise.all`
4. **Verificar se a listagem pode crescer** — se sim, obrigatório `take` + `skip` com total
5. **Verificar se os dados mudam frequentemente** — se não (ex: configurações), considerar `unstable_cache`

```typescript
// Template de rota de listagem com paginação (padrão obrigatório)
const page = Number(searchParams.page ?? 1)
const pageSize = Number(searchParams.pageSize ?? 20)

const [total, data] = await Promise.all([
  prisma.model.count({ where: filtros }),
  prisma.model.findMany({
    where: filtros,
    select: { id: true, campo1: true, campo2: true }, // apenas o necessário
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: { criadoEm: 'desc' }
  })
])

return NextResponse.json({
  data,
  pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  success: true
})
```

---

## 16. Variáveis de ambiente críticas de performance

Estas variáveis existem no código e têm impacto direto na performance. Um agente que cria features ou faz refatoração deve saber que elas existem e nunca as remover ou ignorar.

| Variável | Valor | Efeito quando ativa |
|----------|-------|---------------------|
| `TOKEN_VERSION_COLUMN_EXISTS=1` | `1` | Elimina query ao `INFORMATION_SCHEMA` no boot/HMR. Sem ela: até 10s de latência no cold start. |
| `RBAC_TRUST_JWT=1` | `1` | Elimina 1 query ao banco por request autenticada. O JWT já é verificado pelo middleware com a mesma chave. |
| `REDIS_DISABLED=true` | `true` | Força rate-limiter a usar memória. Sem Redis configurado, nunca deixar `REDIS_ENABLED=true`. |
| `REDIS_URL` ou `REDIS_HOST` | URL real | Habilita Redis para rate-limiting distribuído. Requer Redis real acessível. |
| `DATABASE_URL` com `?connection_limit=N&pool_timeout=20` | já configurado | Limita pool de conexões Prisma para evitar `Too many connections` no MySQL. |

### Regras
- `TOKEN_VERSION_COLUMN_EXISTS=1` e `RBAC_TRUST_JWT=1` **devem estar presentes em produção** após deploy.
- Nunca adicionar `REDIS_ENABLED=true` sem Redis real — causa timeout de ~1s no primeiro login após restart.
- Nunca remover `connection_limit` da `DATABASE_URL` sem justificar.

---

## 17. Skills especializadas disponíveis

Para tarefas específicas, consultar `.github/skills/`:

| Skill | Quando usar | Arquivo |
|-------|-------------|---------|
| `financial-tax-compliance` | impostos, fiscal, compensação do dono, LLC/S-Corp | `.github/skills/financial-tax-compliance/SKILL.md` |
| `rbac-access` | permissões, visibilidade por role, sidebar | `.github/skills/rbac-access/SKILL.md` |
| `erp-data-flow` | fluxo proposta → projeto → estoque → financeiro | `.github/skills/erp-data-flow/SKILL.md` |
| `ui-ux` | design, layout, componentes visuais | `.github/skills/ui-ux/SKILL.md` |
| `business-logic-validator` | máquinas de estado, fluxos e regras | `.github/skills/business-logic-validator/SKILL.md` |
| `locale-formatter` | moeda, datas, timezone, telefone, endereço | `.github/skills/locale-formatter/SKILL.md` |
| `module-audit` | auditoria técnica de um módulo | `.github/skills/module-audit/SKILL.md` |
| `performance-audit` | detectar gargalos de performance, queries lentas, índices faltantes, config incorreta | `.github/skills/performance-audit/SKILL.md` |

### Agentes especializados disponíveis

Para tarefas específicas, usar os agentes em `.github/agents/`:

| Agente | Quando usar | Arquivo |
|--------|-------------|---------|
| `erp-architect` | impacto entre módulos, mudança de schema, decisão arquitetural, feature cross-módulo | `.github/agents/erp-architect.agent.md` |
| `api-audit` | criar ou revisar rotas de API, checklist de padrões de rota | `.github/agents/api-audit.agent.md` |
| `security-review` | revisar auth, RBAC, exposição de dados, OWASP, tokens | `.github/agents/security-review.agent.md` |
| `db-migration` | criar migrations Prisma, alterar schema, checklist de rollback | `.github/agents/db-migration.agent.md` |

### Prompts reutilizáveis disponíveis

Use `/nome-do-prompt` no chat para ativar:

| Prompt | Quando usar |
|--------|-------------|
| `/new-feature` | Iniciar qualquer feature nova — força fluxo Plan → Implement → Test → Audit |
| `/production-ready-module` | Varredura completa de um módulo existente: auditoria 15 pontos + segurança OWASP + correções + testes unitários + E2E + documentação. Resultado: módulo blindado para produção |
| `/daily-check` | Health check diário: build, lint, console.log, TODOs |
| `/rbac-review` | Revisar permissões de uma rota ou componente |
| `/review-flow` | Auditar fluxo de negócio completo (estados, transições, RBAC) |
| `/review-page` | Revisar página: padrões UI, acessibilidade, RBAC, estados |
| `/accessibility-audit` | Auditar acessibilidade de componentes e páginas |
| `/consistency-check` | Verificar consistência de padrões entre módulos |

---

## 18. Comportamento esperado do agente

Antes de qualquer alteração:
- ler este arquivo inteiro;
- entender claramente o objetivo da tarefa;
- identificar os módulos e arquivos afetados;
- avaliar riscos de regressão;
- avaliar riscos de segurança, permissão e integridade de dados;
- avaliar se a alteração pode introduzir gargalo de performance (ver seção 15.1);
- explicar brevemente o que pretende fazer antes de editar.

### Quando a tarefa envolve queries ou fetch de dados

Antes de escrever qualquer query nova:
1. Verificar se o campo de filtro tem `@@index` no schema Prisma
2. Verificar se a query pode ser paralela com outras (`Promise.all`)
3. Verificar se a listagem pode crescer indefinidamente → paginação obrigatória
4. Verificar se o `select` retorna apenas o necessário
5. Se não tem certeza sobre impacto de performance → consultar `performance-audit` skill

### Quando a tarefa reporta lentidão

1. Ler `performance-audit` skill em `.github/skills/performance-audit/SKILL.md`
2. Seguir a metodologia das 6 fases da skill
3. Verificar as variáveis de ambiente da seção 16 antes de alterar código
4. Reportar o que foi analisado e o que foi corrigido — não apenas o sintoma

### Regra de segurança operacional

- não quebrar fluxos existentes sem necessidade;
- não fazer refatoração ampla se uma mudança menor resolver;
- não apagar código importante sem explicar;
- não alterar auth, RBAC, tokens, sessão, dados fiscais ou financeiros sem destacar o impacto;
- não mexer em schema/migration sem explicar efeito no sistema;
- não tratar módulo crítico como experimento;
- não assumir que “funcionar localmente” basta para produção.

---

## 19. Forma de trabalho obrigatória

Sempre preferir:
- mudanças pequenas e auditáveis;
- baixo risco de regressão;
- consistência com a arquitetura atual;
- reaproveitamento de padrões já existentes;
- separação clara de responsabilidades;
- legibilidade e manutenção futura.

Evitar:
- duplicação de lógica;
- “ataões” de demo em módulo real;
- mudanças espalhadas sem necessidade;
- abstrações desnecessárias;
- renomeações largas sem forte justificativa;
- reestruturação grande apenas por gosto técnico.

### Ordem recomendada de trabalho

1. analisar
2. explicar plano breve
3. alterar o mínimo necessário
4. validar o fluxo impactado
5. resumir o resultado final

---

## 20. Checklist antes de finalizar qualquer tarefa

**Segurança e correção:**
- [ ] A rota usa `requireUser()` ou `requireServerUser()`?
- [ ] O RBAC foi checado com `can()`?
- [ ] O body foi validado com Zod?
- [ ] A resposta segue `{ data, success }` ou `{ error, message, success }`?
- [ ] O import do Prisma está em `@/lib/prisma`?
- [ ] Dados sensíveis estão protegidos?
- [ ] `empresaId = 1` foi respeitado?

**UI e consistência:**
- [ ] Não há cor hardcoded indevida?
- [ ] Datas exibidas usam `America/Chicago`?
- [ ] Dark mode continua funcional?
- [ ] O comportamento segue o padrão atual do projeto?

**Performance — obrigatório verificar:**
- [ ] Há `await` dentro de `.map()` ou `.forEach()`? (N+1 — proibido)
- [ ] Queries independentes estão usando `Promise.all`?
- [ ] `findMany` tem `take` + `skip`? (toda listagem deve ser paginada)
- [ ] O `select` ou `$queryRaw` retorna apenas os campos necessários?
- [ ] Novo campo filtrável tem `@@index` no schema Prisma?
- [ ] `requireUser()` é chamado apenas uma vez por request?
- [ ] Nenhuma query síncrona dentro de loop de render?

**Regressão:**
- [ ] O fluxo alterado foi validado?
- [ ] Há risco de regressão em módulo próximo?

---

## 21. Resposta final obrigatória do agente

Ao concluir qualquer tarefa que envolva alteração de código, sempre responder com:

1. **O que foi entendido** — objetivo da tarefa com as próprias palavras
2. **O que foi alterado** — descrição clara das mudanças realizadas
3. **Quais arquivos foram modificados** — caminhos completos
4. **Impacto no negócio / operação** — o que muda para a empresa na prática
5. **O que foi validado** — checklist executado, erros verificados
6. **Riscos, limitações ou próximos pontos** — o que ainda merece atenção

**Se a tarefa for apenas análise (sem alteração de código):**

- Explicar o que foi analisado
- Apontar problemas encontrados com evidências (arquivo + linha)
- Classificar por prioridade: P1 (crítico/segurança) > P2 (funcional) > P3 (qualidade)
- Sugerir o próximo passo mais seguro e útil

**Nunca finalizar uma resposta sem confirmar o que foi feito ou explicar por que não foi possível.**

---

## 22. Visão final do produto

O objetivo não é apenas fazer páginas ou APIs funcionarem isoladamente.

O objetivo é construir um sistema ERP/operacional real para a GladPros que seja:

- **Seguro** — dados protegidos, autenticação sólida, RBAC em todo lugar
- **Confiável** — sem bugs silenciosos, sem dados corrompidos, sem falhas de fluxo
- **Rápido de operar** — equipe consegue fazer tarefas do dia a dia sem fricção
- **Intuitivo** — UI clara, navegação lógica, feedback visual sempre presente
- **Consistente** — os módulos se comunicam, compartilham padrões, não se contradizem
- **Auditável** — toda ação crítica tem rastreabilidade (`AuditLog`)
- **Preparado para crescimento** — código limpo, separação de responsabilidades, fácil de expandir
- **Estruturado para comercialização futura** — qualidade de produto, não de protótipo

Toda implementação deve considerar o uso real da empresa no dia a dia.
Cada funcionalidade deve resolver um problema real da operação.

---

## 23. Definição de sucesso

Uma tarefa só é considerada realmente bem concluída quando a solução for:

- **Funcional** — faz o que foi pedido, sem workarounds
- **Segura** — sem brechas de autenticação, autorização ou exposição de dados
- **Coerente com as regras de negócio** — respeita fluxos, estados e validações do domínio
- **Compatível com RBAC e dados sensíveis** — nada exposto além do permitido por role
- **Alinhada com a arquitetura atual** — sem padrões novos não combinados, sem imports errados
- **Fácil de manter** — código legível, responsabilidades separadas, sem duplicação
- **Útil para a operação real** — resolve o problema real, não apenas compila sem erros

> Código que apenas "passa" ou "compila" não é suficiente.
> O resultado precisa ser confiável para produção e útil para a empresa.

---

## 24. Regra de decisão em caso de dúvida

Se houver dúvida entre duas abordagens, sempre escolher na seguinte ordem de prioridade:

| Conflito | Escolher |
|----------|----------|
| Solução rápida vs solução segura | **Segura** |
| Solução bonita vs solução robusta | **Robusta** |
| Solução genérica vs solução alinhada ao negócio | **Alinhada ao negócio** |
| Solução nova vs solução que respeita o que já funciona | **Respeita o existente** |
| Código conciso vs código claro | **Claro** |

**Em caso de incerteza real:** não assumir, não improvisar. Explicar o que foi encontrado, apontar os riscos e sugerir o próximo passo mais seguro antes de agir.
