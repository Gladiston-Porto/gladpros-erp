# Módulo Auth — Atualização 2026-04-19

**Tipo**: Expansão de cobertura de testes unitários  
**Status**: ✅ Aplicado

---

## O que foi feito

### Testes unitários — 5 novas suites criadas

Durante varredura de qualidade, identificou-se que 5 rotas do módulo auth não tinham testes unitários. Todas as rotas de auth são intencionalmente públicas (não usam `requireUser` — são o ponto de entrada do sistema), então o critério de "sem requireUser = risco" não se aplica. A ausência de testes, entretanto, era uma lacuna real.

| Arquivo criado | Testes | Rotas cobertas |
|---|---|---|
| `src/__tests__/api/auth/forgot-password.test.ts` | 6 | `POST /api/auth/forgot-password` |
| `src/__tests__/api/auth/reset-password.test.ts` | 8 | `POST /api/auth/reset-password` |
| `src/__tests__/api/auth/unlock.test.ts` | 9 | `POST /api/auth/unlock` |
| `src/__tests__/api/auth/first-access-setup.test.ts` | 11 | `POST /api/auth/first-access/setup` |
| `src/__tests__/api/auth/refresh.test.ts` | 9 | `POST /api/auth/refresh` |

**Total da suite após atualização**: 63/63 testes passando.

---

### Cenários cobertos por rota

**`forgot-password`**: rate limit (429), email inválido (422), body vazio (422), usuário inexistente retorna 200 sem revelar existência (segurança), envio de email bem-sucedido, falha de email não quebra a resposta.

**`reset-password`**: rate limit (429), body inválido (400), token inexistente (400), token já usado (400), token expirado (400), senha fraca (400), senha reutilizada (400), happy path com invalidação de sessões (200).

**`unlock`**: body inválido (400), usuário inexistente — resposta genérica para não revelar IDs (400), usuário não bloqueado (400), PIN ausente (400), PIN errado com audit log (401), desbloqueio por PIN (200), resposta de segurança ausente (400), resposta errada (401), desbloqueio por pergunta de segurança (200).

**`first-access/setup`**: sem authToken (401), JWT inválido (401), body inválido (400), userId divergente do JWT — anti account-takeover (403), senha fraca (400), PIN inválido (400), resposta de segurança curta (400), usuário não encontrado (404), já completou primeiro acesso (400), happy path (200), falha de email de confirmação não quebra (200).

**`refresh`**: sem token (400), token já usado — token rotation attack (403), token revogado (403), token expirado (401), token inválido (401), usuário inativo (403), happy path com tokens em cookies httpOnly (200), fallback para token do body (200).

---

## Checklist de novos itens (processo expandido)

| Check | Resultado |
|---|---|
| Middleware cobre o módulo | ✅ Matcher universal — rotas `/api/auth/*` são tratadas separadamente como públicas |
| `requireServerUser()` nas pages | ✅ Páginas de login/recovery não requerem auth por design |
| Variáveis `process.env` documentadas | ✅ `MFA_CODE_TTL_MIN` adicionada ao `.env.example`; `NEXT_PUBLIC_APP_URL` já estava |
| Lint sem erros | ✅ |
| TypeScript sem erros | ✅ |
