# Projetos — Plano de Auditoria e Hardening para Production Readiness

**Status:** Plano de execucao antes da auditoria profunda
**Base:** `docs/architecture/11-operational-system-map.md`, `docs/architecture/12-sidebar-and-module-hardening-decisions.md`, `docs/architecture/06-production-readiness.md`
**Objetivo:** auditar o modulo Projetos como elo central entre Propostas, Estoque, OS, Invoices, Financeiro e Portal.

Este documento nao declara o modulo Projetos como production-ready. Ele define como a auditoria deve ser feita para evitar nova falsa certificacao.

## 1. Por que Projetos vem primeiro

Projetos e o ponto onde o ERP deixa de ser comercial e passa a ser execucao operacional.

Fluxo critico:

```text
Cliente -> Proposta aprovada -> Projeto -> Materiais/Estoque -> Invoice -> Financeiro
```

Se Projetos estiver errado, os problemas se espalham para:

- estoque reservado/consumido;
- custos reais;
- invoices;
- faturamento por etapa;
- service orders vinculadas;
- portal do cliente;
- relatorios e financeiro.

## 2. Escopo de arquivos

### 2.1 Pages

| Area | Arquivos principais |
|---|---|
| Lista | `src/app/(dashboard)/projetos/page.tsx`, `ProjetosClient.tsx` |
| Criacao | `src/app/(dashboard)/projetos/novo/page.tsx` |
| Detalhe | `src/app/(dashboard)/projetos/[id]/page.tsx` |
| Edicao | `src/app/(dashboard)/projetos/[id]/editar/page.tsx` |
| Relatorios | `src/app/(dashboard)/projetos/relatorios/page.tsx` |

### 2.2 APIs

Familias principais:

- `src/app/api/projetos/route.ts`
- `src/app/api/projetos/[id]/route.ts`
- `src/app/api/projetos/[id]/status/route.ts`
- `src/app/api/projetos/[id]/etapas/*`
- `src/app/api/projetos/[id]/tarefas/*`
- `src/app/api/projetos/[id]/materiais/*`
- `src/app/api/projetos/[id]/materiais-estoque/*`
- `src/app/api/projetos/[id]/materials/recompute/*`
- `src/app/api/projetos/[id]/movimentacoes/*`
- `src/app/api/projetos/[id]/anexos/*`
- `src/app/api/projetos/[id]/historico/*`
- `src/app/api/projetos/[id]/financeiro/*`
- `src/app/api/projetos/[id]/invoices/gerar/route.ts`
- `src/app/api/projetos/[id]/service-orders/route.ts`
- `src/app/api/projetos/dashboard/route.ts`
- `src/app/api/projetos/relatorios/export/route.ts`

### 2.3 Dominio e servicos

Auditar:

- `src/domains/projects/services/*`
- `src/domains/projects/gateways/*`
- `src/domains/projects/events/*`
- `src/domains/projects/validators*`
- `src/shared/lib/rbac-projects*`
- `src/lib/projetos/*`

### 2.4 Testes existentes

E2E/API encontrados:

- `tests/e2e/projetos-etapas.spec.ts`
- `tests/e2e/projetos-validation.spec.ts`
- `tests/e2e/api/projetos-subrecursos.spec.ts`
- `tests/e2e/api/projetos-anexos-dashboard.spec.ts`
- `tests/e2e/api/projetos-auth-rbac.spec.ts`
- `tests/e2e/api/projetos-crud.spec.ts`
- `tests/e2e/projetos/projetos-edge-cases.spec.ts`
- `tests/e2e/projetos/projetos-regression.spec.ts`
- `tests/e2e/projetos/projetos-security.spec.ts`
- `tests/e2e/projetos/projetos-crud.spec.ts`
- `tests/e2e/projetos/projetos-smoke.spec.ts`
- `tests/e2e/projetos/projetos-rbac.spec.ts`

Unitario identificado:

- `src/app/api/projetos/[id]/materials/recompute/__tests__/route.test.ts`

## 3. Riscos preliminares ja observados

Estes achados sao sinais para auditoria, nao resultado final.

| Prioridade | Evidencia | Risco |
|---|---|---|
| P1/P2 | `src/app/api/projetos/[id]/status/route.ts` tem `import {  } from 'zod'` e resposta de erro fora do formato padrao | Possivel falha de qualidade/formatacao e padrao API |
| P2 | `src/app/api/projetos/route.ts` retorna listagem sem `success: true` | Divergencia do contrato padrao de API |
| P2 | `src/app/(dashboard)/projetos/page.tsx` usa contagens sem `empresaId` | Risco de inconsistencia com regra single-tenant e padrao de query |
| P2 | Documentacao antiga declara `100% completo` e cita mocks/event handlers antigos | Risco de falso readiness por documentacao historica |
| P2 | Projeto -> Invoice usa gateway proprio (`/invoices/gerar`) | Precisa validar contra regras atuais de invoice, double billing e ledger |
| P2 | Materiais/estoque possuem varias rotas paralelas (`materiais`, `materiais-estoque`, `materials/recompute`) | Risco de regra duplicada ou divergente |

## 4. Checklist oficial a aplicar

A auditoria deve aplicar os 15 pontos do `module-audit`:

