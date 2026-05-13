# Visao de Engenharia e Plano de Acao — GladPros ERP

**Status:** Documento de discussao e alinhamento  
**Objetivo:** registrar a visao tecnica do projeto antes de novas acoes, para evitar perda de contexto, auditorias inconsistentes e decisoes tomadas sem uma estrategia comum.

Este documento nao autoriza implementacao imediata. Ele serve como base para discutir prioridades, ajustar o plano e somente depois executar mudancas por etapas.

## 1. Visao geral

O GladPros ERP ja passou da fase de apenas "criar modulos". O projeto agora precisa ser tratado como um sistema operacional real da empresa, com foco em confiabilidade, seguranca, rastreabilidade, governanca e reducao de regressao.

A prioridade principal deixa de ser velocidade de feature e passa a ser:

1. proteger o que ja funciona;
2. terminar corretamente o que esta incompleto;
3. organizar a experiencia de uso;
4. garantir que cada modulo tenha status real;
5. criar um processo repetivel para evoluir sem quebrar.

## 2. Diagnostico executivo

O projeto tem uma base forte:

| Area | Avaliacao |
|---|---|
| Stack | Next.js, Prisma, MySQL, TypeScript, RBAC, Zod, Jest e Playwright sao adequados para o ERP |
| Dominio | O sistema cobre fluxos reais: clientes, propostas, OS, estoque, financeiro, invoices e usuarios |
| Seguranca | Ja existem auth, MFA, RBAC, tratamento de dados sensiveis e endurecimento de rotas criticas |
| Documentacao | Evoluiu, mas precisa ser usada como governanca pratica, nao apenas historico |
| Testes | Existem, mas precisam ser melhor divididos entre unitarios, integrados e E2E reais |
| Arquitetura | Funciona, mas apresenta sinais de crescimento organico e precisa de mais organizacao por dominio |

O risco principal e o sistema crescer mais rapido do que a arquitetura, os testes, a navegacao e o processo de certificacao conseguem acompanhar.

## 3. Problema central identificado

O maior risco atual nao e falta de codigo. O risco e falta de previsibilidade.

Exemplos:

- modulo marcado como pronto sem checklist atual;
- teste unitario com mock sendo confundido com validacao real;
- documentacao antiga divergindo do estado atual;
- sidebar e navegacao crescendo sem hierarquia clara;
- features parcialmente implementadas ficando visiveis como se estivessem completas;
- regras de negocio importantes espalhadas entre API, UI e servicos;
- auditorias diferentes encontrando problemas diferentes porque o criterio muda.

## 4. Principio de decisao

A partir deste ponto, a decisao tecnica deve seguir esta ordem:

1. seguranca;
2. integridade dos dados;
3. confiabilidade operacional;
4. clareza para o usuario;
5. manutencao futura;
6. velocidade de entrega.

Se houver conflito entre entregar rapido e entregar com seguranca, a decisao correta e entregar com seguranca.

## 5. O que deve mudar no processo

### 5.1 Separar status real de status percebido

Um modulo pode estar em varios niveis:

| Status | Significado |
|---|---|
| Implementado | Codigo existe e fluxo basico funciona |
| Auditado | Foi revisado em algum momento |
| Corrigido | Bugs encontrados foram tratados |
| Certificado | Passou por gate atual com evidencia |
| Production Ready | Pode operar com confianca real e sem P1/P2 aberto |

Documentacao dizendo "completo" ou "producao" nao deve valer sem evidencia atual.

### 5.2 Usar o gate de producao como regra

O documento `docs/architecture/06-production-readiness.md` deve ser o criterio oficial para declarar modulo pronto.

Nenhum modulo deve ser considerado production-ready apenas porque:

- passou build;
- passou unit tests;
- teve uma auditoria antiga;
- possui documentacao dizendo "completo";
- o fluxo feliz funcionou uma vez.

### 5.3 Unit tests com mocks nao bastam

Mocks sao corretos em testes unitarios, mas nao substituem validacao real.

Para fluxos criticos, deve existir pelo menos uma das camadas:

- teste integrado;
- teste E2E;
- contrato real de API;
- seed controlado validando o comportamento final.

## 6. O que eu mudaria na arquitetura

### 6.1 Mais regras em `domains/`

Regras de negocio importantes devem morar em dominio, nao espalhadas em API routes ou componentes.

Exemplo de direcao:

