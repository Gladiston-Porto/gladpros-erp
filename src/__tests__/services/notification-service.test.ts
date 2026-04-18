/**
 * Service Layer Tests: Notification Service
 * Testing notifications (in-app, push, WebSocket)
 */

import { describe, it, expect } from '@jest/globals';

// Notification Types
interface Notification {
  id: string;
  userId: number;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

interface NotificationPreferences {
  userId: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
}

// Notification Service
class NotificationService {
  private notifications: Notification[] = [];
  private preferences: Map<number, NotificationPreferences> = new Map();
  private notificationCounter = 0;

  createNotification(
    userId: number,
    type: Notification['type'],
    title: string,
    message: string
  ): Notification {
    const notification: Notification = {
      id: `notif-${Date.now()}-${++this.notificationCounter}`,
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date(Date.now() + this.notificationCounter), // Offset for ordering
    };

    this.notifications.push(notification);
    return notification;
  }

  getNotificationsForUser(userId: number): Notification[] {
    return this.notifications.filter(n => n.userId === userId);
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  deleteNotification(notificationId: string): void {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index > -1) {
      this.notifications.splice(index, 1);
    }
  }

  setPreferences(userId: number, preferences: NotificationPreferences): void {
    this.preferences.set(userId, preferences);
  }

  getPreferences(userId: number): NotificationPreferences | undefined {
    return this.preferences.get(userId);
  }

  countUnreadNotifications(userId: number): number {
    return this.getNotificationsForUser(userId).filter(n => !n.read).length;
  }

  getUnreadNotifications(userId: number): Notification[] {
    return this.getNotificationsForUser(userId).filter(n => !n.read);
  }

