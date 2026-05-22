---
name: definition-of-done
description: "Use para verificar se uma feature, bug fix ou módulo está realmente pronto. Cobre os critérios de DoD para o GladPros ERP em 3 níveis: feature, bug fix e módulo."
---

# Skill: Definition of Done (DoD)

## O Problema

No GladPros, "pronto" foi declarado prematuramente múltiplas vezes:
- Módulo `usuarios` teve 4 ciclos de auditoria porque a certificação v1/v2/v3 foi declarada sem evidência real
- Bugs foram marcados FIXED sem teste de regressão — e voltaram
- Features foram mergeadas com RBAC incompleto (rotas sub-path esquecidas)

Esta skill define quando algo é **realmente** pronto.

---

## Nível 1: DoD para Bug Fix

Um bug só pode ser marcado **FIXED** quando:

- [ ] O patch está no código — grep no arquivo/linha confirma
- [ ] O patch cobre **todos** os sub-paths afetados (não só o principal)
- [ ] Existe teste de regressão com tag `// @bug:[ID]`
- [ ] O teste passa: `npm test -- --testPathPattern="[BUG-ID]"`
- [ ] `relatorios/known-bugs.json` tem `regressionTest` preenchido
- [ ] Existe regra Semgrep para detectar regressão (se bug de segurança/invariante)
- [ ] `node scripts/check-module-health.mjs --module=[modulo]` retorna verde

**Nenhum desses passos pode ser pulado.** Se pular → bug vai voltar.

---

## Nível 2: DoD para Feature Nova

Uma feature está **pronta** quando:

### Backend
- [ ] Auth: `requireUser()` na primeira linha de todos os handlers
- [ ] RBAC: `can(role, modulo, acao)` antes de CREATE/UPDATE/DELETE
- [ ] Validação: `zod.safeParse()` em todo body recebido
- [ ] Resposta: formato padrão `{ data, success }` ou `{ error, message, success }`
- [ ] Prisma: importado de `@/lib/prisma`
- [ ] empresaId: filtrado nas queries, nunca hardcoded
- [ ] Paginação: `take` + `skip` em toda listagem
- [ ] Sem N+1: sem `await` dentro de `.map()` sem `Promise.all`
- [ ] Campos filtráveis têm `@@index` no schema Prisma
- [ ] AuditLog criado para ações críticas

### Frontend
- [ ] Verificação RBAC antes de renderizar elementos sensíveis
- [ ] Estado de loading (skeleton/spinner)
- [ ] Estado vazio (EmptyState)
- [ ] Estado de erro com mensagem útil
- [ ] Datas no timezone `America/Chicago`
- [ ] Moeda em `en-US` / USD
- [ ] Sem cores hardcoded (usar variáveis CSS)
- [ ] Touch targets ≥ 48px (tablet-first)
- [ ] `aria-label` em elementos interativos

### Qualidade
- [ ] Sem `console.log` em código de produção
- [ ] Sem `TODO` ou `FIXME` sem issue associada
- [ ] Sem `.only` em testes (`eslint-plugin-no-only-tests` cobre isso)
- [ ] `npm run lint` retorna zero warnings
- [ ] `npm run type-check` sem erros
- [ ] `npm test` passa sem falhas

---

## Nível 3: DoD para Módulo (Production Ready)

Um módulo está **Production Ready** quando:

### Prerequisitos
- [ ] Todos os P1 e P2 estão com status FIXED
- [ ] Todo FIXED tem teste de regressão
- [ ] `node scripts/certify-module.mjs --module=[nome]` retorna exit code 0

### Gates (todos devem passar)

#### Gate 1 — Segurança
- [ ] Nenhuma rota sem auth
- [ ] Nenhuma rota sensível sem RBAC
- [ ] Nenhum IDOR (empresaId em todo findUnique/findFirst sensível)
- [ ] Dados sensíveis mascarados/criptografados
- [ ] Sem imports legados

#### Gate 2 — Lógica de Negócio
- [ ] Todos os estados do módulo estão implementados
- [ ] Transições de estado validadas (não pode pular etapas)
- [ ] Regras de negócio do AGENTS.md implementadas
- [ ] Integração com outros módulos funciona (proposta→projeto, etc.)

#### Gate 3 — Testes
- [ ] Cobertura ≥ threshold do módulo em `config/jest.config.js`
- [ ] Testes de regressão para todos os bugs FIXED
- [ ] Testes E2E para o happy path principal
- [ ] `npm test` passa completamente

#### Gate 4 — Performance
- [ ] Sem N+1 queries
- [ ] Toda listagem paginada
- [ ] Campos filtráveis com índice no schema
- [ ] Queries paralelas onde possível

#### Gate 5 — UX
- [ ] Loading, empty e error states em todas as páginas
- [ ] Responsivo (tablet-first)
- [ ] Dark mode funcional
- [ ] Acessibilidade básica

---

## O que NÃO é DoD

- ✗ "Funciona no meu computador"
- ✗ "Build passou sem erros"
- ✗ "Testei manualmente o happy path"
- ✗ "O fluxo principal funciona"
- ✗ "Ciclo anterior auditou e estava OK"

---

## Como Verificar Antes de Declarar Pronto

```bash
# Para bug fix
npm test -- --testPathPattern="[BUG-ID]" --verbose
grep -n "tokenVersion\|can(\|empresaId" [arquivo-corrigido]
node scripts/check-module-health.mjs

# Para feature nova  
npm run lint
npm run type-check
npm test

# Para módulo Production Ready
node scripts/certify-module.mjs --module=[nome]
```

---

## Classificações Finais de Módulo

| Status | Critério |
|--------|----------|
| **Production Ready** | Zero P1/P2 abertos, todos FIXED com teste, certify-module verde |
| **Conditionally Ready** | Zero P1, P2 documentado e mitigado para uso controlado |
| **Not Ready** | Qualquer P1/P2 aberto ou FIXED sem teste |
| **Needs Re-Audit** | Mudança significativa desde última auditoria, ou auditoria >90 dias |
