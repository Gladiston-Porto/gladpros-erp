# Plano Inicial — Inventario do Sistema e Auditoria da Sidebar

**Status:** Plano de trabalho para discussao  
**Objetivo:** criar um roteiro rastreavel para mapear o estado real do GladPros ERP, organizar a sidebar e decidir a ordem de estabilizacao antes de implementar novas mudancas.

Este documento deve ser usado como guia de acompanhamento. A ideia e evitar perda de contexto, impedir falsas declaracoes de modulo pronto e permitir verificar onde estamos quando a discussao for retomada.

## 1. Principio do plano

Antes de alterar codigo, sidebar ou criar novas features, o primeiro passo e entender o sistema atual com evidencia.

A ordem correta e:

1. mapear tudo;
2. classificar o status real;
3. propor reorganizacao;
4. discutir e ajustar;
5. somente depois implementar.

## 2. Fase 1 — Inventario real do sistema

### Objetivo

Descobrir exatamente o que existe, o que esta pronto, o que esta parcial e o que aparece para o usuario sem estar maduro.

### O que mapear

| Area | O que levantar |
|---|---|
| Modulos | Auth, Usuarios, Clientes, Propostas, Projetos, OS, Estoque, Invoices, Financeiro, RH, Workforce, Reports, Analytics, Configuracoes |
| Paginas | Tudo em `src/app/(dashboard)` |
| APIs | Tudo em `src/app/api` |
| Sidebar atual | Grupos, itens, ordem, icones, labels, links e permissoes |
| RBAC | Quais roles podem ver e executar cada item |
| Testes | Unitarios, integrados e E2E existentes por modulo |
| Documentacao | Status declarado em `docs/modules/*` e divergencias |
| Uso operacional | O que a empresa realmente usa no dia a dia |

### Saida esperada

Criar uma matriz oficial:

| Modulo | UI | API | RBAC | Testes | E2E | Status | Aparece na sidebar? | Observacoes |
|---|---|---|---|---|---|---|---|---|
| Auth/Login | A definir | A definir | A definir | A definir | A definir | A definir | N/A | A definir |
| Usuarios | A definir | A definir | A definir | A definir | A definir | A definir | A definir | A definir |
| Clientes | A definir | A definir | A definir | A definir | A definir | A definir | A definir | A definir |
| Propostas | A definir | A definir | A definir | A definir | A definir | A definir | A definir | A definir |
| Projetos | A definir | A definir | A definir | A definir | A definir | A definir | A definir | A definir |
| Service Orders | A definir | A definir | A definir | A definir | A definir | A definir | A definir | A definir |
| Estoque | A definir | A definir | A definir | A definir | A definir | A definir | A definir | A definir |
| Invoices | A definir | A definir | A definir | A definir | A definir | A definir | A definir | A definir |
| Financeiro | A definir | A definir | A definir | A definir | A definir | A definir | A definir | A definir |

## 3. Fase 2 — Diagnostico da sidebar atual

### Objetivo

Parar de tratar a sidebar como uma lista de telas e passa-la a tratar como mapa da operacao real.

### Perguntas da auditoria

1. Quais itens existem hoje?
2. Quais links estao duplicados ou confusos?
3. Quais modulos incompletos aparecem como prontos?
4. Quais itens cada role deveria ver?
5. Quais itens levam a telas sem utilidade operacional clara?
6. Quais itens deveriam virar subitem em vez de item principal?
7. Quais itens deveriam ser ocultados ate o modulo amadurecer?

### Grupos iniciais propostos

| Grupo | Itens provaveis |
|---|---|
| Operacao | Dashboard, Service Orders, Projetos |
| Comercial | Clientes, Propostas, Follow-up |
| Estoque | Materiais, Equipamentos, Compras, Solicitacoes, Relatorios |
| Financeiro | Invoices, Receitas, Despesas, Pagamentos |
| Pessoas | Usuarios, RH, Workforce |
| Gestao | Reports, Analytics, Aprovacoes |
| Sistema | Configuracoes, Seguranca, Auditoria |

### Saida esperada

Um documento com:

- sidebar atual;
- problemas encontrados;
- proposta de nova sidebar;
- itens por role;
- itens ocultos/beta;
- itens que dependem de modulo ser certificado antes de aparecer.

## 4. Fase 3 — Classificacao dos modulos

### Objetivo

Separar o que pode continuar visivel do que precisa ser estabilizado, escondido ou marcado como beta.

