# Projetos — Plano de Auditoria e Hardening para Production Readiness

**Status:** Plano de execucao antes da auditoria profunda
**Base:** `docs/architecture/11-operational-system-map.md`, `docs/architecture/12-sidebar-and-module-hardening-decisions.md`, `docs/architecture/06-production-readiness.md`
**Objetivo:** auditar o modulo Projetos como elo central entre Propostas, Estoque, OS, Invoices, Financeiro e Portal.

Este documento nao declara o modulo Projetos como production-ready. Ele define como a auditoria deve ser feita para evitar nova falsa certificacao.

## 0. Postura obrigatoria de co-producao

O agente responsavel por Projetos deve atuar como **co-produtor tecnico e engenheiro-chefe do modulo**, nao apenas como executor de correcao.

Isso significa:

1. questionar regras que funcionam tecnicamente, mas prejudicam caixa, margem, operacao, seguranca ou confiabilidade;
2. impedir certificacao "production-ready" se o modulo ainda nao protege a empresa contra prejuizo;
3. propor melhorias estruturais quando o sistema estiver apenas registrando dados, mas nao orientando decisao;
4. tratar Projetos como centro de comando da obra, nao como cadastro com abas;
5. trazer para discussao qualquer decisao de negocio que possa travar operacao, duplicar cobranca, esconder risco financeiro ou permitir perda de margem.

Principio de produto:

> Projetos deve proteger a GladPros contra prejuizo, orientar a equipe sobre a proxima acao e dar confianca operacional como uma engrenagem de relogio suico.

O modulo deve responder diariamente:

- estamos ganhando ou perdendo dinheiro neste projeto?
- o custo real esta coerente com o progresso real?
- a mao de obra esta lenta, cara ou mal alocada?
- materiais estao planejados, reservados, usados, devolvidos e cobrados corretamente?
- precisamos cobrar o cliente agora para nao financiar a obra com caixa da empresa?
- alguma OS esta destruindo a margem do projeto?
- o prazo esta em risco antes do atraso oficial?
- qual acao o gerente deve tomar hoje?

Se a resposta para essas perguntas nao estiver suportada por dados reais, alertas e recomendacoes, o modulo ainda nao esta production-ready.

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

1. invoice e gerada conforme tipo de faturamento, nao apenas por status final do projeto;
2. invoice final (`FINAL`) so e permitida quando o projeto estiver concluido ou formalmente aprovado para encerramento;
3. invoices parciais sao permitidas antes da conclusao para proteger caixa e operacao;
4. invoice nao duplica cobranca de OS vinculada, marco, material ou deposito ja faturado;
5. valores incluem proposta, materiais, change orders, descontos, invoices anteriores e pagamentos corretamente;
6. permissao minima para gerar invoice respeita `invoices:create`/financeiro atual;
7. status inicial e contrato seguem modulo Invoices;
8. ledger/financeiro e integrado pelo fluxo correto, nao por atalho.

Tipos obrigatorios de billing para Projetos:

| Tipo | Quando usar | Regra central |
|---|---|---|
| `DEPOSIT` | Entrada / down payment | Pode ocorrer apos proposta aprovada ou projeto criado |
| `PROGRESS` | Cobranca por avanco percentual | Pode ocorrer durante execucao, com descricao e base de calculo |
| `MILESTONE` | Cobranca por marco/etapa | Exige marco identificado para evitar duplicidade |
| `MATERIALS` | Reembolso/cobranca de materiais | Deve marcar ou referenciar materiais ja cobrados |
| `SERVICE_ORDER` | OS especifica | Deve bloquear segunda invoice ativa para a mesma OS |
| `FINAL` | Fechamento do projeto | Exige projeto concluido e deve abater/considerar valores ja faturados |

Regra de produto:

> Bloquear double billing e correto; bloquear todo faturamento antes do projeto concluido e incorreto para obras grandes, pois pode forcar a empresa a financiar operacao com caixa proprio.

### 5.5 Projeto -> Financeiro

Validar:

- custos de materiais;
- despesas vinculadas;
- purchase orders;
- resumo financeiro mascarado por role;
- queries sem dados excessivos;
- exports seguros.

### 5.7 Project Health Engine

Projetos precisa de um motor central de saude operacional/financeira no backend. Calculos soltos em UI nao sao suficientes para production readiness.

O motor deve consolidar:

