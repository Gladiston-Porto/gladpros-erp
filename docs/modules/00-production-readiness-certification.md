# Certificacao Production Readiness — Modulos Auditados

**Data:** 2026-05-12  
**Escopo:** Auth/Login, Usuarios, Clientes, Service Orders/OS, Propostas e Estoque  
**Gate aplicado:** `docs/architecture/06-production-readiness.md`  
**Status:** **Production Ready para o escopo corrigido e validado**

Esta certificacao substitui declaracoes antigas de "modulo completo" ou "pronto para producao" que nao tinham evidencia atual no formato do gate oficial.

## Resultado executivo

Os P1/P2 encontrados durante a re-auditoria foram corrigidos e cobertos por regressao. A validacao final passou com:

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

## Correcoes P1/P2 certificadas

| Modulo | Risco corrigido | Evidencia |
|---|---|---|
| Auth/Login | Reset/MFA/user-status/refresh com vazamentos ou fallback inseguro | `src/app/api/auth/__tests__/auth-security-p1.test.ts`, `src/shared/lib/__tests__/mfa-challenge.test.ts` |
| Usuarios | Hierarquia incompleta em auditoria, seguranca e sessoes | `src/app/api/usuarios/__tests__/user-management-access.test.ts`, suites legadas atualizadas em `src/__tests__/api/usuarios/` |
| Service Orders/OS | Geracao de invoice sem permissao correta, double billing e lock de status terminal | `src/app/api/service-orders/__tests__/os-billing-p1.test.ts` |
| Estoque | Saida manual podia consumir estoque reservado | `src/app/api/estoque/__tests__/movimentacoes-integrity.test.ts` |
| Propostas | Cron sem secret e cancelamento de proposta ja vinculada a projeto | `src/app/api/propostas/__tests__/propostas-flow-p1.test.ts` |
| Exports/Uploads | CSV injection, volume abusivo, Host header em PDF e extensao de upload por filename | `src/app/api/__tests__/export-hardening-p2.test.ts`, `src/app/api/service-orders/__tests__/upload-hardening-p2.test.ts` |

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
| API & Auth | Passou | Rotas sensiveis revisadas com `requireUser`, validacao e formato seguro |
| RBAC & Hierarquia | Passou | Hierarquia centralizada em Usuarios e permissoes reforcadas em OS/Invoices |
| Seguranca OWASP | Passou | Host header, token em body, MFA resend, exports e uploads endurecidos |
| Logica de negocio | Passou | Estoque reservado, proposta vinculada e billing OS/projeto protegidos |
| Fluxo ERP cross-module | Passou | OS -> Invoice, Proposta -> Projeto e Estoque -> Financeiro revisados no escopo |
| Dados sensiveis | Passou | User status e MFA nao expoem dados desnecessarios |
| Performance & escala | Passou | Exports capados/rate-limited e listagens preservadas com limites |
| UI/UX operacional | Sem P1/P2 no escopo | Itens P3 devem continuar em backlog visual/acessibilidade |
| Testes de regressao | Passou | P1/P2 corrigidos possuem regressao |
| Deploy & config | Passou no escopo | `APP_URL` exigido para PDF seguro; cron falha fechado sem secret |

## Riscos e limites

- Esta certificacao cobre o estado atual dos arquivos auditados e commits acima.
- Qualquer mudanca em API, auth, RBAC, Prisma schema, invoice, estoque, proposta, OS, upload, export, cron ou state machine reabre a certificacao do escopo impactado.
- Documentacao antiga em `docs/modules/*` continua como historico quando divergir deste gate.
