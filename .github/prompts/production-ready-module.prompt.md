---
description: "Varredura completa de um módulo para deixá-lo blindado e pronto para produção — bugs, segurança, testes unitários, E2E e documentação"
agent: "agent"
---

# Production-Ready Module — GladPros ERP

Use este prompt para transformar um módulo existente em **produção-ready**: auditado, corrigido, testado, documentado e blindado contra regressão.

**Informe o módulo que deseja auditar:**

> Exemplo: "Quero fazer a varredura completa no módulo clientes"

---

## Como este processo funciona

Este processo replica exatamente o que foi feito nos módulos `clientes` e `login` da GladPros.
Ele passa por **5 fases obrigatórias** em sequência, sem pular nenhuma.

---

## Fase 1 — Leitura e Mapeamento

Antes de qualquer alteração, leia e mapeie:

### 1.1 Arquivos do módulo
- Pages: `src/app/(dashboard)/<modulo>/`
- API: `src/app/api/<modulo>/`
- Componentes: `src/components/<modulo>/`
- Testes existentes: `src/__tests__/api/<modulo>/` e `tests/e2e/<modulo>/`
- Documentação existente: `docs/modules/<modulo>/`

### 1.2 Referências obrigatórias (ler antes de começar)
- `AGENTS.md` — convenções críticas do projeto (auth, RBAC, Prisma, logger, formato de resposta)
- `.github/skills/module-audit/SKILL.md` — checklist de 15 pontos
- `.github/skills/ui-ux/SKILL.md` — design system, tokens, componentes
- `.github/skills/rbac-access/SKILL.md` — permissões por role e módulo

### 1.3 Resultado esperado desta fase
- Lista completa de todos os arquivos do módulo
- Quantidade de rotas de API, páginas e componentes
- Estado atual dos testes (quantos existem, quantos passam)

---

## Fase 2 — Auditoria (15 pontos + segurança)

Execute o checklist completo de 15 pontos do `module-audit` skill **E** a auditoria de segurança.

### 2.1 Checklist de 15 pontos

| # | Check | Critério |
|---|-------|----------|
| 1 | **Auth** | Todas as rotas chamam `requireUser()` como primeira operação? |
| 2 | **RBAC** | `can(role, modulo, action)` verificado antes de create/update/delete? |
| 3 | **Sidebar** | Módulo visível apenas para roles com acesso de leitura? |
| 4 | **Prisma Import** | Apenas `import { prisma } from "@/lib/prisma"`? |
| 5 | **Mock Data** | Nenhum dado falso/hardcoded em código de produção? |
| 6 | **empresaId** | Obtido do contexto do usuário, não hardcoded? |
| 7 | **Currency** | Todos os valores monetários em USD `en-US`? Sem `R$` ou `BRL`? |
| 8 | **Timezone** | Datas exibidas com `timeZone: "America/Chicago"`? Sem UTC cru? |
| 9 | **Suspense** | Pages async server-side wrapped em `<Suspense>` com skeleton? |
| 10 | **Loading** | Componentes client mostram skeleton/spinner enquanto carregam? |
| 11 | **Empty State** | Listas exibem `EmptyState` quando não há dados? |
| 12 | **Error Handling** | try/catch nas rotas + mensagens de erro úteis na UI? |
| 13 | **Pagination** | Listas com >20 itens usam paginação (`take`, `skip`, `total`)? |
| 14 | **Console.log** | Nenhum `console.log/warn/error` em código de produção? |
| 15 | **Accessibility** | `aria-label` em elementos interativos? Touch targets ≥48px? |

### 2.2 Auditoria de vulnerabilidades (varredura completa)

Verificar **cada arquivo do módulo** contra todos os vetores abaixo.
Para cada vulnerabilidade encontrada, registrar: arquivo:linha | vetor | impacto | correção.

---

#### 🔴 VUL-01 — Broken Authentication

```bash
# Rotas sem requireUser()
grep -rn "export async function\|export const" src/app/api/<modulo>/ | grep -v "requireUser"
```
- Rota aceita `userId` do body sem comparar com `claims.sub` do JWT?
- Token verificado com algoritmo errado (ex: `alg: none` aceito)?
- JWT sem verificação de expiração (`exp`)?
- Cookie de sessão sem `httpOnly`? Sem `Secure` em produção? Sem `SameSite`?
- Refresh token aceito mesmo após logout (sem invalidação no banco)?
- Senha aceita com comprimento 0 ou sem validação mínima?

---

#### 🔴 VUL-02 — Broken Access Control (IDOR)

