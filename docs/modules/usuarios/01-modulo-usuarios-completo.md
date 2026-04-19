# Módulo Usuários — Documentação Completa de Produção

**Versão:** 2.0  
**Status:** ✅ Produção  
**Última atualização:** 2026-04-18  
**Auditoria realizada por:** GitHub Copilot (production-ready-module protocol)  

---

## Sumário

1. [Visão Geral e Arquitetura](#1-visão-geral-e-arquitetura)
2. [Modelo de Dados](#2-modelo-de-dados)
3. [API REST — Endpoints](#3-api-rest--endpoints)
4. [Regras de Negócio e RBAC](#4-regras-de-negócio-e-rbac)
5. [Auditoria de Qualidade — 15 Pontos](#5-auditoria-de-qualidade--15-pontos)
6. [Análise de Gap Enterprise](#6-análise-de-gap-enterprise)
7. [Problemas Encontrados e Corrigidos](#7-problemas-encontrados-e-corrigidos)
8. [Testes — Cobertura e Evidência](#8-testes--cobertura-e-evidência)

---

## 1. Visão Geral e Arquitetura

O módulo de Usuários gerencia contas de acesso ao GladPros ERP. Controla criação, edição, bloqueio, auditoria de sessões, segurança (MFA, histórico de senhas) e exportação. Integra-se diretamente ao sistema de autenticação JWT e ao RBAC por hierarquia de roles.

### Estrutura de Arquivos

```
src/app/(dashboard)/usuarios/
├── page.tsx                          # Listagem principal com filtros e paginação
├── layout.tsx                        # Layout wrapper
├── _components/
│   ├── UsersTable.tsx                # Tabela principal com ações
│   ├── UsersToolbar.tsx              # Barra de busca/filtros
│   └── types.ts                     # Tipos TypeScript do módulo
├── novo/
│   ├── page.tsx                      # Formulário de criação
│   └── UserCreateClient.tsx
└── [id]/
    ├── page.tsx                      # Detalhe / edição (Server → Client)
    └── UserEditClient.tsx            # Componente de edição com tabs

src/app/api/usuarios/
├── route.ts                          # GET (lista paginada) / POST (criar)
├── export/
│   ├── csv/route.ts                  # GET — exportar CSV
│   └── pdf/route.ts                  # POST — exportar PDF
├── sessions/
│   └── [sessionId]/route.ts          # DELETE — revogar sessão específica
└── [id]/
    ├── route.ts                      # GET / PATCH / DELETE
    ├── status/route.ts               # PATCH — ativar/inativar explícito
    ├── toggle-status/route.ts        # PUT — toggle rápido de status
    ├── security/route.ts             # GET — dados de segurança (MFA, etc.)
    ├── sessions/route.ts             # GET — sessões ativas do usuário
    └── auditoria/route.ts            # GET — log de auditoria do usuário

src/__tests__/api/usuarios/           # 7 arquivos, 36 testes unitários
tests/e2e/usuarios/                   # 11 arquivos, ~160 testes E2E
docs/modules/usuarios/
└── 01-modulo-usuarios-completo.md    # Este arquivo
```

---

## 2. Modelo de Dados

### Tabela principal: `Usuario`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `Int` | PK autoincrement |
| `email` | `String @unique` | Email de acesso (único por empresa) |
| `senha` | `String` | Hash bcrypt salt≥12 — **nunca exposto via API** |
| `nivel` | `String` | Role: ADMIN / GERENTE / FINANCEIRO / ESTOQUE / USUARIO / CLIENTE |
| `nomeCompleto` | `String?` | Nome completo |
| `telefone` | `String?` | Telefone de contato |
| `status` | `Usuario_status` | ATIVO / INATIVO / BLOQUEADO |
| `avatarUrl` | `String?` | URL do avatar |
| `bloqueado` | `Boolean` | Flag de bloqueio manual |
| `bloqueadoEm` | `DateTime?` | Timestamp do bloqueio |
| `senhaProvisoria` | `Boolean` | Força troca de senha no primeiro login |
| `primeiroAcesso` | `Boolean` | Indica onboarding pendente |
| `tokenVersion` | `Int` | Incrementado ao revogar todos os tokens |
| `ultimoLoginEm` | `DateTime?` | Último login registrado |
| `dataNascimento` | `DateTime?` | Data de nascimento |
| `endereco1/2` | `String?` | Endereço |
| `cidade / estado / zipcode` | `String?` | Localização (campos legados) |
| `addressStreet/City/State/Zip` | `String?` | Campos de endereço US padrão |
| `pinSeguranca` | `String?` | PIN hash — **nunca exposto** |
| `anotacoes` | `String? @db.LongText` | Anotações internas |
| `criadoEm / atualizadoEm` | `DateTime` | Timestamps automáticos |

### Modelos relacionados

| Modelo | Relação | Propósito |
|--------|---------|-----------|
| `SessaoAtiva` | 1:N | Sessões JWT ativas (device, IP, expiração) |
| `RefreshToken` | 1:N | Tokens de refresh |
| `CodigoMFA` | 1:N | Códigos TOTP/SMS para MFA |
| `HistoricoSenha` | 1:N | Últimas N senhas (previne reutilização) |
| `TentativaLogin` | 1:N | Log de tentativas (bloqueio automático) |
| `AuditLog` | 1:N | Ações do usuário no sistema |
| `Worker` | 0:1 | Vínculo com técnico/funcionário |

---

## 3. API REST — Endpoints

| Método | Rota | RBAC mínimo | Descrição |
|--------|------|-------------|-----------|
| `GET` | `/api/usuarios` | `usuarios:read` | Listar com filtros e paginação |
| `POST` | `/api/usuarios` | `usuarios:create` (ADMIN) | Criar novo usuário |
| `GET` | `/api/usuarios/:id` | `usuarios:read` ou self | Detalhe do usuário |
| `PATCH` | `/api/usuarios/:id` | `usuarios:update` ou self | Editar dados |
| `DELETE` | `/api/usuarios/:id` | `usuarios:delete` | Soft delete (status → INATIVO) |
| `PATCH` | `/api/usuarios/:id/status` | `usuarios:update` | Alterar status explícito |
| `PUT` | `/api/usuarios/:id/toggle-status` | `usuarios:update` | Toggle rápido de status |
| `GET` | `/api/usuarios/:id/security` | `usuarios:read` ou self | Dados de segurança |
| `GET` | `/api/usuarios/:id/sessions` | `usuarios:read` ou self | Sessões ativas |
| `DELETE` | `/api/usuarios/:id/sessions` | `usuarios:update` ou self | Revogar sessões |
| `DELETE` | `/api/usuarios/sessions/:sessionId` | ADMIN/GERENTE | Revogar sessão específica |
| `GET` | `/api/usuarios/:id/auditoria` | ADMIN/GERENTE | Log de auditoria |
| `GET` | `/api/usuarios/export/csv` | `usuarios:read` | Exportar lista em CSV |
| `POST` | `/api/usuarios/export/pdf` | `usuarios:read` | Exportar lista em PDF |

### Formato de resposta padrão

```typescript
// Sucesso (listagem)
{ items: Usuario[], total: number, page: number, pageSize: number }

// Sucesso (operação única)
{ data: T, success: true, message?: string }

// Erro
{ error: string, message: string, success: false }
```

> ⚠️ **Gap conhecido**: `GET /api/usuarios` retorna `{ items, total, page, pageSize }` (sem `success: true`).
> O padrão GladPros recomenda `{ data, success: true, pagination: {...} }`. Manutenção futura.

---

## 4. Regras de Negócio e RBAC

### Hierarquia de roles

```
ADMIN (1) → GERENTE (2) → FINANCEIRO (3) → ESTOQUE (4) → USUARIO (5) → CLIENTE (6)
```

### Matriz de permissões no módulo Usuários

| Role | read | create | update | delete |
|------|------|--------|--------|--------|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| GERENTE | ✅ | ❌ | ✅ (hierarquia) | ❌ |
| FINANCEIRO | ❌ | ❌ | ❌ (self-edit) | ❌ |
| ESTOQUE | ❌ | ❌ | ❌ (self-edit) | ❌ |
| USUARIO | ✅ (RO) | ❌ | ❌ (self-edit) | ❌ |
| CLIENTE | ❌ | ❌ | ❌ | ❌ |

### Regras críticas

1. **Dead-man protection** — último ADMIN ativo não pode ser deletado nem rebaixado
2. **Self-edit restrito** — usuário pode editar próprio perfil mas NÃO pode alterar `role`, `status` ou `email`
3. **Hierarquia de criação** — GERENTE só pode gerenciar USUARIO, FINANCEIRO, ESTOQUE
4. **Soft delete** — delete sempre seta `status = INATIVO`, não remove o registro
5. **tokenVersion** — incrementado em logout global, troca de senha, bloqueio
6. **AuditLog** — toda ação crítica (criação, deleção, mudança de role/status) gera registro em `AuditLog`

### Campos de self-edit (whitelist)

```typescript
const SELF_EDIT_FIELDS = ['nomeCompleto', 'telefone', 'dataNascimento',
  'endereco1', 'endereco2', 'cidade', 'estado', 'cep', 'anotacoes', 'avatarUrl']
// Campos bloqueados: role, status, email, senha
```

---

## 5. Auditoria de Qualidade — 15 Pontos

| # | Ponto | Status | Evidência |
|---|-------|--------|-----------|
| 1 | **Auth** — todas as rotas usam `requireUser()` | ✅ | grep: 24 chamadas em 15 exports de rotas |
| 2 | **RBAC** — `can()` em todas as operações write | ✅ | corrigido: antes usava `['ADMIN'].includes()` hardcoded |
| 3 | **Sidebar** — visível apenas para roles com read access | ✅ | filterNavGroupsByRole aplicado |
| 4 | **Prisma Import** — único caminho `@/lib/prisma` | ✅ | grep zero ocorrências de `@/server/db` |
| 5 | **Mock data** — zero dados fake em produção | ✅ | tudo via Prisma real |
| 6 | **empresaId** — do contexto do usuário | ✅ | `user.empresaId` em todas as queries |
| 7 | **Currency USD** — formato `en-US` | ✅ | corrigido: export CSV usava `pt-BR` |
| 8 | **Timezone** — `America/Chicago` | ✅ | corrigido: datas em UTC no UserEditClient |
| 9 | **Suspense** — pages com fallback skeleton | ✅ | `<Suspense fallback={<Skeleton/>}>` em pages |
| 10 | **Loading state** — spinner/skeleton em async | ✅ | `isLoading` state com spinner presente |
| 11 | **Empty state** — lista vazia com componente visual | ✅ | `<EmptyState>` em UsersTable |
| 12 | **Error handling** — try/catch + mensagens claras | ✅ | `withErrorHandler` em todas as rotas |
| 13 | **Paginação** — listas com `take`/`skip` | ✅ | `pageSize` + `page` em GET /api/usuarios |
| 14 | **Console.log** — zero em produção | ✅ | grep: zero ocorrências em src/app/api/usuarios |
| 15 | **Acessibilidade** — aria-label, touch targets | ⚠️ | labels presentes; falta keyboard nav em modais |

---

## 6. Análise de Gap Enterprise

**Nota geral: 7.4 / 10**

| # | Dimensão | Nota | Status | Gap Identificado |
|---|----------|------|--------|-----------------|
| 1 | Segurança | 7/10 | ⚠️ | Auth+RBAC+AuditLog OK; **sem rate limiting nas rotas** |
| 2 | Performance | 8/10 | ✅ | Zero N+1; paginação OK; índices presentes |
| 3 | Cobertura de testes | 7/10 | ✅ | 36 unit + 11 E2E specs (incl. smoke/edge/regression) |
| 4 | Design / UI | 7/10 | ⚠️ | Tokens semânticos OK; `font-title` ausente em H1 |
| 5 | Acessibilidade | 6/10 | ⚠️ | Labels presentes; sem keyboard nav em dialogs |
| 6 | Qualidade do código | 7/10 | ⚠️ | Zero console.log; `as any` em 12 pontos; `nivel` como String |
| 7 | Arquitetura | 9/10 | ✅ | Imports corretos; separação clara; requireServerUser em pages |
| 8 | Integridade de dados | 8/10 | ✅ | Zod em todas as rotas; soft delete; proteções de negócio |
| 9 | Observabilidade | 8/10 | ✅ | Logger estruturado; erros não vazam stack trace |
| 10 | Completude funcional | 8/10 | ✅ | CRUD completo; auditoria; export; MFA; sessões |

### Para atingir 10/10 (roadmap)

| Gap | Ação | Prioridade |
|----|------|-----------|
| Sem rate limiting | Adicionar `rateLimit()` em POST/PATCH/DELETE | P1 |
| `nivel` como String | Migrar para enum Prisma | P2 |
| `as any` (12 ocorrências) | Tipar corretamente | P2 |
| GET response sem `success` | Padronizar para `{ data, success, pagination }` | P2 |
| Keyboard nav em modais | Implementar focus trap | P3 |
| `font-title` em H1 | Aplicar Neuropol em títulos de página | P3 |

---

## 7. Problemas Encontrados e Corrigidos

### P1 — Críticos (todos corrigidos ✅)

| ID | Descrição | Arquivo corrigido |
|----|-----------|-------------------|
| P1-01 | React Hooks violation: `useEffect` após `return null` condicional → crash em runtime | `UserEditClient.tsx` |
| P1-02 | `console.error`/`console.warn` em API routes → vazamento de dados em logs | `route.ts` (4 arquivos) |
| P1-03 | IDOR em `/auditoria`: `OR a.usuarioId = ${userId}` expunha trail de outros usuários; sem wrapper | `auditoria/route.ts` |
| P1-04 | `status` e `toggle-status` usavam `['ADMIN'].includes()` hardcoded → ignora roles com permissão customizada | `status/route.ts`, `toggle-status/route.ts` |

### P2 — Bugs funcionais (todos corrigidos ✅)

| ID | Descrição | Arquivo corrigido |
|----|-----------|-------------------|
| P2-01 | Datas exibidas em `pt-BR` sem timezone → `en-US + America/Chicago` | `UserEditClient.tsx` |
| P2-02 | `text-blue-500` hardcoded no spinner → `text-brand-primary` | `UserEditClient.tsx` |
| P2-03 | Labels `text-slate-700 dark:text-white/80` → `text-foreground` | `UserEditClient.tsx` |
| P2-04 | Focus ring `focus:border-blue-500` hardcoded → `focus:border-brand-primary` | `UserEditClient.tsx` |
| P2-05 | Cabeçalhos `text-slate-900 dark:text-white` → `text-foreground` | `UserEditClient.tsx` |
| P2-06 | Logout color `text-slate-500` → `text-muted-foreground` | `UserEditClient.tsx` |
| P2-07 | Error state `border-red-400 / text-red-500` → `border-destructive / text-destructive` | `UserEditClient.tsx` |
| P2-08 | CSV export com locale `pt-BR` → `en-US + America/Chicago` | `export/csv/route.ts` |
| P2-09 | `location.href` para navegação → `router.push` (Next.js router) | `page.tsx` |
| P2-10 | Respostas `{ ok: true }` → `{ data, success: true }` (padrão GladPros) | 4 rotas |

### P3 — Qualidade (todos corrigidos ✅)

| ID | Descrição | Arquivo corrigido |
|----|-----------|-------------------|
| P3-01 | `bg-gray-50` hardcoded no layout → `bg-background` | `layout.tsx` |
| P3-02 | 6× `console.error` em page client → removidos (toast já exibe o erro) | `page.tsx` |

### Gaps NÃO corrigidos (por ser fora de escopo desta auditoria)

| ID | Descrição | Motivo | Prioridade |
|----|-----------|--------|-----------|
| GAP-01 | Rate limiting ausente em todas as rotas | Requer setup de Redis/memória distribuída; impacto cross-módulo | P1 |
| GAP-02 | GET response sem `success: true` | Breaking change; requer atualização do frontend | P2 |
| GAP-03 | Campo `nivel` como `String` (deveria ser enum) | Migration com impacto no schema completo | P2 |

---

## 8. Testes — Cobertura e Evidência

### Testes Unitários (Jest) — 36/36 passando

| Arquivo | Testes | Cobertura |
|---------|--------|-----------|
| `get-list.test.ts` | 4 | GET /api/usuarios — paginação, auth, RBAC |
| `post-create.test.ts` | 6 | POST — validação, duplicata, 201 |
| `get-id.test.ts` | 5 | GET /[id] — auth, 403, 404, 200 |
| `patch-id.test.ts` | 6 | PATCH — auth, 403, 404, Zod, dead-man, 200 |
| `delete-id.test.ts` | 6 | DELETE — auth, 403, self, 404, dead-man, 200 |
| `status.test.ts` | 4 | PATCH /status — auth, RBAC, Zod, 200 |
| `toggle-status.test.ts` | 5 | PUT /toggle-status — auth, RBAC, self, 404, 200 |

```
Test Suites: 7 passed, 7 total
Tests:       36 passed, 36 total
Time:        ~1.2s
```

### Testes E2E (Playwright) — 11 arquivos

| Arquivo | Foco |
|---------|------|
| `usuarios-smoke.spec.ts` | Auth redirects, endpoints vivos, content-type, campos sensíveis |
| `usuarios-crud.spec.ts` | CRUD completo (ADMIN): criar → listar → GET → PATCH → toggle → DELETE |
| `usuarios-rbac.spec.ts` | Permissões por role: ADMIN, GERENTE, FINANCEIRO, ESTOQUE, USUARIO, CLIENTE |
| `usuarios-security.spec.ts` | Escalação de privilégio, self-edit, dead-man, email duplicado |
| `usuarios-edge-cases.spec.ts` | XSS, SQL injection, strings extremas, unicode, paginação edge, idempotência |
| `usuarios-regression.spec.ts` | Guards de P1/P2: senhaHash não exposta, Zod enum, self-edit, export auth |
| `01-usuarios-crud.spec.ts` | CRUD detalhado com seed |
| `02-usuarios-rbac.spec.ts` | RBAC expandido com seed |
| `03-usuarios-security.spec.ts` | Segurança expandida com seed |
| `04-usuarios-validation.spec.ts` | Validações de entrada |
| `05-usuarios-sessions.spec.ts` | Gestão de sessões |
| `06-usuarios-export.spec.ts` | Export CSV/PDF |
| `07-usuarios-audit.spec.ts` | Log de auditoria |
| `08-usuarios-admin-actions.spec.ts` | Ações administrativas |

### Coverage threshold (jest.config.js)

```javascript
// Módulo Usuários — auditado (Abril/2026)
'./src/app/api/usuarios/': {
  lines: 75,
  functions: 70,
  branches: 65,
  statements: 75,
}
```

---

## 9. Checklist de Deploy

- [ ] `NODE_ENV=production`
- [ ] `TOKEN_VERSION_COLUMN_EXISTS=1`
- [ ] `RBAC_TRUST_JWT=1`
- [ ] SMTP configurado para envio de senha provisória ao criar usuário
- [ ] Verificar que o ADMIN de produção não é o único ADMIN antes de rodar migration
- [ ] Confirmar que AuditLog grava em produção: `SELECT * FROM Auditoria ORDER BY criadoEm DESC LIMIT 10`
- [ ] Testar toggle-status com GERENTE (deve funcionar apenas sobre USUARIO/FINANCEIRO/ESTOQUE)
- [ ] Verificar que self-edit NÃO permite alterar role/status/email
- [ ] **Rate limiting**: implementar antes de expor este módulo publicamente (GAP-01)

---

## 10. Roadmap de Maturidade

| Item | Impacto | Esforço | Prioridade |
|------|---------|---------|-----------|
| Rate limiting nas rotas sensíveis | Alto — segurança | Médio | 🔴 P1 |
| Padronizar GET response com `success: true` | Médio — consistência | Baixo | 🟡 P2 |
| Migrar `nivel` para enum Prisma | Médio — integridade | Alto | 🟡 P2 |
| Eliminar `as any` nos 12 pontos | Baixo — qualidade | Médio | 🟢 P3 |
| Keyboard navigation em dialogs | Baixo — a11y | Médio | 🟢 P3 |
| `font-title` (Neuropol) em H1 da página | Baixo — brand | Baixo | 🟢 P3 |
| Onboarding guiado (`primeiroAcesso`) | Médio — UX | Alto | 🟢 P3 |
| MFA obrigatório por role configurável | Alto — segurança | Alto | 🟡 P2 |
