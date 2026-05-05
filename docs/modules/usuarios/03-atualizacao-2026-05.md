# Módulo Usuários — Atualização Maio 2026

**Status:** ✅ Produção  
**Data:** 2026-05-05  
**Sessões:** 3 (Pesquisa/Auditoria → Segurança/Backend → UI/Features)

---

## Resumo Executivo

Ciclo completo de melhoria do módulo Usuários, iniciado com pesquisa comparativa a sistemas enterprise (SAP, Salesforce, Workday), que gerou um plano de gaps adaptado ao contexto GladPros. Resultou em melhorias de segurança no backend (schema, senha, tokens), quatro novas funcionalidades de negócio (expiração de conta, invalidação de token por mudança de role, delegação temporária, badges de expirado) e um novo componente global no dashboard.

---

## 1. Decisões de Negócio Tomadas

Durante a pesquisa, foram avaliadas e decididas as seguintes questões:

| Tema | Decisão |
|------|---------|
| MFA TOTP | **Não implementado** — sistema só aceita emails corporativos; risco não justifica complexidade |
| Usuários sem `nivel` | **Corrigido** — campo migrado para enum `Usuario_nivel` (ADMIN, GERENTE, FINANCEIRO, ESTOQUE, USUARIO, CLIENTE) |
| Deleção de usuários | **Confirmado como soft delete** — `status = INATIVO`; registro preservado; não aparece em operações, mas mantém rastreabilidade |
| Convite por link | **Não necessário** — ao criar usuário, o sistema já envia email de boas-vindas com senha temporária |
| Expiração de conta | **Implementado** — ADMIN pode definir data de expiração; login bloqueado após a data; badge "Expirado" visível na tabela |
| Bulk operations | **Já existia** — seleção em lote para ativar/inativar e gerar relatórios; confirmado como funcionalidade completa |
| Invalidação de token em mudança de role | **Implementado** — ao salvar mudança de `nivel`, `tokenVersion` é incrementado; sessões anteriores ficam inválidas |
| PIN / resposta secreta | **Mantido como está** — sistema já exige PIN + resposta secreta para desbloqueio; não foi duplicado |
| Delegação temporária | **Implementado (customizado para GladPros)** — ADMIN ou GERENTE pode delegar suas funções a outro ADMIN ou GERENTE por um período com motivo; banner visível no dashboard do delegatário |

---

## 2. Mudanças no Schema Prisma

### 2.1 Campos adicionados a `Usuario`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `expiresAt` | `DateTime?` | Data de expiração da conta; login bloqueado após essa data |

### 2.2 Campo `nivel` migrado para enum

```prisma
// Antes (String — permitia valores inválidos no banco)
nivel  String  @default("USUARIO")

// Depois (enum — values validados pelo ORM)
nivel  Usuario_nivel  @default(USUARIO)

enum Usuario_nivel {
  ADMIN
  GERENTE
  FINANCEIRO
  ESTOQUE
  USUARIO
  CLIENTE
}
```

### 2.3 Novo modelo `Delegacao`

```prisma
model Delegacao {
  id              Int       @id @default(autoincrement())
  deleganteId     Int       // Quem delegou
  delegatarioId   Int       // Quem recebeu
  dataInicio      DateTime
  dataFim         DateTime
  motivo          String?   @db.VarChar(500)
  ativa           Boolean   @default(true)
  canceladaEm     DateTime?
  canceladaPorId  Int?

  delegante    Usuario  @relation("DelegacoesFeitas", ...)
  delegatario  Usuario  @relation("DelegacoesRecebidas", ...)
  canceladaPor Usuario? @relation("DelegacoesCanceladas", ...)

  @@index([deleganteId])
  @@index([delegatarioId])
  @@index([ativa, dataFim])
}
```

### 2.4 Índices adicionados

| Índice | Campo | Motivo |
|--------|-------|--------|
| `@@index([nivel])` | `Usuario.nivel` | Filtros por role na listagem |
| `@@index([status])` | `Usuario.status` | Filtros por status |
| `@@index([empresaId])` | `Usuario.empresaId` | Queries single-tenant |
| `@@index([criadoEm])` | `Usuario.criadoEm` | Ordenação padrão da listagem |

---

## 3. Mudanças na API

### 3.1 Endpoints novos — Delegação

| Método | Rota | RBAC | Descrição |
|--------|------|------|-----------|
| `POST` | `/api/usuarios/delegacoes` | ADMIN ou GERENTE (self) | Criar delegação temporária |
| `GET` | `/api/usuarios/delegacoes/minhas` | Qualquer autenticado | Listar delegações feitas e recebidas do usuário atual |
| `DELETE` | `/api/usuarios/delegacoes/:id` | ADMIN ou delegante original | Cancelar delegação |

