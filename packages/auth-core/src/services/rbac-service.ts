import { z } from 'zod';
import type { UserRole } from '../types/user';

// Types
export interface Permission {
  resource: string;
  action: string;
  scope?: string;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

export interface RBACContext {
  userId: number;
  userRole: UserRole;
  permissions: string[];
}

// Validation schemas
const CheckPermissionSchema = z.object({ // eslint-disable-line @typescript-eslint/no-unused-vars
  // Will be used when permission validation is implemented
  userId: z.number(),
  resource: z.string(),
  action: z.string(),
  scope: z.string().optional(),
});

export class RBACService {
  // Default role permissions - this should be configurable
  private static readonly DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
    admin: [
      { resource: '*', action: '*' }, // Admin has all permissions
    ],
    manager: [
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'update' },
      { resource: 'proposals', action: '*' },
      { resource: 'clients', action: '*' },
      { resource: 'reports', action: 'read' },
    ],
    user: [
      { resource: 'proposals', action: 'read' },
      { resource: 'proposals', action: 'create' },
      { resource: 'proposals', action: 'update', scope: 'own' },
      { resource: 'clients', action: 'read', scope: 'own' },
    ],
    client: [
      { resource: 'proposals', action: 'read', scope: 'own' },
      { resource: 'profile', action: 'read' },
      { resource: 'profile', action: 'update', scope: 'own' },
    ],
  };

  /**
   * Check if user has permission for a specific action on a resource
   */
  static async checkPermission(
    context: RBACContext,
    resource: string,
    action: string,
    scope?: string
  ): Promise<boolean> {
    const { userRole, permissions } = context;

    // Admin has all permissions
    if (userRole === 'admin') {
      return true;
    }

    // Check explicit permissions
    const hasExplicitPermission = permissions.some(perm => {
      const resourceMatch = perm === '*' || perm === resource || this.matchesPattern(perm, resource);
      const actionMatch = perm === '*' || perm === action;
      return resourceMatch && actionMatch;
    });

    if (hasExplicitPermission) {
      return true;
    }

    // Check role-based permissions
    const rolePermissions = this.DEFAULT_PERMISSIONS[userRole] || [];
    return rolePermissions.some(perm => {
      const resourceMatch = perm.resource === '*' || perm.resource === resource || this.matchesPattern(perm.resource, resource);
      const actionMatch = perm.action === '*' || perm.action === action;
      const scopeMatch = !perm.scope || !scope || perm.scope === scope || perm.scope === 'own';

      return resourceMatch && actionMatch && scopeMatch;
    });
  }

  /**
   * Get all permissions for a user
   */
  static async getUserPermissions(userId: number, userRole: UserRole): Promise<string[]> {
    // This would typically query database for user-specific permissions
    // For now, return role-based permissions
    const rolePermissions = this.DEFAULT_PERMISSIONS[userRole] || [];
    return rolePermissions.map(perm => `${perm.resource}:${perm.action}${perm.scope ? `:${perm.scope}` : ''}`);
  }

  /**
   * Check if user can access a resource
   */
  static async canAccessResource(
    userId: number,
    userRole: UserRole,
    resource: string,
    action: string,
    resourceOwnerId?: number
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, userRole);
    const context: RBACContext = {
      userId,
      userRole,
      permissions,
    };

    // Determine scope based on ownership
    let scope: string | undefined;
    if (resourceOwnerId && resourceOwnerId === userId) {
      scope = 'own';
    }

    return this.checkPermission(context, resource, action, scope);
  }

  /**
   * Get user roles hierarchy
   */
  static getRoleHierarchy(): Record<UserRole, number> {
    return {
      admin: 4,
      manager: 3,
      user: 2,
      client: 1,
    };
  }

  /**
   * Check if one role has higher or equal precedence than another
   */
  static hasRolePrecedence(role: UserRole, targetRole: UserRole): boolean {
    const hierarchy = this.getRoleHierarchy();
    return hierarchy[role] >= hierarchy[targetRole];
  }

  /**
   * Filter data based on user permissions
   */
  static async filterDataByPermissions<T extends Record<string, unknown>>(
    userId: number,
    userRole: UserRole,
    data: T[],
    resource: string,
    ownerField: keyof T
  ): Promise<T[]> {
    const permissions = await this.getUserPermissions(userId, userRole);

    return data.filter(item => {
      const context: RBACContext = {
        userId,
        userRole,
        permissions,
      };

      const ownerId = item[ownerField] as number;
      const scope = ownerId === userId ? 'own' : undefined;

      return this.checkPermission(context, resource, 'read', scope);
    });
  }

  /**
   * Pattern matching for wildcard permissions
   */
  private static matchesPattern(pattern: string, target: string): boolean {
    if (pattern === '*') return true;

    // Simple wildcard matching
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(target);
  }

  /**
   * Validate permission format
   */
  static validatePermission(permission: string): boolean {
    const parts = permission.split(':');
    return parts.length >= 2 && parts.length <= 3;
  }

  /**
   * Parse permission string
   */
  static parsePermission(permission: string): Permission {
    const parts = permission.split(':');
    if (parts.length < 2) {
      throw new Error('Invalid permission format');
    }

    return {
      resource: parts[0],
      action: parts[1],
      scope: parts[2],
    };
  }
}
