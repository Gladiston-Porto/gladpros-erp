/**
 * Token Service - Sistema de Refresh Token com Rotation
 * 
 * Implementa VUL-003: Token Rotation para prevenir ataques de roubo de token
 * Integrado com VUL-004: KMS para gerenciamento seguro de chaves JWT
 * 
 * Features:
 * - Access tokens de curta duração (15 minutos)
 * - Refresh tokens de longa duração (7 dias)
 * - Rotation automática de refresh tokens
 * - Cadeia de auditoria (rotation chain)
 * - Revogação granular de tokens
 * - Limpeza automática de tokens expirados
 * - JWT keys gerenciadas pelo KMS (Key Management System)
 */

import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { KMS } from '@/lib/security/kms';
import { signAuthJWT, type Role } from '@/shared/lib/jwt';

const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutos
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias em ms (para datas)
const REFRESH_TOKEN_EXPIRY_JWT = '7d'; // 7 dias (para jwt.sign expiresIn — aceita string, não ms)

// Cache da chave JWT (renovado periodicamente pelo KMS)
let cachedJwtKey: Buffer | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = parseInt(process.env.JWT_KMS_CACHE_TTL_MS || '', 10) || 30 * 60 * 1000; // 30 minutos

let jwtKmsFallbackLogged = false;
let allJwtKmsFallbackLogged = false;

/**
 * Obtém a chave JWT do KMS (com cache)
 */
async function getJwtSecret(): Promise<string> {
  // Em modo de teste, usar apenas JWT_SECRET (KMS desabilitado)
  if (process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test') {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is required');
    return secret;
  }
  const now = Date.now();
  
  // Verificar cache
  if (cachedJwtKey && (now - cacheTimestamp) < CACHE_TTL) {
    const key = cachedJwtKey; // Type narrowing
    return key.toString('hex');
  }
  
  // Buscar chave do KMS
  try {
    const key = await KMS.deriveJWTKey();
    cachedJwtKey = key;
    cacheTimestamp = now;
    return key.toString('hex');
   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    if (!jwtKmsFallbackLogged) {
      console.warn('[TokenService] Failed to get JWT key from KMS, using env fallback');
      jwtKmsFallbackLogged = true;
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is required - KMS also failed');
    return secret;
  }
}

/**
 * Obtém todas as chaves JWT válidas (para verificação de tokens antigos)
 * 
 * Retorna chaves em ordem de versão (mais recente primeira) para otimizar
 * tentativas de verificação de token
 */
async function getAllJwtSecrets(): Promise<string[]> {
  // Em modo de teste, usar apenas JWT_SECRET (KMS desabilitado)
  if (process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test') {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is required');
    return [secret];
  }
  
  try {
    const keys = await KMS.getAllValidKeys('JWT_SIGNING');
     
    // getAllValidKeys já retorna chaves decriptadas no campo 'key'
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return keys.map((managedKey: any) => managedKey.key.toString('hex'));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    if (!allJwtKmsFallbackLogged) {
      console.warn('[TokenService] Failed to get all JWT keys from KMS, using current key fallback');
      allJwtKmsFallbackLogged = true;
    }
    // Fallback para chave atual
    return [await getJwtSecret()];
  }
}

// Tipos
interface TokenPayload {
  userId: number;
  email: string;
  nivel: string; // Role do usuário (ADMIN, USER, etc)
  jti: string;
  type: 'access' | 'refresh';
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

interface RefreshTokenResult {
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

interface ValidatedToken {
  userId: number;
  email: string;
  nivel: string; // Role do usuário
  jti: string;
}

interface RefreshTokenMetadata {
  ip?: string;
  userAgent?: string;
}

/**
 * Gera um JTI (JWT ID) único para prevenir replay attacks
 */
function generateJti(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Gera um par de tokens (access + refresh) para um usuário
 * 
 * @param userId - ID do usuário
 * @param email - Email do usuário
 * @param nivel - Nível de acesso do usuário (ADMIN, USER, etc)
 * @param metadata - Metadados de segurança (IP, User-Agent)
 * @returns Par de tokens com timestamps de expiração
 */
export async function generateTokenPair(
  userId: number,
  email: string,
  nivel: string,
  metadata?: RefreshTokenMetadata
): Promise<TokenPair> {
  const accessJti = generateJti();
  const refreshJti = generateJti();
  
  const now = new Date();
  const accessTokenExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 min
  const refreshTokenExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRY_MS); // 7 dias
  
  // Payload do Access Token
  const accessPayload: TokenPayload = {
    userId,
    email,
    nivel,
    jti: accessJti,
    type: 'access'
  };
  
  // Payload do Refresh Token
  const refreshPayload: TokenPayload = {
    userId,
    email,
    nivel,
    jti: refreshJti,
    type: 'refresh'
  };
  
  // Obter chave JWT do KMS
  const jwtSecret = await getJwtSecret();
  
  // Gerar tokens JWT
  const accessToken = jwt.sign(accessPayload, jwtSecret, {
    expiresIn: ACCESS_TOKEN_EXPIRY
  });
  
  const refreshToken = jwt.sign(refreshPayload, jwtSecret, {
    expiresIn: REFRESH_TOKEN_EXPIRY_JWT
  });
  
 
  
  // Salvar refresh token no banco (access token é stateless)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).refreshToken.create({
      data: {
        token: refreshToken,
        usuarioId: userId,
        jti: refreshJti,
        expiraEm: refreshTokenExpiresAt,
        ip: metadata?.ip,
        userAgent: metadata?.userAgent
      }
    });
  } catch (error) {
    console.error('[createTokenPair] Failed to save refreshToken:', error);
    throw error;
  }
  
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt
  };
}

