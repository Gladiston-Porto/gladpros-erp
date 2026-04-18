import Redis from 'ioredis';

function shouldDebugCache() {
  return process.env.DEBUG_CACHE === '1';
}

class CacheService {
  private redis: Redis | null = null;
  private memoryCache: Map<string, { value: unknown; expires: number }> = new Map();

  constructor() {
    this.initializeRedis();
    
    // Limpeza automática do cache em memória a cada 5 minutos
    setInterval(() => {
      this.cleanupMemoryCache();
    }, 5 * 60 * 1000);
  }

  private shouldUseRedis() {
    if (process.env.REDIS_DISABLED === 'true') {
      return false;
    }

    if (process.env.REDIS_ENABLED === 'true') {
      return true;
    }

    const hasRedisConfig = Boolean(
      process.env.REDIS_HOST || process.env.REDIS_PORT || process.env.REDIS_PASSWORD
    );

    if (process.env.NODE_ENV !== 'production' && !hasRedisConfig) {
      return false;
    }

    return true;
  }

  private disableRedis() {
    if (this.redis) {
      try {
        this.redis.disconnect();
      } catch {
        // noop
      }
    }
    this.redis = null;
  }

  private async initializeRedis() {
    if (!this.shouldUseRedis()) {
      return;
    }

    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 2
      });

      // Silenciar erros de conexão quando Redis não está disponível
      this.redis.on('error', () => {
        const g = global as unknown as { __cache_redis_error_logged?: boolean };
        if (!g.__cache_redis_error_logged) {
          console.warn('[CACHE] Redis não disponível, usando cache em memória');
          g.__cache_redis_error_logged = true;
        }
      });

      // Testar conexão
      await this.redis.ping();
      if (shouldDebugCache()) {
        console.log('[CACHE] Redis conectado com sucesso');
      }
    } catch (error) {
      console.warn('[CACHE] Redis não disponível, usando cache em memória');
      this.disableRedis();
    }
  }

  private cleanupMemoryCache() {
    const now = Date.now();
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expires < now) {
        this.memoryCache.delete(key);
      }
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      if (this.redis) {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        // Cache em memória
        const item = this.memoryCache.get(key);
        if (item && item.expires > Date.now()) {
          return item.value as T;
        }
        this.memoryCache.delete(key);
        return null;
      }
    } catch (error) {
      if (this.redis) {
        console.warn('[CACHE] Falha no Redis durante leitura, usando memória');
        this.disableRedis();
        return this.getFromMemory<T>(key);
      }
      console.error('[CACHE] Erro ao buscar:', error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number = 3600): Promise<boolean> {
    try {
      if (this.redis) {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
        return true;
      } else {
        // Cache em memória
        this.memoryCache.set(key, {
          value,
          expires: Date.now() + (ttlSeconds * 1000)
        });
        return true;
      }
    } catch (error) {
      if (this.redis) {
        console.warn('[CACHE] Falha no Redis durante gravação, usando memória');
        this.disableRedis();
        return this.set(key, value, ttlSeconds);
      }
      console.error('[CACHE] Erro ao salvar:', error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      if (this.redis) {
        await this.redis.del(key);
        return true;
      } else {
        this.memoryCache.delete(key);
        return true;
      }
    } catch (error) {
      if (this.redis) {
        console.warn('[CACHE] Falha no Redis durante remoção, usando memória');
        this.disableRedis();
        return this.delete(key);
      }
      console.error('[CACHE] Erro ao deletar:', error);
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      if (this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        return keys.length;
      } else {
        // Cache em memória - busca por padrão simples
        let deleted = 0;
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        for (const key of this.memoryCache.keys()) {
          if (regex.test(key)) {
            this.memoryCache.delete(key);
            deleted++;
          }
        }
        return deleted;
      }
    } catch (error) {
      if (this.redis) {
        console.warn('[CACHE] Falha no Redis ao deletar padrão, usando memória');
        this.disableRedis();
        return this.deletePattern(pattern);
      }
      console.error('[CACHE] Erro ao deletar padrão:', error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (this.redis) {
        const result = await this.redis.exists(key);
        return result === 1;
      } else {
        const item = this.memoryCache.get(key);
        return !!(item && item.expires > Date.now());
      }
    } catch (error) {
      if (this.redis) {
        console.warn('[CACHE] Falha no Redis ao verificar chave, usando memória');
        this.disableRedis();
        return this.exists(key);
      }
      console.error('[CACHE] Erro ao verificar existência:', error);
      return false;
    }
  }

  private getFromMemory<T = unknown>(key: string): T | null {
    const item = this.memoryCache.get(key);
    if (item && item.expires > Date.now()) {
      return item.value as T;
    }
    this.memoryCache.delete(key);
    return null;
  }

  // Cache específico para sessões de usuário
  async setUserSession<T = unknown>(userId: number, sessionData: T, ttlSeconds: number = 86400): Promise<boolean> {
    return this.set(`user_session:${userId}`, sessionData, ttlSeconds);
  }

  async getUserSession<T = unknown>(userId: number): Promise<T | null> {
    return this.get<T>(`user_session:${userId}`);
  }

  async deleteUserSession(userId: number): Promise<boolean> {
    return this.delete(`user_session:${userId}`);
  }

  // Cache para dados de usuário
  async setUserData<T = unknown>(userId: number, userData: T, ttlSeconds: number = 1800): Promise<boolean> {
    return this.set(`user_data:${userId}`, userData, ttlSeconds);
  }

  async getUserData<T = unknown>(userId: number): Promise<T | null> {
    return this.get<T>(`user_data:${userId}`);
  }

  async invalidateUserData(userId: number): Promise<boolean> {
    return this.delete(`user_data:${userId}`);
  }

  // Cache para listas (com paginação)
  async setListData<T = unknown>(listKey: string, page: number, limit: number, data: T, ttlSeconds: number = 600): Promise<boolean> {
    const key = `list:${listKey}:${page}:${limit}`;
    return this.set(key, data, ttlSeconds);
  }

  async getListData<T = unknown>(listKey: string, page: number, limit: number): Promise<T | null> {
    const key = `list:${listKey}:${page}:${limit}`;
    return this.get<T>(key);
  }

  async invalidateListData(listKey: string): Promise<number> {
    return this.deletePattern(`list:${listKey}:*`);
  }

  // Cache para estatísticas do dashboard
  async setDashboardStats<T = unknown>(userId: number, stats: T, ttlSeconds: number = 300): Promise<boolean> {
    return this.set(`dashboard_stats:${userId}`, stats, ttlSeconds);
  }

  async getDashboardStats<T = unknown>(userId: number): Promise<T | null> {
    return this.get<T>(`dashboard_stats:${userId}`);
  }

  // Cache para configurações do sistema
  async setSystemConfig<T = unknown>(configKey: string, config: T, ttlSeconds: number = 3600): Promise<boolean> {
    return this.set(`system_config:${configKey}`, config, ttlSeconds);
  }

  async getSystemConfig<T = unknown>(configKey: string): Promise<T | null> {
    return this.get<T>(`system_config:${configKey}`);
  }

  // Métricas de cache
  async getStats(): Promise<{
    redis: boolean;
    memoryKeys: number;
    redisKeys?: number;
  }> {
    const stats = {
      redis: !!this.redis,
      memoryKeys: this.memoryCache.size
    };

    if (this.redis) {
      try {
        const info = await this.redis.info('keyspace');
        const keyspaceMatch = info.match(/db0:keys=(\d+)/);
        return {
          ...stats,
          redisKeys: keyspaceMatch ? parseInt(keyspaceMatch[1]) : 0
        };
      } catch (error) {
        console.error('[CACHE] Erro ao obter estatísticas do Redis:', error);
      }
    }

    return stats;
  }

  // Limpeza completa do cache
  async flush(): Promise<boolean> {
    try {
      if (this.redis) {
        await this.redis.flushdb();
      }
      this.memoryCache.clear();
      if (shouldDebugCache()) {
        console.log('[CACHE] Cache limpo completamente');
      }
      return true;
    } catch (error) {
      console.error('[CACHE] Erro ao limpar cache:', error);
      return false;
    }
  }

  // Health check
  async healthCheck(): Promise<{
    redis: boolean;
    memory: boolean;
    error?: string;
  }> {
    const result = {
      redis: false,
      memory: true,
      error: undefined as string | undefined
    };

    try {
      if (this.redis) {
        await this.redis.ping();
        result.redis = true;
      }
    } catch (error) {
      result.error = `Redis: ${error}`;
    }

    return result;
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Helper function for caching expensive operations
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 600
): Promise<T> {
  // Tentar buscar do cache primeiro
  const cached = await cacheService.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Se não estiver no cache, executar função e cachear resultado
  const result = await fetchFn();
  await cacheService.set(key, result, ttlSeconds);
  return result;
}
