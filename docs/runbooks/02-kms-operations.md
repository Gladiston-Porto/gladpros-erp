# KMS Key Rotation — GladPros

Procedimento de rotação das chaves de criptografia sem downtime.

## Chaves gerenciadas

| Variável de Ambiente                    | Uso                              | Rotação Recomendada |
|-----------------------------------------|----------------------------------|---------------------|
| `JWT_SECRET`                            | Assinar tokens JWT               | A cada 90 dias      |
| `CLIENT_DOC_ENCRYPTION_KEY_BASE64`      | Criptografia de documentos AES-256-GCM | A cada 180 dias |
| `CLIENT_DOC_ENCRYPTION_KEY_FALLBACKS`   | Chave antiga (período de migração) | Remover após migração |
| `KMS_MASTER_KEY`                        | Key Management System master     | A cada 365 dias     |
| `ENCRYPTION_KEY`                        | Dados sensíveis de workers       | A cada 180 dias     |

---

## Rotação do JWT_SECRET

**Impacto:** Todos os usuários são deslogados (tokens antigos invalidados)

```bash
# 1. Gerar nova chave (mínimo 48 bytes em base64)
openssl rand -base64 48

# 2. Atualizar .env.production
JWT_SECRET="nova_chave_gerada_aqui"

# 3. Reiniciar servidor — tokens antigos são imediatamente inválidos
pm2 restart gladpros

# 4. Comunicar usuários sobre necessidade de novo login
```

---

## Rotação de Chaves de Criptografia (AES-256-GCM)

**Impacto:** Dados existentes precisam ser re-criptografados com a nova chave

```bash
# 1. Gerar nova chave (32 bytes = 256 bits)
openssl rand -base64 32

# 2. NÃO remova a chave antiga ainda — mova para FALLBACKS
# Em .env.production:
# CLIENT_DOC_ENCRYPTION_KEY_BASE64="NOVA_CHAVE_BASE64"
# CLIENT_DOC_ENCRYPTION_KEY_FALLBACKS="CHAVE_ANTIGA_BASE64"

# 3. Deploy com ambas as chaves configuradas
# O sistema usa a nova chave para ESCREVER
# e tenta fallback para LER dados antigos

# 4. Executar re-criptografia dos dados existentes
npm run kms:rotate

# 5. Verificar que todos os dados foram migrados
npm run kms:validate

# 6. APÓS confirmar migração completa:
# Remover a chave antiga de FALLBACKS
# CLIENT_DOC_ENCRYPTION_KEY_FALLBACKS=""
```

---

## Rotação via CLI do KMS

O sistema tem um CLI built-in para gerenciar chaves:

```bash
# Verificar status atual
npm run kms:status

# Inicializar KMS (primeiro uso)
npm run kms:init

# Rodar rotação automatizada
npm run kms:rotate

# Validar integridade das chaves
npm run kms:validate

# Manutenção geral
npm run kms:maintenance
```

---

## Checklist de rotação segura

- [ ] Backup do banco de dados feito
- [ ] Nova chave gerada com entropia adequada (openssl rand)
- [ ] Chave antiga movida para FALLBACKS (nunca deletar imediatamente)
- [ ] Deploy feito com ambas as chaves
- [ ] Sistema testado: dados antigos ainda descriptografam
- [ ] Re-criptografia executada: `npm run kms:rotate`
- [ ] Validação executada: `npm run kms:validate`
- [ ] Health check OK: todos os serviços healthy
- [ ] FALLBACKS removidos após confirmação completa
- [ ] Chave antiga destruída de forma segura (não commits, não logs)