export async function generateRefreshToken(
  userId: number,
  email: string,
  nivel: string,
  metadata?: RefreshTokenMetadata
): Promise<RefreshTokenResult> {
  const refreshJti = generateJti();
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  const refreshPayload: TokenPayload = {
    userId,
    email,
    nivel,
    jti: refreshJti,
    type: 'refresh'
  };

  const jwtSecret = await getJwtSecret();
  const refreshToken = jwt.sign(refreshPayload, jwtSecret, {
    expiresIn: REFRESH_TOKEN_EXPIRY_JWT
  });

  try {
    await prisma.$executeRaw`
      INSERT INTO refresh_tokens (token, usuarioId, jti, revogado, expiraEm, ip, userAgent, criadoEm)
      VALUES (${refreshToken}, ${userId}, ${refreshJti}, FALSE, ${refreshTokenExpiresAt}, ${metadata?.ip ?? null}, ${metadata?.userAgent ?? null}, NOW())
    `;
  } catch (error) {
    console.error('[generateRefreshToken] Failed to save refreshToken:', error);
    throw error;
  }

  return {
    refreshToken,
    refreshTokenExpiresAt
  };
}

/**
 * Verifica um token JWT usando a chave do KMS
 * Usado pelo RBAC/API (Node.js environment)
 */
export async function verifyTokenWithKMS(token: string): Promise<TokenPayload> {
  const secret = await getJwtSecret();
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded as TokenPayload);
    });
  });
}

/**
 * Valida um Access Token
 * 
 * @param token - Token a ser validado
 * @returns Dados do usuário se válido
 * @throws Error se token inválido ou expirado
 */
export async function validateAccessToken(token: string): Promise<ValidatedToken> {
  // Tentar com chaves válidas do KMS (suporta múltiplas versões)
  const secrets = await getAllJwtSecrets();
  
  let lastError: Error | null = null;
  
  for (const secret of secrets) {
    try {
      const decoded = jwt.verify(token, secret) as TokenPayload;
      
      // Verificar tipo de token
      if (decoded.type !== 'access') {
        throw new Error('Token inválido: tipo incorreto');
      }
      
      // Auditar uso da chave (sucesso)
      const keyIndex = secrets.indexOf(secret);
      const keys = await KMS.getAllValidKeys('JWT_SIGNING');
      const usedKey = keys[keyIndex];
      
      if (usedKey) {
        await KMS.auditKeyUsage({
          keyId: usedKey.id,
          keyVersion: usedKey.version,
           
          keyType: 'JWT_SIGNING',
          operation: 'VERIFY',
          success: true,
          context: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            operation: 'VERIFY' as any,
            entityType: 'AccessToken',
            entityId: decoded.userId
          }
        }).catch(() => {}); // Não falhar se auditoria falhar
      }
      
      return {
        userId: decoded.userId,
        email: decoded.email,
        nivel: decoded.nivel,
        jti: decoded.jti
      };
    } catch (error) {
      lastError = error as Error;
      continue; // Tentar próxima chave
    }
  }
  
  // Se chegou aqui, todas as chaves falharam
  if (lastError) {
    if (lastError instanceof jwt.TokenExpiredError) {
      throw new Error('Token expirado');
    }
    if (lastError instanceof jwt.JsonWebTokenError) {
      throw new Error('Token inválido');
    }
    throw lastError;
  }
  
  throw new Error('Token inválido: nenhuma chave válida');
}