**Regras da delegação:**
- Apenas ADMIN e GERENTE podem criar delegações
- O delegatário (receptor) deve ser ADMIN ou GERENTE
- `dataFim` deve ser posterior a `dataInicio`
- Limite: 1 delegação ativa por par delegante/delegatário
- Cancelamento disponível para o próprio delegante ou um ADMIN

### 3.2 Mudanças em endpoints existentes

#### `GET /api/usuarios` (listagem)

- Adicionado `expiresAt` ao `SELECT` e ao objeto de resposta por item
- Filtro `?role=` agora aceita valores separados por vírgula: `?role=ADMIN,GERENTE`  
  Gera `nivel IN (?, ?)` no SQL (antes: apenas `nivel = ?` — valor único)
- RBAC guard do filtro multi-role: valida cada role individualmente

#### `GET /api/usuarios/:id`

- `expiresAt` adicionado a `USER_DETAIL_COLUMNS` e ao objeto normalizado de resposta
- Campo é retornado como ISO 8601 string ou `null`

#### `PATCH /api/usuarios/:id`

- `expiresAt` adicionado ao Zod schema (`userUpdateApiSchema`) com suporte a:
  - ISO 8601 string (`2026-12-31T00:00:00.000Z`)
  - Formato US `MM/DD/YYYY`
  - `null` para limpar a expiração
- `"expiresAt"` adicionado ao array `allowed` do PATCH
- Bloco especial de null-clearing antes do guard `sets.length === 0` (handle `expiresAt = null`)

#### `POST /api/usuarios` (criação)

- `expiresAt` adicionado ao `UserCreateSchema` (opcional)
- `expiresAt` inserido no INSERT quando presente e coluna existe na DB

#### `PATCH /api/usuarios/:id` — tokenVersion

- Quando o campo `nivel` (role) muda de valor, `tokenVersion` é incrementado no mesmo UPDATE
- Todas as sessões JWT anteriores do usuário ficam inválidas imediatamente
- Garante que usuário com role rebaixada não continue operando com token de role superior

### 3.3 Login — verificação de expiresAt

- Endpoint `POST /api/auth/login` agora verifica `expiresAt` após validar senha
- Se `expiresAt` existir e for passado → retorna `401` com mensagem `"Conta expirada"`
- Verificado antes da geração do JWT (nunca emite token para conta expirada)

---

## 4. Mudanças na UI

### 4.1 `UsersTable.tsx` — badge "Expirado"

- Adicionado `isExpired` flag: `expiresAt && new Date(expiresAt) < new Date()`
- Quando `isExpired = true` e status ≠ ATIVO: badge âmbar "Expirado" aparece na coluna de status
- Informa ao operador que a conta expirou sem precisar abrir o perfil

### 4.2 `UserEditClient.tsx` — campo expiresAt + DelegacaoSection

**Campo expiresAt (ADMIN-only):**
- Input de data no card "Conta e Acesso" — visível apenas quando `currentUserRole === "ADMIN"`
- Formato MM/DD/YYYY com máscara automática
- Exibido no painel de Informações como data formatada em `America/Chicago`
- Enviado no PATCH apenas quando alterado (diff logic)

**DelegacaoSection (ADMIN e GERENTE editando próprio perfil):**
- Exibida quando `currentUserId === id && (role === ADMIN || role === GERENTE)`
- Lista delegações ativas com nome do delegatário, período e motivo
- Formulário para criar nova delegação: selecionar delegatário (busca ADMIN/GERENTE ativos), datas de início/fim, motivo opcional
- Botão de cancelar delegação ativa
- Feedback via toast de sucesso/erro

### 4.3 `UserCreateClient.tsx` — campo expiresAt

- Campo "Expiração da conta (opcional)" adicionado no card "Acesso e Conta"
- Mesmo formato MM/DD/YYYY com máscara automática
- Incluído no payload do POST quando preenchido

### 4.4 `DelegacaoBanner.tsx` (NOVO — componente global)

**Arquivo:** `src/app/(dashboard)/_components/DelegacaoBanner.tsx`

- Client component que faz fetch em `/api/usuarios/delegacoes/minhas` a cada carregamento
- **Banner azul** para delegações recebidas (você está operando com poderes de outro usuário)
- **Banner âmbar** para delegações enviadas (você delegou suas funções)
- Cada banner é dispensável (dismiss por sessão via React state)
- Link "Ver detalhes" navega para `/usuarios/delegacoes`
- Exibe: nome do outro usuário, período (`dataInicio` → `dataFim`), motivo

