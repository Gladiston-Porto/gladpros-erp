# Production Readiness Gate — GladPros ERP

Este documento define o criterio oficial para declarar um modulo do GladPros ERP como **pronto para producao**.

Ele existe para evitar falso positivo de auditoria: um modulo nao pode ser considerado production-ready apenas porque buildou, passou no fluxo feliz, teve uma auditoria anterior ou possui documentacao dizendo "completo".

## Regra principal

Um modulo so pode receber status **Production Ready** quando houver evidencia atual de que:

1. nao existem achados **P1** ou **P2** abertos;
2. todos os P1/P2 encontrados foram corrigidos;
3. cada P1/P2 corrigido possui teste de regressao correspondente;
4. os fluxos de negocio e integracoes cross-module foram validados;
5. seguranca, RBAC, performance, dados sensiveis e operacao real foram verificados;
6. a documentacao do modulo foi atualizada com o estado real.

Auditoria passada nao e certificacao permanente. Qualquer alteracao em API, schema, RBAC, fluxo financeiro, estoque, auth, invoice ou state machine invalida a certificacao ate nova verificacao do escopo impactado.

## Classificacao oficial

| Status | Significado |
|---|---|
| **Production Ready** | Zero P1/P2 abertos, testes de regressao existem para riscos conhecidos, gates abaixo passaram com evidencia. |
| **Conditionally Ready** | Sem P1 aberto, mas ha P2 ou gaps aceitos/documentados com mitigacao clara. Pode ir para uso controlado, nao para liberacao ampla. |
| **Not Ready** | Existe P1 aberto, P2 de integridade/seguranca sem mitigacao, ou falta evidencia de teste para fluxo critico. |
| **Unknown / Needs Re-audit** | Documentacao antiga ou modulo mudou depois da ultima auditoria. Nao declarar como pronto. |

## Severidade

| Prioridade | Bloqueia producao? | Exemplos |
|---|---:|---|
| **P1 — Critico / seguranca / integridade** | Sim | bypass de auth/RBAC, reset token exposto, SSRF com cookie, double billing, estoque negativo, cancelamento que quebra rastreabilidade, cron publico. |
| **P2 — Funcional / escala / abuso** | Sim para liberacao ampla | query sem limite em tabela crescente, rate limit ausente em fluxo sensivel, estado incompleto, upload sem validacao real, refresh/session inconsistente. |
| **P3 — Qualidade / hardening** | Nao, se documentado | response shape inconsistente, log nao estruturado, acessibilidade menor, refatoracao desejavel. |

## Gates obrigatorios

Cada gate deve produzir evidencia com arquivos, linhas, comandos executados ou testes.

| Gate | O que provar |
|---|---|
| **1. API & Auth** | Rotas sensiveis usam `requireUser()`, validam input, retornam formato padrao, nao usam Prisma legado e nao fazem fallback silencioso. |
| **2. RBAC & Hierarquia** | Backend aplica `can()` e regras especificas como `canManageRole()`; frontend nao renderiza acoes proibidas; endpoints laterais tambem respeitam hierarquia. |
| **3. Seguranca OWASP** | Sem Host header poisoning, SSRF, IDOR, mass assignment, dados sensiveis em response/log, upload inseguro, token em body/localStorage, ou rate limit ausente em fluxo sensivel. |
| **4. Logica de negocio** | State machines impedem transicoes invalidas, estados terminais sao realmente terminais, cancelamentos/reopen exigem motivo e AuditLog. |
| **5. Fluxo ERP cross-module** | Integracoes Proposta -> Projeto -> Estoque -> Invoice/Financeiro e OS -> Invoice nao geram dado orfao, double billing ou estoque inconsistente. |
| **6. Dados sensiveis** | SSN/ITIN/EIN ficam criptografados/mascarados; senhas, PINs, tokens e security questions nao sao expostos. |
| **7. Performance & escala** | Listagens crescentes sao paginadas/capadas, exports tem limite/rate limit, sem N+1, indices existem para filtros, queries independentes usam `Promise.all`. |
| **8. UI/UX operacional** | Loading/empty/error, confirmacao para acoes destrutivas, dark mode, acessibilidade e mensagens uteis estao presentes. |
| **9. Testes de regressao** | Cada P1/P2 corrigido possui teste que falharia antes da correcao e passa depois. |
| **10. Deploy & config** | Env vars obrigatorias existem, cron falha fechado, Redis/SMTP/KMS/APP_URL estao documentados e sem fallback inseguro. |

