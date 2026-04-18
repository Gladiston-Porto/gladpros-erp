// src/config/index.ts - Configurações centralizadas

// Configurações de ambiente
export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const;

// Configurações de banco de dados
export const database = {
  url: process.env.DATABASE_URL,
  shadowUrl: process.env.SHADOW_DATABASE_URL,
} as const;

// Configurações de JWT
export const jwt = {
  secret: process.env.JWT_SECRET,
  expiresIn: '24h',
  refreshExpiresIn: '7d',
} as const;

// Configurações de criptografia
export const crypto = {
  docEncryptionKey: process.env.CLIENT_DOC_ENCRYPTION_KEY_BASE64,
  docEncryptionFallbacks: process.env.CLIENT_DOC_ENCRYPTION_KEY_FALLBACKS,
} as const;

// Configurações de email
export const smtp = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM,
  secure: process.env.SMTP_SECURE === 'true',
} as const;

// Configurações da aplicação
export const app = {
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  name: 'GladPros',
  version: '1.0.0',
} as const;

// Configurações de cache
export const cache = {
  defaultTtl: 300, // 5 minutos
  redisUrl: process.env.REDIS_URL,
} as const;

// Configurações de rate limiting
export const rateLimit = {
  loginAttempts: 5,
  loginWindow: 15 * 60 * 1000, // 15 minutos
  generalRequests: 100,
  generalWindow: 60 * 1000, // 1 minuto
} as const;

// Configurações de segurança
export const security = {
  bcryptRounds: 12,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas
  mfaCodeLength: 6,
  mfaCodeExpiry: 5 * 60 * 1000, // 5 minutos
} as const;

// Configurações de upload
export const upload = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  uploadDir: './uploads',
} as const;

// Configurações de estoque
export const stock = {
  defaultLocationId: 1, // Localização padrão para movimentações de estoque
  fieldPurchaseApprovalThreshold: 200, // USD — compras de campo acima deste valor precisam aprovação
} as const;

// Função para validar configurações críticas
export function validateConfig() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'CLIENT_DOC_ENCRYPTION_KEY_BASE64',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Configurações obrigatórias faltando: ${missing.join(', ')}`);
  }

  // Validar JWT_SECRET
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres');
  }

  console.log('✅ Todas as configurações críticas validadas');
}