```bash
# Acesso por ID sem verificação de dono
grep -rn "params.id\|searchParams.id\|body.id" src/app/api/<modulo>/
# Para cada resultado: o código verifica se o registro pertence ao usuário logado?
```
- `GET /api/<modulo>/[id]` — verifica se `registro.empresaId === user.empresaId`?
- `PATCH /api/<modulo>/[id]` — verifica `empresaId` antes de atualizar?
- `DELETE /api/<modulo>/[id]` — verifica `empresaId` antes de deletar?
- Usuário USUARIO consegue acessar dados de outro usuário trocando o ID na URL?
- `can()` está ausente em alguma rota de escrita?

---

#### 🔴 VUL-03 — Injection (SQL, NoSQL, Command)

```bash
# Template literals diretos em queryRaw (SQL injection)
grep -rn '\$queryRaw`' src/app/api/<modulo>/
# verificar se variáveis são interpoladas diretamente (${ }) ou usam tagged template (prisma escapa)

# eval / Function() / exec com input do usuário
grep -rn "eval(\|new Function(\|exec(" src/app/api/<modulo>/

# Path traversal — operações de arquivo com input do usuário
grep -rn "readFile\|writeFile\|unlink\|path\.join" src/app/api/<modulo>/
```
- `prisma.$queryRaw` usa tagged template literal (seguro) ou string concatenada (inseguro)?
- Há `$executeRaw` com interpolação de variáveis?
- Input do usuário usado diretamente em `path.join()` sem sanitização?

---

#### 🔴 VUL-04 — Sensitive Data Exposure

```bash
# Campos sensíveis no response
grep -rn "senha\|password\|hash\|secret\|token\|pin\|cpf\|ssn\|ein\|itin" src/app/api/<modulo>/
# verificar se esses campos aparecem em return NextResponse.json()

# Dados no log
grep -rn "logger\.\|console\." src/app/api/<modulo>/
# verificar se há senha, token, ou dado pessoal sendo logado
```
- Response de listagem retorna `senha`, `senhaHash`, `pin`, `tokenVersion`?
- Documentos fiscais (SSN, EIN, ITIN) retornados sem mascaramento (`docLast4`)?
- Logs contêm PII (email, nome completo, IP em conjunto com ação sensível)?
- `NEXT_PUBLIC_` sendo usado em variável que deveria ser server-only (ex: `NEXT_PUBLIC_JWT_SECRET`)?

---

#### 🔴 VUL-05 — XSS (Cross-Site Scripting)

```bash
# dangerouslySetInnerHTML — qualquer uso é suspeito
grep -rn "dangerouslySetInnerHTML" src/app/(dashboard)/<modulo>/ src/components/<modulo>/

# Conteúdo HTML dinâmico sem escape
grep -rn "__html" src/app/(dashboard)/<modulo>/ src/components/<modulo>/
```
- Algum componente renderiza HTML gerado por input do usuário sem sanitização?
- `dangerouslySetInnerHTML` com valor vindo de API ou banco de dados?
- Template de email/PDF construído com string concatenação de input do usuário?

---

#### 🔴 VUL-06 — Security Misconfiguration

```bash
# Rotas de debug/dev acessíveis sem NODE_ENV check
grep -rn "process.env.NODE_ENV" src/app/api/<modulo>/
# verificar se rotas de dev têm guard de produção