1. dados do Projeto;
2. OS vinculadas;
3. horas de `TimesheetEntry` e `WorkEntry`;
4. materiais planejados, reservados, emitidos, consumidos, devolvidos, perdidos e comprados;
5. despesas (`Expense`);
6. purchase orders/solicitacoes de compra;
7. invoices emitidas;
8. pagamentos recebidos;
9. progresso de etapas;
10. datas previstas/reais.

Metricas obrigatorias:

| Metrica | Objetivo |
|---|---|
| `budgetUsedPct` | Quanto do custo previsto ja foi consumido |
| `actualCost` | Custo real consolidado |
| `estimatedAtCompletion` | Custo projetado no final se continuar no ritmo atual |
| `projectedMarginPct` | Margem esperada no final |
| `laborPlannedHours` / `laborActualHours` | Controle de mao de obra |
| `laborBurnRate` | Velocidade/custo de consumo de horas |
| `materialPlannedCost` / `materialActualCost` | Controle de material |
| `materialVariance` | Desvio de material planejado vs usado/comprado |
| `scheduleVariance` | Risco de prazo |
| `billingCoverage` | Percentual do custo atual coberto por invoices/pagamentos |
| `cashGap` | Valor que a empresa esta financiando do proprio caixa |
| `riskScore` | `OK`, `WARNING`, `ALERT`, `CRITICAL`, `LOSS` |

Alertas obrigatorios:

| Alerta | Condicao |
|---|---|
| `BUDGET_WARNING` | custo atual >= 80% do custo previsto |
| `BUDGET_LIMIT` | custo atual >= 100% |
| `PROJECTED_LOSS` | margem projetada <= 0 |
| `LABOR_SLOWDOWN` | horas consumidas acima do esperado para o progresso |
| `MATERIAL_OVERRUN` | material usado/comprado acima do planejado |
| `CASH_GAP` | custo atual > valor recebido |
| `INVOICE_NEEDED` | billing coverage insuficiente para cobrir operacao |
| `SCHEDULE_RISK` | progresso abaixo do esperado pela data |
| `OS_MARGIN_RISK` | OS vinculada em `ALERT`, `CRITICAL` ou `LOSS` |

O retorno do motor deve incluir nao so numeros, mas tambem recomendacoes:

```ts
{
  riskScore: "ALERT",
  alerts: [...],
  recommendations: [
    "Emitir progress invoice para cobrir cash gap atual",
    "Revisar horas da etapa Rough-in",
    "Verificar material acima do planejado em OS-123"
  ]
}
```

Sem esse motor, Projetos ainda e apenas controle administrativo parcial, nao centro de comando operacional.

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
8. Corrigir billing parcial antes da padronizacao final de APIs.
9. Criar Project Health Engine antes da certificacao final.
10. Criar alertas e recomendacoes acionaveis.
11. Atualizar UI para mostrar saude, riscos e proxima acao.
12. Padronizar APIs somente depois dos contratos de negocio corretos.
13. Criar regressao para cada P1/P2 corrigido.
14. Atualizar documentacao de status do modulo.
15. So entao decidir se Projetos pode ser certificado.

## 8. Criterio de saida

Projetos so pode ser marcado como Production Ready quando:

1. nenhum P1/P2 estiver aberto;
2. Proposta -> Projeto estiver coberto;
3. Projeto -> Estoque estiver coberto;
4. billing parcial e invoice final estiverem separados por tipo, com anti-duplicidade;
5. Project Health Engine consolidar custo, mao de obra, material, prazo, billing e risco com dados reais;
6. alertas e recomendacoes acionaveis estiverem implementados;
7. Projeto -> Invoice/Financeiro estiver coberto;
8. Portal/cliente estiver protegido;
9. state machine estiver testada;
10. regressao existir para todo bug corrigido;
11. `npm run check` ou validacao equivalente passar sem falhas do escopo.

## 9. Proximo passo

Quando a auditoria iniciar, o primeiro comando de trabalho deve ser baseline:

```bash
npx jest src/app/api/projetos/[id]/materials/recompute/__tests__/route.test.ts --runInBand
npx playwright test tests/e2e/projetos/projetos-smoke.spec.ts --project=chromium --config playwright.config.ts
```

Depois disso, a auditoria deve seguir pelos endpoints de estado, materiais e invoice, pois eles concentram o risco cross-module.
