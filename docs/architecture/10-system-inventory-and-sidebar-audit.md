# Inventario do Sistema e Auditoria da Sidebar — Itens 1 a 5

**Status:** Levantamento inicial concluido; primeira correcao do item 6 executada
**Escopo:** paginas, APIs, sidebar, RBAC, documentacao, testes e classificacao preliminar dos modulos
**Proximo passo:** discutir estrategia de execucao antes de alterar comportamento

Este documento consolida os itens 1 a 5 definidos em `docs/architecture/09-system-inventory-and-sidebar-audit-plan.md`.

Nao houve implementacao de sidebar ou mudanca funcional neste levantamento.

## Sumario executivo

O sistema possui base ampla e varios modulos com UI, API, documentacao e testes. O principal problema encontrado nesta etapa nao e falta de funcionalidades isoladas, mas desalinhamento entre:

- sidebar atual;
- mapa RBAC real;
- status de maturidade dos modulos;
- documentacao antiga;
- testes unitarios/E2E existentes;
- organizacao operacional esperada.

O achado mais importante antes de qualquer redesenho visual e que a filtragem da sidebar possui riscos de permissao por causa do mapeamento de rotas.

## Item 1 — Inventario real do sistema

### 1.1 Totais levantados

Levantamento por arquivos atuais:

| Tipo | Total encontrado |
|---|---:|
| Pages `src/app/**/page.tsx` | 120 |
| API routes `src/app/api/**/route.ts` | 291 |
| Testes unitarios/integrados em `src/**/*.test.*` | 153 |
| Specs E2E em `tests/e2e/**/*.spec.ts` | 63 |
| Documentos de modulo em `docs/modules/**/*.md` | 57 |

> Observacao: os numeros por modulo sao aproximados por path/nome. Eles servem para inventario inicial, nao como auditoria final de cobertura.

### 1.2 Modulos principais com pages no dashboard

Rotas principais encontradas em `src/app/(dashboard)`:

| Area | Existe page? | Observacao |
|---|---:|---|
| Dashboard | Sim | `/dashboard` |
| Clientes | Sim | `/clientes`, detalhe, novo, lista, relatorios, config |
| Propostas | Sim | `/propostas`, lista, nova, detalhe, relatorios |
| Projetos | Sim | `/projetos`, novo, detalhe, editar, relatorios |
| Service Orders | Sim | `/ordens-servico`, lista, nova, detalhe, relatorios |
| Estoque | Sim | modulo extenso: materiais, equipamentos, compras, movimentacoes, alertas, solicitacoes, relatorios |
| Invoices | Sim | lista, novo, detalhe, edit, relatorios |
| Financeiro | Sim | existe em `src/app/dashboard/financeiro/*` e tambem `src/app/(dashboard)/financeiro/relatorios` |
| Usuarios | Sim | lista, novo, detalhe |
| RH/Workers | Sim | `/rh`, `/rh/workers`, relatorios |
| Documentos | Sim | `/documentos` |
| Aprovacoes | Sim | `/aprovacoes`, detalhe, regras |
| Relatorios | Sim | `/relatorios`, financeiro executivo |
| Configuracoes | Sim | geral, seguranca, email, backup, categorias, health |
| Admin | Sim | eventos, integracao |
| Notificacoes | Sim | `/notificacoes` |
| Perfil | Sim | `/perfil` |

### 1.3 Familias de API identificadas

Top-level em `src/app/api`:

| Familia API | Observacao preliminar |
|---|---|
| `auth` | auth/login/MFA/reset/session |
| `usuarios` | usuarios, sessoes, security, auditoria, export |
| `clientes` / `clients` | clientes, similar, historico, export, bulk |
| `propostas` | propostas, materiais, etapas, assinatura, export, crons |
| `projetos` | projetos, materiais, etapas, tarefas, financeiro, portal, closeout |
| `service-orders` | OS, materiais, anexos, invoices, duplicacao, reimbursement |
| `estoque` | materiais, equipamentos, compras, movimentacoes, inventario, relatorios, solicitacoes |
| `invoices` | invoices, payments, send, pdf, stats |
| `financeiro` | receitas, despesas, contas, fiscal, compensacao |
| `reports` / `analytics` | relatorios e indicadores |
| `documents` | documentos |
| `aprovacoes` | aprovacoes |
| `notifications` | notificacoes |
| `webhooks` | webhooks externos |
| `empresa`, `backup`, `weather`, `tasks`, `technicians`, `test`, `sentry-tunnel` | APIs auxiliares/infra |