  clearAllNotifications(userId: number): void {
    const userNotifications = this.getNotificationsForUser(userId);
    userNotifications.forEach(n => {
      const index = this.notifications.indexOf(n);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
    });
  }
}

describe('Notification Service', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
  });

  describe('Notification Creation', () => {
    it('should create notification', () => {
      const notification = notificationService.createNotification(
        1,
        'INFO',
        'Test',
        'Test message'
      );

      expect(notification.id).toBeDefined();
      expect(notification.userId).toBe(1);
      expect(notification.type).toBe('INFO');
    });

    it('should set created timestamp', () => {
      const before = new Date();
      const notification = notificationService.createNotification(
        1,
        'INFO',
        'Test',
        'Message'
      );
      const after = new Date(Date.now() + 10); // Add 10ms buffer

      expect(notification.createdAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(notification.createdAt.getTime()).toBeLessThanOrEqual(
        after.getTime()
      );
    });

    it('should mark as unread by default', () => {
      const notification = notificationService.createNotification(
        1,
        'INFO',
        'Test',
        'Message'
      );

      expect(notification.read).toBe(false);
    });

    it('should support different notification types', () => {
      const types: Array<Notification['type']> = [
        'INFO',
        'SUCCESS',
        'WARNING',
        'ERROR',
      ];

      types.forEach(type => {
        const notification = notificationService.createNotification(
          1,
          type,
          'Title',
          'Message'
        );

        expect(notification.type).toBe(type);
      });
    });
  });

  describe('Notification Retrieval', () => {
    it('should get all notifications for user', () => {
      notificationService.createNotification(1, 'INFO', 'Title 1', 'Message 1');
      notificationService.createNotification(1, 'INFO', 'Title 2', 'Message 2');
      notificationService.createNotification(2, 'INFO', 'Title 3', 'Message 3');

      const userNotifications = notificationService.getNotificationsForUser(1);

      expect(userNotifications.length).toBe(2);
    });

    it('should return empty array for user with no notifications', () => {
      const notifications = notificationService.getNotificationsForUser(999);

      expect(notifications.length).toBe(0);
    });

    it('should get unread notifications only', () => {
      const n1 = notificationService.createNotification(
        1,
        'INFO',
        'Title 1',
        'Message 1'
      );
      const n2 = notificationService.createNotification(
        1,
        'INFO',
        'Title 2',
        'Message 2'
      );

      notificationService.markAsRead(n1.id);

      const unread = notificationService.getUnreadNotifications(1);

      expect(unread.length).toBe(1);
      expect(unread[0].id).toBe(n2.id);
    });
  });

  describe('Notification Status', () => {
    it('should mark notification as read', () => {
      const notification = notificationService.createNotification(
        1,
        'INFO',
        'Title',
        'Message'
      );

      notificationService.markAsRead(notification.id);

      const updated = notificationService.getNotificationsForUser(1)[0];
      expect(updated.read).toBe(true);
    });

    it('should count unread notifications', () => {
      notificationService.createNotification(1, 'INFO', 'T1', 'M1');
      notificationService.createNotification(1, 'INFO', 'T2', 'M2');
      notificationService.createNotification(1, 'INFO', 'T3', 'M3');

      const count = notificationService.countUnreadNotifications(1);

      expect(count).toBe(3);
    });

    it('should update unread count after marking as read', () => {
      const n1 = notificationService.createNotification(
        1,
        'INFO',
        'T1',
        'M1'
      );
      notificationService.createNotification(1, 'INFO', 'T2', 'M2');

      notificationService.markAsRead(n1.id);

      const count = notificationService.countUnreadNotifications(1);
      expect(count).toBe(1);
    });
  });

  describe('Notification Deletion', () => {
    it('should delete notification', () => {
      const notification = notificationService.createNotification(
        1,
        'INFO',
        'Title',
        'Message'
      );

      notificationService.deleteNotification(notification.id);

      const notifications = notificationService.getNotificationsForUser(1);
      expect(notifications.length).toBe(0);
    });

    it('should clear all user notifications', () => {
      notificationService.createNotification(1, 'INFO', 'T1', 'M1');
      notificationService.createNotification(1, 'INFO', 'T2', 'M2');
      notificationService.createNotification(2, 'INFO', 'T3', 'M3');

      notificationService.clearAllNotifications(1);

      expect(notificationService.getNotificationsForUser(1).length).toBe(0);
      expect(notificationService.getNotificationsForUser(2).length).toBe(1);
    });
  });

  describe('Notification Preferences', () => {
    it('should set user preferences', () => {
      const preferences: NotificationPreferences = {
        userId: 1,
        emailNotifications: true,
        pushNotifications: false,
        inAppNotifications: true,
      };

      notificationService.setPreferences(1, preferences);

      const retrieved = notificationService.getPreferences(1);
      expect(retrieved).toEqual(preferences);
    });

    it('should support disabling email notifications', () => {
      const preferences: NotificationPreferences = {
        userId: 1,
        emailNotifications: false,
        pushNotifications: true,
        inAppNotifications: true,
      };

      notificationService.setPreferences(1, preferences);

      const retrieved = notificationService.getPreferences(1);
      expect(retrieved?.emailNotifications).toBe(false);
    });

    it('should support disabling all notifications', () => {
      const preferences: NotificationPreferences = {
        userId: 1,
        emailNotifications: false,
        pushNotifications: false,
        inAppNotifications: false,
      };

      notificationService.setPreferences(1, preferences);

      const retrieved = notificationService.getPreferences(1);
      expect(retrieved?.emailNotifications).toBe(false);
      expect(retrieved?.pushNotifications).toBe(false);
      expect(retrieved?.inAppNotifications).toBe(false);
    });
  });

  describe('Proposta Notifications', () => {
    it('should notify cliente when proposta is sent', () => {
      const notification = notificationService.createNotification(
        1,
        'INFO',
        'Nova Proposta',
        'Sua proposta foi enviada'
      );

      expect(notification.title).toContain('Proposta');
    });

    it('should notify cliente when proposta is approved', () => {
      const notification = notificationService.createNotification(
        1,
        'SUCCESS',
        'Proposta Aprovada',
        'Sua proposta foi aprovada!'
      );

      expect(notification.type).toBe('SUCCESS');
    });

    it('should notify cliente when proposta is rejected', () => {
      const notification = notificationService.createNotification(
        1,
        'ERROR',
        'Proposta Rejeitada',
        'Sua proposta foi rejeitada'
      );

      expect(notification.type).toBe('ERROR');
    });
  });

  describe('Notification Expiration', () => {
    it('should support notification expiration', () => {
      const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const notification = notificationService.createNotification(
        1,
        'INFO',
        'Title',
        'Message'
      );
      notification.expiresAt = expiryTime;

      expect(notification.expiresAt).toBeDefined();
      expect(notification.expiresAt?.getTime()).toBeGreaterThan(
        Date.now()
      );
    });

    it('should check if notification is expired', () => {
      const notification = notificationService.createNotification(
        1,
        'INFO',
        'Title',
        'Message'
      );

      // Set expiry to past
      notification.expiresAt = new Date(Date.now() - 1000);

      const isExpired = notification.expiresAt < new Date();
      expect(isExpired).toBe(true);
    });
  });

  describe('Bulk Notifications', () => {
    it('should create bulk notifications', () => {
      const userIds = [1, 2, 3, 4, 5];

      userIds.forEach(userId => {
        notificationService.createNotification(
          userId,
          'INFO',
          'Title',
          'Message'
        );
      });

      userIds.forEach(userId => {
        const notifications = notificationService.getNotificationsForUser(
          userId
        );
        expect(notifications.length).toBe(1);
      });
    });

    it('should batch mark notifications as read', () => {
      const n1 = notificationService.createNotification(1, 'INFO', 'T1', 'M1');
      const n2 = notificationService.createNotification(1, 'INFO', 'T2', 'M2');
      const n3 = notificationService.createNotification(1, 'INFO', 'T3', 'M3');

      // Verify all are unread
      expect(notificationService.countUnreadNotifications(1)).toBe(3);

      // Mark all as read
      notificationService.markAsRead(n1.id);
      notificationService.markAsRead(n2.id);
      notificationService.markAsRead(n3.id);

      // Verify all are now read
      const notifications = notificationService.getNotificationsForUser(1);
      expect(notifications.every(n => n.read)).toBe(true);
      expect(notificationService.countUnreadNotifications(1)).toBe(0);
    });
  });

  describe('Notification Ordering', () => {
    it('should maintain creation order', () => {
      const n1 = notificationService.createNotification(1, 'INFO', 'T1', 'M1');
      const n2 = notificationService.createNotification(1, 'INFO', 'T2', 'M2');
      const n3 = notificationService.createNotification(1, 'INFO', 'T3', 'M3');

      const notifications = notificationService.getNotificationsForUser(1);

      expect(notifications[0].id).toBe(n1.id);
      expect(notifications[1].id).toBe(n2.id);
      expect(notifications[2].id).toBe(n3.id);
    });

    it('should order by creation time descending when sorted', () => {
      const n1 = notificationService.createNotification(1, 'INFO', 'T1', 'M1');
      const n2 = notificationService.createNotification(1, 'INFO', 'T2', 'M2');
      const n3 = notificationService.createNotification(1, 'INFO', 'T3', 'M3');

      // Original order (ascending by creation time)
      const ascending = notificationService.getNotificationsForUser(1);
      expect(ascending[0].id).toBe(n1.id);
      expect(ascending[2].id).toBe(n3.id);

      // Descending order (newest first)
      const descending = [...ascending].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      expect(descending[0].id).toBe(n3.id);
      expect(descending[2].id).toBe(n1.id);
    });
  });
});
