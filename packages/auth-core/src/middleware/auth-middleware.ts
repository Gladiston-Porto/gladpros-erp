import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { User, UserRole } from '../types/user';
import type { AuthMiddlewareOptions } from '../types/auth';

// Types
export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: number;
    email: string;
    role: UserRole;
    permissions: string[];
  };
}

export type AuthenticatedUser = {
  id: number;
  email: string;
  role: UserRole;
  permissions: string[];
};

// Validation schemas
const AuthHeaderSchema = z.object({
  authorization: z.string().regex(/^Bearer .+$/),
});

/**
 * Authentication Middleware
 * Provides middleware functions for protecting routes and managing user access
 */
export class AuthMiddleware {
  /**
   * Main authentication middleware
   */
  static async authenticate(
    request: NextRequest,
    options: AuthMiddlewareOptions = {}
  ): Promise<{ success: boolean; user?: User; response?: NextResponse }> {
    try {
      // Check if route allows public access
      if (options.allowPublic) {
        return { success: true };
      }

      // Extract token from Authorization header
      const authHeader = request.headers.get('authorization');

      if (!authHeader) {
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Authorization header missing' },
            { status: 401 }
          ),
        };
      }

      const validatedHeader = AuthHeaderSchema.parse({ authorization: authHeader });
      const token = validatedHeader.authorization.replace('Bearer ', '');

      // Verify token (will be used when JWT verification is implemented)
      const user = await this.verifyToken(token);

      if (!user) {
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Invalid or expired token' },
            { status: 401 }
          ),
        };
      }

      // Check role requirements
      if (options.requiredRoles && !options.requiredRoles.includes(user.role)) {
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          ),
        };
      }

      // Check permission requirements
      if (options.requiredPermissions) {
        const hasRequiredPermissions = options.requiredPermissions.every((permission: string) =>
          user.permissions.includes(permission)
        );

        if (!hasRequiredPermissions) {
          return {
            success: false,
            response: NextResponse.json(
              { error: 'Insufficient permissions' },
              { status: 403 }
            ),
          };
        }
      }

      return { success: true, user };
    } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        ),
      };
    }
  }

  /**
   * Verify JWT token
   */
  private static async verifyToken(_token: string): Promise<User | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // token will be used when JWT verification is implemented
    try {
      // This would typically verify JWT token
      // For now, return mock user data
      throw new Error('Token verification needs to be implemented');
    } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // error is logged by the calling function if needed
      return null;
    }
  }

  /**
   * Create authenticated request object
   */
  static createAuthenticatedRequest(
    request: NextRequest,
    user: AuthenticatedUser
  ): AuthenticatedRequest {
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = user;
    return authenticatedRequest;
  }

  /**
   * Extract user from request
   */
  static getUserFromRequest(request: AuthenticatedRequest): Partial<User> | null {
    return request.user || null;
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(request: AuthenticatedRequest): boolean {
    return !!request.user;
  }

  /**
   * Check if user has specific role
   */
  static hasRole(request: AuthenticatedRequest, role: UserRole): boolean {
    return request.user?.role === role;
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(request: AuthenticatedRequest, permission: string): boolean {
    return request.user?.permissions?.includes(permission) || false;
  }

  /**
   * Check if user has any of the specified roles
   */
  static hasAnyRole(request: AuthenticatedRequest, roles: UserRole[]): boolean {
    return request.user?.role ? roles.includes(request.user.role) : false;
  }

  /**
   * Check if user has all specified permissions
   */
  static hasAllPermissions(request: AuthenticatedRequest, permissions: string[]): boolean {
    if (!request.user?.permissions) return false;
    return permissions.every(permission => request.user!.permissions.includes(permission));
  }

  /**
   * Check if user has any of the specified permissions
   */
  static hasAnyPermission(request: AuthenticatedRequest, permissions: string[]): boolean {
    if (!request.user?.permissions) return false;
    return permissions.some(permission => request.user!.permissions.includes(permission));
  }

  /**
   * Middleware for protecting API routes
   */
  static createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
    return async (request: NextRequest): Promise<NextResponse | undefined> => {
      const authResult = await this.authenticate(request, options);

      if (!authResult.success) {
        return authResult.response;
      }

      // If authentication successful, continue to next middleware/route
      return undefined;
    };
  }

  /**
   * Generate error response for authentication failures
   */
  static createAuthError(
    message: string = 'Authentication required',
    status: number = 401
  ): NextResponse {
    return NextResponse.json(
      { error: message },
      { status }
    );
  }

  /**
   * Generate error response for authorization failures
   */
  static createAuthzError(
    message: string = 'Insufficient permissions',
    status: number = 403
  ): NextResponse {
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

// Convenience middleware functions
export const requireAuth = AuthMiddleware.createAuthMiddleware();
export const requireAdmin = AuthMiddleware.createAuthMiddleware({
  requiredRoles: ['admin'],
});
export const requireManager = AuthMiddleware.createAuthMiddleware({
  requiredRoles: ['admin', 'manager'],
});
export const allowPublic = AuthMiddleware.createAuthMiddleware({
  allowPublic: true,
});
