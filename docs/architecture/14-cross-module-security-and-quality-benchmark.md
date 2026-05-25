# 14 - Benchmark Unificado de Auditoria por Modulo (Interno + OWASP/NIST)

> Objetivo: padronizar como todos os modulos do GladPros ERP sao auditados, com os mesmos parametros tecnicos, de negocio e seguranca.
>
> Escopo: aplicavel a todos os modulos em `docs/modules/*` e a todas as APIs em `src/app/api/**`.

## 1. Classificacao de severidade

| Severidade | Definicao                                                                    | Exemplo                                                     |
| ---------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| P1         | Risco critico de seguranca, integridade ou acesso indevido                   | bypass de auth, replay MFA, IDOR critico                    |
| P2         | Risco funcional importante, exposicao parcial ou inconsistencia de seguranca | enum de conta, cookie scope incorreto, validacao incompleta |
| P3         | Qualidade, manutenibilidade, UX tecnica, observabilidade                     | mensagens ambiguas, testes faltando, logs pobres            |

Regra de decisao:

- `Not Ready`: existe qualquer P1 aberto.
- `Conditionally Ready`: sem P1, com P2 mitigado e escopo controlado.
- `Production Ready`: zero P1/P2 abertos + regressao coberta + evidencias atualizadas.
- `Needs Re-audit`: houve mudanca relevante no escopo sem recertificacao.

## 2. Gate obrigatorio por modulo

1. API/RBAC

- Auth correta (`requireUser` ou excecao documentada para `/api/auth/*` etc.)
- Checagem `can()` em operacoes sensiveis
- Resposta padrao `{ data, success }` ou `{ error, message, success }`

2. Seguranca de autenticacao e sessao

- Anti-enumeracao em login/recovery
- Rate-limit e lockout validos
- Tokens/cookies com flags corretas e escopo minimo
- Regras de MFA (one-time, TTL curto, anti-replay, invalidacao correta)

3. Integridade de negocio

- Estados e transicoes validas
- Sem bypass de fluxo critico (proposta/projeto/estoque/financeiro etc.)
- Sem efeitos colaterais silenciosos em modulo adjacente

4. Dados sensiveis

- Nenhum segredo em texto claro em log/response
- Criptografia/mascara quando exigido
- Menor privilegio em payload de resposta

5. Performance minima segura

- Sem N+1
- Paginacao em listagens
- Queries independentes em `Promise.all`
- Campos de filtro com indice quando aplicavel

6. Testabilidade e regressao

- Teste de regressao para todo bug P1/P2 corrigido
- Testes de contrato para status code e formato de resposta
- Sem regressao no fluxo feliz e no fluxo de falha

## 3. Parametros externos de mercado (benchmark)

### OWASP - Authentication/MFA

Parametros obrigatorios no modulo:

- Erros genericos para evitar discrepancy factor (anti-user-enumeration)
- MFA para acoes sensiveis e perfis de maior privilegio
- OTP com TTL curto, uso unico e limite de tentativa
- Fluxo seguro de reset/recovery de MFA
- Reautenticacao em eventos de risco (mudanca de credencial/dispositivo)

Fontes:

- OWASP Authentication Cheat Sheet
- OWASP Multifactor Authentication Cheat Sheet

### NIST SP 800-63B (mapeamento pratico)

Parametros minimos adotados no ERP:

- Replay resistance: autenticador one-time nao pode aceitar reutilizacao
- Rate limiting por autenticador e por conta
- Sessao com segredo curto, cookie seguro e timeout coerente
- Canal protegido para autenticacao e transporte de credenciais

Fonte:

- NIST SP 800-63B (Digital Identity Guidelines)

## 4. Evidencias minimas para fechar auditoria

Toda revisao de modulo deve anexar:

1. Lista de findings com severidade (`P1/P2/P3`) e localizacao de arquivo.
2. Resultado de testes relevantes (unitario/integracao/e2e quando houver).
3. Evidencia de que P1/P2 corrigidos possuem teste de regressao.
4. Status final do modulo (`Production Ready`, `Conditionally Ready`, `Not Ready`, `Needs Re-audit`).

## 5. Fluxo padrao de execucao (repetivel em todos os modulos)

1. Levantar escopo do modulo e fluxos criticos.
2. Rodar auditoria interna (regras do AGENTS + gate de producao).
3. Confrontar com benchmark externo (OWASP/NIST).
4. Corrigir por prioridade: P1 -> P2 -> P3.
5. Validar com testes locais e atualizar evidencias.
6. Publicar status final com riscos residuais.

## 6. Checklist curto para uso diario

- [ ] Sem P1 aberto
- [ ] P2 de seguranca mitigado
- [ ] Contrato de API consistente
- [ ] MFA/OTP sem replay
- [ ] Cookies e sessao com escopo minimo
- [ ] Testes de regressao para fixes criticos
- [ ] Status final do modulo definido com evidencia