```text
src/domains/
  proposals/
    services/
    policies/
    state-machine/
  service-orders/
    services/
    policies/
    state-machine/
  inventory/
    services/
    policies/
  users/
    policies/
```

Beneficios:

- testes mais simples;
- menor duplicacao;
- regras reutilizaveis;
- auditoria mais clara;
- menos risco de uma rota escapar da regra.

### 6.2 State machines explicitas

Modulos com estados criticos devem ter transicoes controladas.

| Modulo | Estados/fluxos que precisam controle forte |
|---|---|
| Propostas | rascunho, enviada, aprovada, rejeitada, cancelada, convertida em projeto |
| Service Orders | draft, scheduled, in progress, completed, invoiced, paid, write-off |
| Invoices | draft, sent, partially paid, paid, void, write-off |
| Estoque | disponivel, reservado, consumido, devolvido, ajustado |
| Usuarios | ativo, inativo, bloqueado, expirado |

Cada transicao deve definir:

- quem pode executar;
- pre-condicoes;
- efeitos colaterais;
- AuditLog;
- testes.

### 6.3 Padronizar APIs

As respostas devem seguir formato unico:

```ts
{ data, success: true, pagination?: {...} }
```

ou:

```ts
{ error, message, success: false }
```

Isso reduz tratamento especial no frontend e facilita testes.

### 6.4 Criar helpers compartilhados

Criar ou consolidar helpers para:

- paginacao;
- filtros;
- sort whitelist;
- CSV seguro;
- export limits;
- timezone;
- response format;
- rate limit de fluxos sensiveis.

## 7. Sidebar e navegacao

A sidebar foi citada como confusa e desorganizada. Antes de mexer visualmente, e preciso redesenhar a arquitetura de navegacao.

### 7.1 Problema provavel

A sidebar parece ter crescido junto com os modulos, sem uma decisao clara de agrupamento por tarefa operacional.

Possiveis sintomas:

- muitos itens no mesmo nivel;
- modulos tecnicos misturados com fluxos operacionais;
- itens incompletos aparecendo como principais;
- diferenca entre permissao RBAC e relevancia operacional;
- usuario nao sabe onde iniciar uma tarefa.

### 7.2 Criterio proposto

A sidebar deve ser organizada pelo modo como a empresa trabalha, nao pelo modo como o codigo esta separado.

Exemplo de grupos para discussao:

| Grupo | Conteudo possivel |
|---|---|
| Operacao | Dashboard, OS, Projetos, Agenda/Campo |
| Comercial | Clientes, Propostas, Follow-up |
| Estoque | Materiais, Equipamentos, Compras, Solicitacoes, Relatorios |
| Financeiro | Invoices, Receitas, Despesas, Pagamentos, Relatorios |
| Pessoas | Usuarios, RH, Workforce |
| Gestao | Analytics, Reports, Aprovacoes |
| Sistema | Configuracoes, Auditoria, Seguranca |

### 7.3 Regra para a sidebar

Um item so deve aparecer se:

1. o usuario tem permissao;
2. o modulo esta implementado ou explicitamente marcado como beta;
3. o item leva a uma acao util;
4. o nome e claro para operacao real.

Nao esconder por CSS. Renderizar condicionalmente por RBAC.

## 8. O que falta no projeto

### 8.1 Status real por modulo

Criar uma matriz oficial:

| Modulo | Implementado | Testado | E2E | Certificado | Observacoes |
|---|---|---|---|---|---|
| Auth/Login | A definir | A definir | A definir | A definir | Revisar fluxo completo |
| Usuarios | A definir | A definir | A definir | A definir | Hierarquia e sessoes |
| Clientes | A definir | A definir | A definir | A definir | Documento/endereco/export |
| Propostas | A definir | A definir | A definir | A definir | State machine e projeto |
| Estoque | A definir | A definir | A definir | A definir | Reserva, inventario, compras |
| OS | A definir | A definir | A definir | A definir | Invoice, materiais, status |
| Invoices | A definir | A definir | A definir | A definir | Pagamento e financeiro |
| Financeiro | A definir | A definir | A definir | A definir | Fiscal, despesas, reports |

### 8.2 Seeds oficiais

Criar dados controlados para testes e E2E:

- ADMIN;
- GERENTE;
- FINANCEIRO;
- ESTOQUE;
- USUARIO;
- CLIENTE;
- cliente PF/PJ;
- proposta aprovada;
- projeto ativo;
- OS com material;
- estoque com reservado;
- invoice aberto;
- invoice pago.