### 1.4 Cobertura por modulo — leitura inicial

| Modulo | Pages | APIs | Unit/integration | E2E | Docs | Leitura inicial |
|---|---:|---:|---:|---:|---:|---|
| Auth/Login | 6 | 18 | 16 | 7 | 5 | Forte cobertura relativa; modulo critico e deve continuar como primeiro gate |
| Usuarios | 3 | 13 | 13 | 12 | 5 | Forte cobertura; depende de RBAC/hierarquia sempre atualizados |
| Clientes | 6 | 11 | 12 | 6 | 6 | Boa cobertura; manter foco em documento/endereco/export/RBAC |
| Propostas | 6 | 27 | 5 | 7 | 5 | Fluxo critico; precisa manter contrato com Projetos/Invoices |
| Projetos | 6 | 28 | 15 | 12 | 11 | Forte superficie; docs indicam historico longo e fases |
| Service Orders | 5 | 31 | 4 | 0 | 2 | Superficie grande com pouca E2E dedicada pelo path; prioridade para E2E operacional |
| Estoque | 24 | 42 | 3 | 0 | 4 | Modulo muito grande; prioridade para cobertura real de fluxo e organizacao de submenu |
| Invoices | 9 | 11 | 7 | 6 | 4 | Cobertura relevante; depende de OS/Projeto/Financeiro |
| Financeiro | 22 | 37 | 8 | 6 | 10 | Superficie grande; navegacao atual mistura financeiro/fiscal |
| RH/Workforce | 5 | 14 | 0 | 0 | 2 | Precisa classificacao de maturidade antes de destaque na sidebar |
| Reports/Analytics | 16 | 24 | 0 | 0 | 1 | Ha indicios de mock/fallback; deve ser tratado como parcial ate validar dados reais |
| Documents | 1 | 6 | 0 | 0 | 0 | Tem TODO de criacao de pasta; nao deve ser tratado como completo |
| Aprovacoes | 3 | 5 | 0 | 0 | 0 | Ha mock user ID em page; precisa hardening antes de destaque amplo |
| Configuracoes/Admin | 10 | 3 | 0 | 1 | 0 | Admin/integracao/eventos precisam RBAC/sidebar mais claro |
| Portal | 6 | N/A por path publico | 14 | 0 | 0 | Portal tem dominio/testes, mas nao entra na sidebar interna |

## Item 2 — Diagnostico da sidebar atual

### 2.1 Arquivo fonte da sidebar

Sidebar principal:

```text
src/shared/components/GladPros/index.tsx
```

Layout que usa a sidebar:

```text
src/app/(dashboard)/layout.tsx
```

Arquivo legado/alternativo encontrado:

```text
src/shared/components/DashboardShell.tsx
```

### 2.2 Sidebar atual

`DEFAULT_NAV_GROUPS` atual:

| Grupo | Itens |
|---|---|
| Sem titulo | Dashboard |
| COMERCIAL | Clientes, Propostas, Projetos, Ordens de Servico |
| OPERACIONAL | Estoque, Documentos, Relatorios |
| PESSOAS | Workers |
| FINANCEIRO | Visao Geral, Receitas, Despesas, Contas, Transferencias |
| FISCAL | Invoices, Payables (1099), Fluxo de Caixa, Painel Fiscal |
| SISTEMA | Usuarios, Eventos, Integracao, Perfil |

### 2.3 Problemas encontrados