# Headers de segurança ausentes
grep -rn "NextResponse.json\|new Response" src/app/api/<modulo>/
# verificar se rotas sensíveis retornam headers como Cache-Control: no-store
```
- Rotas de debug (ex: `/api/<modulo>/dev/*`, `/api/<modulo>/seed`) acessíveis em produção?
- Mensagens de erro retornam stack trace ou detalhes internos do banco?
- CORS configurado com `*` em rotas que retornam dados autenticados?
- Dados sensíveis sendo cacheados (`Cache-Control` sem `no-store` em rotas de auth/financeiro)?

---

#### 🟠 VUL-07 — Rate Limiting ausente ou insuficiente

```bash
# Rotas sem rate limit
grep -rn "export async function POST\|export async function PUT\|export async function DELETE" src/app/api/<modulo>/
# Para cada uma: há chamada a RateLimiter ou importação de rate-limit?
```
- Rotas de criação (POST) sem rate limit? Um atacante poderia criar 10.000 registros por segundo?
- Rotas de busca (GET com filtro) sem rate limit? Enumeração de dados possível?
- Rate limit baseado apenas em IP? Contornável com proxies?
- Janela de rate limit adequada? (5 req/15min para auth, mais para operações normais)

---

#### 🟠 VUL-08 — Open Redirect

```bash
# redirect() com URL controlada pelo usuário
grep -rn "redirect(\|router\.push(\|router\.replace(" src/app/(dashboard)/<modulo>/ src/components/<modulo>/
```
- `redirect(searchParams.returnUrl)` sem validar que a URL é interna?
- `router.push(params.next)` sem verificar se começa com `/`?
- Um atacante poderia redirecionar o usuário para `https://site-malicioso.com`?

---

#### 🟠 VUL-09 — SSRF (Server-Side Request Forgery)

```bash
# fetch() com URL controlada pelo usuário
grep -rn "fetch(" src/app/api/<modulo>/
```
- `fetch(body.webhookUrl)` sem validação da URL?
- `fetch(body.imageUrl)` para baixar imagem sem whitelist de domínios?
- Um atacante poderia fazer o servidor requisitar `http://169.254.169.254` (metadata AWS)?

---

#### 🟠 VUL-10 — Mass Assignment

```bash
# Spread de body direto no Prisma
grep -rn "create({.*\.\.\.body\|update({.*\.\.\.body\|\.\.\.parsed\.data" src/app/api/<modulo>/
```
- `prisma.model.create({ data: { ...body } })` aceita campos como `empresaId`, `nivel`, `admin`?
- O schema Zod tem `z.object({}).strict()` ou usa `.passthrough()` que aceita campos extras?
- Um usuário poderia se promover a ADMIN enviando `{ "nivel": "ADMIN" }` no body?

---

#### 🟠 VUL-11 — Insecure Direct Object Reference em arquivos/uploads

```bash
grep -rn "uploads/\|public/\|readFile\|createReadStream" src/app/api/<modulo>/
```
- Arquivo servido por `GET /api/<modulo>/file?path=../../../etc/passwd`?
- Upload de arquivo sem validação de tipo MIME e extensão?
- Nome do arquivo gerado pelo usuário usado diretamente no sistema de arquivos?
- Arquivo de um usuário acessível por outro usuário sem verificação de dono?

---

#### 🟡 VUL-12 — Timing Attacks

```bash
grep -rn "=== \|!== " src/app/api/<modulo>/
# verificar comparações diretas de tokens, senhas, pins, códigos
```
- Comparação de token/código feita com `===` (tempo variável) em vez de `crypto.timingSafeEqual`?
- Comparação de PIN feito com `pin === stored` (vulnerável a timing attack)?
- Verificação de hash de reset token feita com comparação direta?

---

#### 🟡 VUL-13 — ReDoS (Regex Denial of Service)

```bash
grep -rn "new RegExp(\|\.match(\|\.test(\|\.replace(" src/app/api/<modulo>/
```
- Regex complexa aplicada sobre input do usuário sem limite de tamanho?
- Padrão com backtracking catastrófico (ex: `(a+)+`, `(.+)+`)?
- Input do usuário usado para construir a própria regex (`new RegExp(body.pattern)`)?

---

#### 🟡 VUL-14 — Prototype Pollution

```bash
grep -rn "Object\.assign\|\.\.\.req\.\|merge(" src/app/api/<modulo>/
```
- `Object.assign(target, body)` onde `body` vem do usuário?
- Merge recursivo de objetos sem proteção contra `__proto__`, `constructor`, `prototype`?

---

#### 🟡 VUL-15 — Audit Trail ausente em ações críticas

- Ações destrutivas (delete, cancelamento, mudança de status) geram `AuditLog`?
- Mudanças em dados financeiros têm rastreabilidade?
- Tentativas de acesso negado (403) são logadas para detecção de intrusão?

### 2.3 Varredura de bugs e erros pré-existentes

Esta é a parte que encontra **problemas que já existem no código e que vão causar falhas em produção**.

#### 2.3.1 Bugs de lógica de negócio

Para cada rota de API e cada componente, perguntar:

- A rota faz o que o nome dela diz? (ex: uma rota `PATCH /status` que na verdade deleta é um bug)
- Máquinas de estado: é possível fazer uma transição inválida? (ex: aprovar um item já cancelado)
- Há validações de negócio que estão no frontend mas **não** no backend? (facilmente bypassável)
- Campos obrigatórios no Zod que o banco aceita como `null` — ou o contrário?
- Cálculos financeiros: arredondamento errado? Divisão por zero possível? Soma sem `Number()` (soma de strings)?
- Datas: comparações de data sem timezone podem errar 1 dia? `new Date()` usado sem `America/Chicago`?
- Boolean invertido: um `if (!isActive)` que deveria ser `if (isActive)`?
- Condições de corrida: duas operações simultâneas podem deixar o banco em estado inválido?

#### 2.3.2 Bugs de TypeScript e runtime

Buscar ativamente por estes padrões — cada um é um bug latente:

```bash
# any explícito ou implícito
grep -rn ": any\|as any\|<any>" src/app/(dashboard)/<modulo>/ src/app/api/<modulo>/

# Non-null assertion sem justificativa (pode explodir em runtime)
grep -rn "!\." src/app/(dashboard)/<modulo>/ src/app/api/<modulo>/

# Optional chaining ausente em acesso a dados de API (pode explodir se API falhar)
grep -rn "\.data\." src/components/<modulo>/

# JSON.parse sem try/catch (explode com string malformada)
grep -rn "JSON\.parse" src/app/api/<modulo>/

# parseInt/parseFloat sem base/validação (NaN silencioso)
grep -rn "parseInt\|parseFloat" src/app/api/<modulo>/

# Await fora de try/catch em chamadas externas
grep -rn "await fetch\|await axios" src/app/api/<modulo>/
```

Verificar também:
- Props de componentes sem type guard para undefined/null
- Estados React não inicializados antes do primeiro render
- `useEffect` com dependências ausentes no array (stale closure)
- `useState` com valor inicial que muda na hidratação (hydration mismatch)
- Formulários que não resetam após submit com sucesso
- Loading state que nunca volta para `false` em caso de erro

#### 2.3.3 Bugs de performance (anti-patterns do AGENTS.md §15.1)

```bash
# N+1: await dentro de .map() — cria N queries sequenciais
grep -rn "\.map(async\|forEach(async" src/app/api/<modulo>/

# findMany sem paginação — retorna a tabela inteira
grep -rn "findMany({" src/app/api/<modulo>/
# verificar se cada um tem take/skip

# SELECT * em queryRaw
grep -rn "SELECT \*" src/app/api/<modulo>/

# Queries sequenciais que poderiam ser paralelas (await seguido de outro await sem dependência)
```

Para cada `findMany` encontrado verificar:
- Tem `take` e `skip`? Se não, é um bug de performance que escala mal
- Tem `select`? Se não, retorna todos os campos incluindo os grandes (ex: campos de texto longo)
- Tem `@@index` no schema para os campos usados no `where`?

#### 2.3.4 Bugs de integridade de dados

- Deleção sem verificar dependências (ex: deletar um cliente que tem projetos ativos)
- Update sem verificar se o registro pertence à `empresaId` do usuário logado
- Criação sem setar `empresaId` do usuário logado (deixa o campo em branco ou usa valor errado)
- Campos únicos sem tratamento do erro de duplicata (`P2002` do Prisma)
- Transações ausentes em operações que modificam múltiplas tabelas (ex: criar pedido + baixar estoque)
- Soft delete (`deletedAt`) vs hard delete — o módulo mistura os dois sem consistência?
- Campos `updatedAt` / `criadoEm` com timezone errado

#### 2.3.5 Bugs de UI/UX que causam perda de dados

- Formulário sem confirmação antes de ações destrutivas (delete sem modal de confirmação)
- Botão de submit sem `disabled` durante loading (duplo clique cria registro duplicado)
- Navegação que perde dados do formulário não salvo sem aviso
- Filtros/paginação que não persistem após refresh da página
- Mensagem de sucesso que aparece mesmo quando a API retornou erro (não verifica `success: true`)
- Erro silencioso: `catch(e) {}` vazio que engole erros sem avisar o usuário

### 2.4 Classificação dos problemas encontrados

Classifique cada problema em:
- **P1 — Crítico/Segurança**: vulnerabilidade explorável, dado exposto, bypass de auth, perda de dados silenciosa → **bloqueia produção**
- **P2 — Bug funcional**: lógica errada, cálculo incorreto, crash de runtime, N+1, estado inconsistente → **deve corrigir antes de produção**
- **P3 — Qualidade**: design inconsistente, acessibilidade menor, warning de TypeScript, log desnecessário → **melhorar na próxima iteração**

Gere tabela completa com: ID | Categoria | Arquivo:linha | Descrição | Impacto em produção | Correção proposta

**Não prossiga para a Fase 3 sem listar TODOS os problemas encontrados nas seções 2.1 a 2.4.**

---

## Fase 3 — Correções

### Ordem de correção (sempre nesta sequência)

1. **P1s primeiro** — em paralelo quando possível, mas sem pular nenhum
2. **P2s** — em paralelo quando possível
3. **P3s** — se houver tempo, caso contrário documentar como "próximos passos"

### Padrões obrigatórios em cada correção

**Rotas de API:**
```typescript
import { prisma } from "@/lib/prisma"         // único import válido
import { requireUser } from "@/shared/lib/rbac"
import { can, type Role } from "@/shared/lib/rbac-core"
import { logger } from "@/lib/api/logger"     // nunca console.*
import { z } from "zod"

export async function POST(request: NextRequest) {
  const user = await requireUser(request)
  if (!can(user.role as Role, "modulo", "create")) {
    return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 })
  }
  const body = schema.safeParse(await request.json().catch(() => ({})))
  if (!body.success) {
    return NextResponse.json({ error: "Dados inválidos", success: false }, { status: 400 })
  }
  try {
    // lógica
    return NextResponse.json({ data: result, success: true })
  } catch (error) {
    logger.error("[Modulo] Descrição", {}, error)
    return NextResponse.json({ error: "Erro interno", success: false }, { status: 500 })
  }
}
```

**Cores e design:**
```
bg-white, text-gray-700, bg-blue-600  →  bg-card, text-foreground, bg-brand-primary
text-red-600, bg-red-50               →  text-destructive, bg-destructive/10
rounded-lg                            →  rounded-2xl
bg-linear-to-r from-blue-600         →  bg-hero-gradient
```

**Tokens no body JSON → cookies httpOnly:**
```typescript
const response = NextResponse.json({ success: true })
response.cookies.set('tokenName', value, {
  httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: ..., path: '/'
})
return response
```

---

## Fase 4 — Testes

### 4.1 Testes Unitários (Jest)

Para **cada rota de API** do módulo, criar/atualizar `src/__tests__/api/<modulo>/<rota>.test.ts` cobrindo:

| Cenário | Status esperado |
|---------|----------------|
| Body inválido / campos ausentes | 400 |
| Não autenticado (sem cookie) | 401 |
| Role sem permissão | 403 |
| Recurso não encontrado | 404 |
| Rate limit atingido | 429 |
| Fluxo feliz (happy path) | 200/201 |
| Erro interno (Prisma throw) | 500 |

**Padrão de mock obrigatório:**
```typescript
// Mock Prisma — ÚNICO caminho válido
jest.mock('../../../lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    modelName: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    }
  }
}))
```

**Meta mínima**: todos os testes existentes passando + pelo menos happy path + 401 + 403 para cada rota nova.

### 4.2 Testes E2E (Playwright) — cobertura completa

Criar **6 spec files** em `tests/e2e/<modulo>/`.
Cada um tem responsabilidade exclusiva — não duplicar testes entre arquivos.

**Helpers obrigatórios em todos os arquivos:**
```typescript
import { seedAuthenticatedSessionWithMFA } from '../helpers/auth'
import { seedAuthenticatedSessionFromDatabase } from '../helpers/auth'

// Usuários de teste disponíveis (definidos em tests/e2e/helpers/auth.ts)
// qa.admin.clientes@teste.local   → ADMIN    (id: 13)
// qa.gerente@teste.local          → GERENTE  (id: 14)
// qa.financeiro@teste.local       → FINANCEIRO (id: 15)
// qa.estoque@teste.local          → ESTOQUE  (id: 16)
// qa.usuario@teste.local          → USUARIO  (id: 17)
```

---

#### 📄 Spec 1 — `<modulo>-smoke.spec.ts`
**Objetivo**: garantir que as páginas existem, carregam e protegem acesso não autenticado.

```typescript
// Cobrir obrigatoriamente:

// [SMOKE-01] Cada página do módulo carrega sem erro 500/404 (usuário autenticado)
// - GET /<modulo>           → status 200, sem texto "Error" ou "Internal Server"
// - GET /<modulo>/[id]      → status 200 ou redirect válido
// - GET /<modulo>/novo      → status 200 (se existir)

// [SMOKE-02] Redirect sem autenticação
// - Sem cookie → GET /<modulo> redireciona para /login
// - Sem cookie → GET /<modulo>/[id] redireciona para /login

// [SMOKE-03] Título e elementos críticos presentes
// - Página tem <h1> com texto reconhecível do módulo
// - Navegação principal está visível
// - Não há "undefined", "null", "[object Object]" visível na tela

// [SMOKE-04] API routes respondem (não 404)
// - GET /api/<modulo>       → 200 ou 401 (nunca 404 ou 500 em estado limpo)
// - POST /api/<modulo>      → 401 sem auth (nunca 404 ou 500)
```

---

#### 📄 Spec 2 — `<modulo>-crud.spec.ts`
**Objetivo**: verificar todos os fluxos CRUD end-to-end com usuário autenticado como ADMIN.

```typescript
// Cobrir obrigatoriamente (com seedAuthenticatedSessionWithMFA como ADMIN):

// [CRUD-01] Listagem
// - Página carrega lista de registros
// - Paginação funciona (próxima página, página anterior)
// - Filtros funcionam (busca por nome/status/data — o que o módulo tiver)
// - Ordenação funciona (colunas clicáveis)
// - Estado vazio exibido corretamente quando não há registros

// [CRUD-02] Criar registro
// - Formulário de criação abre (botão ou link)
// - Campos obrigatórios validados (submeter vazio → erros inline)
// - Submit com dados válidos → sucesso (toast/banner de confirmação)
// - Novo registro aparece na listagem após criação
// - URL/rota correta após criação (redirect ou permanece com feedback)

// [CRUD-03] Visualizar detalhes
// - Clicar em um registro abre a página de detalhes
// - Todos os campos do registro estão visíveis e legíveis
// - Dados sensíveis mascarados (ex: documentos fiscais mostram apenas últimos 4)
// - Nenhum campo exibe "undefined", "null" ou "[object Object]"

// [CRUD-04] Editar registro
// - Botão/link de edição visível e funcional
// - Formulário pré-populado com dados atuais
// - Alterar um campo e salvar → dados atualizados na tela
// - Cancelar edição não altera os dados originais

// [CRUD-05] Deletar / desativar registro
// - Modal de confirmação aparece antes da ação destrutiva
// - Cancelar no modal → nada acontece
// - Confirmar → registro removido/inativado da lista
// - Toast/banner de confirmação exibido

// [CRUD-06] Fluxo de estados (se o módulo tiver máquina de estados)
// - Transição válida: ex. RASCUNHO → ENVIADO → funciona
// - Transição inválida: ex. CANCELADO → APROVADO → bloqueada com mensagem clara
// - Status correto exibido em badge com cor adequada
```

---

#### 📄 Spec 3 — `<modulo>-rbac.spec.ts`
**Objetivo**: garantir que cada role vê exatamente o que deve ver — nem mais, nem menos.

```typescript
// Para CADA role relevante ao módulo (usar seedAuthenticatedSessionFromDatabase):

// [RBAC-01] ADMIN — acesso total
// - Vê todos os registros
// - Botões de criar, editar, deletar visíveis
// - Todas as abas/seções visíveis

// [RBAC-02] GERENTE — acesso conforme matriz
// - Verificar o que a matriz de permissões define para este módulo
// - Botões que não tem permissão NÃO estão visíveis
// - Se tentar via API diretamente → 403

// [RBAC-03] USUARIO — acesso mínimo
// - Vê apenas o que a matriz permite
// - Não vê seções financeiras/administrativas
// - Tentativa de POST /api/<modulo> sem permissão → 403

// [RBAC-04] CLIENTE (se aplicável)
// - Acesso apenas ao portal, não ao dashboard
// - Tentativa de acessar /<modulo> → redirect para /login ou /403

// [RBAC-05] Visibilidade de botões de ação por role
// Para cada role, verificar que os botões corretos aparecem/somem:
// | Ação       | ADMIN | GERENTE | FINANCEIRO | ESTOQUE | USUARIO |
// |------------|-------|---------|------------|---------|---------|
// | Criar      |  ✅   |   ?     |     ?      |    ?    |    ?    |
// | Editar     |  ✅   |   ?     |     ?      |    ?    |    ?    |
// | Deletar    |  ✅   |   ?     |     ?      |    ?    |    ?    |
// (preencher conforme a matriz do módulo em AGENTS.md §6.6)

// [RBAC-06] API protegida por role (teste direto via page.request)
// Cada role tenta operações além do permitido e recebe 403:
// ex: USUARIO tenta DELETE /api/<modulo>/1 → 403
// ex: ESTOQUE tenta POST /api/<modulo>/financeiro → 403
```

---

#### 📄 Spec 4 — `<modulo>-security.spec.ts`
**Objetivo**: verificar as defesas de segurança diretamente nas APIs.

```typescript
// [SEC-01] Autenticação obrigatória
// - GET /api/<modulo> sem cookie → 401
// - POST /api/<modulo> sem cookie → 401
// - PATCH /api/<modulo>/[id] sem cookie → 401
// - DELETE /api/<modulo>/[id] sem cookie → 401

// [SEC-02] IDOR — não acessar dados de outra empresa
// - Usuário autenticado tenta GET /api/<modulo>/[id_de_outra_empresa] → 403 ou 404
// - Tentativa de PATCH com empresaId diferente no body → ignorado ou 403

// [SEC-03] Validação de input
// - Body completamente vazio → 400 com mensagem de erro
// - Campo numérico com string → 400
// - SQL injection attempt no campo de busca → 400 ou resultado vazio (nunca 500)
// - XSS attempt no campo de texto → salvo como texto literal (não executado)

// [SEC-04] Rate limiting
// - Enviar N+1 requests em sequência rápida → 429 com Retry-After header
// - Verificar que a resposta 429 tem { success: false }

// [SEC-05] Dados sensíveis nunca no response
// - Response de GET /api/<modulo> nunca contém campos: senha, pin, hash, secret, token
// - Se o módulo lida com documentos fiscais: apenas docLast4 visível, nunca o valor completo

// [SEC-06] Headers de segurança (se aplicável)
// - Rotas de dados sensíveis têm Cache-Control: no-store
// - Cookies de sessão são httpOnly (verificar via page.context().cookies())
```

---

#### 📄 Spec 5 — `<modulo>-edge-cases.spec.ts`
**Objetivo**: cobrir casos de borda e comportamentos extremos que costumam quebrar em produção.

```typescript
// [EDGE-01] Dados extremos
// - String com 10.000 caracteres em campo de texto → rejeitado (400) ou truncado
// - Número negativo em campo de quantidade → rejeitado (400)
// - Data no passado distante (ex: 1800-01-01) → rejeitado ou aceito sem quebrar
// - Emoji e caracteres especiais (ñ, ü, 中文, 🔥) em campos de texto → salvo e exibido corretamente
// - Valor monetário com muitas casas decimais (ex: 99.9999) → arredondado corretamente

// [EDGE-02] Concorrência e estado
// - Dois usuários editam o mesmo registro ao mesmo tempo → último salvo sem corromper
// - Duplo clique no botão de submit → apenas 1 registro criado (não duplicado)
// - Submeter formulário e navegar imediatamente → sem estado fantasma

// [EDGE-03] Relacionamentos e dependências
// - Tentar deletar registro com dependências ativas → bloqueado com mensagem clara
// - Tentar criar registro com FK inválida → 400 com mensagem útil
// - Filtrar por relacionamento que não existe → lista vazia (não 500)

// [EDGE-04] Paginação extrema
// - Página 9999 (inexistente) → lista vazia ou redirect para página 1 (nunca 500)
// - pageSize=0 → tratado como 1 ou 10 (nunca divisão por zero)
// - pageSize=1000 → limitado ao máximo permitido (nunca retorna tabela inteira)

// [EDGE-05] Sessão expirada durante uso
// - Sessão expira enquanto usuário preenche formulário
// - Submit → redirect para /login (não 500 silencioso)
// - Após re-login → dados do formulário idealmente preservados ou mensagem clara
```

---

#### 📄 Spec 6 — `<modulo>-regression.spec.ts`
**Objetivo**: um guard de regressão para cada P1 e P2 corrigido na auditoria.
Cada teste previne que o bug volte silenciosamente.

```typescript
// Estrutura padrão para cada guard:
// test('[P1-001] <descrição curta do bug corrigido>', async ({ page }) => {
//   // Reproduzir exatamente o cenário do bug
//   // Verificar que o comportamento correto está presente
//   // Se o bug voltar, este teste vai falhar
// })

// Exemplos de guards comuns:

// [REG-RBAC] Role sem permissão recebe 403 — não 200, não 404
test('[REG-RBAC] USUARIO não consegue deletar via API', async ({ page }) => {
  await seedAuthenticatedSessionFromDatabase(page, 'qa.usuario@teste.local')
  const resp = await page.request.delete('/api/<modulo>/1')
  expect(resp.status()).toBe(403)
  const body = await resp.json()
  expect(body.success).toBe(false)
})

// [REG-AUTH] Rota sensível sem auth retorna 401 — não 200
test('[REG-AUTH] GET /api/<modulo> sem cookie retorna 401', async ({ page }) => {
  const resp = await page.request.get('/api/<modulo>')
  expect(resp.status()).toBe(401)
})

// [REG-SENSIVEL] Response nunca contém campos sensíveis
test('[REG-SENSIVEL] response de GET /api/<modulo> não contém senha ou hash', async ({ page }) => {
  await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/dashboard')
  const resp = await page.request.get('/api/<modulo>')
  const body = await resp.json()
  const bodyStr = JSON.stringify(body)
  expect(bodyStr).not.toMatch(/\"senha\"|\"hash\"|\"pin\"|\"secret\"/)
})

// [REG-PAGINATE] findMany sempre paginado — nunca retorna tabela inteira
test('[REG-PAGINATE] GET /api/<modulo> retorna paginação no response', async ({ page }) => {
  await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/dashboard')
  const resp = await page.request.get('/api/<modulo>')
  const body = await resp.json()
  expect(body.pagination).toBeDefined()
  expect(body.pagination.page).toBeDefined()
  expect(body.pagination.total).toBeDefined()
})

// [REG-SUCCESS] Todas as respostas de erro têm { success: false }
test('[REG-SUCCESS] erro de validação retorna { success: false }', async ({ page }) => {
  await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/dashboard')
  const resp = await page.request.post('/api/<modulo>', { data: {} })
  const body = await resp.json()
  expect(body.success).toBe(false)
})

// + Um guard específico para cada P1/P2 encontrado neste módulo
// Nomear como [P1-001], [P1-002], [P2-001] etc. com descrição do bug original
```

---

### Resumo de cobertura E2E obrigatória

| Spec | Foco | Tests mínimos |
|------|------|--------------|
| `smoke` | Páginas carregam + redirects sem auth | 4 |
| `crud` | Todos os fluxos CRUD end-to-end | 6 |
| `rbac` | Cada role — visibilidade + API | 6 |
| `security` | APIs — auth, IDOR, input, rate limit, data exposure | 6 |
| `edge-cases` | Dados extremos, concorrência, paginação | 5 |
| `regression` | Um guard por P1/P2 corrigido | N (mínimo 5) |
| **Total** | | **≥ 32 testes** |

### 4.3 Validação final

```bash
# Confirmar que todos os testes passam
npx jest "src/__tests__/api/<modulo>" --no-coverage

# Confirmar que não há erros TypeScript nos arquivos alterados
npx tsc --noEmit
```

**Não avançar para a Fase 5 se houver testes failing.**

---

## Fase 5 — Documentação

Criar `docs/modules/<modulo>/01-modulo-<modulo>-completo.md` com as seguintes seções:

### Estrutura da documentação

```markdown
# 📦 MÓDULO [NOME] — GladPros ERP

**Data**: YYYY-MM-DD
**Status**: ✅ Pronto para produção
**Testes**: XX/XX unit + E2E completo

## Resumo Executivo
Tabela: Dimensão | Status | Detalhes

## Estrutura de Arquivos
Árvore de diretórios comentada

## Fluxos do Módulo
Descrição + diagrama de cada fluxo principal (criar, editar, excluir, status)

## Rotas de API
Para cada rota: método, path, auth, RBAC, body (Zod), responses, erros possíveis

## Regras de Negócio
Validações de domínio, máquinas de estado, constraints

## Cobertura de Testes
Tabela: arquivo | testes | o que cobre

## Bugs Corrigidos na Auditoria
Para cada P1/P2: arquivo:linha | problema | risco | correção aplicada

## Guia de Manutenção
Como adicionar nova rota, como adicionar novo campo, helpers disponíveis, como rodar testes

## Checklist de Deploy
Lista de verificações antes de cada deploy do módulo

## Referências
Links para OWASP, RFC relevantes, skills do projeto
```

---

## Resposta final obrigatória do agente

Ao concluir todas as 5 fases, responder com:

### 1. Resumo executivo
- Módulo auditado: `<nome>`
- Problemas encontrados: X P1, Y P2, Z P3
- Problemas corrigidos: X P1, Y P2, Z P3

### 2. Tabela de problemas e correções

| ID | Arquivo | Problema | Risco | Status |
|----|---------|----------|-------|--------|
| P1-001 | `path/file.ts:linha` | Descrição | Crítico | ✅ Corrigido |
| ... | | | | |

### 3. Testes
- Unitários: XX/XX passando
- E2E: X spec files criados
- Regression guards: X (um por P1/P2)

### 4. Arquivos modificados
Lista completa com caminhos absolutos

### 5. Checklist de produção

- [ ] Nenhum `console.*` em `src/app/api/<modulo>/`
- [ ] Todos os testes passando
- [ ] Nenhuma cor hardcoded
- [ ] `requireUser()` em todas as rotas
- [ ] `can()` em todas as mutações
- [ ] Zod em todos os inputs
- [ ] Documentação criada em `docs/modules/<modulo>/`
- [ ] Regression guards em `tests/e2e/<modulo>/<modulo>-regression.spec.ts`

### 6. O que não foi corrigido (e por quê)
Se algum P3 foi deixado para depois, documentar aqui com justificativa.

---

## Fase 6 — Commit (obrigatório ao final)

Após todas as fases concluídas e checklist verificado, fazer **dois commits cirúrgicos**:

### Commit 1 — correções e testes

```bash
git add \
  src/app/api/<modulo>/**/*.ts \
  src/app/(dashboard)/<modulo>/**/*.tsx \
  src/components/<modulo>/**/*.tsx \
  src/shared/lib/<arquivos-novos>.ts \
  src/__tests__/api/<modulo>/**/*.test.ts

