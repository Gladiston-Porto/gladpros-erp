# Módulo Clientes — Atualização 2026-05-05

**Tipo**: Novas funcionalidades + correções de qualidade  
**Status**: ✅ Aplicado

---

## O que foi feito

### 1. ZIP Auto-fill (Feature nova)

**Objetivo**: Reduzir atrito no cadastro de clientes, preenchendo cidade e estado automaticamente ao digitar o CEP americano.

**Fluxo**:
1. Usuário digita o ZIP no campo `addressZip` e sai do campo (blur)
2. O frontend normaliza para 5 dígitos e chama `GET /api/clientes/zip-lookup?zip=XXXXX`
3. O backend chama `zippopotam.us` (API pública gratuita, sem autenticação) com cache em memória
4. Se encontrado, `addressCity` e `addressState` são auto-preenchidos — **somente se cidade estiver vazia**
5. Se cidade já estiver preenchida, o auto-fill é ignorado (preserva edição manual)

**Arquivos criados**:
- `src/lib/validation/zip-lookup.ts` — helper `lookupZip()` com cache `Map`, timeout 2.5s, falha silenciosa
- `src/app/api/clientes/zip-lookup/route.ts` — `GET` autenticado com `requireClientePermission('canRead')`, `apiRateLimit` e `withErrorHandler`

**Arquivos modificados**:
- `src/components/clientes/ClienteForm.tsx` — `handleZipBlur()` com `AbortController`, estados `zipLookupStatus` (`idle | loading | found | notfound`), ícones `Loader2` / `CheckCircle`

**Limitações documentadas**:
- Cache in-memory é por instância de processo; em produção com múltiplas instâncias cada uma mantém seu próprio cache. Aceitável — a API externa é pública e rápida.
- ZIP+4 (`75201-1234`) é aceito no campo; `lookupZip` normaliza internamente para 5 dígitos.

---

### 2. Correções de acessibilidade em `ClienteDetailsModal.tsx`

**Problema**: 3 botões interativos sem `aria-label`, violando WCAG 2.1 AA (ponto 15 do checklist de auditoria).

**Correção aplicada**:

| Botão | `aria-label` adicionado |
|---|---|
| Botão de editar cliente | `"Editar Cliente"` |
| Botão de inativar/ativar cliente | `"Inativar Cliente"` |
| Botão de fechar modal | `"Fechar"` |

---

### 3. EmptyState visual na lista de clientes

**Problema**: Quando a lista de clientes retornava zero resultados (busca sem match ou empresa nova), a tabela ficava vazia sem feedback visual adequado.

**Correção aplicada** em `src/app/(dashboard)/clientes/lista/page.tsx`:

```tsx
{data.length === 0 ? (
  <EmptyState
    icon={<Users className="w-8 h-8 text-muted-foreground" />}
    title="Nenhum cliente encontrado"
    description="Tente ajustar os filtros ou cadastre um novo cliente."
  />
) : (
  <ClientesTable ... />
)}
```

---

### 4. Bug fix: erros de autenticação no `zip-lookup/route.ts`

**Problema crítico (já corrigido nesta sessão)**: A versão original do endpoint usava `try/catch` genérico que engolia erros `UNAUTHENTICATED` e `FORBIDDEN`, retornando `{ data: null, success: true }` com status 200 — violação de segurança e de contrato da API.

**Correção**: Substituído por `withErrorHandler` (padrão do módulo), que propaga erros de auth corretamente:
- `UNAUTHENTICATED` → 401
- `FORBIDDEN` → 403

---

### 5. Rate-limit no `zip-lookup/route.ts`

**Problema**: O endpoint `GET /api/clientes/zip-lookup` estava sem controle de rate-limit, enquanto todas as outras rotas do módulo (ex: `similar/route.ts`) usam `apiRateLimit`.

**Correção**: Adicionado `apiRateLimit.isAllowed(request)` como primeira verificação, retornando 429 quando excedido — antes mesmo de verificar auth. Também adicionado `export const runtime = 'nodejs'` para consistência com as demais rotas.

---

## Cobertura de testes

| Arquivo | Testes adicionados |
|---|---|
| `src/__tests__/api/clientes/zip-lookup.route.test.ts` | +1 (rate-limit 429) + mock `apiRateLimit` adicionado |
| `src/__tests__/components/clientes/ClienteForm.test.tsx` | +5 (auto-fill, não sobrescreve, sem fetch < 5 dígitos, notfound, erro de rede) |
| `tests/e2e/clientes/clientes-crud.spec.ts` | +1 (ZIP auto-fill E2E com zippopotam.us real) |

---

## Checklist final do módulo

| Check | Resultado |
|---|---|
| Auth em todas as rotas | ✅ |
| RBAC com `can()` / `requireClientePermission` | ✅ |
| Rate-limit em todas as rotas | ✅ (gap corrigido nesta sessão) |
| Prisma import correto (`@/lib/prisma`) | ✅ |
| Sem mock data em produção | ✅ |
| `empresaId: 1` single-tenant documentado | ✅ |
| Moeda USD (`en-US`) | ✅ |
| Datas em `America/Chicago` | ✅ |
| Suspense / skeleton em pages assíncronas | ✅ |
| Loading state nos componentes | ✅ |
| EmptyState nas listas | ✅ (gap corrigido nesta sessão) |
| Error handling com mensagens amigáveis | ✅ |
| Paginação em listas longas | ✅ |
| Zero `console.log` em produção | ✅ |
| Acessibilidade (`aria-label`, touch targets) | ✅ (gap corrigido nesta sessão) |
| Lint zero warnings | ✅ |
| TypeScript zero erros | ✅ |
| Testes unitários passando | ✅ |
