---
description: "Checklist completo pré-deploy: build, segurança, migrations, env vars, RBAC, performance — para deploy em staging ou produção"
agent: "agent"
---

# Deploy Checklist — GladPros ERP

Execute este checklist antes de qualquer deploy em staging ou produção.

**Informe o ambiente de destino:**

> `staging` | `production`

---

## 1. Build & Qualidade de Código

```bash
npm run build              # build completo sem erros
npm run quality:types      # TypeScript sem erros
npm run quality:lint       # ESLint sem erros críticos
npm run quality:test       # Jest sem falhas
```

Verificar manualmente:
- [ ] Nenhum `console.log` com dados sensíveis em `src/`
- [ ] Nenhum `TODO/FIXME` de severidade P1 pendente
- [ ] Nenhum import de `@/server/db` ou `@/server/db-temp` (usar `@/lib/prisma`)

---

## 2. Segurança

```bash
npm run secret:scan        # nenhum secret hardcoded
npm run security:audit     # npm audit sem vulnerabilidades críticas
```

Verificar:
- [ ] Nenhuma chave ou token no código
- [ ] Todas as rotas novas têm `requireUser()` + `can()`
- [ ] Dados sensíveis (SSN, EIN) continuam criptografados
- [ ] Sem nova rota pública que deveria ser protegida

---

## 3. Banco de Dados

```bash
# Verificar status das migrations
npx prisma migrate status

# Para produção: testar em staging ANTES
DATABASE_URL="mysql://staging..." npx prisma migrate deploy
```

- [ ] Migrations testadas em staging primeiro
- [ ] Backup do banco de produção feito (`mysqldump`)
- [ ] Nenhuma migration `DROP COLUMN`/`DROP TABLE` sem janela de manutenção
- [ ] Índices novos adicionados (`@@index`) para campos filtráveis

---

## 4. Variáveis de Ambiente

Verificar no ambiente de destino:

**Obrigatórias:**
- [ ] `DATABASE_URL` com `connection_limit` e `pool_timeout`
- [ ] `JWT_SECRET` (mínimo 32 chars)
- [ ] `TOKEN_VERSION_COLUMN_EXISTS=1`
- [ ] `RBAC_TRUST_JWT=1`
- [ ] `CLIENT_DOC_ENCRYPTION_KEY_BASE64`
- [ ] `KMS_MASTER_KEY`
- [ ] `SENTRY_DSN`

**Verificar:**
- [ ] `REDIS_DISABLED=true` se não houver Redis real
- [ ] Sem `REDIS_ENABLED=true` sem Redis configurado

---

## 5. Performance

- [ ] Sem `await` dentro de `.map()` ou `.forEach()` (N+1)
- [ ] Todas as listagens novas têm `take` + `skip` (paginação)
- [ ] `select` ou `include` retornam apenas campos necessários
- [ ] Campos filtráveis novos têm `@@index` no schema

---

## 6. Verificação Pós-Deploy

```bash
# Health check
curl https://[AMBIENTE]/api/monitoring/health

# Smoke test de auth
curl -X POST https://[AMBIENTE]/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gladpros.com","password":"..."}'
```

- [ ] Health check retorna 200
- [ ] Login funciona
- [ ] Sentry recebendo eventos (verificar dashboard)
- [ ] Nenhum erro 500 nos primeiros 5 minutos

---

## Rollback

Se algo der errado após o deploy:

```bash
# Aplicação: voltar para versão anterior
git checkout [tag-anterior]
npm run build
pm2 reload gladpros-prod

# Banco (se migration foi aplicada): usar backup
mysql -u $DB_USER -p$DB_PASS gladpros < backup_YYYYMMDD.sql
```

> Consultar o skill `deployment-runbook` para detalhes completos.