### 4.5 `layout.tsx` (dashboard)

- `DelegacaoBanner` injetado acima do `{children}` no `DashboardShell`
- Visível em todas as páginas do dashboard quando há delegação ativa

### 4.6 `usuarios/[id]/page.tsx`

- Agora chama `requireServerUser()` para obter o usuário logado
- Passa `currentUserId` e `currentUserRole` como props para `UserEditClient`
- Necessário para que o `DelegacaoSection` saiba se está no próprio perfil

---

## 5. Melhorias de Segurança

| Item | Antes | Depois |
|------|-------|--------|
| bcrypt cost | 10 | **12** (mais resistente a brute force) |
| Senha em texto em logs | Possível em erros | Removido — nunca logado |
| Role como String | Qualquer valor aceitável no banco | **Enum Prisma** — validação em nível de ORM |
| Token após rebaixamento de role | Continuava válido até expirar | **tokenVersion +1** invalida imediatamente |
| Conta expirada | Sem verificação no login | **Bloqueio no login** com mensagem clara |

---

## 6. Estrutura de Arquivos Atualizada

```
src/app/(dashboard)/usuarios/
├── page.tsx
├── _components/
│   ├── UsersTable.tsx            ← badge "Expirado" adicionado
│   ├── UsersToolbar.tsx
│   └── types.ts                  ← expiresAt adicionado ao tipo Usuario
├── novo/
│   ├── page.tsx
│   └── UserCreateClient.tsx      ← campo expiresAt adicionado
└── [id]/
    ├── page.tsx                   ← passa currentUserId/currentUserRole
    └── UserEditClient.tsx         ← expiresAt + DelegacaoSection

src/app/(dashboard)/_components/
└── DelegacaoBanner.tsx            ← NOVO — banner de delegação ativa

src/app/api/usuarios/
├── route.ts                       ← expiresAt + multi-role filter
├── delegacoes/
│   ├── route.ts                   ← POST (criar), GET (listar minhas)
│   ├── minhas/route.ts            ← GET delegações do usuário atual
│   └── [id]/route.ts              ← DELETE (cancelar)
└── [id]/
    └── route.ts                   ← expiresAt no GET + PATCH; tokenVersion em role change

src/shared/lib/
└── validation.ts                  ← expiresAt em userUpdateApiSchema

prisma/schema.prisma               ← expiresAt, nivel enum, Delegacao model, 4 indexes
```

---

## 7. Gaps Fechados neste Ciclo

Os seguintes gaps da análise enterprise (documentados em `01-modulo-usuarios-completo.md`) foram resolvidos:

| Gap | Resolução |
|-----|-----------|
| `nivel` como `String` (GAP-03) | ✅ Migrado para `enum Usuario_nivel` |
| Sem expiração de conta | ✅ Campo `expiresAt` no schema, API e UI |
| Token válido após rebaixamento de role | ✅ `tokenVersion +1` em role change |
| Sem delegação temporária | ✅ Modelo `Delegacao` + 3 rotas + UI completa |
| bcrypt cost subótimo | ✅ 10 → 12 |

---

## 8. Gaps Ainda Abertos

| ID | Descrição | Prioridade |
|----|-----------|-----------|
| GAP-02 | GET /api/usuarios retorna `{ items, total }` sem `success: true` | P2 |
| GAP-04 | Keyboard navigation em modais/drawers (acessibilidade) | P3 |
| GAP-05 | `font-title` ausente no H1 da página de usuários | P3 |
| GAP-06 | Testes E2E para delegação e expiração de conta | P2 |
| GAP-07 | Página `/usuarios/delegacoes` (view completo de delegações) — DelegacaoBanner já tem o link | P2 |

---

## 9. Checklist de Deploy (aditivo)

Além do checklist do `01-modulo-usuarios-completo.md`:

- [ ] Executar `npx prisma db push` ou migration para aplicar `expiresAt`, `nivel` enum e tabela `Delegacao`
- [ ] Executar `npm run db:generate` após mudança de schema
- [ ] Confirmar que `TOKEN_VERSION_COLUMN_EXISTS=1` está no `.env` de produção
- [ ] Testar login com conta expirada → deve retornar 401
- [ ] Testar mudança de role de um usuário → sessão anterior deve ser inválida
- [ ] Testar criação de delegação como GERENTE → banner deve aparecer para o delegatário
- [ ] Confirmar que `DelegacaoBanner` não aparece quando não há delegação ativa
- [ ] Verificar que `/api/usuarios?role=ADMIN,GERENTE` retorna usuários corretos
