import { cacheService } from '@/shared/lib/cache';

export interface Notification {
  id: string;
  userId: number;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export class NotificationService {
  private static readonly CACHE_PREFIX = 'notifications';
  private static readonly USER_NOTIFICATIONS_KEY = (userId: number) => `${this.CACHE_PREFIX}:user:${userId}`;
  private static readonly GLOBAL_NOTIFICATIONS_KEY = `${this.CACHE_PREFIX}:global`;

  // Criar nova notificação
  static async create(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<string> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newNotification: Notification = {
      ...notification,
      id,
      read: false,
      createdAt: new Date()
    };

    try {
      // Salvar em cache (TTL de 30 dias para notificações)
      const cacheKey = this.USER_NOTIFICATIONS_KEY(notification.userId);
      const existingNotifications = await cacheService.get<Notification[]>(cacheKey) || [];
      
      // Adicionar nova notificação no início
      const updatedNotifications = [newNotification, ...existingNotifications];
      
      // Manter apenas as últimas 100 notificações
      const trimmedNotifications = updatedNotifications.slice(0, 100);
      
      await cacheService.set(cacheKey, trimmedNotifications, 30 * 24 * 3600); // 30 dias

      console.log(`[NOTIFICATIONS] Nova notificação criada para usuário ${notification.userId}: ${notification.title}`);
      
      return id;
    } catch (error) {
      console.error('[NOTIFICATIONS] Erro ao criar notificação:', error);
      throw new Error('Falha ao criar notificação');
    }
  }

  // Buscar notificações do usuário
  static async getUserNotifications(
    userId: number,
    options?: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    }
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    try {
      const cacheKey = this.USER_NOTIFICATIONS_KEY(userId);
      const allNotifications = await cacheService.get<Notification[]>(cacheKey) || [];
      
      // Filtrar notificações expiradas
      const validNotifications = allNotifications.filter(notif => 
        !notif.expiresAt || new Date(notif.expiresAt) > new Date()
      );

      // Aplicar filtros
      let filteredNotifications = validNotifications;
      if (options?.unreadOnly) {
        filteredNotifications = validNotifications.filter(notif => !notif.read);
      }

      // Aplicar paginação
      const offset = options?.offset || 0;
      const limit = options?.limit || 20;
      const paginatedNotifications = filteredNotifications.slice(offset, offset + limit);

      // Contar não lidas
      const unreadCount = validNotifications.filter(notif => !notif.read).length;

      return {
        notifications: paginatedNotifications,
        total: filteredNotifications.length,
        unreadCount
      };
    } catch (error) {
      console.error('[NOTIFICATIONS] Erro ao buscar notificações:', error);
      return {
        notifications: [],
        total: 0,
        unreadCount: 0
      };
    }
  }

