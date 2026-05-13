# Certificacao Production Readiness — Modulos Auditados

**Data:** 2026-05-12  
**Escopo:** Auth/Login, Usuarios, Clientes, Service Orders/OS, Propostas e Estoque  
**Gate aplicado:** `docs/architecture/06-production-readiness.md`  
**Status:** **Production Ready — P1/P2 do plano fechados e cobertos por regressao**

Esta certificacao substitui declaracoes antigas de "modulo completo" ou "pronto para producao" que nao tinham evidencia atual no formato do gate oficial.

> Correcao de rumo: esta documentacao chegou a ser rebaixada para **Conditionally Ready** porque a revisao item-a-item encontrou P2 complementares abertos. Esses P2 foram entao tratados e cobertos por regressao antes desta certificacao final.

## Resultado executivo

Os P1/P2 do plano foram corrigidos e cobertos por regressao. A validacao tecnica do escopo alterado passou com:

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

## P2 complementares fechados apos revisao do plano

Estes itens foram identificados depois da primeira certificacao e agora fazem parte da evidencia final.

| Prioridade | Modulo | Correcao | Evidencia |
|---|---|---|---|
| P2 | Service Orders/Uploads | Valida magic bytes/assinatura real antes de persistir; rejeita conteudo que nao corresponde ao MIME declarado. | `src/app/api/service-orders/[id]/attachments/route.ts`, `src/app/api/service-orders/__tests__/upload-hardening-p2.test.ts` |
| P2 | Estoque | Snapshot de inventario agora usa `page/pageSize`, cap de 100, `take/skip` e metadados de paginacao. | `src/app/api/estoque/inventario/route.ts`, `src/app/api/estoque/__tests__/inventario-pagination-p2.test.ts` |
| P2 | Estoque | Relatorio de inventario agora pagina/capa listas detalhadas de materiais e equipamentos. | `src/app/api/estoque/relatorios/inventario/route.ts`, `src/app/api/estoque/__tests__/inventario-pagination-p2.test.ts` |
| P2 | Clientes | Listagem e detalhe usam fallback de `endereco` legado para `addressStreet/addressCity/addressState/addressZip` e aliases `cidade/estado/zipcode`. | `src/app/api/clientes/route.ts`, `src/app/api/clientes/[id]/route.ts`, `src/__tests__/api/clientes/route.test.ts`, `src/__tests__/api/clientes/detail.route.test.ts` |
| P2 | Propostas | Gatilhos de faturamento nao suportados (`POR_MARCOS`, `NA_ENTREGA`, `CUSTOMIZADO`) sao bloqueados ate implementacao completa; apenas `NA_APROVACAO` fica habilitado em producao. | `src/domains/proposals/services/billingTriggerPolicy.ts`, `src/domains/proposals/services/__tests__/billingTriggerPolicy.test.ts` |

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
| Seguranca OWASP | Passou | Host header, token em body, MFA resend, exports e upload com magic bytes foram endurecidos |
| Logica de negocio | Passou | Estoque reservado, proposta vinculada, billing OS/projeto e gatilhos de faturamento protegidos |
| Fluxo ERP cross-module | Passou | OS -> Invoice, Proposta -> Projeto e Estoque -> Financeiro revisados no escopo; gatilhos nao suportados falham fechado |
| Dados sensiveis | Passou para P1 | User status e MFA nao expoem dados desnecessarios |
| Performance & escala | Passou | Exports capados/rate-limited; inventario e relatorio de estoque paginados/capados |
| UI/UX operacional | Sem P1/P2 no escopo | Itens P3 devem continuar em backlog visual/acessibilidade |
| Testes de regressao | Passou | P1/P2 corrigidos possuem regressao |
| Deploy & config | Passou no escopo | `APP_URL` exigido para PDF seguro; cron falha fechado sem secret |

## Riscos e limites

- Esta certificacao cobre o estado atual dos arquivos auditados e dos P1/P2 listados acima.
- Qualquer mudanca em API, auth, RBAC, Prisma schema, invoice, estoque, proposta, OS, upload, export, cron ou state machine reabre a certificacao do escopo impactado.
- Documentacao antiga em `docs/modules/*` continua como historico quando divergir deste gate.

## Criterio para manter o status

O status **Production Ready** deve ser reaberto para **Needs Re-audit** se qualquer mudanca futura tocar API, auth, RBAC, Prisma schema, invoice, estoque, proposta, OS, upload, export, cron ou state machine.
