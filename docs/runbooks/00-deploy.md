# Deploy Checklist — GladPros

Use este checklist ANTES de cada deploy para produção.

## Pré-deploy (1-2h antes)

### Segurança
- [ ] `npm run secret:scan` — nenhum secret no código
- [ ] `npm run security:audit` — nenhuma vulnerabilidade HIGH
- [ ] Todos os secrets em `.env.production` rotacionados nos últimos 90 dias
- [ ] KMS: `npm run kms:status` — chaves válidas e não expiradas

### Build
- [ ] `npm run type-check` — zero erros TypeScript
- [ ] `npm run lint` — zero erros ESLint
- [ ] `npm run build` — build completou sem erros
- [ ] `npm test` — todos os testes passando

### Database
- [ ] Backup feito: `mysqldump -u user -p gladpros > backup_$(date +%Y%m%d_%H%M%S).sql`
- [ ] Migrations testadas em staging: `npx prisma migrate deploy` (staging)
- [ ] Sem migrations pendentes com dados destrutivos sem rollback planejado

## Durante o deploy

### Ordem de operações
1. Coloque o sistema em modo de manutenção (se aplicável)
2. Execute as migrations: `npx prisma migrate deploy`
3. Faça o deploy do código
4. Reinicie o servidor
5. Verifique o health check: `curl https://app.gladpros.com/api/monitoring/health`
6. Tire do modo de manutenção

### Health check esperado
```json
{
  "status": "healthy",
  "services": {
    "database": { "status": "healthy" },
    "cache":    { "status": "healthy" },
    "email":    { "status": "healthy" }
  }
}
```

## Pós-deploy (30min após)

- [ ] Testar fluxo crítico: Login → Dashboard → Criar Proposta → Aprovar
- [ ] Verificar logs: nenhum erro 500 nos últimos 10 minutos
- [ ] Verificar Sentry: nenhum novo problema crítico
- [ ] Verificar métricas: `GET /api/monitoring/metrics`

## Rollback (se necessário)

```bash
# 1. Reverter o código (git)
git checkout previous-tag

# 2. Reverter migrations (se houve alteração destrutiva)
# ATENÇÃO: só fazer se tiver backup e o rollback foi planejado
npx prisma migrate resolve --rolled-back migration_name

# 3. Restaurar banco (último recurso)
mysql -u user -p gladpros < backup_YYYYMMDD_HHMMSS.sql

# 4. Reiniciar servidor
pm2 restart gladpros
```

## Contatos de emergência

- DBA / Backend lead: [preencher]
- Infrastructure: [preencher]
- On-call: [preencher]