/**
 * Valida um Refresh Token
 * 
 * Verifica:
 * - Assinatura JWT válida
 * - Não expirado
 * - Não revogado no banco
 * - Tipo correto (refresh)
 * 
 * @param token - Refresh token a ser validado
 * @returns Dados do usuário e registro do token
 * @throws Error se token inválido, expirado ou revogado
 */
export async function validateRefreshToken(token: string) {
  // Tentar com chaves válidas do KMS
  const secrets = await getAllJwtSecrets();
  
  let decoded: TokenPayload | null = null;
  let lastError: Error | null = null;
  
  for (const secret of secrets) {
    try {
      decoded = jwt.verify(token, secret) as TokenPayload;
      break; // Sucesso
    } catch (error) {
      lastError = error as Error;
      continue;
    }
  }
  
  if (!decoded || lastError) {
    if (lastError instanceof jwt.TokenExpiredError) {
      throw new Error('Token expirado');
    }
    if (lastError instanceof jwt.JsonWebTokenError) {
      throw new Error('Token inválido');
    }
    throw new Error('Token inválido: nenhuma chave válida');
  }
  
  try {
    // 2. Verificar tipo
     
    if (decoded.type !== 'refresh') {
      throw new Error('Token inválido: tipo incorreto');
    }
    
    // 3. Buscar no banco
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storedToken = await (prisma as any).refreshToken.findUnique({
      where: { jti: decoded.jti },
      include: { usuario: true }
    });
    
    // 4. Verificar se existe
    if (!storedToken) {
      throw new Error('Token não encontrado');
    }
    
    // 5. Verificar se foi revogado
    if (storedToken.revogado) {
      throw new Error(`Token revogado: ${storedToken.motivoRevogacao || 'sem motivo'}`);
    }
    
    // 6. Verificar se já foi usado (rotation)
    if (storedToken.usadoEm) {
      // Token já foi usado - possível reutilização maliciosa
      // Revogar toda a cadeia de tokens do usuário por segurança
      await revokeAllUserTokens(
        storedToken.usuarioId,
        'Detecção de reutilização de token - possível comprometimento'
      );
      throw new Error('Token já foi usado - todos os tokens do usuário foram revogados por segurança');
    }
    
    return {
      userId: decoded.userId,
      email: decoded.email,
      nivel: decoded.nivel,
      jti: decoded.jti,
      tokenRecord: storedToken
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expirado');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Refresh token inválido');
    }
    throw error;
  }
}

/**
 * Refresh de Access Token usando Refresh Token
 * 
 * Implementa Token Rotation:
 * 1. Valida o refresh token atual
 * 2. Marca-o como usado
 * 3. Gera um NOVO par de tokens
 * 4. O novo refresh token aponta para o antigo (rotation chain)
 * 
 * @param oldRefreshToken - Refresh token atual
 * @param metadata - Metadados de segurança
 * @returns Novo par de tokens
 */
export async function refreshAccessToken(
  oldRefreshToken: string,
  metadata?: RefreshTokenMetadata
): Promise<TokenPair> {
  // 1. Validar refresh token
  const validated = await validateRefreshToken(oldRefreshToken);
  
  // 2. Buscar dados completos do usuário
  const usuario = await prisma.usuario.findUnique({
    where: { id: validated.userId }
  });
  
  if (!usuario) {
    throw new Error('Usuário não encontrado');
  }
  
 
  
  if (usuario.status !== 'ATIVO') {
    throw new Error('Usuário inativo');
  }
  
  // 3. Marcar token antigo como usado
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).refreshToken.update({
    where: { jti: validated.jti },
    data: { usadoEm: new Date() }
  });
  
  // 4. Gerar novo par de tokens
  const accessJti = generateJti();
  const refreshJti = generateJti();
  
  const now = new Date();
  const accessTokenExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  const refreshTokenExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRY_MS);
  
  const refreshPayload: TokenPayload = {
    userId: usuario.id,
    email: usuario.email,
    nivel: usuario.nivel,
    jti: refreshJti,
    type: 'refresh'
  };
  
  // Obter chave JWT do KMS
  const jwtSecret = await getJwtSecret();

  const accessToken = await signAuthJWT({
    sub: String(usuario.id),
    role: (usuario.nivel || 'USUARIO') as Role,
    email: usuario.email,
    status: 'ATIVO',
    tokenVersion: usuario.tokenVersion ?? 0
  }, ACCESS_TOKEN_EXPIRY);

  const refreshToken = jwt.sign(refreshPayload, jwtSecret, {
    expiresIn: REFRESH_TOKEN_EXPIRY_JWT
  });
  
  // 5. Salvar novo refresh token com referência ao anterior (rotation chain)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).refreshToken.create({
    data: {
      token: refreshToken,
      usuarioId: usuario.id,
      jti: refreshJti,
      expiraEm: refreshTokenExpiresAt,
      tokenPaiId: validated.tokenRecord.id, // Rotation chain!
      ip: metadata?.ip,
      userAgent: metadata?.userAgent
    }
  });
  
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt
  };
}

