# Decisoes de Sidebar e Ordem de Hardening

**Status:** Proposta de decisao para revisao antes de implementacao completa
**Base:** `11-operational-system-map.md`, `10-system-inventory-and-sidebar-audit.md`, RBAC atual e fluxo operacional do ERP
**Objetivo:** definir como o usuario deve navegar no sistema e qual modulo deve ser endurecido primeiro.

Este documento nao substitui o gate de production readiness. Ele organiza as decisoes de produto/arquitetura para guiar as proximas implementacoes sem perder contexto.

## 1. Principio adotado

A sidebar deve ser organizada pela operacao real da GladPros, nao pela estrutura tecnica das pastas.

Cada item deve aparecer somente se:

1. o usuario tem permissao RBAC;
2. a rota tem mapeamento explicito;
3. o modulo esta production-ready, conditionally-ready ou explicitamente marcado como beta/admin;
4. o item ajuda a executar uma tarefa real.

## 2. Sidebar final proposta

### 2.1 Estrutura recomendada

| Grupo | Itens | Status de decisao |
|---|---|---|
| Dashboard | Dashboard, Notificacoes | Aprovavel |
| Comercial | Clientes, Propostas | Recomendado |
| Operacao | Projetos, Ordens de Servico, Documentos | Recomendado, com Documentos como beta |
| Estoque | Estoque | Recomendado; submenus internos devem concentrar materiais/equipamentos/compras |
| Financeiro | Visao geral, Receitas, Despesas, Contas, Transferencias, Fluxo de Caixa, Conciliacao, Relatorios | Ja parcialmente aplicado |
| Faturamento | Invoices, Relatorios de Invoices | Ja aplicado |
| Fiscal | Painel Fiscal, Impostos Estimados, Payables 1099, Owner Compensation, Relatorios Fiscais, Categorias Fiscais | Ja aplicado; sensivel |
| Pessoas | Usuarios, RH/Workers | Recomendado, mas RH/Workers deve ser beta ate auditoria |
| Gestao | Reports/Analytics, Aprovacoes | Recomendado como beta/admin ate hardening |
| Sistema | Configuracoes, Eventos, Integracao, Perfil | Eventos/Integracao admin-only; Perfil sempre visivel |

### 2.2 Mudanca principal em relacao ao estado atual

O grupo **COMERCIAL** nao deve carregar Projetos e OS no longo prazo.

Recomendacao:

- **Comercial:** Clientes, Propostas.
- **Operacao:** Projetos, Ordens de Servico, Documentos.

Motivo: proposta e cliente pertencem ao ciclo de venda; projeto e OS pertencem a execucao.

## 3. Exposicao por role

| Grupo | ADMIN | GERENTE | FINANCEIRO | ESTOQUE | USUARIO | CLIENTE |
|---|---|---|---|---|---|---|
| Dashboard | Sim | Sim | Sim | Sim | Sim | Nao na sidebar interna |
| Comercial | Sim | Sim | Parcial leitura | Parcial leitura | Parcial | Nao |
| Operacao | Sim | Sim | Parcial leitura | Parcial | Sim | Nao |
| Estoque | Sim | Leitura | Leitura | Sim | Leitura | Nao |
| Financeiro | Sim | Leitura | Sim | Nao | Nao | Nao |
| Faturamento | Sim | Sim | Sim | Nao | Leitura limitada | Nao na sidebar interna |
| Fiscal | Sim | Leitura limitada se aprovado | Sim | Nao | Nao | Nao |
| Pessoas | Sim | Parcial | Leitura RH se permitido | Nao | Nao | Nao |
| Gestao | Sim | Parcial | Parcial | Nao | Parcial apenas aprovacoes se aplicavel | Nao |
| Sistema | Sim | Perfil/config limitada | Perfil | Perfil | Perfil | Portal externo |

Observacao: CLIENTE deve operar pelo portal, nao pela sidebar interna.

## 4. Classificacao dos modulos incompletos

| Modulo | Classificacao proposta | Exposicao recomendada agora | Condicao para virar principal |
|---|---|---|---|
| Reports/Analytics | Beta | ADMIN/GERENTE ou oculto por role | Remover mock fallback, validar APIs reais e E2E de relatorios criticos |
| Documents | Beta operacional | ADMIN/GERENTE/USUARIO conforme RBAC, com escopo claro | Completar pastas, permissoes e testes de upload/listagem |
| Aprovacoes | Needs hardening | ADMIN/GERENTE/FINANCEIRO conforme fluxo, ou beta | Remover mock user ID, validar notificacoes e aprovar/rejeitar com usuario real |
| RH/Workforce | Beta | ADMIN/GERENTE; FINANCEIRO leitura se necessario | Definir papel operacional, workers/1099/payables e testes |
| Configuracoes nao-admin | Limitado | GERENTE somente configuracoes seguras; admin/system admin-only | Separar configuracoes operacionais de configuracoes sensiveis |
| Portal | Auditoria propria | Fora da sidebar interna | Validar token, escopo de cliente, invoices/projetos/documentos |

