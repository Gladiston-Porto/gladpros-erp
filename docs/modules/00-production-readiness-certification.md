# Certificacao Production Readiness — Modulos Auditados

**Data:** 2026-05-12  
**Escopo:** Auth/Login, Usuarios, Clientes, Service Orders/OS, Propostas e Estoque  
**Gate aplicado:** `docs/architecture/06-production-readiness.md`  
**Status:** **Conditionally Ready — P1 corrigidos; P2 complementares ainda abertos**

Esta certificacao substitui declaracoes antigas de "modulo completo" ou "pronto para producao" que nao tinham evidencia atual no formato do gate oficial.

> Correcao de status: esta documentacao foi inicialmente registrada como "Production Ready para o escopo corrigido e validado". A revisao item-a-item do plano mostrou P2 complementares ainda nao fechados. Portanto, o status correto e **Conditionally Ready**, nao Production Ready amplo.

## Resultado executivo

Os P1 principais encontrados durante a re-auditoria foram corrigidos e cobertos por regressao. Parte dos P2 de hardening tambem foi corrigida. A validacao tecnica do escopo alterado passou com:

```bash
git diff --check
npm run check
```

## Evidencia de commits

| Commit | Conteudo |
|---|---|
| `35f278f` | P1 de production readiness: Auth/Login, Usuarios, OS billing, Estoque e Propostas |
| `17760f1` | P2 de hardening: exports, uploads, limites, rate limit e Host header |
| `da2a018` | Atualizacao de suites legadas para validar os novos gates |

## Correcoes P1/P2 ja fechadas

| Modulo | Risco corrigido | Evidencia |
|---|---|---|
| Auth/Login | Reset/MFA/user-status/refresh com vazamentos ou fallback inseguro | `src/app/api/auth/__tests__/auth-security-p1.test.ts`, `src/shared/lib/__tests__/mfa-challenge.test.ts` |
| Usuarios | Hierarquia incompleta em auditoria, seguranca e sessoes | `src/app/api/usuarios/__tests__/user-management-access.test.ts`, suites legadas atualizadas em `src/__tests__/api/usuarios/` |
| Service Orders/OS | Geracao de invoice sem permissao correta, double billing e lock de status terminal | `src/app/api/service-orders/__tests__/os-billing-p1.test.ts` |
| Estoque | Saida manual podia consumir estoque reservado | `src/app/api/estoque/__tests__/movimentacoes-integrity.test.ts` |
| Propostas | Cron sem secret e cancelamento de proposta ja vinculada a projeto | `src/app/api/propostas/__tests__/propostas-flow-p1.test.ts` |
| Exports/Uploads | CSV injection, volume abusivo, Host header em PDF e extensao de upload por filename | `src/app/api/__tests__/export-hardening-p2.test.ts`, `src/app/api/service-orders/__tests__/upload-hardening-p2.test.ts` |

## P2 complementares ainda abertos

Estes itens bloqueiam a declaracao ampla de **Production Ready** ate serem corrigidos ou formalmente aceitos com mitigacao.

| Prioridade | Modulo | Pendencia | Evidencia atual |
|---|---|---|---|
| P2 | Service Orders/Uploads | Validar magic bytes/assinatura real do arquivo antes de persistir. Hoje a rota valida MIME declarado, tamanho e extensao derivada do MIME, mas grava o `arrayBuffer` sem conferir assinatura. | `src/app/api/service-orders/[id]/attachments/route.ts:180-206` |
| P2 | Estoque | Paginar/capar snapshot de inventario. A rota usa `materialSaldo.findMany()` sem `take/skip`. | `src/app/api/estoque/inventario/route.ts:137-145` |
| P2 | Estoque | Paginar/capar relatorio de inventario. A query raw de materiais e a listagem de equipamentos nao aplicam limite/paginacao. | `src/app/api/estoque/relatorios/inventario/route.ts:58-90` |
| P2 | Clientes | Garantir fallback legado de endereco em todos os retornos relevantes. A listagem/detalhe retornam campos `address*` diretamente, sem fallback visivel para `cidade/estado/zipcode`. | `src/app/api/clientes/route.ts:167-181`, `src/app/api/clientes/[id]/route.ts:108-121` |
| P2 | Propostas | Confirmar e fechar politica de `gatilhoFaturamento`: cada valor precisa estar implementado ou bloqueado/desabilitado se ainda nao suportado. Hoje o campo e persistido diretamente. | `src/app/api/propostas/route.ts:207-209`, `src/app/api/propostas/[id]/route.ts:147-149` |

