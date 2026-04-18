# Módulo Projetos — Especificação Técnica

## 1. Visão Geral
- **Objetivo**: Transformar propostas aprovadas em projetos executáveis com controle integral de escopo, etapas, materiais, equipe, custos e auditoria.
- **Integrações planejadas**: futuros módulos de Estoque, Almoxarifado, Triagem, Financeiro e Dashboard do Cliente.
- **Padrões existentes**: seguir a arquitetura modular do monorepo (`src/domains`, `packages/*`) e preservar o design system atual (GladPros UI + Tailwind).

## 2. Escopo por Fase
1. **Fase 0 – Definições**: alinhar status, RBAC e campos sensíveis.
2. **Fase 1 – Banco de Dados**: criar Migração 1 com tabelas base (`projetos`, `projetos_etapas`, `projetos_materiais`, `projetos_anexos`, `projetos_historico`, `projetos_tarefas`).
3. **Fase 2 – Backend Core**: serviços de domínio, validações, RBAC, auditoria e API REST `/api/projetos`.
4. **Fase 3 – Ponte Estoque**: Migração 2 e endpoints de liberação/devolução integráveis ao módulo de estoque.
5. **Fase 4 – Triagens**: gatilhos para triagem de materiais/equipamentos na transição de status.
6. **Fase 5 – Financeiro**: geração de invoices/pagamentos e resumo financeiro protegido.
7. **Fase 6 – Notificações & Automação**: eventos WebSocket, cron jobs e e-mails automáticos.
8. **Fase 7 – Frontend**: rotas protegidas, componentes (kanban, timeline, financeiro, histórico) e testes E2E.

## 3. Status e Transições
```
planejado → em_execucao → em_inspecao → aguardando_devolucoes → concluido → arquivado
```
- Exceções: `suspenso`, `cancelado` (com justificativa).
- Regras-chave:
  - `em_execucao`: requer equipe atribuída + ao menos uma etapa pendente.
  - `em_inspecao`: 100% etapas concluídas ou marcadas como “adiadas”.
  - `aguardando_devolucoes`: abre triagens automáticas para materiais/equipamentos pendentes.
  - `concluido`: somente com triagens finalizadas e sem pendências.
  - `suspenso/cancelado`: somente se materiais não estiverem em uso e tarefas críticas resolvidas (ou com justificativa obrigatória).

## 4. RBAC e Campos Sensíveis
| Papel        | Permissões                                                                 | Acesso a valores sensíveis |
|--------------|-----------------------------------------------------------------------------|-----------------------------|
| ADMIN        | CRUD total                                                                  | Sim                         |
| GERENTE      | CRUD completo (exceto campos financeiros)                                   | Não                         |
| USUARIO      | Operacional (igual a GERENTE)                                               | Não                         |
| FINANCEIRO   | Leitura geral + rotas financeiras                                           | Sim                         |
| ESTOQUE      | Leitura do projeto + operações de materiais/triagens                        | Não                         |
| CLIENTE      | Seus próprios projetos (status, cronograma, anexos públicos, invoices dele) | Não                         |

- Campos sensíveis (visíveis somente para ADMIN/FINANCEIRO): `valor_estimado`, `custo_previsto`, `custo_real`, `margem_prevista`, `margem_real`, `lucro_previsto`, `lucro_real`.
- Serialização: implementar `ProjectPresenter` aplicando máscaras conforme RBAC.

## 5. Modelagem de Dados (Migração 1)
- Tabelas descritas conforme briefing (`projetos`, `projetos_etapas`, `projetos_materiais`, `projetos_anexos`, `projetos_historico`, `projetos_tarefas`).
- Índices previstos: `idx_projetos_cliente_status`, `idx_projetos_responsavel_status`, `idx_projetos_datas`, `idx_etapas_projeto_ordem`, `idx_materiais_projeto_status`, entre outros.
- Integrações futuras: `centro_custo_id`, FKs de estoque (`movimentacoes`), triagem e financeiro ficarão opcionais e serão ativadas nas fases 3–5.

