# Módulo Usuários — GladPros ERP

## Resumo Executivo

Módulo de gestão de usuários, permissões e status do sistema GladPros. Permite criar, editar, ativar/desativar e excluir (soft delete) usuários com controle de hierarquia e auditoria completa.

## Varredura Production-Ready — 2025-07-18

- **4 P1** encontrados e corrigidos
- **10 P2** encontrados e corrigidos
- **2 P3** encontrados e corrigidos

## Estrutura de Arquivos

```
src/app/(dashboard)/usuarios/
  page.tsx                          — Listagem principal (client)
  layout.tsx                        — Layout wrapper
  _components/
    UsersTable.tsx
    UsersToolbar.tsx
    types.ts
  [id]/
    page.tsx                        — Página de edição (server → client)
    UserEditClient.tsx              — Componente de edição

src/app/api/usuarios/
  route.ts                          — GET (list) + POST (create)
  [id]/
    route.ts                        — GET + PATCH + PUT + DELETE
    status/route.ts                 — PATCH (set status)
    toggle-status/route.ts          — PUT (toggle status)
    auditoria/route.ts              — GET (audit log)
    security/route.ts               — GET (security info)
    sessions/route.ts               — GET + DELETE (sessions)
  sessions/
    [sessionId]/route.ts            — DELETE (single session)
  export/
    csv/route.ts                    — GET (export CSV)
    pdf/route.ts                    — POST (export PDF)

src/app/usuarios/
  layout.tsx                        — Layout público/wrapper

src/__tests__/api/usuarios/
  get-list.test.ts
  post-create.test.ts
  get-id.test.ts
  patch-id.test.ts
  delete-id.test.ts
  toggle-status.test.ts
  status.test.ts
```

## Rotas de API

| Método | Path | Auth | RBAC | Descrição |
|--------|------|------|------|-----------|
| GET | /api/usuarios | ✅ requireUser | can(role, 'usuarios', 'read') | Listar usuários com paginação e filtros |
| POST | /api/usuarios | ✅ requireUser | ADMIN only | Criar usuário |
| GET | /api/usuarios/:id | ✅ requireUser | can(role, 'usuarios', 'read') ou self | Buscar usuário |
| PATCH | /api/usuarios/:id | ✅ requireUser | can(role, 'usuarios', 'update') ou self | Editar usuário |
| DELETE | /api/usuarios/:id | ✅ requireUser | can(role, 'usuarios', 'delete') | Desativar usuário (soft delete) |
| PATCH | /api/usuarios/:id/status | ✅ requireUser | can(role, 'usuarios', 'update') | Alterar status |
| PUT | /api/usuarios/:id/toggle-status | ✅ requireUser | can(role, 'usuarios', 'update') | Toggle status |
| GET | /api/usuarios/:id/auditoria | ✅ requireUser | ADMIN/GERENTE | Logs de auditoria |
| GET | /api/usuarios/:id/security | ✅ requireUser | ADMIN/GERENTE ou self | Info de segurança |
| GET | /api/usuarios/:id/sessions | ✅ requireUser | ADMIN/GERENTE ou self | Sessões ativas |
| DELETE | /api/usuarios/:id/sessions | ✅ requireUser | ADMIN/GERENTE ou self | Revogar sessões |
| DELETE | /api/usuarios/sessions/:sessionId | ✅ requireUser | ADMIN/GERENTE | Revogar sessão específica |
| GET | /api/usuarios/export/csv | ✅ requireUser | ADMIN/GERENTE | Exportar CSV |
| POST | /api/usuarios/export/pdf | ✅ requireUser | ADMIN/GERENTE | Exportar PDF |

## Regras de Negócio

- **ADMIN**: pode criar, editar e excluir todos os usuários
- **GERENTE**: pode editar USUARIO, FINANCEIRO, ESTOQUE; não pode criar/excluir
- Usuário pode editar apenas campos não-sensíveis do próprio perfil (nomeCompleto, telefone, endereço, anotacoes)
- Campos bloqueados no self-edit: role, status, email, senha
- Não é possível desativar o último ADMIN ativo (dead-man protection)
- Delete é sempre soft (status → INATIVO)
- Toda ação crítica gera `AuditLog` via `AuditoriaService`
- Senha provisória gerada automaticamente e enviada por email ao criar usuário

## Hierarquia de Roles

```
ADMIN (1) → GERENTE (2) → FINANCEIRO (3) → ESTOQUE (4) → USUARIO (5) → CLIENTE (6)
```

- ADMIN gerencia todos
- GERENTE gerencia USUARIO, FINANCEIRO, ESTOQUE
- Outros roles não podem gerenciar usuários

## Matriz de Permissões — Módulo Usuários