| Prioridade | Problema | Evidencia | Impacto |
|---|---|---|---|
| P1/P2 para sidebar | `routeToModule()` mapeia `/dashboard` antes de `/dashboard/financeiro`; logo `/dashboard/financeiro/*` vira modulo `dashboard`, nao `financeiro`. | `src/shared/lib/rbac-core.ts:90-92` | Itens financeiros podem aparecer para roles que so tem `dashboard:read`. |
| P2 | Rotas `/admin/eventos` e `/admin/integracao` nao possuem mapeamento em `routeToModule()`. | `src/shared/lib/rbac-core.ts:78-98`, `src/shared/components/GladPros/index.tsx:128-129` | Como rota desconhecida fica visivel, itens admin podem aparecer indevidamente. |
| P2 | `filterNavGroupsByRole()` deixa rotas desconhecidas visiveis. | `src/shared/components/GladPros/index.tsx:145-146` | Falha segura deveria ocultar ou exigir mapeamento explicito para itens sensiveis. |
| P2 | Grupo COMERCIAL mistura Propostas, Projetos e OS. | `src/shared/components/GladPros/index.tsx:83-89` | Confunde fluxo comercial com execucao operacional. |
| P2 | Financeiro e Fiscal estao separados de forma confusa, mas ambos usam rotas financeiras. | `src/shared/components/GladPros/index.tsx:106-123` | Usuario pode nao entender onde procurar invoices, cash flow, fiscal e despesas. |
| P2 | PESSOAS so mostra Workers; Usuarios fica em Sistema e RH page existe fora da sidebar. | `src/shared/components/GladPros/index.tsx:100-130`, pages `/rh`, `/usuarios` | A gestao de pessoas fica fragmentada. |
| P2 | Existem pages importantes que nao aparecem claramente na sidebar: Configuracoes, Notificacoes, RH, subrelatorios. | inventario de pages | Pode gerar telas escondidas, acesso inconsistente e manutencao dificil. |
| P2 | Reports tem fallback para mock data em componente. | `src/components/reports/ReportViewer.tsx:55-67` | Relatorios nao devem aparentar dados reais quando API falha. |
| P2 | Aprovacoes usa `useNotifications('user-123')`. | `src/app/(dashboard)/aprovacoes/page.tsx:61-62` | Mock user ID em tela real precisa correcao antes de status production-ready amplo. |
| P3 | Documentos possui TODO para criacao de pasta. | `src/app/(dashboard)/documentos/page.tsx:61-62` | Feature visivel pode estar incompleta. |

### 2.4 Regra proposta para sidebar

Antes de alterar UI, a regra proposta e:

1. nenhum item sensivel pode ficar visivel se `routeToModule()` retornar `null`;
2. toda rota na sidebar deve ter modulo RBAC explicito ou `alwaysVisible` justificado;
3. itens incompletos devem ser ocultos, beta ou admin-only;
4. grupo deve refletir fluxo operacional, nao estrutura tecnica.

## Item 3 — Classificacao preliminar dos modulos

Classificacao inicial, sujeita a confirmacao na discussao:

| Modulo | Status preliminar | Motivo |
|---|---|---|
| Auth/Login | Production Ready / manter sob vigilancia | Cobertura forte e gates recentes; critico para todo o sistema |
| Usuarios | Production Ready / manter sob vigilancia | Hierarquia corrigida e cobertura alta |
| Clientes | Production Ready / manter sob vigilancia | Cobertura boa e P2 recentes fechados |
| Propostas | Conditionally Ready | Fluxo forte, mas contrato com Projeto/Invoice exige E2E continuo |
| Projetos | Needs structured review | Superficie grande e muitos docs/fases; precisa consolidar status real |
| Service Orders | Needs E2E hardening | API grande e modulo operacional critico; sem E2E dedicado encontrado por path |
| Estoque | Needs E2E hardening | Modulo muito amplo, sidebar interna extensa e poucas regressões unitarias por superficie |
| Invoices | Conditionally Ready | Boa cobertura, mas depende de fluxos OS/Projeto/Financeiro |
| Financeiro | Needs structured review | Superficie grande, fiscal/payables/receitas/despesas misturados |
| RH/Workforce | Incomplete/Beta ate prova contraria | Sem testes encontrados no levantamento inicial |
| Reports/Analytics | Incomplete/Beta | Sem testes e com fallback mock em report viewer |
| Documents | Incomplete/Beta | TODO de feature visivel e sem docs/testes |
| Aprovacoes | Needs hardening | Mock user ID em page real e sem testes/docs no levantamento |
| Configuracoes/Admin | Internal/Admin only | Deve ser visivel apenas com RBAC explicito e mapeamento corrigido |
| Portal | Fora da sidebar interna | Deve ter auditoria propria de portal publico/token |

## Item 4 — Ordem de estabilizacao proposta

Ordem recomendada antes de redesenhar tudo:

1. **Sidebar/RBAC mapping** — corrigir visibilidade e fail-closed de itens desconhecidos.
2. **Auth/Login** — manter como gate de seguranca.
3. **Usuarios/RBAC** — garantir que roles e hierarquia continuam coerentes.
4. **Clientes** — base do ERP comercial/operacional.
5. **Propostas + Projetos** — fluxo de entrada comercial ate execucao.
6. **Service Orders** — execucao operacional e relacao com invoice/estoque.
7. **Estoque** — materiais, compras, reserva, inventario e solicitacoes.
8. **Invoices + Financeiro** — cobranca, pagamento e fluxo financeiro.
9. **Reports/Analytics** — somente depois dos dados base estarem confiaveis.
10. **RH/Workforce, Documents, Aprovacoes, Configuracoes/Admin** — classificar, ocultar/beta ou endurecer conforme uso real.