## 6. Serviços e Camadas
- `ProjectService`: criação, atualização, transições de status e mascaramento.
- `ProjectStageService`: gestão das etapas (CRUD + porcentagem).
- `ProjectMaterialService`: planejamento, liberação, devolução, integração com estoque.
- `ProjectTaskService`: tarefas vinculadas à etapa/projeto.
- `ProjectAttachmentService`: upload, flag público para cliente e exclusão.
- `ProjectHistoryService`: auditoria centralizada.
- `ProjectNumberService`: geração sequencial `PRJ-YYYY-####`, reutilizando lógica do módulo Propostas.
- `ProjectEventEmitter`: publicar eventos para WebSockets/cron.

## 7. API REST (Fase 2)
- Base `/api/projetos` seguindo padrão Next.js App Router.
- Endpoints principais: `POST /`, `GET /`, `GET /:id`, `PUT /:id`, `PATCH /:id/status`, `DELETE /:id` (admin), subrotas para etapas, materiais, tarefas, anexos, histórico.
- Middleware: autenticação JWT/MFA existente + guardas RBAC.
- Validações: `express-validator` ou Zod (conforme padrão atual), sanitização, rate-limit, Helmet.
- Auditoria: cada alteração relevante gera registro em `projetos_historico` (antes/depois, usuário, timestamp).

## 8. Integrações Futuras
- **Estoque/Almoxarifado**: Migração 2 (`projetos_movimentacoes_estoque`) + endpoints `liberar` / `devolver` com geração de movimentações.
- **Triagens**: gatilhos automáticos ao entrar em `aguardando_devolucoes`, integrados às tabelas de triagem quando criadas.
- **Financeiro**: geração de invoices baseada em condições da proposta, repasse de custos dos materiais, resumos protegidos.
- **Dashboard Cliente**: endpoints dedicados e máscaras adicionais, reaproveitando o módulo `dashboard` existente.

## 9. Eventos, Notificações e Automação
- Eventos WebSocket: `projeto.criado`, `projeto.status_alterado`, `projeto.material.*`, `projeto.tarefa.*`, `invoice.*`.
- Automação (cron/queue): lembretes de prazo, alertas de estoque baixo, invoices pendentes, triagens pendentes, limpeza de tokens expirada.
- Notificações/E-mails: status, liberação de materiais, devoluções e invoices.

## 10. Frontend
- Rotas protegidas: `/projetos`, `/projetos/:id` com abas (Resumo, Financeiro, Etapas, Materiais, Tarefas, Triagens, Anexos, Histórico).
- Componentização seguindo design system atual (GladPros UI, Tailwind, componentes existentes).
- Componentes chave: `ProjectCard`, `ProjectStatusBadge`, `StageKanban`, `StageTimeline`, `MaterialList`, `MaterialActionDialog`, `TaskBoard`, `FinancePanel`, `HistoryTimeline`.
- Storybook: documentar estados, tokens de cor e variações RBAC.
- Testes: React Testing Library + Cypress.

## 11. Testes e Qualidade
- Backend: Jest + SuperTest para fluxos principais (criação, transições válidas/ inválidas, materiais, RBAC, auditoria).
- Frontend: RTL (componentes) e Cypress (fluxos E2E).
- cURL scripts: smoke tests documentados para cada rota crítica.
- Observabilidade: logs com Pino/Winston e integração Sentry, seguindo padrão atual.

## 12. Layout & Design
- Respeitar layout e design existentes (GladPros UI): cabeçalho, breadcrumbs, cards, badges e tonais correspondentes.
- Garantir responsividade e consistência com módulos já lançados.
- Alinhar com tokens de cor e tipografia definidos na biblioteca `packages/ui`.

## 13. Entregáveis de Cada Etapa
1. Especificação, diretórios do domínio, contratos iniciais.
2. Migração Prisma (review e testes básicos).
3. Serviços de domínio com testes unitários.
4. API REST completa com RBAC e auditoria.
5. Ponte de estoque (migração 2 + endpoints de liberação/devolução).
6. Gatilhos de triagem e bloqueios de status.
7. Integração financeira (invoices, resumos, mascaramento).
8. Eventos & notificações.
9. Frontend completo com Storybook e E2E.
10. Documentação final (README do módulo, manual de API, roteiros de testes).

---
Atualizado em: 03/out/2025.
