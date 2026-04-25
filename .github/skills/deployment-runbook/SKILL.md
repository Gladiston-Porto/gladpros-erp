---
name: deployment-runbook
description: "Use when deploying to staging or production, configuring environment variables, rolling back, or executing pre/post-deploy checklists for the GladPros ERP."
---

# Skill: Deployment Runbook

## When to Use
- Preparing a production deploy
- Executing a rollback
- Configuring environment variables in staging/prod
- Debugging post-deploy issues
- Running database migrations in production

---

## Ambientes

| Ambiente | Branch | URL | DB |
|----------|--------|-----|-----|
| Development | any | localhost:3000 | MySQL local |
| Staging | `develop` | staging.gladpros.com | MySQL staging |
| Production | `main` | app.gladpros.com | MySQL prod |

---

## Variáveis de Ambiente Obrigatórias

### Segurança / Auth
```bash
JWT_SECRET=                          # mínimo 32 chars, gerar com: openssl rand -base64 32
NEXTAUTH_SECRET=                     # mesmo valor que JWT_SECRET ou separado
NEXTAUTH_URL=                        # URL pública do app (sem trailing slash)
```

### Banco de Dados
```bash
DATABASE_URL="mysql://user:pass@host:3306/gladpros?connection_limit=10&pool_timeout=20"
# IMPORTANTE: connection_limit e pool_timeout evitam "Too many connections"
```

### Performance (Obrigatórias em Produção)
```bash
TOKEN_VERSION_COLUMN_EXISTS=1        # Elimina query ao INFORMATION_SCHEMA no boot
RBAC_TRUST_JWT=1                     # Elimina 1 query ao banco por request autenticada
```

### Criptografia de Documentos
```bash
CLIENT_DOC_ENCRYPTION_KEY_BASE64=    # AES-GCM key, 32 bytes base64: openssl rand -base64 32
CLIENT_DOC_ENCRYPTION_KEY_FALLBACKS= # Chaves antigas para rotação (separadas por vírgula)
KMS_MASTER_KEY=                      # Mesma base64 key (backup do KMS local)
```

### WhatsApp (se ativo)
```bash
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
```

### Monitoramento
```bash
SENTRY_DSN=                          # Sentry error tracking
SENTRY_AUTH_TOKEN=                   # Para source maps no build
NEXT_PUBLIC_SENTRY_DSN=              # Client-side Sentry
```

### Redis (opcional — rate limiting distribuído)
```bash
# Só configurar se Redis real estiver disponível
# REDIS_DISABLED=true   ← manter true se não tiver Redis
REDIS_URL=redis://...   # ou REDIS_HOST + REDIS_PORT
```

---

## Checklist Pré-Deploy (Produção)

### 1. Build & Qualidade
- [ ] `npm run build` passa sem erros
- [ ] `npm run quality:types` sem erros TypeScript
- [ ] `npm run quality:lint` sem erros críticos
- [ ] `npm run quality:test` sem falhas
- [ ] Nenhum `console.log` com dados sensíveis
- [ ] Nenhum `TODO/FIXME` crítico pendente

### 2. Banco de Dados
- [ ] Migrations testadas em staging primeiro
- [ ] Backup do banco de prod feito antes das migrations
- [ ] `npx prisma migrate status` — todas as migrations aplicadas em staging
- [ ] Verificar que não há migration destrutiva (DROP COLUMN, DROP TABLE) sem janela de manutenção

### 3. Variáveis de Ambiente
- [ ] Todas as vars obrigatórias configuradas no ambiente de destino
- [ ] `TOKEN_VERSION_COLUMN_EXISTS=1` e `RBAC_TRUST_JWT=1` presentes em prod
- [ ] `REDIS_DISABLED=true` se não houver Redis configurado
- [ ] `SENTRY_DSN` configurado e funcional

### 4. Segurança
- [ ] Nenhum secret hardcoded no código
- [ ] `npm run secret:scan` sem alertas
- [ ] Headers de segurança configurados (CSP, HSTS, X-Frame-Options)
- [ ] Rate limiting funcionando (testar endpoint `/api/auth/login`)

---

## Procedimento de Deploy

### Staging
```bash
# 1. Merge develop → staging branch (ou push direto)
git checkout develop && git pull

# 2. Rodar migrations
DATABASE_URL="mysql://..." npx prisma migrate deploy

# 3. Build e restart
npm run build
pm2 restart gladpros-staging  # ou docker-compose restart
```

### Produção
```bash
# 1. Criar tag de release
git checkout main && git pull
git tag v1.X.X -m "Release v1.X.X — [descrição]"
git push origin v1.X.X

# 2. Backup do banco
mysqldump -u $DB_USER -p$DB_PASS gladpros > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Migrations (janela de manutenção se destrutiva)
DATABASE_URL="mysql://..." npx prisma migrate deploy

# 4. Build
NODE_ENV=production npm run build

# 5. Restart sem downtime
pm2 reload gladpros-prod  # ou zero-downtime via deploy pipeline
```

---

## Rollback

### Aplicação (sem migration destrutiva)
```bash
# Voltar para o build anterior
git checkout v1.X.X-anterior
npm run build
pm2 restart gladpros-prod
```

### Banco de Dados (migration rollback)
```bash
# Prisma não tem rollback automático — usar backup
mysql -u $DB_USER -p$DB_PASS gladpros < backup_YYYYMMDD_HHMMSS.sql

# Ou reverter migration manual (cuidado com dados)
npx prisma migrate resolve --rolled-back "migration_name"
```

> **Regra**: Nunca fazer migration destrutiva sem backup + janela de manutenção definida.

---

## Verificação Pós-Deploy

```bash
# Health check básico
curl https://app.gladpros.com/api/monitoring/health

# Verificar auth
curl -X POST https://app.gladpros.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gladpros.com","password":"..."}'

# Verificar métricas
curl https://app.gladpros.com/api/monitoring/metrics
```

**Indicadores de problema pós-deploy:**
- Response time > 2s no `/api/monitoring/health` → verificar DB pool
- 500 errors no Sentry → verificar migrations e env vars
- Falha de login → verificar `JWT_SECRET` e `TOKEN_VERSION_COLUMN_EXISTS`
- Rate limit hit imediato → verificar `REDIS_DISABLED` / Redis config

---

## Troubleshooting Comum

| Sintoma | Causa Provável | Solução |
|---------|---------------|---------|
| Login retorna 500 | `JWT_SECRET` errado ou ausente | Verificar env var |
| Latência alta no primeiro request | `TOKEN_VERSION_COLUMN_EXISTS` não definida | Adicionar `=1` no env |
| "Too many connections" | `connection_limit` não configurada | Adicionar na `DATABASE_URL` |
| Redis timeout no login | `REDIS_ENABLED=true` sem Redis real | Definir `REDIS_DISABLED=true` |
| SSN/EIN não descriptografam | `CLIENT_DOC_ENCRYPTION_KEY_BASE64` diferente do prod | Usar fallbacks ou rotacionar chave |
| Migrations falham | Prisma version mismatch | `npm run db:generate` antes do deploy |
