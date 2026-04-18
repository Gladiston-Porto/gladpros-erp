import { useEffect, useState, useCallback } from 'react';
import { authenticatedFetch } from '@/lib/api/client';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: string;
  read: boolean;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  sendNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => Promise<void>;
}

export function useNotifications(userId?: string): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await authenticatedFetch('/api/notifications?limit=50');
      if (!response.ok) return;
      const data = await response.json();

      if (data.notifications) {
        setNotifications(data.notifications.map((n: {
          id: string;
          type: string;
          title: string;
          message: string;
          data?: Record<string, unknown>;
          createdAt: string;
          read: boolean;
        }) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          data: n.data || {},
          timestamp: n.createdAt,
          read: n.read,
        })));
      }

      setIsConnected(true);
    } catch (error) {
      console.error('Notification fetch error:', error);
      setIsConnected(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();

    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
    // Fire and forget API call
    authenticatedFetch(`/api/notifications/${id}`, { method: 'PUT' }).catch(() => {});
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
    authenticatedFetch('/api/notifications/mark-all-read', { method: 'PUT' }).catch(() => {});
  }, []);

  const sendNotification = useCallback(async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    try {
      const response = await authenticatedFetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification),
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      console.error('Send notification error:', error);
      throw error;
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    sendNotification,
  };
}