  // Marcar notificação como lida
  static async markAsRead(userId: number, notificationId: string): Promise<boolean> {
    try {
      const cacheKey = this.USER_NOTIFICATIONS_KEY(userId);
      const notifications = await cacheService.get<Notification[]>(cacheKey) || [];
      
      const updatedNotifications = notifications.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      );

      await cacheService.set(cacheKey, updatedNotifications, 30 * 24 * 3600);
      
      console.log(`[NOTIFICATIONS] Notificação ${notificationId} marcada como lida`);
      return true;
    } catch (error) {
      console.error('[NOTIFICATIONS] Erro ao marcar como lida:', error);
      return false;
    }
  }

  // Marcar todas como lidas
  static async markAllAsRead(userId: number): Promise<boolean> {
    try {
      const cacheKey = this.USER_NOTIFICATIONS_KEY(userId);
      const notifications = await cacheService.get<Notification[]>(cacheKey) || [];
      
      const updatedNotifications = notifications.map(notif => ({ ...notif, read: true }));

      await cacheService.set(cacheKey, updatedNotifications, 30 * 24 * 3600);
      
      console.log(`[NOTIFICATIONS] Todas notificações marcadas como lidas para usuário ${userId}`);
      return true;
    } catch (error) {
      console.error('[NOTIFICATIONS] Erro ao marcar todas como lidas:', error);
      return false;
    }
  }

  // Deletar notificação
  static async delete(userId: number, notificationId: string): Promise<boolean> {
    try {
      const cacheKey = this.USER_NOTIFICATIONS_KEY(userId);
      const notifications = await cacheService.get<Notification[]>(cacheKey) || [];
      
      const updatedNotifications = notifications.filter(notif => notif.id !== notificationId);

      await cacheService.set(cacheKey, updatedNotifications, 30 * 24 * 3600);
      
      console.log(`[NOTIFICATIONS] Notificação ${notificationId} deletada`);
      return true;
    } catch (error) {
      console.error('[NOTIFICATIONS] Erro ao deletar notificação:', error);
      return false;
    }
  }

  // Limpar notificações antigas
  static async cleanup(userId: number): Promise<number> {
    try {
      const cacheKey = this.USER_NOTIFICATIONS_KEY(userId);
      const notifications = await cacheService.get<Notification[]>(cacheKey) || [];
      
      const now = new Date();
      const validNotifications = notifications.filter(notif => {
        // Manter notificações não expiradas e não lidas há menos de 7 dias
        if (notif.expiresAt && new Date(notif.expiresAt) <= now) {
          return false;
        }
        
        if (notif.read) {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return new Date(notif.createdAt) > sevenDaysAgo;
        }
        
        return true;
      });

      const removedCount = notifications.length - validNotifications.length;
      
      if (removedCount > 0) {
        await cacheService.set(cacheKey, validNotifications, 30 * 24 * 3600);
        console.log(`[NOTIFICATIONS] ${removedCount} notificações antigas removidas para usuário ${userId}`);
      }

      return removedCount;
    } catch (error) {
      console.error('[NOTIFICATIONS] Erro na limpeza:', error);
      return 0;
    }
  }

  // Notificações pré-definidas do sistema
  static async notifyLogin(userId: number, ip: string, userAgent: string): Promise<string> {
    return this.create({
      userId,
      type: 'info',
      title: 'Novo login detectado',
      message: `Login realizado com sucesso de ${ip}`,
      data: { ip, userAgent, type: 'login' }
    });
  }

  static async notifyPasswordChanged(userId: number): Promise<string> {
    return this.create({
      userId,
      type: 'success',
      title: 'Senha alterada',
      message: 'Sua senha foi alterada com sucesso',
      data: { type: 'password_change' }
    });
  }

  static async notifySecurityAlert(userId: number, alertType: string, details: string): Promise<string> {
    return this.create({
      userId,
      type: 'warning',
      title: 'Alerta de segurança',
      message: details,
      data: { type: 'security_alert', alertType }
    });
  }

  static async notifySystemMaintenance(userId: number, scheduledAt: Date): Promise<string> {
    return this.create({
      userId,
      type: 'warning',
      title: 'Manutenção programada',
      message: `Sistema em manutenção programada para ${scheduledAt.toLocaleDateString('pt-BR')}`,
      data: { type: 'maintenance', scheduledAt: scheduledAt.toISOString() },
      expiresAt: scheduledAt
    });
  }

  static async notifyDataExport(userId: number, exportType: string, status: 'completed' | 'failed'): Promise<string> {
    return this.create({
      userId,
      type: status === 'completed' ? 'success' : 'error',
      title: status === 'completed' ? 'Exportação concluída' : 'Falha na exportação',
      message: `Exportação de ${exportType} ${status === 'completed' ? 'foi concluída' : 'falhou'}`,
      data: { type: 'export', exportType, status }
    });
  }

  // Broadcast para todos os usuários (notificações globais)
  static async broadcast(notification: Omit<Notification, 'id' | 'userId' | 'createdAt' | 'read'>): Promise<void> {
    try {
      const globalNotification: Omit<Notification, 'userId'> = {
        ...notification,
        id: `global_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        read: false
      };

      // Salvar na lista de notificações globais
  const globalKey = this.GLOBAL_NOTIFICATIONS_KEY;
  const globalNotifications = await cacheService.get<Array<Omit<Notification, 'userId'>>>(globalKey) || [];
      globalNotifications.unshift(globalNotification);
      
      // Manter apenas as últimas 10 notificações globais
      const trimmedGlobal = globalNotifications.slice(0, 10);
  await cacheService.set(globalKey, trimmedGlobal, 30 * 24 * 3600);

      console.log(`[NOTIFICATIONS] Notificação global criada: ${notification.title}`);
    } catch (error) {
      console.error('[NOTIFICATIONS] Erro ao criar notificação global:', error);
    }
  }

  // Buscar notificações globais
  static async getGlobalNotifications(): Promise<Notification[]> {
    try {
      const globalKey = this.GLOBAL_NOTIFICATIONS_KEY;
      const globalNotifications = await cacheService.get<Notification[]>(globalKey) || [];
      
      // Filtrar notificações não expiradas
      const validNotifications = globalNotifications.filter(notif => 
        !notif.expiresAt || new Date(notif.expiresAt) > new Date()
      );

      return validNotifications;
    } catch (error) {
      console.error('[NOTIFICATIONS] Erro ao buscar notificações globais:', error);
      return [];
    }
  }
}
