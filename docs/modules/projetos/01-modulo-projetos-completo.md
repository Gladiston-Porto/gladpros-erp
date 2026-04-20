# Módulo Projetos — Documentação Completa

> **Data**: 2025-07-15  
> **Status**: Production-Ready (auditado)  
> **Nota Enterprise**: 7.8/10  
> **Testes Unitários**: 29/29 passando  
> **E2E Specs**: 6 arquivos

---

## 1. Resumo Executivo

| Dimensão | Nota | Observação |
|----------|------|------------|
| Segurança | 8/10 | Auth e RBAC em todas as rotas; costs route corrigida |
| Performance | 8/10 | Paginação obrigatória; queries paralelas onde possível |
| Testes | 7/10 | 29 unit tests + 6 E2E spec files |
| Design/UI | 8/10 | 100% tokens semânticos; dark mode compatível |
| Acessibilidade | 6/10 | aria-labels adicionados em etapas; outros componentes ainda precisam |
| Qualidade código | 8/10 | console.log removidos; Zod em fronteiras; resposta padronizada |
| Arquitetura | 8/10 | ProjectService + rbac-projects; separação clara |
| Integridade dados | 8/10 | empresaId filtering; ownership checks |
| Observabilidade | 6/10 | AuditLog parcial; precisa de mais cobertura |
| Completude funcional | 9/10 | CRUD, etapas, materiais, financeiro, tarefas, equipe, jobs |

---

## 2. Estrutura de Arquivos

```
src/app/(dashboard)/projetos/
├── page.tsx                          # Lista de projetos (Server Component + RBAC)
├── ProjetosClient.tsx                # Client component com filtros e cards
├── [id]/
│   ├── page.tsx                      # Detalhe do projeto
│   └── editar/page.tsx               # Edição do projeto
├── novo/page.tsx                     # Criar novo projeto
└── relatorios/page.tsx               # Dashboard de relatórios

src/app/api/projetos/
├── route.ts                          # GET (listar) + POST (criar)
├── dashboard/route.ts                # GET dashboard stats
└── [id]/
    ├── route.ts                      # GET/PUT/DELETE projeto
    ├── status/route.ts               # PATCH alterar status
    ├── etapas/route.ts               # CRUD etapas
    ├── materiais/route.ts            # CRUD materiais
    ├── tarefas/route.ts              # CRUD tarefas
    ├── anexos/route.ts               # Upload/download anexos
    ├── historico/route.ts            # Histórico de alterações
    ├── movimentacoes/route.ts        # Movimentações
    ├── invoices/route.ts             # Invoices do projeto
    ├── materials/route.ts            # Materials alternative
    └── financeiro/costs/route.ts     # Custos financeiros (EVM)

src/components/projetos/
├── ProjetoForm.tsx                   # Formulário principal
├── etapas/
│   ├── EtapasManager.tsx             # Gerenciador com CRUD
│   ├── EtapasList.tsx                # Lista com drag & drop
│   ├── EtapaCard.tsx                 # Card individual
│   └── EtapaForm.tsx                 # Formulário de etapa
├── financeiro/FinanceiroDashboard.tsx # Dashboard EVM
├── materiais/MateriaisLista.tsx       # Lista de materiais
├── tarefas/
│   ├── TarefasKanban.tsx             # Kanban board
│   └── TarefaCard.tsx                # Card de tarefa
├── equipe/EquipeManager.tsx          # Gerenciador de equipe
└── jobs/ProjetoJobsList.tsx          # Lista de jobs

src/domains/projects/
├── services/ProjectService.ts        # Serviço principal
└── validators.ts                     # Zod schemas

src/shared/lib/
├── rbac-projects.ts                  # RBAC específico do módulo
└── services/project-finance.ts       # Serviço financeiro
```

---

## 3. Rotas de API

| Método | Path | Auth | RBAC | Body Zod | Responses |
|--------|------|------|------|----------|-----------|
| GET | `/api/projetos` | requireProjectPermission('canRead') | canRead | listarProjetosSchema | 200, 401, 403 |
| POST | `/api/projetos` | requireProjectPermission('canCreate') | canCreate | createProjetoSchema | 201, 400, 401, 403 |
| GET | `/api/projetos/[id]` | requireProjectPermission('canRead') | canRead + ownership | - | 200, 400, 404 |
| PUT | `/api/projetos/[id]` | requireProjectOwnershipPermission('canUpdate') | canUpdate | updateProjetoSchema | 200, 400, 404 |
| DELETE | `/api/projetos/[id]` | requireProjectPermission('canDelete') | canDelete (ADMIN only) | - | 200, 400, 404 |
| PATCH | `/api/projetos/[id]/status` | requireProjectOwnershipPermission('canChangeStatus') | canChangeStatus | alterarStatusProjetoSchema | 200, 400, 404 |
| GET | `/api/projetos/[id]/financeiro/costs` | requireProjectPermission('canViewFinancials') | canViewFinancials | - | 200, 400, 404 |
| POST | `/api/projetos/[id]/financeiro/costs` | requireProjectPermission('canViewFinancials') | canViewFinancials | - | 200, 400, 404 |

