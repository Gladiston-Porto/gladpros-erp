// src/lib/cache/business-cache.ts
import { cacheService } from '../cache';

const inFlightBusinessCache = new Map<string, Promise<unknown>>();

// Cache específico para dados de negócio
export class BusinessCache {
  // Cache para dados de usuário com permissões
  static async getUserWithPermissions(userId: number) {
    const cacheKey = `user_permissions:${userId}`;
    return cacheService.get(cacheKey);
  }

  static async setUserWithPermissions(userId: number, userData: Record<string, unknown>, ttlSeconds: number = 1800) {
    const cacheKey = `user_permissions:${userId}`;
    return cacheService.set(cacheKey, userData, ttlSeconds);
  }

  static async invalidateUserPermissions(userId: number) {
    const cacheKey = `user_permissions:${userId}`;
    return cacheService.delete(cacheKey);
  }

  // Cache para estatísticas do dashboard
  static async getDashboardStats(userId: number, period: string = '30d') {
    const cacheKey = `dashboard_stats:${userId}:${period}`;
    return cacheService.get(cacheKey);
  }

  static async setDashboardStats(userId: number, stats: Record<string, unknown>, period: string = '30d', ttlSeconds: number = 300) {
    const cacheKey = `dashboard_stats:${userId}:${period}`;
    return cacheService.set(cacheKey, stats, ttlSeconds);
  }

  static async invalidateDashboardStats(userId: number) {
    const pattern = `dashboard_stats:${userId}:*`;
    return cacheService.deletePattern(pattern);
  }

  // Cache para listas de propostas com filtros
  static async getProposalsList(filters: Record<string, unknown>) {
    const cacheKey = `proposals_list:${JSON.stringify(filters)}`;
    return cacheService.get(cacheKey);
  }

  static async setProposalsList(filters: Record<string, unknown>, data: Record<string, unknown>, ttlSeconds: number = 600) {
    const cacheKey = `proposals_list:${JSON.stringify(filters)}`;
    return cacheService.set(cacheKey, data, ttlSeconds);
  }

  static async invalidateProposalsList() {
    return cacheService.deletePattern('proposals_list:*');
  }

  // Cache para dados de clientes
  static async getClientData(clientId: string) {
    const cacheKey = `client_data:${clientId}`;
    return cacheService.get(cacheKey);
  }

  static async setClientData(clientId: string, data: Record<string, unknown>, ttlSeconds: number = 1800) {
    const cacheKey = `client_data:${clientId}`;
    return cacheService.set(cacheKey, data, ttlSeconds);
  }

  static async invalidateClientData(clientId: string) {
    const cacheKey = `client_data:${clientId}`;
    return cacheService.delete(cacheKey);
  }

  // Cache para configurações do sistema
  static async getSystemSettings() {
    const cacheKey = 'system_settings';
    return cacheService.get(cacheKey);
  }

  static async setSystemSettings(settings: Record<string, unknown>, ttlSeconds: number = 3600) {
    const cacheKey = 'system_settings';
    return cacheService.set(cacheKey, settings, ttlSeconds);
  }

  static async invalidateSystemSettings() {
    return cacheService.delete('system_settings');
  }

  // Cache para tokens de propostas públicas
  static async getPublicProposal(token: string) {
    const cacheKey = `public_proposal:${token}`;
    return cacheService.get(cacheKey);
  }

  static async setPublicProposal(token: string, data: Record<string, unknown>, ttlSeconds: number = 3600) {
    const cacheKey = `public_proposal:${token}`;
    return cacheService.set(cacheKey, data, ttlSeconds);
  }

  static async invalidatePublicProposal(token: string) {
    const cacheKey = `public_proposal:${token}`;
    return cacheService.delete(cacheKey);
  }

  // Cache para analytics e métricas
  static async getAnalyticsData(type: string, period: string) {
    const cacheKey = `analytics:${type}:${period}`;
    return cacheService.get(cacheKey);
  }

  static async setAnalyticsData(type: string, period: string, data: Record<string, unknown>, ttlSeconds: number = 1800) {
    const cacheKey = `analytics:${type}:${period}`;
    return cacheService.set(cacheKey, data, ttlSeconds);
  }

  static async invalidateAnalyticsData(type?: string) {
    const pattern = type ? `analytics:${type}:*` : 'analytics:*';
    return cacheService.deletePattern(pattern);
  }

  // Método utilitário para invalidar cache relacionado a uma entidade
  static async invalidateEntityCache(entityType: string, entityId: string | number) {
    const patterns = [
      `${entityType}_data:${entityId}`,
      `${entityType}_list:*${entityId}*`,
      `${entityType}_stats:*${entityId}*`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await cacheService.deletePattern(pattern);
    }

    return totalDeleted;
  }

  // Método para warm-up do cache (pré-carregar dados importantes)
  static async warmupCache() {
     
    // eslint-disable-next-line no-console
    console.log('[CACHE] Iniciando warm-up do cache...');

    try {
      // Cache de configurações do sistema
      // await this.setSystemSettings(await fetchSystemSettings());

      // Cache de dados frequentemente acessados
      // await this.warmupFrequentlyAccessedData();

 

      // eslint-disable-next-line no-console
      console.log('[CACHE] Warm-up do cache concluído');
    } catch (error) {
      console.error('[CACHE] Erro durante warm-up do cache:', error);
    }
  }

   
  // Método para limpeza seletiva baseada em padrões de uso
  static async cleanupStaleData() {
    // eslint-disable-next-line no-console
    console.log('[CACHE] Iniciando limpeza de dados stale...');

    const stalePatterns = [
      'temp_*',
      'session_*',
      'draft_*'
    ];

    let totalCleaned = 0;
    for (const pattern of stalePatterns) {
       
      totalCleaned += await cacheService.deletePattern(pattern);
    }

    // eslint-disable-next-line no-console
    console.log(`[CACHE] ${totalCleaned} entradas stale removidas`);
    return totalCleaned;
  }
}

// Helper functions para cache condicional
export async function withBusinessCache<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  options: {
    ttlSeconds?: number;
    condition?: (data: T) => boolean;
    invalidateOnError?: boolean;
  } = {}
): Promise<T> {
  const { ttlSeconds = 600, condition, invalidateOnError = false } = options;

  try {
    // Tentar buscar do cache
    const cached = await cacheService.get<T>(cacheKey);
    if (cached !== null) {
      // Verificar condição se fornecida
      if (!condition || condition(cached)) {
        return cached;
      }
    }

    const inFlight = inFlightBusinessCache.get(cacheKey);
    if (inFlight) {
      return await inFlight as T;
    }

    const fetchPromise = (async () => {
      const freshData = await fetchFn();

      // Verificar condição antes de cachear
      if (!condition || condition(freshData)) {
        await cacheService.set(cacheKey, freshData, ttlSeconds);
      }

      return freshData;
    })();

    inFlightBusinessCache.set(cacheKey, fetchPromise);

    try {
      return await fetchPromise;
    } finally {
      inFlightBusinessCache.delete(cacheKey);
    }

  } catch (error) {
    if (invalidateOnError) {
      await cacheService.delete(cacheKey);
    }
    throw error;
  }
}