## 5. Ordem de hardening recomendada

### 5.1 Ordem executiva

1. **Projetos**
2. **Invoices**
3. **Financeiro**
4. **Fiscal**
5. **Reports/Analytics**
6. **RH/Workforce**
7. **Documents**
8. **Aprovacoes**
9. **Portal**

### 5.2 Motivo da ordem

| Ordem | Modulo | Por que vem agora |
|---:|---|---|
| 1 | Projetos | E o elo central entre Propostas, Estoque, Invoices e operacao real |
| 2 | Invoices | Transforma execucao em cobranca e conecta com Financeiro |
| 3 | Financeiro | Recebe pagamentos, despesas, contas e relatorios executivos |
| 4 | Fiscal | Depende de dados financeiros corretos e tem risco compliance/CPA |
| 5 | Reports/Analytics | So deve consolidar dados depois dos dados base estarem confiaveis |
| 6 | RH/Workforce | Afeta workers, payables, owner compensation e 1099 |
| 7 | Documents | Apoia operacao, mas nao deve bloquear fluxo financeiro principal |
| 8 | Aprovacoes | Deve ser endurecido depois de definir quais fluxos realmente exigem aprovacao |
| 9 | Portal | Precisa auditoria propria de seguranca externa e experiencia do cliente |

## 6. Primeiro modulo recomendado: Projetos

Projetos deve ser o primeiro hardening profundo porque e o ponto onde o ERP deixa de ser comercial e vira execucao.

### 6.1 Perguntas que a auditoria de Projetos deve responder

1. Uma proposta aprovada gera projeto de forma consistente?
2. O vinculo `Proposta <-> Projeto` e bidirecional e unico?
3. O projeto tem state machine clara?
4. Materiais reservados/consumidos afetam estoque corretamente?
5. Purchase orders e despesas vinculadas aparecem no custo do projeto?
6. Change orders alteram escopo/custo/faturamento de forma rastreavel?
7. Projeto gera invoice apenas no gatilho correto?
8. Projeto com OS vinculada evita double billing?
9. Cliente ve apenas o que deve pelo portal?
10. Cada transicao critica tem RBAC, audit log e teste?

### 6.2 Gates minimos para Projetos

| Gate | Criterio |
|---|---|
| RBAC | ADMIN/GERENTE operam; FINANCEIRO/ESTOQUE/USUARIO veem/agem somente conforme matriz |
| State machine | Transicoes invalidas bloqueadas com erro claro |
| Proposta -> Projeto | Apenas proposta aprovada gera projeto; cancelamento posterior bloqueado |
| Estoque | Reserva, uso, devolucao e movimentacao consistentes |
| Financeiro/Invoice | Invoice respeita gatilho e nao duplica OS |
| Portal | Cliente so ve dados autorizados |
| Performance | Listagens paginadas e selects limitados |
| Testes | Unitarios para regras, integracao/API e pelo menos E2E do fluxo principal |

## 7. Decisoes que ainda precisam confirmacao

Antes de implementar a sidebar final inteira, confirmar:

1. **Projetos e OS devem sair de COMERCIAL e ir para OPERACAO?**  
   Recomendacao: sim.

2. **Documents deve aparecer em OPERACAO como beta ou ficar oculto ate completar pastas?**  
   Recomendacao: aparecer como beta apenas para roles internas que realmente usam documentos.

3. **Reports/Analytics deve ir para GESTAO ou ficar oculto ate remover mocks?**  
   Recomendacao: GESTAO beta/admin/gerente ate hardening.

4. **Usuarios deve ficar em PESSOAS ou SISTEMA?**  
   Recomendacao: Pessoas para gestao de equipe; Sistema fica para configuracoes/eventos/integracoes.

5. **Aprovacoes deve ficar em GESTAO ou aparecer apenas quando houver fluxos reais ativos?**  
   Recomendacao: Gestao beta ate remover mock e validar notificacoes reais.

## 8. Proximo passo pratico

Se essas decisoes forem aceitas, a proxima execucao deve ser:

1. ajustar a sidebar para a estrutura final operacional;
2. atualizar testes de navegacao por role;
3. documentar a decisao como aplicada;
4. iniciar auditoria profunda do modulo **Projetos**.

Nao recomendo iniciar Projetos antes de fechar a exposicao dos modulos parciais na sidebar, para evitar que paginas beta continuem aparecendo como prontas.
