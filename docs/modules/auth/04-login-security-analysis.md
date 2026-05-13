# 🛡️ ANÁLISE DE SEGURANÇA: Módulo de Login e Autenticação
**Data:** 18 de Novembro de 2025
**Autor:** GitHub Copilot (Auditoria de Segurança)
**Status:** 🔴 CRÍTICO - Vulnerabilidades Confirmadas

---

## 1. Resumo Executivo

A auditoria confirmou a suspeita de vulnerabilidade no controle de sessões. Embora o sistema possua uma infraestrutura robusta de segurança implementada (`TokenService`, `KMS`, `Token Rotation`), **ela não está sendo utilizada pelo fluxo de login principal**.

O endpoint de verificação de MFA (`/api/auth/mfa/verify`) está gerando tokens manualmente com duração fixa de **24 horas**, ignorando completamente a lógica de tokens de curta duração (15 min) e rotação de refresh tokens que foi desenhada para o projeto.

**Conclusão:** O sistema está operando em modo de "segurança degradada", expondo usuários a riscos de sequestro de sessão (Session Hijacking) prolongado.

---

## 2. Diagnóstico Técnico

### 🔴 Problema 1: Token de Acesso Excessivamente Longo
**Local:** `src/app/api/auth/mfa/verify/route.ts` (Linha ~156)
**Código Atual:**
```typescript
const token = await signAuthJWT({ ... }, "24h"); // Hardcoded 24 horas
```
**Comportamento Esperado:** O token de acesso deveria durar apenas **15 minutos** (definido em `src/lib/auth/token-service.ts`).
**Risco:** Se um token for roubado (via XSS ou malware), o atacante tem acesso total por 24 horas, mesmo que a senha do usuário seja alterada.

### 🔴 Problema 2: Ausência de Refresh Token
**Local:** `src/app/api/auth/mfa/verify/route.ts`
**Falha:** O endpoint retorna apenas o `authToken` (Access Token). Não há geração nem envio do `refreshToken`.
**Consequência:**
1.  O sistema de **Token Rotation** (VUL-003) nunca é ativado.
2.  Não há como renovar a sessão de forma segura sem pedir login novamente (o que é mascarado pelo token de 24h).
3.  O endpoint de logout (`/api/auth/logout`) tenta revogar um refresh token que nunca existiu no cookie.

### 🔴 Problema 3: Bypass do TokenService
O projeto possui um serviço dedicado (`src/lib/auth/token-service.ts`) que implementa:
- Geração de par de chaves (Access + Refresh).
- Rastreamento de IP/User-Agent.
- Detecção de reutilização de tokens.
- Integração com KMS.

**O fluxo de login atual ignora este serviço e usa uma função utilitária básica (`signAuthJWT`) do `jose`.**

### 🔴 Problema 4: Middleware Permissivo (Falha de Lógica)
**Local:** `middleware.ts`
**Falha:** O middleware atual implementa Rate Limiting, IP Blocking e Headers de Segurança, mas **não verifica se o usuário está autenticado**.
**Consequência:**
1.  Qualquer usuário pode acessar rotas protegidas (ex: `/dashboard`) sem estar logado, a menos que a própria página faça a verificação (o que é inseguro e inconsistente).
2.  A regra de "Sempre redirecionar para login" não está sendo cumprida.

---

## 3. Evidências

| Componente | Implementação Atual (Real) | Implementação Segura (Planejada) |
|------------|---------------------------|----------------------------------|
| **Geração de Token** | `signAuthJWT(payload, "24h")` | `TokenService.generateTokenPair(userId)` |
| **Duração Access Token** | 24 Horas | 15 Minutos |
| **Refresh Token** | Inexistente | 7 Dias (com rotação a cada uso) |
| **Cookie** | Apenas `authToken` | `authToken` + `refreshToken` (HttpOnly) |
| **Logout** | Remove cookie (token JWT continua válido até expirar) | Revoga refresh token no banco (invalidação imediata) |

---

## 4. Plano de Correção Imediata

Para corrigir essas vulnerabilidades, é necessário refatorar o endpoint de verificação de MFA e o Middleware.

### Passo 1: Integrar TokenService no Login
Alterar `src/app/api/auth/mfa/verify/route.ts` para:
1.  Importar `generateTokenPair` de `@/lib/auth/token-service`.
2.  Substituir a chamada `signAuthJWT` por `generateTokenPair`.
3.  Configurar dois cookies na resposta:
    *   `accessToken`: 15 min, HttpOnly, SameSite=Lax.
    *   `refreshToken`: 7 dias, HttpOnly, SameSite=Lax, Path=/api/auth/refresh.

### Passo 2: Implementar Proteção no Middleware
Atualizar `middleware.ts` para:
1.  Verificar a presença do cookie `authToken` (ou `accessToken`).
2.  Se não existir e a rota for protegida (ex: `/dashboard`, `/financeiro`), redirecionar para `/login`.
3.  Se o token estiver expirado (mas existir refresh token), tentar renovar (opcional, ou deixar o frontend lidar).

### Passo 3: Implementar Rotação no Frontend
O frontend precisa saber lidar com a expiração de 15 minutos.
1.  Verificar se existe um interceptor no `axios` ou `fetch` que captura erros 401.
2.  Se receber 401, tentar chamar `/api/auth/refresh` automaticamente.
3.  Se o refresh falhar, redirecionar para login.

### Passo 4: Corrigir Logout
Garantir que o logout chame `revokeRefreshToken` corretamente, passando o token que agora estará disponível nos cookies.

---

## 6. Execução das Correções (Status: ✅ CONCLUÍDO)

### ✅ Middleware Refatorado
- **Arquivo:** `middleware.ts`
- **Ação:** Implementada verificação rigorosa de autenticação.
- **Resultado:** Rotas protegidas agora redirecionam para login se o cookie estiver ausente.

### ✅ Endpoint MFA Refatorado
- **Arquivo:** `src/app/api/auth/mfa/verify/route.ts`
- **Ação:** Substituída geração manual de token por `TokenService.generateTokenPair`.
- **Resultado:** Tokens agora seguem a política de segurança (15m Access / 7d Refresh) e são assinados com chave KMS.

### ✅ Validação de Sessão Unificada
- **Problema Identificado:** O componente `requireServerUser` (usado em Layouts) falhava ao validar tokens gerados pelo `TokenService` devido a incompatibilidade de chaves (Env vs KMS).
- **Correção:** Atualizado `src/shared/lib/requireServerUser.ts` para usar `TokenService.validateAccessToken`.
- **Resultado:** O fluxo de login completo (Login -> MFA -> Dashboard) foi validado com sucesso via teste automatizado (`test-full-login-flow.js`).

## 7. Próximos Passos
- [ ] Monitorar logs de produção para garantir que a rotação de chaves KMS não cause invalidação em massa (chaves antigas devem ser aceitas por um período).
- [ ] Implementar interceptor no Frontend para renovação automática do Access Token (15 min) usando o Refresh Token.