---

## 4. Permissões por Role

| Permissão | ADMIN | GERENTE | FINANCEIRO | ESTOQUE | USUARIO | CLIENTE |
|-----------|-------|---------|------------|---------|---------|---------|
| canRead | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| canCreate | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| canUpdate | ✅ | ✅ | ✅ | ❌ | ✅* | ❌ |
| canDelete | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| canChangeStatus | ✅ | ✅ | ❌ | ❌ | ✅* | ❌ |
| canViewFinancials | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

\* USUARIO: somente seus próprios projetos (ownership check)

---

## 5. Máquina de Estados

```
planejado → em_execucao → em_inspecao → aguardando_devolucoes → concluido
    ↓            ↓              ↓                 ↓
  suspenso    suspenso       suspenso          suspenso
    ↓            ↓              ↓                 ↓
  cancelado  cancelado      cancelado         cancelado
                                                   ↓
                                              arquivado
```

---

## 6. Bugs Corrigidos na Auditoria

| ID | Prioridade | Arquivo | Problema | Correção |
|----|-----------|---------|----------|----------|
| P1-COSTS-AUTH | P1 | financeiro/costs/route.ts | Legacy `getAuthUser` sem RBAC | Migrado para `requireProjectPermission('canViewFinancials')` |
| P1-PAGE-RBAC | P1 | page.tsx | Sem `requireServerUser` + `can()` | Adicionado RBAC check completo |
| P1-RESPONSE-FORMAT | P1 | [id]/route.ts, route.ts, status/route.ts | Resposta raw sem `{ data, success }` | Padronizado todas as respostas |
| P2-COLORS | P2 | 12 componentes | ~200+ hardcoded colors (bg-white, text-gray, etc) | 100% migrado para tokens semânticos |
| P2-CONSOLE | P2 | 5 componentes | console.log em produção | Removidos todos |
| P2-CLIENTE-RBAC | P2 | rbac-projects.ts | CLIENTE role ausente do canRead | Adicionado CLIENTE ao canRead e canDownloadAttachments |

---

## 7. Cobertura de Testes

### Unitários (Jest)
- `route.test.ts` — GET/POST /api/projetos (8 tests)
- `detail.route.test.ts` — GET/PUT/DELETE /api/projetos/[id] (10 tests)
- `status.route.test.ts` — PATCH /api/projetos/[id]/status (4 tests)
- `costs.route.test.ts` — GET/POST /api/projetos/[id]/financeiro/costs (7 tests)
- **Total: 29/29 passando**

### E2E (Playwright)
- `projetos-smoke.spec.ts` — Carregamento de páginas + redirect
- `projetos-crud.spec.ts` — Fluxo CRUD completo como ADMIN
- `projetos-rbac.spec.ts` — Validação por role
- `projetos-security.spec.ts` — Auth, IDOR, XSS, SQL injection
- `projetos-edge-cases.spec.ts` — Paginação, concorrência, limites
- `projetos-regression.spec.ts` — Guards para cada P1/P2 corrigido

---

## 8. Guia de Manutenção

### Adicionar novo status
1. Atualizar enum em `src/domains/projects/validators.ts`
2. Atualizar máquina de estados em `ProjectService.alterarStatus()`
3. Adicionar label/cor no frontend
4. Criar migration se necessário

### Adicionar nova permissão
1. Adicionar ao `PROJECT_PERMISSIONS` em `src/shared/lib/rbac-projects.ts`
2. Implementar check na rota
3. Atualizar documentação

### Adicionar nova rota
1. Usar `requireProjectPermission()` ou `requireProjectOwnershipPermission()`
2. Envolver com `withErrorHandler()`
3. Validar input com Zod
4. Retornar `{ data, success: true }` ou `{ error, message, success: false }`
5. Criar teste unitário

---

## 9. Checklist de Deploy

- [x] Auth em todas as rotas (`requireProjectPermission`)
- [x] RBAC granular por operação
- [x] Validação Zod em fronteiras
- [x] Resposta padronizada `{ data, success }`
- [x] Import Prisma correto (`@/lib/prisma`)
- [x] Sem console.log em produção
- [x] Tokens semânticos (sem cores hardcoded)
- [x] Dark mode funcional
- [x] CLIENTE com acesso RO
- [x] Testes unitários passando (29/29)
- [x] E2E specs criados (6 files)
- [x] TypeScript sem erros

---

## 10. Referências

- `AGENTS.md` — Regras gerais do projeto
- `.github/skills/rbac-access/SKILL.md` — RBAC detalhado
- `.github/skills/erp-data-flow/SKILL.md` — Fluxo de dados ERP
- `src/shared/lib/rbac-projects.ts` — RBAC específico do módulo
- `src/domains/projects/` — Domínio de projetos
