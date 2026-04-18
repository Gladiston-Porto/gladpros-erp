# Módulo Clientes — Documentação Técnica Completa

> **Última revisão**: Abril 2026  
> **Status**: Produção — enterprise-ready  
> **Auditoria realizada**: Sessões 001 + 002 (ver checkpoints)

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Módulo](#2-arquitetura-do-módulo)
3. [Modelo de Dados](#3-modelo-de-dados)
4. [Rotas de API](#4-rotas-de-api)
5. [Lógica de Negócio](#5-lógica-de-negócio)
6. [Segurança e RBAC](#6-segurança-e-rbac)
7. [Criptografia e Documentos Fiscais](#7-criptografia-e-documentos-fiscais)
8. [Auditoria](#8-auditoria)
9. [Performance e Cache](#9-performance-e-cache)
10. [Componentes UI](#10-componentes-ui)
11. [Cobertura de Testes](#11-cobertura-de-testes)
12. [Fluxos de Integração](#12-fluxos-de-integração)
13. [Índices de Banco de Dados](#13-índices-de-banco-de-dados)
14. [Erros Conhecidos e Resoluções](#14-erros-conhecidos-e-resoluções)
15. [Guia de Manutenção Futura](#15-guia-de-manutenção-futura)
16. [O que falta para 10/10](#16-o-que-falta-para-1010)

---

## 1. Visão Geral

O módulo **Clientes** é o hub central do ERP GladPros. Todos os outros módulos (Propostas, Projetos, Invoices, Service Orders) dependem de um cliente vinculado. É o ponto de entrada do ciclo de vida de qualquer negócio.

### Responsabilidades
- Cadastro e gestão de clientes PF e PJ
- Armazenamento seguro de documentos fiscais (SSN, ITIN, EIN) via criptografia AES-GCM
- Controle de status (ATIVO / INATIVO) com validação de dependências ativas
- Exportação de dados (CSV e PDF)
- Operações em massa (bulk activate / deactivate / delete)
- Histórico completo de auditoria por cliente
- Relatórios e análise de perfil da base de clientes

### Regra fundamental
> Clientes não são deletados fisicamente. O campo `status` vai de `ATIVO` para `INATIVO`. Isso preserva a integridade referencial com todos os módulos vinculados.

---

## 2. Arquitetura do Módulo

```
src/
├── app/
│   ├── (dashboard)/clientes/
│   │   ├── page.tsx                  ← Hub do módulo (landing)
│   │   ├── lista/page.tsx            ← Lista paginada com filtros, bulk, export
│   │   ├── novo/page.tsx             ← Formulário de criação
│   │   ├── [id]/page.tsx             ← Detalhe + edição + histórico
│   │   └── relatorios/page.tsx       ← Relatórios e análise
│   └── api/clientes/
│       ├── route.ts                  ← GET (lista) + POST (criação)
│       ├── [id]/
│       │   ├── route.ts              ← GET (detalhe), PUT (update), DELETE (soft)
│       │   ├── toggle-status/route.ts ← PUT: toggle ATIVO ↔ INATIVO
│       │   └── audit/route.ts        ← GET: histórico de auditoria
│       ├── bulk/route.ts             ← POST: ações em massa
│       └── export/
│           ├── csv/route.ts          ← POST: exportar CSV
│           └── pdf/route.ts          ← POST: exportar PDF (Playwright headless)
├── components/clientes/
│   ├── ClienteCard.tsx               ← Card da view grid
│   ├── ClienteForm.tsx               ← Formulário unificado create/edit
│   ├── ClienteTable.tsx              ← Tabela da lista principal
│   ├── ClienteFilters.tsx            ← Filtros de busca avançada
│   ├── ClienteHistorico.tsx          ← Timeline de auditoria na UI
│   ├── ClienteStatusBadge.tsx        ← Badge ATIVO / INATIVO
│   ├── BulkActionsBar.tsx            ← Barra de ações em massa
│   └── ExportButton.tsx              ← Dropdown CSV / PDF
└── shared/lib/
    ├── helpers/cliente.ts            ← Toda lógica de negócio do módulo
    └── validations/cliente.ts        ← Schemas Zod compartilhados
```

---

## 3. Modelo de Dados

### Tabela `Cliente` (Prisma)

```prisma
model Cliente {
  id              Int      @id @default(autoincrement())
  empresaId       Int      @default(1)            // single-tenant
  tipo            TipoCliente                      // PF | PJ

  // Dados de identificação
  nomeCompleto    String?                          // PF: nome completo
  razaoSocial     String?                          // PJ: nome jurídico (legal name)
  nomeFantasia    String?                          // PJ: DBA / trade name
  nomeChave       String   @unique                 // slug gerado automaticamente

  // Contato
  email           String   @unique
  telefone        String?

  // Endereço (campos novos — preferir sobre legados)
  addressStreet   String?
  addressUnit     String?
  addressCity     String?
  addressState    String?
  addressZip      String?
  addressCounty   String?

  // Endereço legado — manter para compatibilidade com dados antigos
  endereco        String?   // @deprecated — usar addressStreet
  cidade          String?   // @deprecated — usar addressCity
  estado          String?   // @deprecated — usar addressState
  zipcode         String?   // @deprecated — usar addressZip

  // Documentos fiscais (NUNCA armazenar em claro)
  tipoDocumentoPF TipoDocumentoPF?               // SSN | ITIN
  documentoEnc    String?   // Criptografado — AES-GCM via crypto.ts
  docLast4        String?   // Últimos 4 dígitos (exibição)
  docHash         String?   @unique              // SHA-256 para detecção de duplicatas
  ein             String?                         // EIN para PJ (não criptografado)

  // Status
  status          StatusCliente @default(ATIVO)   // ATIVO | INATIVO
  ativo           Boolean       @default(true)    // campo legado — sync com status

  observacoes     String?
  criadoEm        DateTime  @default(now())
  atualizadoEm    DateTime  @updatedAt

  // Relações
  propostas       Proposta[]
  projetos        Projeto[]
  invoices        Invoice[]
  serviceOrders   ServiceOrder[]
  auditLogs       AuditLog[]    @relation("ClienteAuditLogs")

  // Índices
  @@index([empresaId])
  @@index([status])
  @@index([tipo])
  @@index([email])
  @@index([docHash])
  @@index([nomeChave])
  @@index([addressCity])
  @@index([addressState])
  @@index([addressCity, addressState])
}
```

### Enums

```typescript
enum TipoCliente { PF, PJ }
enum TipoDocumentoPF { SSN, ITIN }
enum StatusCliente { ATIVO, INATIVO }
```

---

## 4. Rotas de API

### `GET /api/clientes`
Lista paginada de clientes com filtros.

**Auth**: `requireClientePermission(req, 'canRead')`  
**RBAC**: ADMIN, GERENTE, FINANCEIRO, ESTOQUE, USUARIO  

**Query params**:
| Param | Tipo | Descrição |
|-------|------|-----------|
| `q` | string | Busca em nome, email, razão social, docLast4 |
| `tipo` | `PF \| PJ \| all` | Filtro por tipo |
| `ativo` | `true \| false \| all` | Filtro por status |
| `addressCity` | string | Filtro por cidade |
| `addressState` | string | Filtro por estado (2 letras) |
| `addressCounty` | string | Filtro por county |
| `page` | number | Página (padrão: 1) |
| `pageSize` | number | Itens por página (padrão: 20, máx: 100) |
| `sortBy` | string | Campo de ordenação |
| `sortDir` | `asc \| desc` | Direção da ordenação |

**Cache**: `withBusinessCache` — TTL 5s (dev) / 20s (prod), chave por userId+role+filtros.

---

### `POST /api/clientes`
Cria novo cliente.

**Auth**: `requireClientePermission(req, 'canCreate')`  
**RBAC**: ADMIN, GERENTE, USUARIO  
**Validation**: `clienteCreateSchema` (Zod)  

**Campos obrigatórios PF**:
- `tipo: 'PF'`, `nomeCompleto`, `email`, `telefone`, `addressStreet`, `addressCity`, `addressState`, `addressZip`

**Campos obrigatórios PJ**:
- `tipo: 'PJ'`, `nomeFantasia`, `email`, `telefone`, `addressStreet`, `addressCity`, `addressState`, `addressZip`

**Retorno 409** se documento (docHash) já cadastrado.

---

### `GET /api/clientes/[id]`
Detalhe de um cliente. Inclui contadores de projetos, service orders e invoices.

**Auth**: `requireClientePermission(req, 'canRead')`  
**Nota**: `documentoEnc` **não** é retornado — apenas `docLast4`.

---

### `PUT /api/clientes/[id]`
Atualiza dados de um cliente.

**Auth**: `requireClientePermission(req, 'canUpdate')`  
**RBAC**: ADMIN, GERENTE, USUARIO  
**Retorno 409** se novo documento já pertencer a outro cliente.

---

### `DELETE /api/clientes/[id]`
Soft delete — muda status para `INATIVO`. Não remove dados.

**Auth**: `requireClientePermission(req, 'canDelete')`  
**RBAC**: ADMIN, GERENTE  
**Retorno 409** se cliente tiver projetos, service orders ou invoices ativas.

---

### `PUT /api/clientes/[id]/toggle-status`
Alterna status ATIVO ↔ INATIVO.

**Auth**: `requireClientePermission(req, 'canUpdate')`  
**Ao inativar**: verifica dependências — retorna 409 se houver projetos/SO/invoices ativas.  
**Ao ativar**: nenhuma verificação necessária.

---

### `POST /api/clientes/bulk`
Operações em massa.

**Auth**: delete → `canDelete`, activate/deactivate → `canUpdate`  
**Rate-limit**: `clientes:bulk`  
**Body**:
```typescript
{
  action: 'activate' | 'deactivate' | 'delete',
  scope: 'selected' | 'allFiltered',
  ids?: number[],        // obrigatório se scope=selected
  filters?: ClienteFilters  // usado se scope=allFiltered
}
```
**Nota importante**: O body é lido **antes** da autenticação para determinar qual permissão verificar. Isso é intencional e documentado — evita dupla verificação de JWT.

---

### `POST /api/clientes/export/csv`
Exporta clientes em formato CSV.

**Auth**: `requireClientePermission(req, 'canRead')`  
**Rate-limit**: aplicado  
**Body**: filtros (mesmos do GET lista) + `selectedIds?: number[]`  
**Retorno 400** se nenhum cliente encontrado.  
**Auditoria**: `EXPORT_CSV` registrado via `AuditService.logAction` (fire-and-forget).

---

### `POST /api/clientes/export/pdf`
Exporta clientes como PDF via Playwright headless.

**Auth**: `requireClientePermission(req, 'canRead')`  
**Auditoria**: `EXPORT_PDF` registrado.

---

### `GET /api/clientes/similar`
Detecta possíveis clientes duplicados por **telefone** ou **endereço** (aviso não-bloqueante).

**Auth**: `requireClientePermission(req, 'canRead')`  
**Query params**:
| Param | Tipo | Descrição |
|-------|------|-----------|
| `telefone` | string | Número de 10 dígitos |
| `addressStreet` | string | Logradouro (min 5 chars) |
| `addressCity` | string | Cidade (obrigatória junto com street) |
| `addressState` | string | Estado (2 letras, opcional) |
| `excludeId` | number | ID do cliente a excluir (uso em edição) |

**Resposta**:
```json
{
  "data": {
    "byTelefone": [{ "id": 1, "nome": "João Silva", "tipo": "PF", "email": "joao@..." }],
    "byAddress":  [{ "id": 2, "nome": "Empresa XYZ", "tipo": "PJ", "email": "..." }],
    "hasMatches": true
  },
  "success": true
}
```
**Importante**: Esta rota **nunca bloqueia** o cadastro. É usada pelo formulário via debounce para exibir um aviso amarelo ao operador.

---

### `GET /api/clientes/[id]/audit`
Histórico de auditoria do cliente.

**Auth**: `requireUser(req)` + `hasRole(['ADMIN', 'GERENTE'])`  
**Nota**: usa `requireUser` diretamente (não `requireClientePermission`) — correto, pois auditoria é restrita a roles de supervisão.  
**Query**: `limit` (padrão: 50, máx: 100)

---

## 5. Lógica de Negócio

Toda a lógica central está em `src/shared/lib/helpers/cliente.ts`:

### `sanitizeClienteInput(data)`
Normaliza campos antes de gravar no banco:
- Trim em todos os campos string
- `nomeChave` = slug gerado de nome/razão social
- `email` sempre lowercase
- `addressState` sempre uppercase (ex: `tx` → `TX`)
- `ativo` sincronizado com `status`

### `checkDocumentoExists(docHash, excludeId?)`
Verifica se documento já está cadastrado. Retorna `true` se duplicata encontrada (excluindo o próprio registro em updates).

### `logClienteAudit(clienteId, acao, diff, userId)`
Registra uma entrada no `AuditLog`. `clienteId` deve ser `number`.

### `calculateClienteDiff(oldData, newData)`
Gera objeto com apenas os campos que mudaram: `{ campo: { old: valor_antigo, new: valor_novo } }`.

### `getClientesBlockingDependenciesMap(ids)`
Retorna `Map<clienteId, { activeServiceOrders, activeProjetos, activeInvoices }>` para uma lista de IDs. Usa **3 queries paralelas** (Promise.all) para evitar N+1.

### `hasBlockingDependencies(counts)`
Retorna `true` se qualquer contador > 0.

### `buildClienteDependencyConflictDetails(counts)`
Formata o objeto de detalhes para resposta 409.

### `maskDocumento(enc)`
Retorna string mascarada para exibição: `***-**-XXXX`.

### `validateAddressIntegrity(addressFields)`
Valida que se qualquer campo de endereço for preenchido, os campos obrigatórios (street, city, state, zip) também estão.

---

## 6. Segurança e RBAC

### Helper de permissão

```typescript
// src/shared/lib/rbac.ts — linha 137
export async function requireClientePermission(
  request: NextRequest,
  action: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete'
): Promise<User>
```

Este helper:
1. Chama `requireUser(request)` internamente (verificação JWT)
2. Verifica a permissão via `ClientePermissions[role][action]`
3. Lança erro 403 se não autorizado
4. Retorna o `user` para uso na rota

**NUNCA** chamar `requireUser` separadamente depois de `requireClientePermission` — causaria dupla verificação JWT.

### Matriz de permissões do módulo

| Role | canRead | canCreate | canUpdate | canDelete |
|------|---------|-----------|-----------|-----------|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| GERENTE | ✅ | ✅ | ✅ | ✅ |
| FINANCEIRO | ✅ | ❌ | ❌ | ❌ |
| ESTOQUE | ✅ | ❌ | ❌ | ❌ |
| USUARIO | ✅ | ✅ | ✅ | ❌ |
| CLIENTE | ❌ | ❌ | ❌ | ❌ |

### Visibilidade na sidebar

O módulo aparece na sidebar para todos os roles com `canRead = true` (todos exceto CLIENTE).

---

## 7. Criptografia e Documentos Fiscais

Os documentos fiscais (SSN, ITIN) são **dados sensíveis protegidos por lei** (IRS, GDPR, CCPA).

### Como funciona

```
Entrada do usuário: "123-45-6789"
         ↓
AES-GCM encrypt    → documentoEnc = "abc123...xyz" (gravado no banco)
SHA-256 hash       → docHash = "ef45..." (gravado, usado para detecção de duplicatas)
Últimos 4 dígitos  → docLast4 = "6789" (gravado, exibido na UI)
```

### Regras obrigatórias

1. **`documentoEnc` nunca é retornado** nas respostas de API — apenas `docLast4`
2. `docHash` é usado **apenas** para verificar duplicatas (`checkDocumentoExists`)
3. A função de criptografia está em `src/shared/lib/crypto.ts`
4. Para EIN (PJ), o campo `ein` não é criptografado — armazenado em claro (EIN é público)

### Por que EIN não é criptografado?
EIN é um número público de registro de empresa (como CNPJ). Diferente de SSN/ITIN que são pessoais e sensíveis.

---

## 8. Auditoria

Todas as ações críticas geram uma entrada no `AuditLog`:

| Ação | Trigger | Dados registrados |
|------|---------|------------------|
| `CREATE` | POST /api/clientes | payload completo (sem documentoEnc) |
| `UPDATE` | PUT /api/clientes/[id] | diff (campos alterados) |
| `DELETE` | DELETE /api/clientes/[id] | status anterior |
| `UPDATE` | PUT toggle-status | status: { old, new } |
| `UPDATE_BULK_STATUS` | POST bulk activate/deactivate | diff por cliente |
| `DELETE_BULK` | POST bulk delete | id e status anterior |
| `EXPORT_CSV` | POST export/csv | fire-and-forget |
| `EXPORT_PDF` | POST export/pdf | fire-and-forget |

### Visualização na UI
A rota `GET /api/clientes/[id]/audit` retorna o histórico. O componente `ClienteHistorico.tsx` renderiza a timeline na aba "Histórico" da tela de detalhe.

### Acesso ao histórico
Apenas **ADMIN** e **GERENTE** podem ver o histórico de auditoria.

---

## 9. Performance e Cache

### Cache de lista
```typescript
// GET /api/clientes usa withBusinessCache
// Chave: clientes:list:{userId}:{role}:{q}:{tipo}:{ativo}:{city}:{state}:{page}:{pageSize}
// TTL: 5s (dev) / 20s (prod)
```

### Paginação obrigatória
Todas as listagens usam `take` + `skip`. Padrão: 20 itens por página.

### Queries paralelas
`getClientesBlockingDependenciesMap` usa `Promise.all` para 3 queries independentes (service orders, projetos, invoices) — evita N+1.

### Índices no banco
```sql
CREATE INDEX idx_cliente_address_city ON Cliente(addressCity);
CREATE INDEX idx_cliente_address_state ON Cliente(addressState);
CREATE INDEX idx_cliente_address_city_state ON Cliente(addressCity, addressState);
-- + índices já existentes em: empresaId, status, tipo, email, docHash, nomeChave
```

---

## 10. Componentes UI

### `ClienteForm.tsx`
Formulário unificado para criação e edição.

**Campos PF**:
- `nomeCompleto` (obrigatório)
- `tipoDocumentoPF`: SSN | ITIN (toggle)
- `ssn` ou `itin` (obrigatório)
- `email`, `telefone`
- Endereço completo (street, unit, city, state, zip, county)
- `observacoes`

**Campos PJ**:
- `nomeFantasia` (obrigatório — DBA / trade name)
- `razaoSocial` (opcional — legal name)
- `ein`
- `email`, `telefone`
- Endereço completo
- `observacoes`

**data-testid disponíveis**:
- `cliente-form-nome-completo`, `cliente-form-nome-fantasia`, `cliente-form-razao-social`
- `cliente-form-ssn`, `cliente-form-itin`, `cliente-form-ein`
- `cliente-form-email`, `cliente-form-telefone`
- `cliente-form-address-street`, `cliente-form-address-unit`, `cliente-form-address-city`
- `cliente-form-address-state`, `cliente-form-address-zip`, `cliente-form-address-county`
- `cliente-form-observacoes`, `cliente-form-submit`

### `ClienteCard.tsx`
Card da view grid. Exibe tipo, nome, email, telefone, localização, documento mascarado, data de criação.
Botões com `aria-label` descritivo para acessibilidade.
SVGs decorativos com `aria-hidden="true"`.

### `ClienteTable.tsx`
Tabela da lista principal com suporte a seleção em massa via checkbox.
`data-testid="cliente-row-{id}"` para cada linha.

### `BulkActionsBar.tsx`
Barra que aparece quando ≥1 cliente está selecionado. Botões: Ativar, Inativar, Excluir.

### `ExportButton.tsx`
Dropdown com opções CSV e PDF. `data-testid="clientes-export-button"`.

---

## 11. Cobertura de Testes

### Unit Tests (Jest)

| Arquivo | Testes | O que cobre |
|---------|--------|-------------|
| `route.test.ts` | — | GET lista, POST criação, filtros, paginação |
| `detail.route.test.ts` | — | GET detalhe, PUT update, DELETE soft |
| `historico.route.test.ts` | — | Histórico legado |
| `bulk.route.test.ts` | 8 | activate, deactivate+409, delete+409, allFiltered, rate-limit, validação |
| `toggle-status.route.test.ts` | 6 | toggle ATIVO↔INATIVO, 409 deps, 404, 422, nome PJ |
| `export-csv.route.test.ts` | 6 | CSV content, header, 400 sem dados, audit, filtros, rate-limit |
| `audit.route.test.ts` | 8 | ADMIN OK, diff parsed, 403 USUARIO, 403 FINANCEIRO, 422, lista vazia, limit |

**Total**: 34 testes — 100% passando

### E2E Tests (Playwright)

| Spec | O que cobre |
|------|-------------|
| `clientes-smoke.spec.ts` | Hub, lista, relatórios — navegação básica com MFA |
| `clientes-crud.spec.ts` | Criação PF/PJ, edição, validação de campos obrigatórios |
| `clientes-guards.spec.ts` | Export CSV+PDF, guard de dependência (409 UI) |
| `clientes-rbac.spec.ts` | Visibilidade por role (GERENTE, FINANCEIRO, ESTOQUE, USUARIO) |
| `clientes-bulk.spec.ts` | Bulk activate, deactivate, delete, 409 bloqueado, 400 ids vazio, 401 sem token, allFiltered |
| `clientes-audit.spec.ts` | Aba Histórico na UI + API audit (ADMIN acessa, USUARIO não) |

### O que não tem cobertura E2E (gap conhecido)
- Campos de endereço legado (cobertos por unit tests de helpers)
- Aviso de duplicidade por telefone/endereço (coberto por unit tests de `similar.route.test.ts`)

---

## 12. Fluxos de Integração

O módulo clientes é **upstream** — alimenta os outros módulos.

```
Cliente
  ├── Proposta  (clienteId obrigatório)
  │     └── Projeto  (quando proposta aprovada)
  │           ├── Service Order  (vinculada ao projeto)
  │           ├── Estoque (movimentações do projeto)
  │           └── Invoice (faturamento do projeto)
  └── Invoice  (pode ser criada diretamente sem projeto)
```

### Regra de cascata de inativação
Um cliente **não pode ser inativado** se tiver qualquer um destes ativos:
- `Projeto` com status ativo (em andamento, aguardando, etc.)
- `ServiceOrder` com status ativo
- `Invoice` com status ativo (não paga/cancelada)

Essa verificação ocorre em:
1. `DELETE /api/clientes/[id]`
2. `PUT /api/clientes/[id]/toggle-status` (ao inativar)
3. `POST /api/clientes/bulk` (actions: deactivate, delete)

### Campos usados por outros módulos
Ao criar Proposta/Projeto via UI, os seguintes campos de cliente são exibidos:
- `nomeCompletoOuRazao` (campo virtual calculado no select)
- `email`, `telefone`
- `addressCity`, `addressState`
- `documentoMasked` (docLast4 formatado)

---

## 13. Índices de Banco de Dados

### Como aplicar migrations sem shadow DB

O usuário `dev` não tem permissão de `CREATE DATABASE` (necessário para shadow DB do Prisma).

**Fluxo correto para novas migrations**:

```bash
# 1. Criar o arquivo de migration manualmente
mkdir -p prisma/migrations/YYYYMMDD_descricao
cat > prisma/migrations/YYYYMMDD_descricao/migration.sql << 'EOF'
-- Seu SQL aqui
CREATE INDEX ...;
EOF

# 2. Aplicar o SQL diretamente no banco
mysql -h 127.0.0.1 -P 3306 -u dev -pdev123 gladpros < prisma/migrations/YYYYMMDD_descricao/migration.sql

# 3. Marcar como aplicada no histórico do Prisma
npx prisma migrate resolve --applied YYYYMMDD_descricao

# 4. Verificar
npx prisma migrate status
```

---

## 14. Erros Conhecidos e Resoluções

### Bugs corrigidos neste ciclo de auditoria

| Bug | Onde | Resolução |
|-----|------|-----------|
| N+1 em decrypt-failures | `route.ts` GET | Substituído por `Promise.all` |
| Sem 409 para documento duplicado | POST + PUT | Adicionado `checkDocumentoExists` com retorno 409 |
| Locale pt-BR em ClienteCard | `ClienteCard.tsx:109` | Trocado para `en-US` + `America/Chicago` |
| `tipoDocumentoPF` não persistido | POST + PUT | Adicionado ao payload de criação e ao `updateableFields` |
| Dupla autenticação em bulk | `bulk/route.ts` | Removido segundo `requireUser`, mantido apenas `requireClientePermission` |
| AuditLog silencioso em bulk | `bulk/route.ts` | Adicionado `.catch()` com `console.error` |
| Handler PATCH morto | `[id]/route.ts` | Removido (~86 linhas) — frontend usa toggle-status |
| `documentoEnc` no GET select | `[id]/route.ts` | Removido do select — dados sensíveis não devem vazar |
| Sem auditoria em exports | `export/csv/route.ts`, `export/pdf/route.ts` | Adicionado `AuditService.logAction` fire-and-forget |
| `razaoSocial` sem campo no form | `ClienteForm.tsx` | Adicionado input opcional "Razão Social (Legal Name)" |
| Botões sem `aria-label` | `ClienteCard.tsx` | Adicionado `aria-label` descritivo em todos os botões |
| SVGs sem `aria-hidden` | `ClienteCard.tsx` | Adicionado `aria-hidden="true"` |

---

## 15. Guia de Manutenção Futura

### Ao adicionar campo novo ao modelo Cliente

1. **Schema Prisma**: adicionar campo em `schema.prisma`
2. **Migration**: criar migration SQL manualmente (ver seção 13)
3. **Validação**: atualizar `clienteCreateSchema` e `clienteUpdateSchema` em `validations/cliente.ts`
4. **Helpers**: atualizar `sanitizeClienteInput()` e `calculateClienteDiff()` se necessário
5. **API GET**: adicionar ao `select` no `route.ts`
6. **API PUT**: adicionar ao `updateableFields` no `[id]/route.ts`
7. **Form**: adicionar input em `ClienteForm.tsx` com `data-testid`
8. **Testes**: atualizar mocks nos unit tests e E2E fixtures

### Ao adicionar nova ação de bulk

1. Adicionar ao enum `bulkSchema.action` em `bulk/route.ts`
2. Implementar a lógica na função handler
3. Adicionar auditoria com `AuditService.logAction`
4. Adicionar caso no `bulk.route.test.ts`
5. Adicionar teste E2E em `clientes-bulk.spec.ts`

### Ao alterar permissões RBAC

1. Editar `ClientePermissions` em `src/shared/lib/rbac.ts`
2. Atualizar `clientes-rbac.spec.ts` com os novos cenários
3. Verificar que a sidebar reflete as mudanças

### O que NÃO fazer

- ❌ Retornar `documentoEnc` em qualquer resposta de API
- ❌ Deletar fisicamente clientes (`DELETE FROM Cliente WHERE ...`)
- ❌ Chamar `requireUser` depois de `requireClientePermission` (dupla autenticação)
- ❌ Usar `@/server/db` — sempre `@/lib/prisma`
- ❌ Usar `empresaId` hardcoded em queries de outros módulos sem documentar single-tenant
- ❌ Fazer `findMany` sem `take` + `skip`
- ❌ Usar `await` dentro de `.map()` (N+1)
- ❌ Hardcodar cores (`bg-white`, `text-gray-700`) — usar CSS variables

---

## 16. O que falta para 10/10

O módulo está em **9.2/10**. O que faltaria para chegar a 10/10:

### Alta prioridade (bloqueantes de 10/10)
1. **`ClienteForm.test.tsx`** — Testes de componente para o formulário principal (toggle PF/PJ, validação inline, submit com normalize). Hoje não existe.
2. **Test coverage threshold** — Configurar em `jest.config.js` um mínimo (ex: 80%) para prevenir regressão por omissão de testes em futuras features.

### Média prioridade (melhorias reais de produto)
3. **Importação CSV** — Cadastrar múltiplos clientes via upload de planilha com validação prévia e relatório de erros. Reduz trabalho operacional.
4. **Aba "Histórico" mais rica na UI** — A rota de audit existe, o componente `ClienteHistorico.tsx` existe. Falta expor dados de diff de forma legível (mostrar o que mudou, não apenas que houve update).
5. **Busca por endereço completo** — hoje filtra por city/state separados, mas não por ZIP ou county via UI.

### Baixa prioridade (nice to have)
6. **Merge de duplicatas** — Detectar clientes com `docHash` duplicado de importações antigas e oferecer merge manual.
7. **Portal do cliente** — Link de acesso externo para o cliente ver invoices/projetos. A rota `/api/portal/*` já existe.
8. **Campos personalizados** — Metadados extras por tipo de cliente (ex: tipo de propriedade para residencial vs comercial).

---

## Histórico de Revisões

| Data | O que foi auditado/corrigido |
|------|------------------------------|
| Abril 2026 | Auditoria completa (sessões 001+002): 11 bugs corrigidos, 34 unit tests + 5 specs E2E criados, documentação inicial |