## Item 5 — Testes reais minimos

Camada minima recomendada para nao depender apenas de mocks:

| Area | E2E/integração minimo necessario |
|---|---|
| Sidebar/RBAC | Para cada role, validar itens visiveis e ocultos; especialmente financeiro, admin e cliente |
| Auth/Login | Login, MFA, refresh/logout, reset e bloqueio |
| Usuarios | ADMIN gerencia todos; GERENTE nao gerencia ADMIN/GERENTE/CLIENTE |
| Clientes | Criar PF/PJ, documento mascarado, endereco novo/legado, export seguro |
| Propostas | Criar, enviar/aprovar, bloquear gatilho nao suportado, converter em projeto |
| Projetos | Criar projeto, etapas, materiais, movimentacoes e portal token |
| Service Orders | Criar OS, adicionar material, anexar arquivo valido/invalido, gerar invoice com permissao |
| Estoque | Entrada, reserva, saida bloqueada quando consome reservado, inventario paginado |
| Invoices | Criar, enviar, registrar pagamento, bloquear double billing |
| Financeiro | Receita/despesa/conta/fluxo basico e RBAC FINANCEIRO vs GERENTE |
| Reports/Analytics | API real sem mock fallback; erro deve aparecer como erro, nao dado fake |
| Documents | Upload/lista/criacao de pasta quando implementada |
| Aprovacoes | Usuario real, lista, aprovar/rejeitar e notificacao sem mock |

## Item 6 — Estrategia de execucao

A primeira etapa aprovada para execucao foi corrigir a base de RBAC/sidebar antes de qualquer reorganizacao visual ou mudanca de pastas.

### Opcao recomendada

Comecar por **Sidebar/RBAC mapping**, antes de redesenho visual.

Motivo:

- ja existe risco de visibilidade incorreta em `/dashboard/financeiro/*`;
- itens `/admin/*` podem ficar visiveis por serem rotas desconhecidas;
- se a base de visibilidade estiver errada, qualquer redesenho visual apenas reorganiza o erro.

### Estrategia sugerida

1. Corrigir `routeToModule()` para mapear rotas especificas antes de `/dashboard`. **Executado.**
2. Fazer sidebar falhar fechado para rotas desconhecidas, exceto lista explicita de always-visible. **Executado.**
3. Criar teste unitario para `routeToModule()` e `filterNavGroupsByRole()`. **Executado.**
4. Propor nova estrutura de grupos sem alterar ainda os destinos.
5. Validar com voce quais grupos e nomes fazem sentido para a operacao.
6. Implementar sidebar nova em uma mudanca pequena e testavel.

### Correcao ja aplicada

| Area | Resultado |
|---|---|
| Financeiro | `/dashboard/financeiro/*` agora mapeia para o modulo `financeiro`, antes do fallback generico de `/dashboard`. |
| Rotas desconhecidas | Itens sem mapeamento RBAC deixam de aparecer automaticamente na sidebar. |
| Admin | Itens `/admin/eventos` e `/admin/integracao` foram marcados como `ADMIN` only na sidebar. |
| Protecao direta | Rotas em `/admin/*` ganharam layout server-side que redireciona nao-ADMIN para `/403`. |
| Testes | Foi adicionada regressao cobrindo financeiro, admin-only e fail-closed de rotas desconhecidas. |
| Estrutura financeira | A sidebar foi reorganizada em `FINANCEIRO`, `FATURAMENTO` e `FISCAL`; a rota legada `/financeiro/relatorios` redireciona para `/dashboard/financeiro/relatorios`. |

### Decisoes pendentes

Antes de implementar, precisamos decidir:

1. A sidebar deve ser organizada por **operacao real** ou por **modulo tecnico**?
2. `Reports`, `Documents`, `Aprovacoes`, `RH/Workforce` entram como principais, beta ou admin-only?
3. Projetos e OS saem de COMERCIAL e vao para OPERACAO?
4. Configuracoes/Admin ficam no mesmo grupo Sistema?

### Decisoes ja aplicadas

1. Financeiro, Faturamento e Fiscal ficam separados na sidebar.
2. O namespace principal de financeiro permanece em `/dashboard/financeiro/*`.
3. A rota antiga `/financeiro/relatorios` foi mantida apenas como redirect para nao quebrar links existentes.

## Conclusao

Itens 1 a 5 foram levantados. O ponto de parada correto e o item 6: discutir estrategia de execucao.

Nao recomendo mexer na sidebar visual antes de corrigir e testar o mapeamento RBAC da navegacao.
