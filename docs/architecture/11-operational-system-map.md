# Mapa Operacional do Sistema — GladPros ERP

**Status:** Documento de entendimento sistemico
**Objetivo:** registrar como o ERP deve ser compreendido antes de novas mudancas estruturais, de sidebar ou de modulo
**Escopo:** modulos, usuarios, fluxos, dependencias, status real, riscos e proximas decisoes

Este documento e a referencia para entender o GladPros ERP como um sistema operacional da empresa, nao como paginas isoladas.

## 1. Visao operacional

O GladPros ERP organiza a operacao de uma empresa real de construcao e servicos em Dallas, Texas.

O sistema precisa sustentar o fluxo completo:

```text
Cliente
  -> Proposta
  -> Projeto ou Service Order
  -> Materiais / Estoque / Compras
  -> Invoice
  -> Pagamento / Financeiro
  -> Relatorios / Fiscal / Gestao
```

Nem todo trabalho nasce em proposta. Existem dois caminhos principais:

| Caminho | Quando usar | Fluxo |
|---|---|---|
| Comercial planejado | Obra, remodeling, projeto com escopo maior | Cliente -> Proposta -> Projeto -> Estoque -> Invoice -> Financeiro |
| Atendimento direto | Manutencao, reparo, visita tecnica, servico rapido | Cliente -> Service Order -> Materiais -> Invoice -> Financeiro |

## 2. Roles e usuarios do sistema

| Role | Perfil operacional | Deve ver principalmente |
|---|---|---|
| ADMIN | Dono/administrador do sistema | Tudo, configuracoes, usuarios, fiscal, auditoria |
| GERENTE | Supervisor operacional | Clientes, propostas, projetos, OS, leitura financeira limitada |
| FINANCEIRO | Gestao financeira/fiscal | Financeiro, faturamento, invoices, relatórios, fiscal |
| ESTOQUE | Controle de materiais/equipamentos | Estoque, compras, solicitacoes, leitura de clientes/projetos/OS quando necessario |
| USUARIO | Operacao de campo | OS, projetos, documentos, clientes permitidos, leitura limitada |
| CLIENTE | Portal externo | Seus projetos/invoices/documentos autorizados |

Regra de produto: a sidebar deve refletir o trabalho real de cada role, nao apenas permissao tecnica.

## 3. Mapa dos modulos

| Modulo | Funcao no ERP | Dono operacional | Status atual de entendimento |
|---|---|---|---|
| Auth/Login | Entrada segura, MFA, reset, sessoes | ADMIN | Certificado no escopo auditado |
| Usuarios | Roles, hierarquia, seguranca, sessoes | ADMIN | Certificado no escopo auditado |
| Clientes | Cadastro, documentos, enderecos, historico | Comercial/Gerencia | Certificado no escopo auditado |
| Propostas | Orçamentos, assinatura, aprovacao, origem de projetos | Comercial/Gerencia | Certificado com vigilancia cross-module |
| Projetos | Execucao planejada, etapas, materiais, custos | Gerencia/Operacao | Precisa revisao estruturada completa |
| Service Orders | Atendimento direto ou tarefa operacional vinculada | Operacao/Gerencia | Certificado em P1/P2, precisa E2E operacional |
| Estoque | Materiais, equipamentos, reservas, saidas, compras | Estoque/Gerencia | Certificado em P1/P2, precisa E2E operacional |
| Invoices | Faturamento, PDF, envio, pagamento, write-off | Financeiro | Conditionally Ready; depende de OS/Projeto/Financeiro |
| Financeiro | Receitas, despesas, contas, fluxo de caixa, conciliacao | Financeiro | Em organizacao estrutural |
| Fiscal | Schedule C, impostos estimados, owner compensation, 1099 | ADMIN/Financeiro | Modulo sensivel; requer validacao com CPA |
| Reports/Analytics | Indicadores e relatorios consolidados | Gerencia/ADMIN | Parcial; nao pode usar mock como dado real |
| RH/Workforce | Workers, colaboradores, assignments | Gerencia/ADMIN | Precisa classificacao de maturidade |
| Documents | Documentos e anexos operacionais | Operacao/Gerencia | Parcial; feature de pasta ainda pendente |
| Aprovacoes | Fluxos de aprovacao interna | Gerencia/Financeiro | Precisa hardening; mock user ID foi identificado |
| Configuracoes/Admin | Parametros, seguranca, eventos, integracoes | ADMIN | Deve ser admin-only quando envolver sistema/admin |
| Portal | Acesso externo de cliente | Cliente | Auditoria propria necessaria |

## 4. Fluxo principal — Cliente para recebimento

### 4.1 Cliente

Cliente e a origem do relacionamento comercial e operacional.

Responsabilidades:

- cadastro PF/PJ;
- documento fiscal criptografado/mascarado;
- endereco atual e fallback legado;
- historico de propostas, projetos, OS e invoices.

Regras importantes:

- nunca expor SSN/ITIN/EIN completo;
- sempre aplicar RBAC antes de exportar;
- dados legados de endereco devem continuar legiveis.

