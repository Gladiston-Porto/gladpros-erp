# Incident Response — GladPros

Guia de resposta a incidentes críticos.

---

## 🔴 Banco de dados inacessível

**Sintomas:** Health check retorna `"database": "unhealthy"`, erro 500 em todas as APIs

```bash
# 1. Verificar conexão
mysql -h HOST -u USER -p -e "SELECT 1"

# 2. Verificar se o serviço está rodando (Docker)
docker ps | grep db
docker logs gladpros_db --tail 50

# 3. Reiniciar banco (Docker)
docker restart gladpros_db

# 4. Verificar pool de conexões Prisma
# Verificar logs do servidor por "too many connections"
# Se necessário, ajustar connection_limit na DATABASE_URL:
# mysql://user:pass@host:3306/db?connection_limit=10
```

---

## 🔴 JWT comprometido / Suspeita de token forjado

**Sintomas:** Acessos não autorizados, usuário relatando sessão ativa que não criou

```bash
# 1. Rotacionar JWT_SECRET IMEDIATAMENTE
openssl rand -base64 48  # gerar nova chave

# 2. Atualizar .env.production com nova chave
# 3. Reiniciar servidor (invalida TODOS os tokens existentes)
pm2 restart gladpros

# 4. Notificar todos os usuários para fazer novo login
# 5. Verificar AuditLog para ações suspeitas:
# SELECT * FROM AuditLog WHERE criadoEm > NOW() - INTERVAL 24 HOUR ORDER BY criadoEm DESC;
```

---

## 🔴 Rate limit ativado / Ataque de brute force

**Sintomas:** Muitas requisições 429, IP específico com alto volume

```bash
# 1. Identificar o IP atacante nos logs
grep "429" /var/log/gladpros/access.log | awk '{print $1}' | sort | uniq -c | sort -rn

# 2. Bloquear IP manualmente via Redis (já implementado no sistema)
# Via código ou redis-cli:
redis-cli SET "blocked:IP_AQUI" "1" PX 86400000  # 24 horas

# 3. Se Redis não disponível, bloquear no nginx/load balancer
# 4. Monitorar se o ataque continua de outros IPs
```

---

## 🟡 Redis indisponível

**Sintomas:** Health check retorna `"cache": "degraded"`, performance mais lenta

O sistema **continua funcionando** com fallback em memória, mas:
- Rate limiting não é compartilhado entre instâncias
- IPs bloqueados não persistem entre reinicializações

```bash
# 1. Verificar Redis
redis-cli ping  # deve retornar PONG
docker ps | grep redis
docker restart gladpros_redis

# 2. Verificar REDIS_URL no ambiente
# 3. O sistema se reconecta automaticamente ao Redis
```

---

## 🟡 Emails não sendo enviados

**Sintomas:** Usuários não recebem emails de reset de senha, MFA, etc.

```bash
# 1. Verificar configuração SMTP
npm run config:validate

# 2. Verificar logs de email
grep "SMTP" /var/log/gladpros/app.log | tail -20

# 3. Verificar se Hostinger não está bloqueando
# Comum: limite de envio por hora excedido
```

---

## 🟡 Chaves de criptografia (KMS)

**Sintomas:** Dados de clientes não descriptografam, erro de criptografia

```bash
# 1. Verificar status das chaves
npm run kms:status

# 2. Validar chaves
npm run kms:validate

# 3. SE a chave foi corrompida/perdida:
# AVISO: DADOS CRIPTOGRAFADOS COM AQUELA CHAVE PODEM SER PERDIDOS
# 4. Usar chaves de fallback se configuradas (CLIENT_DOC_ENCRYPTION_KEY_FALLBACKS)
# 5. Acionar backup imediatamente
```

---

## 🟡 Erros 500 em produção

```bash
# 1. Verificar Sentry para o erro exato
# 2. Verificar logs estruturados
tail -f /var/log/gladpros/app.log | grep '"level":"error"'

# 3. Verificar se é erro de migration pendente
npx prisma migrate status

# 4. Verificar memória do servidor
free -h
pm2 monit
```

---

## Escalonamento

| Severidade | Tempo de resposta | Quem acionar |
|------------|------------------|--------------|
| P1 (down)  | 15 min           | On-call + DBA |
| P2 (degraded) | 1 hora       | On-call |
| P3 (bug)   | 4 horas          | Desenvolvedor |
| P4 (melhoria) | Próximo sprint | Backlog |