git commit -m "fix(<modulo>): varredura completa — segurança, bugs e testes

Vulnerabilidades corrigidas:
- [P1-001] <descrição>
- [P1-002] <descrição>
- [P2-001] <descrição>

Bugs corrigidos:
- <descrição curta de cada bug>

Testes:
- <rota>.test.ts: X/X passando
- Total: XX/XX testes unitários passando

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Commit 2 — E2E e documentação

```bash
git add \
  tests/e2e/<modulo>/*.spec.ts \
  docs/modules/<modulo>/01-modulo-<modulo>-completo.md

git commit -m "feat(<modulo>): E2E completo e documentação

E2E — 6 spec files em tests/e2e/<modulo>/:
- <modulo>-smoke.spec.ts: X testes
- <modulo>-crud.spec.ts: X testes
- <modulo>-rbac.spec.ts: X testes
- <modulo>-security.spec.ts: X testes
- <modulo>-edge-cases.spec.ts: X testes
- <modulo>-regression.spec.ts: X guards (um por P1/P2)

Documentação:
- docs/modules/<modulo>/01-modulo-<modulo>-completo.md

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Confirmar que está no repositório

```bash
git log --oneline -3
```

> ✅ Com os dois commits feitos, tudo está registrado no histórico do repositório.
> Para enviar ao remoto (GitHub): `git push`
