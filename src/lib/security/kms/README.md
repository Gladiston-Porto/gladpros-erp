# Key Management System (KMS)

Sistema completo de gerenciamento de chaves criptográficas com rotação automática, versionamento e auditoria.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Instalação e Configuração](#instalação-e-configuração)
- [Uso](#uso)
- [Rotação de Chaves](#rotação-de-chaves)
- [Manutenção](#manutenção)
- [Segurança](#segurança)
- [Troubleshooting](#troubleshooting)

## Visão Geral

O KMS (Key Management System) fornece:

- ✅ **Gerenciamento centralizado** de todas as chaves criptográficas
- ✅ **Rotação automática** com grace periods para zero downtime
- ✅ **Versionamento** de chaves para compatibilidade retroativa
- ✅ **Auditoria completa** de todas as operações
- ✅ **Derivação segura** usando HKDF (RFC 5869)
- ✅ **Encriptação at-rest** com AES-256-GCM
- ✅ **Cache inteligente** para performance

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    KMS_MASTER_KEY                       │
│              (ENV - nunca no banco)                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   HKDF Derivation     │
         │   (RFC 5869)          │
         └───┬───────────────┬───┘
             │               │
      ┌──────▼────┐    ┌────▼──────┐
      │ JWT_KEY   │    │ DOC_KEY   │
      │ Version 1 │    │ Version 1 │
      └───────────┘    └───────────┘
             │               │
             ▼               ▼
      [Encrypted]     [Encrypted]
      [AES-256-GCM]   [AES-256-GCM]
             │               │
             ▼               ▼
      ┌─────────────────────────┐
      │   encryption_keys       │
      │   (MySQL Database)      │
      └─────────────────────────┘
```

### Ciclo de Vida das Chaves

```
ACTIVE ──(rotation)──> READ_ONLY ──(expire)──> RETIRED ──(retention)──> ARCHIVED
  │                         │                      │                        │
  │                         │                      │                        │
  ▼                         ▼                      ▼                        ▼
Sign/Encrypt          Decrypt only          No operations           Cold storage
                      (grace period)
```

## Instalação e Configuração

### 1. Gerar Master Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Configurar Ambiente

Adicione ao `.env.local`:

```env
# KMS Master Key (NUNCA commitar!)
KMS_MASTER_KEY=gbIr3iw3u9xb1OzfOt9sg0E/Chu391wDVO3cJzU8WB0=
```

⚠️ **CRÍTICO**: Adicione `.env.local` ao `.gitignore`!

### 3. Inicializar Chaves

```bash
npm run kms:init
```

Isso cria:
- JWT_SIGNING v1 (para tokens de autenticação)
- DOC_ENCRYPTION v1 (para documentos sensíveis)
- BACKUP v1 (para backups criptografados)

### 4. Validar Configuração

```bash
npm run kms:validate
```

## Uso

### Importação

```typescript
import { KMS } from '@/lib/security/kms';
```

### Obter Chave Ativa

```typescript
// Chave ativa (para operações de escrita/sign)
const jwtKey = await KMS.getActiveKey('JWT_SIGNING');
const docKey = await KMS.getActiveKey('DOC_ENCRYPTION');

// Todas as chaves válidas (para operações de leitura/verify)
const allJwtKeys = await KMS.getAllValidKeys('JWT_SIGNING');
```

### Derivação de Chaves

```typescript
// Chave JWT derivada (auto-cria se não existir)
const jwtSigningKey = await KMS.deriveJWTKey();

// Chave de documentos
const docEncryptionKey = await KMS.deriveDocKey();

// Chave de sessão (efêmera)
const sessionKey = await KMS.deriveSessionKey();

// Chave de backup
const backupKey = await KMS.deriveBackupKey();
```

### Auditoria

```typescript
await KMS.auditKeyUsage({
  keyId: key.id,
  keyVersion: key.version,
  keyType: 'JWT_SIGNING',
  operacao: 'SIGN',
  tipoEntidade: 'RefreshToken',
  entidadeId: tokenId,
  sucesso: true,
  usuarioId: userId,
  ip: request.ip,
  userAgent: request.headers['user-agent']
});
```

### Estatísticas

```typescript
const stats = await KMS.getKeyStats(keyId);
console.log(`Total operations: ${stats.total}`);
console.log(`Successful: ${stats.successful}`);
console.log(`Failed: ${stats.failed}`);
console.log('Operations by type:', stats.byOperation);
```

## Rotação de Chaves

### Schedules Configurados

| Tipo de Chave    | Rotação | Grace Period | Retenção | Uso                    |
|------------------|---------|--------------|----------|------------------------|
| JWT_SIGNING      | 90 dias | 30 dias      | 365 dias | Tokens de autenticação |
| DOC_ENCRYPTION   | 180 dias| 60 dias      | 730 dias | Documentos sensíveis   |
| SESSION          | 30 dias | 7 dias       | 90 dias  | Chaves de sessão       |
| BACKUP           | 365 dias| 90 dias      | 1095 dias| Backups criptografados |

### Rotação Manual

```bash
# Rotacionar chave específica
npm run kms:rotate JWT_SIGNING

# Ver status de todas as chaves
npm run kms:status
```

### Rotação Automática

```typescript
// Em um cron job diário
import { KMS } from '@/lib/security/kms';

async function dailyMaintenance() {
  const result = await KMS.performMaintenance();
  
  console.log(`Retired: ${result.retired}`);
  console.log(`Archived: ${result.archived}`);
  console.log(`Rotated: ${result.rotationResult.rotated.length}`);
}
```

### Grace Period

Durante o grace period (após rotação):

```typescript
// ✅ Nova chave (ACTIVE) - usada para ASSINAR
const activeKey = await KMS.getActiveKey('JWT_SIGNING');
jwt.sign(payload, activeKey);

// ✅ Chaves antigas (READ_ONLY) - ainda válidas para VERIFICAR
const allKeys = await KMS.getAllValidKeys('JWT_SIGNING');
for (const key of allKeys) {
  try {
    jwt.verify(token, key);
    break; // Token válido encontrado
  } catch (err) {
    continue; // Tentar próxima chave
  }
}
```

### Re-encriptação (quando necessário)

```typescript
const result = await KMS.rotateKey('DOC_ENCRYPTION', 'Scheduled rotation');

if (result.reEncryptionNeeded) {
  // Re-encriptar documentos com chave antiga
  await KMS.reEncryptData('DOC_ENCRYPTION', result.oldVersion, result.newVersion);
}
```

## Manutenção

### CLI Tools

```bash
# Inicializar sistema
npm run kms:init

# Ver status
npm run kms:status

# Rotacionar chave
npm run kms:rotate JWT_SIGNING

# Manutenção completa
npm run kms:maintenance

# Validar configuração
npm run kms:validate
```

### Manutenção Diária (Recomendado)

Configure um cron job:

```typescript
// scripts/cron/daily-kms-maintenance.ts
import { KMS } from '@/lib/security/kms';

async function run() {
  const result = await KMS.performMaintenance();
  
  // Log para monitoramento
  console.log('KMS Maintenance Complete:', {
    timestamp: new Date(),
    retired: result.retired,
    archived: result.archived,
    rotated: result.rotationResult.rotated,
    errors: result.rotationResult.errors,
    auditCleaned: result.auditCleaned
  });
}

run().catch(console.error);
```

### Monitoramento

Monitore métricas:

```typescript
const { prisma } = await import('@/shared/lib/prisma');

// Chaves próximas da rotação
const keys = await prisma.encryptionKey.findMany({
  where: {
    status: 'ACTIVE',
    criadoEm: {
      lt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000) // 80 dias
    }
  }
});

// Audit logs com erros
const errors = await prisma.keyUsageAudit.count({
  where: {
    sucesso: false,
    timestamp: {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // últimas 24h
    }
  }
});
```

## Segurança

### Best Practices

1. **Master Key**
   - ✅ Armazene em variável de ambiente (nunca no código)
   - ✅ Use 32 bytes (256 bits) de aleatoriedade
   - ✅ Rotacione anualmente em produção
   - ✅ Mantenha backups seguros (offline)
   - ❌ NUNCA commite no Git
   - ❌ NUNCA logue em arquivos/console

2. **Chaves Derivadas**
   - ✅ Rotacione regularmente (schedules automáticos)
   - ✅ Use grace periods para zero downtime
   - ✅ Mantenha múltiplas versões durante transição
   - ✅ Archive chaves antigas após período de retenção

3. **Auditoria**
   - ✅ Logue todas as operações críticas
   - ✅ Monitore falhas (possível ataque)
   - ✅ Retenha logs por 90+ dias
   - ✅ Alerte em padrões suspeitos

4. **Performance**
   - ✅ Use cache (5 min TTL padrão)
   - ✅ Batch re-encryption operations
   - ✅ Monitore latência de decriptação

### Disaster Recovery

#### Perda da Master Key

⚠️ **CRÍTICO**: Sem a master key, as chaves derivadas são irrecuperáveis!

**Plano de Backup**:

1. Armazene a master key em:
   - Gestor de senhas corporativo
   - Vault (HashiCorp Vault, AWS Secrets Manager)
   - Backup offline em local seguro

2. Procedimento de recuperação:
   ```bash
   # 1. Restaurar master key
   echo "KMS_MASTER_KEY=<backup-key>" >> .env.local
   
   # 2. Validar
   npm run kms:validate
   
   # 3. Verificar chaves
   npm run kms:status
   ```

#### Rotação Forçada (Comprometimento)

```bash
# Rotacionar todas as chaves imediatamente
for key_type in JWT_SIGNING DOC_ENCRYPTION BACKUP; do
  npm run kms:rotate $key_type
done

# Invalidar sessões antigas
# (implementar lógica específica do app)
```

## Troubleshooting

### Erro: "Master key must be exactly 32 bytes"

**Causa**: Master key inválida ou não configurada.

**Solução**:
```bash
# Gerar nova key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Adicionar ao .env.local
echo "KMS_MASTER_KEY=<generated-key>" >> .env.local

# Validar
npm run kms:validate
```

### Erro: "No ACTIVE key found"

**Causa**: Sistema não inicializado.

**Solução**:
```bash
npm run kms:init
```

### Erro: "Failed to decrypt key"

**Causa**: Master key mudou ou chave corrompida.

**Solução**:
```bash
# 1. Verificar master key está correta
npm run kms:validate

# 2. Se mudou, restaurar do backup
# 3. Se chave corrompida, rotacionar
npm run kms:rotate <key-type>
```

### Performance: Cache Hit Rate Baixo

**Causa**: TTL muito curto ou muitas invalidações.

**Solução**:
```typescript
// Aumentar TTL do cache (padrão: 5 min)
// Editar key-manager.ts
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos
```

### Auditoria: Muitos Logs

**Causa**: Retenção muito longa.

**Solução**:
```bash
# Limpar logs manualmente (>90 dias)
npm run kms:maintenance
```

Ou ajustar em `key-rotation.ts`:
```typescript
// Reduzir retenção de auditoria
const AUDIT_RETENTION_DAYS = 60; // era 90
```

## Referências

- [RFC 5869 - HKDF](https://datatracker.ietf.org/doc/html/rfc5869)
- [NIST SP 800-57](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final) - Key Management
- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)

## Suporte

Para issues ou dúvidas:
1. Verifique este README
2. Execute `npm run kms:validate`
3. Verifique logs de auditoria
4. Consulte equipe de segurança