/**
 * Revoga um refresh token específico
 * 
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 * @param token - Token a ser revogado
 * @param motivo - Motivo da revogação
 */
export async function revokeRefreshToken(
  token: string,
  motivo: string = 'Logout do usuário'
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const revokedByToken = await (prisma as any).refreshToken.updateMany({
      where: {
        token,
        revogado: false
      },
      data: {
        revogado: true,
        motivoRevogacao: motivo,
        revogadoEm: new Date()
      }
     
    });

    if (revokedByToken?.count > 0) {
      return;
    }

    const jwtSecret = await getJwtSecret();
    const decoded = jwt.verify(token, jwtSecret) as TokenPayload;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).refreshToken.updateMany({
      where: {
        jti: decoded.jti,
        revogado: false
      },
      data: {
        revogado: true,
        motivoRevogacao: motivo,
        revogadoEm: new Date()
      }
    });
  } catch (error) {
    // Token inválido ou expirado - ignorar silenciosamente
    console.warn('Tentativa de revogar token inválido:', error);
  }
}

/**
 * Revoga TODOS os refresh tokens de um usuário
 * 
 * Usado em casos de:
 * - Detecção de reutilização de token (possível roubo)
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 * - Mudança de senha
 * - Logout de todos os dispositivos
 * 
 * @param userId - ID do usuário
 * @param motivo - Motivo da revogação em massa
 */
export async function revokeAllUserTokens(
  userId: number,
  motivo: string = 'Logout de todos os dispositivos'
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (prisma as any).refreshToken.updateMany({
    where: {
      usuarioId: userId,
      revogado: false
    },
    data: {
      revogado: true,
      motivoRevogacao: motivo,
      revogadoEm: new Date()
    }
  });
  
  return result.count;
}

/**
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 * Limpa tokens expirados do banco de dados
 * 
 * Deve ser executado periodicamente (cron job)
 * Remove tokens expirados há mais de 30 dias
 * 
 * @returns Número de tokens removidos
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (prisma as any).refreshToken.deleteMany({
    where: {
      expiraEm: {
        lt: thirtyDaysAgo
      }
    }
  });
  
  return result.count;
 
}

 

/**
 * Obtém estatísticas de tokens de um usuário
 * 
 * Útil para debugging e auditoria
 * 
 * @param userId - ID do usuário
 * @returns Estatísticas dos tokens
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 */
export async function getUserTokenStats(userId: number) {
  const [total, ativos, revogados, expirados, usados] = await Promise.all([
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).refreshToken.count({ where: { usuarioId: userId } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).refreshToken.count({
      where: {
        usuarioId: userId,
         
        revogado: false,
        expiraEm: { gt: new Date() },
        usadoEm: null
      }
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).refreshToken.count({
      where: { usuarioId: userId, revogado: true }
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).refreshToken.count({
      where: {
        usuarioId: userId,
        expiraEm: { lt: new Date() }
      }
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).refreshToken.count({
      where: {
        usuarioId: userId,
        usadoEm: { not: null }
      }
    })
  ]);
  
  return {
     
    total,
    ativos,
    revogados,
    expirados,
    usados
  };
}

/**
 * Lista todos os tokens ativos de um usuário
 * 
 * Útil para funcionalidade "Ver dispositivos conectados"
 * 
 * @param userId - ID do usuário
 * @returns Lista de tokens ativos com metadados
 */
export async function listUserActiveTokens(userId: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await (prisma as any).refreshToken.findMany({
    where: {
      usuarioId: userId,
      revogado: false,
      expiraEm: { gt: new Date() },
      usadoEm: null
    },
    select: {
      id: true,
      criadoEm: true,
      expiraEm: true,
      ip: true,
      userAgent: true
    },
    orderBy: { criadoEm: 'desc' }
  });
}
