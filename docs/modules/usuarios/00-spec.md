# Módulo Usuários — Documentação Técnica

**Status:** ✅ Produção  
**Última atualização:** 2026-07-01  

---

## 1. Visão Geral

O módulo de Usuários gerencia contas de acesso ao sistema GladPros ERP. Controla criação, edição, bloqueio, auditoria de sessões, segurança (MFA, histórico de senhas) e exportação. Está diretamente integrado ao sistema de autenticação JWT e ao RBAC por hierarquia de roles.

---

## 2. Arquitetura (estrutura de pastas real)

```
src/app/(dashboard)/usuarios/
├── page.tsx                          # Lista de usuários
├── _components/
│   ├── UsersTable.tsx                # Tabela com filtros e ações
│   ├── UsersToolbar.tsx              # Barra de busca e filtros
│   └── types.ts
├── novo/
│   ├── page.tsx                      # Formulário de criação
│   └── UserCreateClient.tsx
└── [id]/
    ├── page.tsx                      # Detalhe / edição
    └── UserEditClient.tsx

src/app/api/usuarios/
├── route.ts                          # GET (lista paginada) / POST (criar)
├── export/
│   ├── csv/route.ts                  # GET — exportar CSV
│   └── pdf/route.ts                  # GET — exportar PDF
├── sessions/
│   └── [sessionId]/route.ts          # DELETE — revogar sessão específica
├── delegacoes/
│   ├── route.ts                      # POST — criar delegação temporária
│   └── minhas/route.ts               # GET — delegações do usuário atual
└── [id]/
    ├── route.ts                      # GET / PATCH / DELETE
    ├── status/route.ts               # PATCH — ativar/inativar
    ├── toggle-status/route.ts        # POST — toggle rápido de status
    ├── security/route.ts             # GET/POST — dados de segurança
    ├── sessions/route.ts             # GET — sessões ativas
    └── auditoria/route.ts            # GET — log de auditoria do usuário
```

---

## 3. Modelo de Dados (campos Prisma reais)

### Usuario

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `Int` | PK autoincrement |
| `email` | `String @unique` | Email de acesso |
| `senha` | `String` | Hash bcrypt (salt ≥ 12) — nunca exposto |
| `nivel` | `Usuario_nivel` (enum) | Role: ADMIN / GERENTE / FINANCEIRO / ESTOQUE / USUARIO / CLIENTE |
| `nomeCompleto` | `String?` | Nome completo |
| `telefone` | `String?` | Telefone de contato |
| `status` | `Usuario_status` | ATIVO / INATIVO / BLOQUEADO |
| `avatarUrl` | `String?` | URL do avatar |
| `bloqueado` | `Boolean` | Flag de bloqueio manual |
| `bloqueadoEm` | `DateTime?` | Timestamp do bloqueio |
| `senhaProvisoria` | `Boolean` | Força troca de senha no primeiro login |
| `primeiroAcesso` | `Boolean` | Indica onboarding pendente |
| `tokenVersion` | `Int` | Versão do token JWT — incrementada ao revogar |
| `ultimoLoginEm` | `DateTime?` | Último login registrado |
| `dataNascimento` | `DateTime?` | Data de nascimento |
| `endereco1/2` | `String` | Endereço |
| `cidade / estado / zipcode` | `String?` | Localização |
| `pinSeguranca` | `String?` | PIN hash para operações sensíveis |
| `perguntaSecreta / respostaSecreta` | `String?` | Recuperação de conta |
| `anotacoes` | `String? @db.LongText` | Anotações internas |
| `expiresAt` | `DateTime?` | Expiração da conta; login bloqueado após esta data |
| `criadoEm / atualizadoEm` | `DateTime` | Timestamps |

### Modelos relacionados

- **SessaoAtiva** — sessões JWT ativas (device, IP, expiração)
- **RefreshToken** — tokens de refresh vinculados ao usuário
- **CodigoMFA** — códigos TOTP/SMS para MFA
- **HistoricoSenha** — hashes anteriores (previne reutilização)
- **TentativaLogin** — log de tentativas (rate limiting / bloqueio)
- **AuditLog** — ações realizadas pelo usuário no sistema
- **Worker** — relação 1:1 com worker (se for técnico/funcionário)
- **Delegacao** — relações 1:N para delegações feitas, recebidas e canceladas