| Role | read | create | update | delete |
|------|------|--------|--------|--------|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| GERENTE | ✅ | ❌ | ✅ (hierarquia) | ❌ |
| FINANCEIRO | ❌ | ❌ | ❌ (self only) | ❌ |
| ESTOQUE | ❌ | ❌ | ❌ (self only) | ❌ |
| USUARIO | ❌ | ❌ | ❌ (self only) | ❌ |
| CLIENTE | ❌ | ❌ | ❌ | ❌ |

## Campos de Edição por Contexto

**Self-edit (qualquer usuário no próprio perfil):**
`nomeCompleto`, `telefone`, `dataNascimento`, `endereco1`, `endereco2`, `cidade`, `estado`, `cep`, `anotacoes`, `avatarUrl`

**Admin-edit (ADMIN/GERENTE sobre outros usuários):**
Todos os campos acima + `email`, `role/nivel`, `status`, `senha`

## Testes

- **Unit (Jest)**: `src/__tests__/unit/lib/user-hierarchy.test.ts` (existente)
- **Unit (Jest)**: `src/__tests__/unit/lib/user-validation.test.ts` (existente)
- **API (Jest)**: `src/__tests__/api/usuarios/` (criados nesta auditoria — 7 arquivos)
- **E2E (Playwright)**: `tests/e2e/usuarios/` (existentes — 8 spec files)

### Arquivos de Teste E2E

```
01-usuarios-crud.spec.ts
02-usuarios-rbac.spec.ts
03-usuarios-security.spec.ts
04-usuarios-validation.spec.ts
05-usuarios-sessions.spec.ts
06-usuarios-export.spec.ts
07-usuarios-audit.spec.ts
08-usuarios-admin-actions.spec.ts
```

## Bugs Corrigidos Nesta Auditoria

### P1 — Críticos

| ID | Descrição | Arquivo |
|----|-----------|---------|
| P1-01 | React Hooks violation: `useEffect` após `return null` condicional em `AuditLogPanel` — causa crash em runtime | `UserEditClient.tsx` |
| P1-02 | `console.error`/`console.warn` em API routes — vazamento de dados sensíveis em logs de produção | `route.ts` (4 arquivos) |
| P1-03 | `/auditoria` retornava array raw (sem success wrapper) + IDOR: `OR a.usuarioId = ${userId}` expunha todo o trail do usuário além do registro alvo | `auditoria/route.ts` |
| P1-04 | `status` e `toggle-status` usavam `['ADMIN','GERENTE'].includes()` hardcoded em vez de `can()` — ignora roles com permissão customizada | `status/route.ts`, `toggle-status/route.ts` |

### P2 — Bugs

| ID | Descrição | Arquivo |
|----|-----------|---------|
| P2-01 | Datas exibidas em `pt-BR` sem timezone → `en-US + America/Chicago` | `UserEditClient.tsx` |
| P2-02 | `text-blue-500` hardcoded no spinner de loading → `text-brand-primary` | `UserEditClient.tsx` |
| P2-03 | Labels com `text-slate-700 dark:text-white/80` → `text-foreground` | `UserEditClient.tsx` |
| P2-04 | Focus ring `focus:border-blue-500` hardcoded → `focus:border-brand-primary` | `UserEditClient.tsx` |
| P2-05 | Headers de seção `text-slate-900 dark:text-white` → `text-foreground` | `UserEditClient.tsx` |
| P2-06 | LOGOUT color `text-slate-500` → `text-muted-foreground` | `UserEditClient.tsx` |
| P2-07 | Error state `border-red-400 / text-red-500` → `border-destructive / text-destructive` | `UserEditClient.tsx` |
| P2-08 | CSV export com locale `pt-BR` → `en-US + America/Chicago` | `export/csv/route.ts` |
| P2-09 | `location.href` para navegação → `router.push` (Next.js router) | `page.tsx` |
| P2-10 | Respostas de sucesso com `{ ok: true }` → `{ data, success: true }` (padrão GladPros) | 4 rotas |

### P3 — Qualidade

| ID | Descrição | Arquivo |
|----|-----------|---------|
| P3-01 | `bg-gray-50` hardcoded no layout → `bg-background` | `layout.tsx` |
| P3-02 | `console.error` em client page (6 ocorrências) removidos — toast já exibe o erro | `page.tsx` |

## Checklist de Deploy

- [ ] `NODE_ENV=production`
- [ ] `TOKEN_VERSION_COLUMN_EXISTS=1`
- [ ] `RBAC_TRUST_JWT=1`
- [ ] SMTP configurado para envio de senha provisória
- [ ] Testar criação de usuário com senha temporária e verificar recebimento de email
- [ ] Verificar que o ADMIN de produção não é o único ADMIN ativo antes de migrar
- [ ] Confirmar que AuditLog está sendo gravado em produção (`SELECT * FROM Auditoria ORDER BY criadoEm DESC LIMIT 10`)
- [ ] Testar toggle-status com GERENTE (deve funcionar apenas sobre USUARIO/FINANCEIRO/ESTOQUE)
- [ ] Verificar que self-edit não permite alterar role/status/email
