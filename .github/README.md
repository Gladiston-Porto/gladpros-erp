# Configuração do GitHub Actions

## Secrets Necessários

Para que o build funcione corretamente no GitHub Actions, você precisa configurar os seguintes secrets no repositório:

### Secrets Obrigatórios
- `JWT_SECRET`: Secret para JWT (mínimo 32 caracteres)
- `CLIENT_DOC_ENCRYPTION_KEY_BASE64`: Chave de criptografia para documentos (32 bytes em base64)
- `DATABASE_URL`: URL de conexão com o banco de dados MySQL/MariaDB

### Secrets Opcionais
- `NEXT_PUBLIC_APP_URL`: URL pública da aplicação
- `SMTP_HOST`: Servidor SMTP para notificações
- `SMTP_USER`: Usuário SMTP
- `SMTP_PASS`: Senha SMTP
- `SMTP_FROM`: Endereço de remetente
- `SMTP_PORT`: Porta SMTP (padrão: 465)
- `SMTP_SECURE`: Usar SSL/TLS (true/false)

## Como Configurar

1. Vá para o seu repositório no GitHub
2. Clique em **Settings** > **Secrets and variables** > **Actions**
3. Clique em **New repository secret**
4. Adicione cada secret com seu respectivo valor

## Exemplo de Valores

```bash
# JWT_SECRET (gere um novo com pelo menos 32 caracteres)
JWT_SECRET="sua-chave-jwt-muito-longa-com-pelo-menos-32-caracteres"

# CLIENT_DOC_ENCRYPTION_KEY_BASE64 (gere uma chave de 32 bytes)
CLIENT_DOC_ENCRYPTION_KEY_BASE64="YWJjZGVmZ2hpams="

# DATABASE_URL (para produção)
DATABASE_URL="mysql://usuario:senha@host:porta/database"
```

## Verificação Local

Antes de fazer deploy, teste localmente:

```bash
# Verificar se todas as variáveis estão configuradas
node scripts/check-build-env.js

# Fazer build de produção
npm run build
```

## Troubleshooting

Se o build falhar com "Missing JWT_SECRET":

1. Verifique se todos os secrets obrigatórios estão configurados
2. Certifique-se de que os valores estão corretos
3. Re-execute o workflow após adicionar os secrets

O script `check-build-env.js` foi criado especificamente para ajudar a diagnosticar problemas de configuração de ambiente.