---

## 4. API REST (endpoints reais)

| Método | Rota | RBAC mínimo | Descrição |
|--------|------|-------------|-----------|
| `GET` | `/api/usuarios` | `usuarios:read` | Listar usuários com filtros e paginação |
| `POST` | `/api/usuarios` | `usuarios:create` | Criar novo usuário |
| `GET` | `/api/usuarios/:id` | `usuarios:read` | Detalhe do usuário |
| `PATCH` | `/api/usuarios/:id` | `usuarios:update` | Editar dados do usuário |
| `DELETE` | `/api/usuarios/:id` | `usuarios:delete` | Remover usuário |
| `PATCH` | `/api/usuarios/:id/status` | `usuarios:update` | Ativar / inativar |
| `POST` | `/api/usuarios/:id/toggle-status` | `usuarios:update` | Toggle rápido de status |
| `GET` | `/api/usuarios/:id/security` | `usuarios:read` | Dados de segurança (MFA, sessões) |
| `GET` | `/api/usuarios/:id/sessions` | `usuarios:read` | Sessões ativas do usuário |
| `GET` | `/api/usuarios/:id/auditoria` | `usuarios:read` | Log de auditoria |
| `DELETE` | `/api/usuarios/sessions/:sessionId` | `usuarios:update` | Revogar sessão específica |
| `POST` | `/api/usuarios/delegacoes` | ADMIN/GERENTE | Criar delegação temporária |
| `GET` | `/api/usuarios/delegacoes/minhas` | Autenticado | Delegações do usuário atual |
| `DELETE` | `/api/usuarios/delegacoes/:id` | ADMIN ou delegante | Cancelar delegação |
| `GET` | `/api/usuarios/export/csv` | `usuarios:read` | Exportar lista em CSV |
| `GET` | `/api/usuarios/export/pdf` | `usuarios:read` | Exportar lista em PDF |

---

## 5. Regras de Negócio

- **Hierarquia de criação**: ADMIN pode criar qualquer role; GERENTE pode criar apenas USUARIO, FINANCEIRO, ESTOQUE
- **Auto-edição**: usuário pode editar próprio perfil (nome, avatar, senha), mas não pode alterar próprio `nivel`
- **Bloqueio automático**: após N tentativas de login falhas → `bloqueado = true`
- **Senha provisória**: criação via admin gera `senhaProvisoria = true` → usuário obrigado a trocar no próximo login
- **tokenVersion**: incrementado ao forçar logout global (ex: senha alterada por admin, bloqueio) **e ao mudar o `nivel` do usuário**
- **Expiração de conta**: campo `expiresAt` permite ao ADMIN definir uma data após a qual o login é bloqueado
- **Delegação temporária**: ADMIN ou GERENTE pode delegar suas funções a outro ADMIN/GERENTE por um período definido
- **Histórico de senha**: últimas N senhas salvas em `HistoricoSenha` — sistema bloqueia reutilização
- **MFA**: TOTP via app autenticador; obrigatório para ADMIN e FINANCEIRO (configurável)
- **Worker link**: ao criar usuário técnico (USUARIO), pode-se vincular a um `Worker` existente

---

## 6. Segurança & RBAC

| Role | Permissões |
|------|-----------|
| `ADMIN` | CRUD completo — gerencia todos os roles |
| `GERENTE` | CRUD — mas só cria/edita USUARIO, FINANCEIRO, ESTOQUE |
| `USUARIO` | Read only (próprio perfil via /perfil) |
| `FINANCEIRO` | Sem acesso ao módulo `/usuarios` |
| `ESTOQUE` | Sem acesso ao módulo `/usuarios` |
| `CLIENTE` | Sem acesso |