### 4.2 Proposta

Proposta representa uma oferta formal antes da execucao.

Fluxo esperado:

```text
RASCUNHO -> ENVIADA -> ASSINADA -> APROVADA -> Projeto
   |          |           |
   +------ CANCELADA -----+
```

Regras importantes:

- somente proposta aprovada pode gerar projeto;
- se ja existe `projetoId`, nao cancelar sem fluxo explicito de rollback;
- gatilhos de faturamento nao implementados devem falhar fechado.

### 4.3 Projeto

Projeto representa execucao planejada de trabalho maior.

Fluxo esperado:

```text
PLANEJADO -> EM_EXECUCAO -> EM_INSPECAO -> CONCLUIDO -> ARQUIVADO
```

Dependencias:

- cliente;
- proposta opcional/origem;
- materiais reservados;
- despesas;
- purchase orders;
- invoices;
- documentos.

Riscos a revisar:

- state machine precisa estar explicita;
- materiais reservados/consumidos precisam ser consistentes;
- invoice deve respeitar gatilho e evitar duplicidade com OS.

### 4.4 Service Orders

Service Order atende trabalhos diretos ou tarefas operacionais.

Fluxo esperado:

```text
DRAFT -> SCHEDULED -> IN_PROGRESS -> COMPLETED -> CLOSED
   |          |              |             |
   +------ CANCELLED --------+------ WRITTEN_OFF
```

Regras importantes:

- OS standalone pode gerar invoice direta;
- OS vinculada a projeto nao pode gerar dupla cobranca para o mesmo trabalho;
- materiais usados devem respeitar estoque disponivel real;
- anexos precisam validar MIME, extensao, tamanho e magic bytes.

### 4.5 Estoque

Estoque controla disponibilidade real de materiais/equipamentos.

Fluxo esperado:

```text
PLANNED -> RESERVED -> ISSUED -> CONSUMED
                         |
                      RETURNED
```

Regra critica:

```text
disponivel = quantidade - reservado
```

Saida manual nunca deve consumir quantidade reservada para projeto/OS.

### 4.6 Invoice

Invoice transforma trabalho aprovado/concluido em cobranca.

Fluxo esperado:

```text
DRAFT -> SENT -> VIEWED -> APPROVED -> PARTIALLY_PAID -> PAID
   |        |         |          |
   +---- CANCELLED ---+      DISPUTED -> WRITTEN_OFF
```

Regras importantes:

- gerar numero unico, nunca reutilizar invoice cancelada;
- calcular TX sales tax no servidor;
- PDF deve ser seguro contra Host header/SSRF;
- pagamento deve refletir no financeiro/ledger conforme regra contábil.

### 4.7 Financeiro

Financeiro registra fluxo monetario real.

Subareas atuais:

| Area | Finalidade |
|---|---|
| Receitas | Entradas financeiras, recebimentos e recorrencia |
| Despesas | Contas a pagar, aprovacao, pagamento |
| Contas | Contas bancarias e saldos |
| Transferencias | Movimentacao entre contas |
| Fluxo de Caixa | Visao de liquidez |
| Conciliacao | Conferencia entre banco e registros |
| Relatorios | DRE, balanco, relatorios financeiros |

Decisao aplicada:

- namespace principal: `/dashboard/financeiro/*`;
- rota legada `/financeiro/relatorios` redireciona para `/dashboard/financeiro/relatorios`;
- sidebar separa **Financeiro**, **Faturamento** e **Fiscal**.

### 4.8 Fiscal

Fiscal apoia compliance federal dos EUA para GladPros LLC, com possibilidade de S-Corp.

Subareas:

- painel fiscal;
- impostos estimados;
- Schedule C;
- owner compensation;
- payables/1099;
- categorias fiscais;
- relatórios para CPA.

Regras importantes:

- LLC default: owner draw nao e salario e nao e dedutivel;
- S-Corp: salario razoavel antes de distribution;
- se salary YTD = 0 e distribution > 0, bloquear;
- qualquer decisao fiscal deve ser validada com CPA.

## 5. Sidebar operacional atualizada

Estado apos as primeiras correcoes:

| Grupo | Conteudo | Observacao |
|---|---|---|
| Dashboard | Visao geral | Sempre visivel para roles internos permitidos |
| Comercial | Clientes, Propostas, Projetos, OS | Ainda pode ser refinado: Projetos/OS talvez pertencam a Operacao |
| Operacional | Estoque, Documentos, Relatorios | Precisa decidir se Reports fica em Gestao |
| Pessoas | Workers | Precisa avaliar RH/Usuarios/Workforce juntos |
| Financeiro | Receitas, despesas, contas, transferencias, fluxo de caixa, conciliacao, relatorios | Estrutura inicial aplicada |
| Faturamento | Invoices, relatorios de invoices | Separado para clareza operacional |
| Fiscal | Painel fiscal, impostos, payables, owner compensation, categorias | Separado por sensibilidade/compliance |
| Sistema | Usuarios, Eventos, Integracao, Perfil | Admin protegido; Perfil sempre visivel |

