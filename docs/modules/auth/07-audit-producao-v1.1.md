# Auditoria de Produção — Módulo Auth/Login (P2/P3 Features)
**Versão**: v1.1  
**Data**: 2026-05-18  
**Status**: ✅ Production Ready  
**Auditor**: Copilot Engineering (co-produtor GladPros ERP)
**Baseado em**: v1.0 — novas features de segurança adicionadas

---

## Features Implementadas nesta Versão

| Feature | Prioridade | Status |
|---------|-----------|--------|
| Backup Codes MFA (8 códigos, uso único, bcrypt hash) | P2 | ✅ Implementado |
| "Lembrar este dispositivo por 30 dias" (cookie httpOnly) | P3 | ✅ Implementado |
| Alerta de novo dispositivo por email | P3 | ✅ Implementado |
| Password Expiry — alerta soft, sem expiração forçada | P3 | ✅ Implementado |

---

## Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `src/app/api/auth/mfa/backup-codes/route.ts` | GET (status) + POST (gera 8 códigos) |
| `src/shared/lib/auth/device-alert.ts` | `checkAndAlertNewDevice()` — compara browser family |
| `src/shared/lib/emails/new-device.ts` | Template HTML alerta novo dispositivo (Chicago TZ) |
| `src/components/auth/PasswordExpiryBanner.tsx` | Banner dismissível (7 dias via localStorage) |

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `prisma/schema.prisma` | `MfaBackupCode`, `DispositivoConfiavel`, `senhaAlteradaEm` em Usuario |
| `src/shared/lib/validation.ts` | `mfaCodeSchema` aceita TOTP 6d OU backup 10 chars; `mfaVerificationSchema` + `rememberDevice` |
| `src/app/api/auth/mfa/verify/route.ts` | Backup code path, rememberDevice cookie, device alert |
| `src/app/api/auth/login/route.ts` | Trusted device check (skip MFA se device confiável) |
| `src/app/api/auth/reset-password/route.ts` | `senhaAlteradaEm = NOW()` no UPDATE |
| `src/app/api/usuarios/[id]/route.ts` | `senhaAlteradaEm = NOW()` no UPDATE de senha |
| `src/app/api/auth/me/route.ts` | Retorna `passwordAlerta` e `diasSemAlteracao` |
| `src/app/mfa/page.tsx` | Modo backup code, checkbox lembrar dispositivo |
| `src/app/(dashboard)/configuracoes/seguranca/page.tsx` | Seção Backup Codes com geração + exibição one-time |
| `src/app/(dashboard)/layout.tsx` | Integra `PasswordExpiryBanner` |
| `src/app/api/usuarios/[id]/resend-welcome/route.ts` | Fix P1: `magicLinkConsumedAt = NULL` ao reenviar |

---

## Detalhes Técnicos das Features

### Backup Codes
- 8 códigos por usuário, charset `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sem I/O/0/1)
- Formato exibido: `XXXXX-XXXXX` (plaintext UMA vez no POST)
- Armazenados como hash bcrypt rounds=10 em `MfaBackupCode`
- POST invalida todos os códigos anteriores (DELETE + INSERT em transação)
- `mfa/verify` detecta: `cleanCode.length === 10 && /^[A-Z0-9]{10}$/.test(cleanCode)` → caminho backup
- Marca `usadoEm = NOW()` após uso bem-sucedido

### Lembrar Dispositivo
- Cookie `deviceTrust` httpOnly, SameSite=Strict, maxAge=30 dias
- Device token: `randomUUID().replace(/-/g,'')` (32 chars hex) armazenado em `DispositivoConfiavel`
- `login/route.ts`: lê `deviceTrust`, verifica no DB, se válido emite `authToken` direto (skip MFA)
- `mfa/verify/route.ts`: se `rememberDevice=true` → cria `DispositivoConfiavel`

### Alerta Novo Dispositivo
- `checkAndAlertNewDevice()` busca últimas 5 `SessaoAtiva`, compara `extractBrowserFamily()` (Chrome/Firefox/Safari/Edge/Opera)
- Se browser family não visto → envia email via `sendMail` fire-and-forget
- Template HTML com gradiente GladPros, tabela IP/Device/Horário em America/Chicago

### Password Expiry Soft Alert
- `senhaAlteradaEm DateTime?` em Usuario — NULL = nunca alterada = alerta imediato
- Threshold via `PASSWORD_EXPIRY_DAYS` env (default 90 dias)
- `/api/auth/me` retorna `passwordAlerta: boolean` e `diasSemAlteracao: number | null`
- Banner dismissível (localStorage `pwd_alert_dismissed_at`, esconde por 7 dias)
- Botão "Alterar agora" → `/perfil`; "Depois" → dismiss por 7 dias
- **Não expira a senha forçadamente** — usuário tem autonomia

---

## Checklist Gates v1.1

| Gate | Status | Evidência |
|------|--------|-----------|
| API/RBAC — novas rotas | ✅ | `backup-codes/route.ts` usa `requireUser()` |
| Segurança — backup codes | ✅ | bcrypt hash, uso único, charset sem ambiguidade |
| Segurança — device trust | ✅ | Cookie httpOnly, SameSite=Strict, expiresAt no DB |
| Segurança — password expiry | ✅ | Soft alert, sem força, sem lock |
| TypeScript | ✅ | `tsc --noEmit` exit code 0 |
| Prisma schema | ✅ | `db push` executado com sucesso |
| Fix P1 (resend-welcome) | ✅ | `magicLinkConsumedAt = NULL` corrigido |
| Dark mode | ✅ | Todos os novos componentes usam CSS variables |
| Timezone | ✅ | `America/Chicago` em todos os formatos de data exibidos |
| Acessibilidade | ✅ | `aria-label` em todos os botões dos novos componentes |

---

## Classificação Final

**🟢 Production Ready v1.1**

Zero P1 abertos. Features P2/P3 implementadas e validadas. TypeScript limpo. Schema migrado. UI integrada ao dashboard layout.