## Protocolo obrigatorio para agentes

Ao auditar ou certificar modulo, o agente deve executar quatro revisoes independentes, mesmo que o modulo ja tenha sido auditado antes:

1. **API auditor** — auth, RBAC, Zod, response format, paginacao, Prisma, errors.
2. **Security reviewer** — OWASP, sessoes, tokens, uploads, exports, dados sensiveis, host headers.
3. **Business-flow validator** — state machines, regras de dominio, invariantes, integracoes ERP.
4. **Performance reviewer** — N+1, unbounded reads, indices, rate limit, cold paths, jobs e exports.

O modulo so pode ser declarado **Production Ready** se as quatro revisoes retornarem zero P1/P2 ou se todo P1/P2 encontrado for corrigido e coberto por teste.

## Evidencia minima exigida

Toda certificacao deve incluir:

- lista de arquivos auditados;
- achados P1/P2/P3 com `arquivo:linha`;
- status de cada gate;
- lista de testes criados/atualizados;
- comandos executados e resultado;
- riscos aceitos, se houver;
- data da certificacao e escopo exato;
- declaracao explicita: `Production Ready`, `Conditionally Ready`, `Not Ready` ou `Needs Re-audit`.

Sem evidencia, a certificacao e invalida.

## Testes obrigatorios para bugs encontrados

Regra:

> Bug P1/P2 corrigido sem teste de regressao continua sendo risco aberto.

Exemplos de regressao obrigatoria:

| Risco | Teste que deve existir |
|---|---|
| Reset link usa Host da request | Enviar `Host: attacker.test` e verificar que o link usa `APP_URL`. |
| PDF SSRF/cookie exfiltration | Verificar que PDF usa origem allowlisted e nao encaminha cookie bruto para host derivado. |
| Gerente gerencia Admin | `GERENTE` nao acessa audit/security/sessions de `ADMIN`. |
| OS gera invoice sem permissao | Role sem `invoices:create` recebe 403. |
| OS ligada a projeto gera invoice duplicada | Criacao de invoice e bloqueada quando billing pertence ao projeto. |
| Proposta com projeto e cancelada | Cancelamento retorna 409/403 e preserva rastreabilidade. |
| Estoque reservado fica negativo | `quantidade=10`, `reservado=8`, `SAIDA=5` falha. |
| Cron sem secret | `CRON_SECRET` ausente falha fechado e nao executa job. |
| MFA resend por userId | Reenvio exige challenge token e aplica rate limit. |

## Regras para documentacao de modulo

Documentos em `docs/modules/<modulo>/` podem dizer que o modulo esta completo apenas se apontarem para a certificacao atual.

Evite frases absolutas como:

- "100% pronto para producao"
- "modulo blindado"
- "P1/P2 resolvidos"

Use somente quando houver evidencia no formato deste gate. Caso contrario, use:

- "implementado, pendente de certificacao";
- "auditado em <data>, requer re-auditoria apos mudancas";
- "Conditionally Ready com os seguintes riscos aceitos".

## Quando reabrir certificacao

Re-auditoria e obrigatoria quando houver:

- alteracao em `prisma/schema.prisma`;
- nova rota de API ou mudanca de permissao;
- alteracao em auth, MFA, refresh, logout, reset, cookies ou tokenVersion;
- alteracao em status machine;
- mudanca em invoice, pagamento, estoque, compra, material, projeto ou proposta;
- nova integracao externa, upload, export, PDF, AI ou cron;
- correcao emergencial feita sem teste de regressao.

## Prompt recomendado para futuras auditorias

Use este formato:

```text
Tente provar que o modulo <nome> NAO esta pronto para producao.
Siga docs/architecture/06-production-readiness.md.
Execute revisoes independentes de API, seguranca, negocio/ERP e performance.
Classifique achados P1/P2/P3 com arquivo:linha.
Nao declare Production Ready se houver P1/P2 aberto ou se P1/P2 corrigido nao tiver teste de regressao.
```