**Regra crítica**: ao editar um usuário, verificar se o operador tem permissão sobre o `nivel` do alvo:
```typescript
// GERENTE não pode editar ADMIN nem outro GERENTE
const MANAGEABLE_BY_GERENTE = ["USUARIO", "FINANCEIRO", "ESTOQUE"]
if (user.nivel === "GERENTE" && !MANAGEABLE_BY_GERENTE.includes(target.nivel)) {
  return 403
}
```

Dados sensíveis **nunca** retornados pela API:
- `senha` (hash bcrypt)
- `pinSeguranca`
- `respostaSecreta`
- `tokenVersion` (interno)

---

## 7. Estados / Status (Usuario_status)

| Status | Descrição |
|--------|-----------|
| `ATIVO` | Usuário ativo, pode fazer login |
| `INATIVO` | Desativado manualmente, sem acesso |
| `BLOQUEADO` | Bloqueado por tentativas excessivas ou manualmente |

---

## 8. Integrações

| Módulo | Integração |
|--------|-----------|
| **Auth** | JWT com `tokenVersion` para invalidação segura |
| **MFA** | TOTP codes em `CodigoMFA` |
| **Workforce** | 1:1 com `Worker` para usuários técnicos |
| **AuditLog** | Toda ação crítica gera `AuditLog` com `usuarioId` |
| **Sessões** | `SessaoAtiva` e `RefreshToken` gerenciados junto |

---

## 9. Problemas Conhecidos

- Campo `nivel` armazenado como **enum `Usuario_nivel`** (migrado de `String` em maio 2026)
- Exportação PDF pode ser lenta para listas grandes (sem paginação no export)

---

## 10. Cobertura de Testes (estado atual)

| Tipo | Contagem | Estado |
|------|----------|--------|
| Unit (Jest) | **80 testes** em 13 suites | ✅ 80/80 passando |
| E2E (Playwright) | **178 testes** em 11 specs | ✅ 178/178 passando |

### Specs E2E

```
tests/e2e/usuarios/
├── 01-usuarios-crud.spec.ts       # CRUD happy-path (ADMIN)
├── 02-usuarios-rbac.spec.ts       # Matriz RBAC 6 roles × 5 ações
├── 03-usuarios-security.spec.ts   # Escalação, self-edit, dead-man
├── 04-usuarios-validation.spec.ts # Validação Zod E2E (telefone, CEP, email)
├── 05-usuarios-sessions.spec.ts   # Listagem e revogação de sessões
├── 06-usuarios-export.spec.ts     # Export CSV/PDF + filtro hierárquico
├── 07-usuarios-audit.spec.ts      # Auditoria: mutações geram AuditLog
├── 08-usuarios-admin-actions.spec.ts # Security info, self-edit, status toggle
├── usuarios-edge-cases.spec.ts    # Strings extremas, unicode, injeção, paginação
├── usuarios-regression.spec.ts    # Guards P1/P2 (bugs corrigidos)
└── usuarios-smoke.spec.ts         # Smoke: endpoints vivos + auth
```

### Padrão de isolamento de rate limit

Todos os specs usam `resetRateLimits` em `beforeEach` (via `tests/e2e/fixtures/auth.ts`)
para garantir que o bucket IP não sangre entre runs do servidor de longa duração.

```typescript
import { test, resetRateLimits } from '../fixtures/auth';
test.beforeEach(async ({ request }) => { await resetRateLimits(request); });
```

---

## 11. Roadmap Futuro

- [x] Campo `nivel` migrado para enum Prisma (`Usuario_nivel`) — maio 2026
- [x] Expiração de conta (`expiresAt`) com bloqueio no login — maio 2026
- [x] Invalidação automática de token ao mudar role (`tokenVersion +1`) — maio 2026
- [x] Delegação temporária (ADMIN/GERENTE) com banner no dashboard — maio 2026
- [ ] Onboarding guiado no primeiro acesso (`primeiroAcesso = true`)
- [ ] Foto de perfil com upload e crop
- [ ] Notificação de login em novo dispositivo
- [ ] MFA obrigatório configurável por role (não apenas ADMIN/FINANCEIRO)
- [ ] Relatório de atividade por usuário (logins, ações, OS executadas)
- [ ] Integração com SSO/SAML para clientes enterprise