### 8.3 Observabilidade

Adicionar ou consolidar:

- logs estruturados;
- error tracking;
- health checks;
- metricas de API;
- auditoria de acoes criticas;
- runbook de incidentes.

### 8.4 Contratos cross-module

Documentar e testar contratos:

| Fluxo | Contrato |
|---|---|
| Proposta -> Projeto | proposta aprovada gera projeto rastreavel |
| Projeto -> Estoque | materiais planejados nao somem |
| OS -> Estoque | material consumido reduz saldo disponivel corretamente |
| OS/Projeto -> Invoice | nao gera cobranca duplicada |
| Invoice -> Financeiro | pagamento reflete no financeiro |
| Cliente -> Documento | documento nunca expoe valor completo |

### 8.5 Politica para features incompletas

Nada parcialmente implementado deve ficar ativo como se estivesse completo.

| Estado | Comportamento |
|---|---|
| Implementado | habilitado no UI e backend |
| Parcial | escondido no UI e bloqueado no backend |
| Experimental | feature flag explicita |
| Nao suportado | erro claro e teste |

## 9. Plano de discussao proposto

Antes de implementar qualquer coisa, discutir nesta ordem:

### Etapa 1 — Mapa real do sistema

Objetivo: listar todos os modulos e definir status real.

Resultado esperado:

- matriz de status por modulo;
- lista do que esta completo, parcial ou incompleto;
- lista de modulos que nao devem aparecer como principais na sidebar.

### Etapa 2 — Redesenho da sidebar

Objetivo: reorganizar navegacao por fluxo operacional.

Resultado esperado:

- grupos principais;
- nomes finais dos menus;
- itens por role;
- itens ocultos, beta ou desativados.

### Etapa 3 — Prioridade de estabilizacao

Objetivo: decidir o que estabilizar antes de novas features.

Ordem sugerida:

1. Auth/Login;
2. Usuarios/RBAC;
3. Clientes;
4. Propostas;
5. OS;
6. Estoque;
7. Invoices/Financeiro;
8. Reports/Analytics.

### Etapa 4 — Testes reais e seeds

Objetivo: criar base para nao depender apenas de mocks.

Resultado esperado:

- seed oficial;
- E2E minimo por modulo;
- testes integrados dos fluxos ERP.

### Etapa 5 — Refatoracao controlada

Objetivo: mover regras criticas para dominios e policies sem quebrar comportamento.

Regra:

- refatorar um fluxo por vez;
- manter teste antes/depois;
- nao alterar UI junto com regra de negocio se nao for necessario.

### Etapa 6 — Certificacao final por modulo

Objetivo: cada modulo receber status real com evidencia.

Resultado esperado:

- documento de certificacao por modulo;
- zero P1/P2 aberto;
- testes de regressao;
- E2E/integração onde necessario.

## 10. O que nao fazer agora

Evitar neste momento:

- criar modulo grande novo;
- adicionar IA em fluxo critico;
- redesenhar UI inteira sem mapa de navegacao;
- criar dashboards sem contrato de dados;
- automatizar financeiro sem AuditLog;
- liberar features parciais sem flag;
- declarar modulo pronto sem gate.

## 11. Perguntas para a proxima discussao

1. Quais modulos estao realmente em uso pela operacao hoje?
2. Quais telas da sidebar a equipe usa diariamente?
3. Quais itens da sidebar confundem ou duplicam tarefas?
4. Quais modulos ainda estao incompletos, mesmo aparecendo no menu?
5. O objetivo imediato e estabilizar o ERP interno ou preparar para comercializacao futura?
6. Qual fluxo gera mais retrabalho hoje: clientes, propostas, OS, estoque ou financeiro?
7. Quais roles realmente usam o sistema no dia a dia?
8. Quais dados nao podem nunca aparecer para roles comuns?
9. Quais relatorios sao operacionais e quais sao gerenciais?
10. O que deve ficar fora da sidebar ate estar pronto?

## 12. Conclusao

O projeto deve entrar em uma fase de organizacao e estabilizacao antes de novas grandes features.

A meta nao e apenas "terminar modulos", mas criar um ERP em que cada modulo tenha:

- status real;
- fluxo claro;
- permissao correta;
- testes adequados;
- documentacao atual;
- integracao com os demais modulos;
- navegacao simples para a operacao.

Este documento deve ser usado como referencia para as proximas decisoes e atualizado conforme as discussoes avancarem.