Regra atual:

- rota sem mapeamento RBAC nao deve aparecer automaticamente;
- `/admin/*` e admin-only na sidebar e no layout server-side;
- `/dashboard/financeiro/*` e tratado como `financeiro`, nao `dashboard`.

## 6. Dependencias criticas entre modulos

| Origem | Destino | Regra |
|---|---|---|
| Proposta | Projeto | Apenas proposta aprovada gera projeto; link bidirecional deve ser preservado |
| Projeto | Estoque | Reserva antes de uso; consumo gera movimentacao |
| Projeto | Invoice | Invoice depende do gatilho de faturamento |
| OS | Invoice | OS standalone pode faturar direto; OS vinculada nao pode duplicar cobranca do projeto |
| Invoice | Financeiro | Pagamento deve refletir receita/ledger |
| Financeiro | Fiscal | Dados financeiros alimentam Schedule C, estimated tax e relatórios CPA |
| Worker/RH | Payables/1099 | Contractors/owner compensation afetam fiscal e financeiro |
| Cliente | Portal | Cliente so ve seus proprios projetos/invoices/documentos |

## 7. Status de maturidade por familia

| Familia | Status operacional | Proxima decisao |
|---|---|---|
| Fundacao: Auth, Usuarios, RBAC | Estavel no escopo auditado | Manter regressao e reabrir se tocar auth/RBAC |
| Comercial: Clientes, Propostas | Estavel com vigilancia | Validar fluxo Proposta -> Projeto com E2E |
| Operacao: Projetos, OS | Parcialmente certificado | Revisar state machines e E2E real |
| Estoque | Certificado em P1/P2 | Expandir E2E de reserva/saida/devolucao |
| Faturamento: Invoices | Conditionally Ready | Validar Invoice -> Payment -> Financeiro |
| Financeiro/Fiscal | Em estruturacao | Auditar APIs, relatórios, ledger e regras fiscais |
| Gestao: Reports/Analytics/Aprovacoes | Parcial/Beta | Remover mocks ativos e definir valor operacional |
| Pessoas: RH/Workforce | Parcial | Definir papel real no dia a dia |
| Documents | Parcial | Completar folders/permissoes/fluxo real |
| Portal | Requer auditoria propria | Validar tokens, escopo de dados e UX cliente |

## 8. O que nao devemos fazer ainda

1. Nao mover pastas grandes sem mapa de links, redirects e testes.
2. Nao declarar modulo production-ready apenas por existir page/API.
3. Nao deixar mocks em telas reais aparentando dados verdadeiros.
4. Nao misturar Fiscal com Financeiro sem respeitar RBAC e sensibilidade.
5. Nao reorganizar sidebar por gosto visual sem fluxo operacional aprovado.
6. Nao criar feature nova antes de classificar se ela completa um fluxo existente.

## 9. Proximas discussoes recomendadas

### 9.1 Sidebar final por operacao

Decidir se a sidebar deve seguir esta proposta:

| Grupo sugerido | Itens provaveis |
|---|---|
| Dashboard | Dashboard, notificacoes |
| Comercial | Clientes, Propostas |
| Operacao | Projetos, Service Orders, Documentos |
| Estoque | Materiais, Equipamentos, Compras, Solicitacoes, Relatorios |
| Financeiro | Receitas, Despesas, Contas, Fluxo de Caixa, Conciliacao, Relatorios |
| Faturamento | Invoices, Pagamentos, Relatorios |
| Fiscal | Impostos, Schedule C, 1099, Owner Compensation, Categorias |
| Pessoas | Usuarios, RH, Workers |
| Gestao | Reports, Analytics, Aprovacoes |
| Sistema | Configuracoes, Auditoria/Eventos, Integracoes, Perfil |

### 9.2 Modulos beta ou ocultos

Definir se ficam visiveis para usuarios finais:

- Reports/Analytics;
- Documents;
- Aprovacoes;
- RH/Workforce;
- Configuracoes nao-admin;
- Portal interno/externo.

### 9.3 Ordem segura de auditoria sistêmica

Recomendacao:

1. Projetos;
2. Invoices;
3. Financeiro;
4. Fiscal;
5. Reports/Analytics;
6. RH/Workforce;
7. Documents;
8. Aprovacoes;
9. Portal.

## 10. Criterio de sucesso desta etapa

Esta etapa sera considerada concluida quando:

1. o time entender o papel de cada modulo;
2. sidebar for decidida com base em fluxo real;
3. modulos parciais forem marcados como beta/ocultos ou entrarem em plano de hardening;
4. proximas auditorias usarem este mapa antes de alterar codigo;
5. cada nova decisao atualizar este documento ou criar ADR relacionado.

## 11. Resumo executivo

O ERP ja possui muitos componentes importantes. O trabalho agora e alinhar:

- fluxo real da empresa;
- permissao por role;
- maturidade dos modulos;
- navegacao;
- testes reais;
- documentacao viva.

O proximo passo seguro e discutir a sidebar final e a ordem de auditoria dos modulos ainda parciais, usando este mapa como referencia.