### Status possiveis

| Status | Acao |
|---|---|
| Production Ready | Pode ficar visivel normalmente |
| Conditionally Ready | Pode ficar visivel para roles especificos, com observacao |
| Needs Hardening | Nao recebe feature nova; corrigir antes |
| Incomplete/Beta | Esconder ou marcar como beta |
| Internal/Admin only | Visivel apenas para ADMIN/GERENTE |
| Deprecated | Remover da sidebar e arquivar |

### Regra

Modulo incompleto nao deve aparecer como modulo principal sem indicacao clara. Se o backend nao suporta o fluxo, a UI tambem nao deve sugerir que suporta.

## 5. Fase 4 — Ordem de estabilizacao

### Ordem inicial proposta

1. Auth/Login
2. Usuarios/RBAC
3. Clientes
4. Propostas
5. Projetos + Service Orders
6. Estoque
7. Invoices + Financeiro
8. Reports/Analytics
9. RH/Workforce
10. Configuracoes/Auditoria

### Criterio

Nenhum modulo recebe feature grande antes de ter:

- status real definido;
- P1/P2 conhecidos;
- testes minimos;
- decisao clara sobre aparecer ou nao na sidebar.

## 6. Fase 5 — Testes reais minimos

### Objetivo

Reduzir dependencia exclusiva de testes unitarios com mocks.

### Fluxos minimos sugeridos

| Fluxo | Teste minimo |
|---|---|
| Login/Auth | Login, MFA e logout |
| Usuarios | GERENTE nao gerencia ADMIN |
| Clientes | Criar cliente e visualizar documento mascarado |
| Propostas | Criar, aprovar e converter em projeto |
| Service Orders | Criar OS, usar material e gerar invoice |
| Estoque | Entrada, reserva e bloqueio de saida que consome reservado |
| Invoices | Gerar, enviar e pagar |
| Sidebar | Role ve apenas itens permitidos |

## 7. Fase 6 — Implementacao controlada

Somente depois das fases anteriores, executar mudancas em ciclos pequenos.

### Ciclo por modulo

1. confirmar status;
2. corrigir documentacao;
3. ajustar sidebar/RBAC se necessario;
4. corrigir P1/P2;
5. criar regressao;
6. criar ou ajustar E2E;
7. rodar validacao;
8. certificar modulo;
9. passar para o proximo.

## 8. Primeiro entregavel pratico

O primeiro entregavel nao deve ser codigo. Deve ser um relatorio:

```text
docs/architecture/10-system-inventory-and-sidebar-audit.md
```

Conteudo esperado:

1. lista de todos os modulos;
2. lista das paginas reais;
3. lista das APIs reais;
4. sidebar atual;
5. mapa de RBAC por item;
6. status preliminar por modulo;
7. itens confusos ou duplicados;
8. itens que devem ser escondidos;
9. proposta inicial da nova sidebar;
10. perguntas para decisao antes de mexer no codigo.

## 9. Como acompanhar o plano

Durante a execucao, cada fase deve ser marcada como:

| Status | Significado |
|---|---|
| Pendente | Ainda nao iniciado |
| Em andamento | Levantamento ou discussao em progresso |
| Bloqueado | Falta decisao ou informacao |
| Concluido | Documento/decisao final criado |

Nenhuma fase deve ser considerada concluida sem evidencia no documento correspondente.

## 10. Riscos a evitar

1. Mexer na sidebar antes de saber o status real dos modulos.
2. Declarar modulo pronto baseado apenas em teste unitario.
3. Manter tela incompleta aparecendo como fluxo principal.
4. Misturar reorganizacao visual com refatoracao de regra de negocio.
5. Fazer muitos modulos ao mesmo tempo.
6. Usar documentacao antiga como verdade atual.

## 11. Proxima decisao

A proxima decisao deve ser confirmar se o primeiro trabalho sera:

> Auditar inventario do sistema + sidebar atual, sem alterar comportamento.

Se aprovado, o resultado sera o documento `docs/architecture/10-system-inventory-and-sidebar-audit.md`, que servira como mapa para as proximas implementacoes.

## 12. Conclusao

Este plano existe para garantir que o projeto avance com controle.

A meta inicial nao e fazer mais codigo. A meta e criar clareza suficiente para que qualquer mudanca futura seja:

- planejada;
- rastreavel;
- validada;
- alinhada ao uso real da empresa;
- protegida contra regressao.