## Regra sobre mocks em testes

Mocks sao permitidos em testes unitarios para isolar regras de negocio, permissao, erro e resposta sem depender de banco real ou servicos externos. Eles nao podem existir em codigo de producao nem ser usados como unica evidencia de readiness.

Para declarar um modulo production-ready:

1. Testes unitarios podem usar mocks, mas devem validar regras reais.
2. Fluxos criticos precisam ter validacao integrada, E2E ou contrato real com dados controlados.
3. Botao, grafico, card ou exportacao nao deve depender de dado fake em producao.
4. Arquivos `src/app/**`, `src/components/**` e `src/app/api/**` nao devem conter mock/demo data ativo no fluxo real.
5. Se a unica prova de um comportamento for um mock, o item fica como risco P2 ate haver validacao do fluxo real.

## Gates

| Gate | Status | Observacao |
|---|---|---|
| API & Auth | Passou para P1 | Rotas sensiveis revisadas com `requireUser`, validacao e formato seguro no escopo corrigido |
| RBAC & Hierarquia | Passou para P1 | Hierarquia centralizada em Usuarios e permissoes reforcadas em OS/Invoices |
| Seguranca OWASP | Parcial | Host header, token em body, MFA resend e exports foram endurecidos; upload ainda precisa magic bytes |
| Logica de negocio | Parcial | Estoque reservado, proposta vinculada e billing OS/projeto protegidos; gatilhos de faturamento ainda precisam fechamento |
| Fluxo ERP cross-module | Parcial | OS -> Invoice, Proposta -> Projeto e Estoque -> Financeiro revisados no escopo; gatilhos pendentes |
| Dados sensiveis | Passou para P1 | User status e MFA nao expoem dados desnecessarios |
| Performance & escala | Parcial | Exports capados/rate-limited; inventario/relatorio de estoque ainda precisam limite/paginacao |
| UI/UX operacional | Sem P1/P2 no escopo | Itens P3 devem continuar em backlog visual/acessibilidade |
| Testes de regressao | Parcial | P1/P2 corrigidos possuem regressao; P2 abertos ainda precisam testes apos correcao |
| Deploy & config | Passou no escopo | `APP_URL` exigido para PDF seguro; cron falha fechado sem secret |

## Riscos e limites

- Esta certificacao cobre o estado atual dos arquivos auditados e commits acima, mas nao declara Production Ready amplo enquanto os P2 complementares estiverem abertos.
- Qualquer mudanca em API, auth, RBAC, Prisma schema, invoice, estoque, proposta, OS, upload, export, cron ou state machine reabre a certificacao do escopo impactado.
- Documentacao antiga em `docs/modules/*` continua como historico quando divergir deste gate.

## Fase pendente para concluir o plano em sua totalidade

1. Corrigir upload com validacao de magic bytes e regressao.
2. Paginar/capar inventario e relatorios grandes de estoque, com regressao.
3. Corrigir/confirmar fallback legado de endereco em Clientes, com regressao.
4. Implementar, bloquear ou desabilitar gatilhos de faturamento de Propostas ainda nao suportados, com regressao.
5. Rodar novamente `git diff --check`, `npm run check` e certificacao por modulo.
6. Atualizar este documento para **Production Ready** somente se nao restar P1/P2 aberto.
