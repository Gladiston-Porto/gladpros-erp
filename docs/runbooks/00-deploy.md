# Deploy Checklist — GladPros ERP (VPS Hostinger)

**Plataforma:** VPS Hostinger · Ubuntu 22.04 · Docker + Docker Compose  
**URL produção:** https://app.gladpros.com

---

## Primeira instalação na VPS

### 1. Preparar o servidor
```bash
ssh root@IP_DA_VPS
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker
apt-get install -y docker-compose-plugin
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
```

### 2. Clonar o projeto
```bash
su - deploy
git clone https://github.com/SEU_ORG/gladpros-erp.git /home/deploy/gladpros
cd /home/deploy/gladpros
```

### 3. Configurar variáveis de ambiente
```bash
cp .env.production.example .env.production
nano .env.production

# Gerar secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"   # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" # DOC_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # ENCRYPTION_KEY
```

### 4. Configurar SSL (Let's Encrypt)
```bash
apt-get install -y certbot
certbot certonly --standalone -d app.gladpros.com
mkdir -p config/nginx/ssl
ln -s /etc/letsencrypt/live/app.gladpros.com/fullchain.pem config/nginx/ssl/fullchain.pem
ln -s /etc/letsencrypt/live/app.gladpros.com/privkey.pem  config/nginx/ssl/privkey.pem
```

### 5. Build e primeiro deploy
```bash
cd /home/deploy/gladpros
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d db
sleep 30
docker compose -f docker-compose.prod.yml run --rm migrate
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

### 6. Seed do admin (só na primeira vez)
```bash
docker compose -f docker-compose.prod.yml exec app npx prisma db seed
```

---

## Deploy de atualização (fluxo normal)

### Pré-deploy (local)
- [ ] `npm run type-check` — zero erros TypeScript
- [ ] `npm run lint` — zero erros ESLint
- [ ] `npm run build` — build local sem erros
- [ ] Verificar migrations novas: `git diff HEAD prisma/migrations/`

### Na VPS
```bash
cd /home/deploy/gladpros
git pull origin master
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml run --rm migrate
docker compose -f docker-compose.prod.yml up -d --no-deps app
docker compose -f docker-compose.prod.yml logs app --tail=50
```

### Health check
```bash
curl -s https://app.gladpros.com/api/monitoring/health | jq .
```

---

## Pós-deploy checklist

- [ ] Login funcionando
- [ ] Dashboard carregando
- [ ] Criar proposta e download PDF funcionando
- [ ] Nenhum erro nos logs: `docker compose -f docker-compose.prod.yml logs app --tail=100`

---

## Backup do banco

```bash
# Backup manual
docker compose -f docker-compose.prod.yml exec db \
  mysqldump -u root -p"${MYSQL_ROOT_PASSWORD}" gladpros \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Cron automático (root) — todo dia às 2h
# 0 2 * * * cd /home/deploy/gladpros && docker compose -f docker-compose.prod.yml exec -T db mysqldump -u root -p"SENHA" gladpros > /backups/gladpros_$(date +\%Y\%m\%d).sql
```

---

## Rollback

```bash
git --no-pager log --oneline -10
git checkout HASH_ANTERIOR
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d --no-deps app
# Se preciso reverter banco:
docker compose -f docker-compose.prod.yml exec -T db \
  mysql -u root -p"${MYSQL_ROOT_PASSWORD}" gladpros < backup_YYYYMMDD.sql
```

---

## Monitoramento

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
docker stats --no-stream
df -h
```

---

## Renovação SSL (cron automático)

```bash
# Crontab root:
0 3 1 * * certbot renew --quiet && docker compose -f /home/deploy/gladpros/docker-compose.prod.yml restart nginx
```

---

## Contatos

- Responsável: Gladiston Porto
- Hostinger suporte: https://support.hostinger.com
- Sentry: https://sentry.io/organizations/gladpros/