| # | Gate | O que verificar em Projetos |
|---|---|---|
| 1 | Auth | Toda API sensivel chama auth/permission helper antes da operacao |
| 2 | RBAC | `can()` ou helper equivalente cobre read/create/update/delete/status/material/financeiro |
| 3 | Sidebar | Projetos aparece somente para roles com `projetos:read` |
| 4 | Prisma import | Apenas `@/lib/prisma` |
| 5 | Mock data | Sem mock/fake em pages, APIs, services ou event handlers ativos |
| 6 | empresaId | Queries filtram empresa de forma consistente |
| 7 | Currency | USD/en-US, sem BRL/R$ |
| 8 | Timezone | America/Chicago para exibicao e comparacoes de prazo |
| 9 | Suspense | Pages async com fallback apropriado |
| 10 | Loading | Client components com loading real |
| 11 | Empty State | Listas vazias com estado visual |
| 12 | Error Handling | APIs e UI com mensagens claras e formato padrao |
| 13 | Pagination | Listagens paginadas/capadas |
| 14 | Console | Sem debug logs em producao |
| 15 | Accessibility | Aria-label, touch targets, contraste |

## 5. Gates de negocio especificos de Projetos

### 5.1 Proposta -> Projeto

Validar:

1. somente proposta `APROVADA` gera projeto;
2. `propostaId` no Projeto e `projetoId` na Proposta ficam consistentes;
3. nao ha duplicidade de projeto para a mesma proposta;
4. cancelamento posterior da proposta fica bloqueado ou tem rollback explicito.

### 5.2 State machine de Projeto

Validar transicoes:

```text
PLANEJADO -> EM_EXECUCAO -> EM_INSPECAO -> CONCLUIDO -> ARQUIVADO
```

E excecoes:

- suspender;
- cancelar;
- rejeitar inspecao voltando para execucao;
- bloquear transicoes a partir de terminal state.

Cada transicao deve ter:

- permissao;
- pre-condicao;
- audit log/historico;
- resposta de erro clara;
- teste.

### 5.3 Projeto -> Estoque

Validar:

1. reserva antes do consumo;
2. consumo gera movimentacao real;
3. devolucao retorna saldo;
4. nao permite consumir estoque reservado para outro projeto/OS;
5. status dos materiais (`RESERVADA`, `UTILIZADA`, `DEVOLVIDA` ou equivalente) e consistente.

### 5.4 Projeto -> Invoice

Validar:

1. invoice so e gerada conforme gatilho de faturamento;
2. invoice nao duplica cobranca de OS vinculada;
3. valores incluem proposta, materiais, change orders e descontos corretamente;
4. permissao minima para gerar invoice respeita `invoices:create`/financeiro atual;
5. status inicial e contrato seguem modulo Invoices;
6. ledger/financeiro e integrado pelo fluxo correto, nao por atalho.

### 5.5 Projeto -> Financeiro

Validar:

- custos de materiais;
- despesas vinculadas;
- purchase orders;
- resumo financeiro mascarado por role;
- queries sem dados excessivos;
- exports seguros.

### 5.6 Projeto -> Portal

Validar:

- CLIENTE ve apenas seus projetos;
- documentos/anexos publicos sao filtrados;
- invoices exibidas pertencem ao cliente;
- token/portal nao bypassa RBAC interno.

## 6. Testes obrigatorios para fechar P1/P2

| Fluxo | Teste esperado |
|---|---|
| Proposta aprovada gera projeto | Deve criar vinculo bidirecional e impedir duplicidade |
| Proposta nao aprovada | Deve bloquear geracao de projeto |
| Status invalido | Deve retornar erro claro e nao alterar projeto |
| Projeto concluido/arquivado | Deve bloquear edicoes estruturais indevidas |
| Reserva/consumo material | Deve refletir estoque e movimentacao |
| Devolucao material | Deve restaurar saldo e historico |
| Invoice de projeto | Deve respeitar permissao e gatilho |
| OS vinculada | Deve impedir double billing |
| Financeiro mascarado | USUARIO/ESTOQUE nao ve valores restritos |
| Portal cliente | Cliente nao acessa projeto de outro cliente |

## 7. Ordem de execucao da auditoria

1. Inventariar APIs, services e state machines reais.
2. Rodar testes existentes de Projetos para baseline.
3. Aplicar checklist 15 pontos.
4. Aplicar gates de negocio deste documento.
5. Classificar achados P1/P2/P3.
6. Corrigir P1 primeiro.
7. Corrigir P2 de integridade/RBAC/performance.
8. Criar regressao para cada P1/P2 corrigido.
9. Atualizar documentacao de status do modulo.
10. So entao decidir se Projetos pode ser certificado.

## 8. Criterio de saida

Projetos so pode ser marcado como Production Ready quando:

1. nenhum P1/P2 estiver aberto;
2. Proposta -> Projeto estiver coberto;
3. Projeto -> Estoque estiver coberto;
4. Projeto -> Invoice/Financeiro estiver coberto;
5. Portal/cliente estiver protegido;
6. state machine estiver testada;
7. regressao existir para todo bug corrigido;
8. `npm run check` ou validação equivalente passar sem falhas do escopo.

## 9. Proximo passo

Quando a auditoria iniciar, o primeiro comando de trabalho deve ser baseline:

```bash
npx jest src/app/api/projetos/[id]/materials/recompute/__tests__/route.test.ts --runInBand
npx playwright test tests/e2e/projetos/projetos-smoke.spec.ts --project=chromium --config playwright.config.ts
```

Depois disso, a auditoria deve seguir pelos endpoints de estado, materiais e invoice, pois eles concentram o risco cross-module.
