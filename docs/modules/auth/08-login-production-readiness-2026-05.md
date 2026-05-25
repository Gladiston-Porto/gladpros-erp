# 08 - Login/Auth Production Readiness (2026-05)

Data: 2026-05-24
Escopo: login, MFA (request/resend/verify), unlock, user-status, forgot/reset password.

## 1. Status Final

Status: Production Ready (escopo login/auth)

Base de decisão:

- Zero findings P1/P2 abertos no escopo tratado nesta rodada.
- Regressões críticas cobertas por testes automatizados.
- Contratos de API alinhados com anti-enumeração e one-time code safety.

## 2. Correções Críticas Aplicadas

1. Anti-enumeração em login para conta inativa/bloqueada:

- Respostas genéricas 401 sem metadados de bloqueio.
- Arquivo: src/app/api/auth/login/route.ts

2. Consumo atômico de credenciais one-time:

- MFA code: update atômico com guarda de uso/expiração.
- Backup code: consumo atômico com usadoEm IS NULL.
- Arquivos: src/shared/lib/mfa.ts, src/app/api/auth/mfa/verify/route.ts

3. Falha de entrega MFA com erro explícito:

- request/resend retornam 503 com MFA_DELIVERY_FAILED quando SMTP falha.
- Arquivos: src/app/api/auth/mfa/request/route.ts, src/app/api/auth/mfa/resend/route.ts

4. Endurecimento de desbloqueio:

- user-status neutralizado para não revelar estado da conta.
- unlock migrou de userId exposto para email, com resolução interna.
- Erros de unlock padronizados para mensagem genérica.
- Arquivos: src/app/api/auth/user-status/route.ts, src/app/api/auth/unlock/route.ts, src/shared/lib/validation.ts, src/app/desbloqueio/page.tsx

5. Higiene de observabilidade em testes:

- Erros esperados UNAUTHENTICATED/FORBIDDEN não são logados como erro interno no ambiente de teste.
- Arquivo: src/lib/api/error-handler.ts

## 3. Evidências de Teste

Execução validada em 2026-05-24:

1. Suíte auth ampliada

- Comando: npx jest src/**tests**/api/auth/\*.test.ts src/app/api/auth/**tests**/auth-security-p1.test.ts src/shared/lib/**tests**/mfa.test.ts --runInBand
- Resultado: 17 suites, 157 testes, 0 falhas

2. Revalidação pós-ajuste de logging

- Comando: npx jest src/**tests**/api/auth/me-security.test.ts src/**tests**/api/auth/me.test.ts src/**tests**/api/auth/me-avatar.test.ts --runInBand
- Resultado: 3 suites, 43 testes, 0 falhas

## 4. Gate de Segurança (Resumo)

1. Auth/RBAC:

- Rotas de auth públicas mantidas no escopo permitido.
- Sem bypass novo identificado no fluxo login/MFA.

2. Anti-enumeração:

- Login e user-status não diferenciam existência/estado de conta via payload sensível.

3. Replay resistance:

- Credenciais MFA one-time não aceitam reutilização concorrente.

4. Recovery safety:

- Unlock sem exposição de identificador interno (userId) no cliente.

## 5. Riscos Residuais

1. Certificação programática oficial depende de governance do módulo em relatorios/modulos/auth.
2. O status deste documento é válido para o escopo auditado nesta rodada; mudanças futuras em auth exigem revalidação.

## 6. Próxima Revalidação Recomendada

Revalidar este documento quando houver qualquer mudança em:

- src/app/api/auth/login/route.ts
- src/app/api/auth/mfa/\*\*
- src/app/api/auth/unlock/route.ts
- src/app/api/auth/user-status/route.ts
- src/shared/lib/mfa.ts
- src/lib/api/error-handler.ts
