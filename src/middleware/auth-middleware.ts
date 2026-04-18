// src/middleware/auth-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireServerUser } from '@/shared/lib/requireServerUser';

export interface AuthMiddlewareConfig {
  requireAuth?: boolean;
  requiredRole?: string[];
  requiredPermissions?: string[];
  allowPublic?: boolean;
}

export async function authMiddleware(
  req: NextRequest,
  config: AuthMiddlewareConfig = {}
) {
  const {
    requireAuth = true,
    requiredRole = [],
    requiredPermissions = [],
    allowPublic = false
  } = config;

  // Se não requer autenticação e permite público, continuar
  if (!requireAuth && allowPublic) {
    return NextResponse.next();
  }

  try {
    // Verificar autenticação
    const user = await requireServerUser();

    // Verificar role se especificada
    if (requiredRole.length > 0 && !requiredRole.includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions - role not allowed' },
        { status: 403 }
      );
    }

    // Verificar permissões se especificadas
    if (requiredPermissions.length > 0) {
      // Para este exemplo, assumimos que as permissões estão disponíveis
      // Em uma implementação real, isso viria do sistema RBAC
      const userPermissions = ['read', 'write']; // Placeholder
      const hasPermission = requiredPermissions.some(permission =>
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    return NextResponse.next();

  } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Error handling - will be used when authentication fails
    if (requireAuth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }
}

// Middleware para rate limiting
export async function rateLimitMiddleware(
  req: NextRequest,
  limits: {
    maxRequests: number;
    windowMs: number;
    key?: string;
  }
) {
  const { maxRequests, windowMs, key } = limits; // eslint-disable-line @typescript-eslint/no-unused-vars
  // Will be used when rate limiting is implemented

  // Implementar rate limiting baseado em IP ou user ID
  const clientKey = key || req.headers.get('x-forwarded-for') || 'anonymous';
  // Will be used for rate limiting
  const cacheKey = `ratelimit:${clientKey}`; // eslint-disable-line @typescript-eslint/no-unused-vars
  // Will be used for caching rate limit data

  // Aqui seria implementada a lógica de rate limiting
  // Por enquanto, apenas passar adiante
  return NextResponse.next();
}

// Middleware para validação de entrada
export function validationMiddleware(schema: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  return async function(req: NextRequest) {
    try {
      const body = await req.json();

      // Validar com o schema fornecido
      const validatedData = schema.parse(body);

      // Criar novo request com dados validados
      const newReq = new Request(req.url, { // eslint-disable-line @typescript-eslint/no-unused-vars
        // Will be used when request validation is implemented
        method: req.method,
        headers: req.headers,
        body: JSON.stringify(validatedData)
      });

      return NextResponse.next();

    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error },
        { status: 400 }
      );
    }
  };
}

// Middleware para logging
export function loggingMiddleware(req: NextRequest) {
  const start = Date.now();

  // Log da requisição
  // eslint-disable-next-line no-console
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Retornar response com logging
  const response = NextResponse.next();

  // Log da resposta
  const duration = Date.now() - start;
  // eslint-disable-next-line no-console
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${response.status} (${duration}ms)`);

  return response;
}

// Middleware composto para APIs
export function createApiMiddleware(config: {
  auth?: AuthMiddlewareConfig;
  rateLimit?: { maxRequests: number; windowMs: number };
  validation?: Record<string, unknown>;
  logging?: boolean;
}) {
  return async function(req: NextRequest) {
    // Logging
    if (config.logging) {
      loggingMiddleware(req);
    }

    // Rate limiting
    if (config.rateLimit) {
      const rateLimitResult = await rateLimitMiddleware(req, config.rateLimit);
      if (rateLimitResult.status !== 200) {
        return rateLimitResult;
      }
    }

    // Autenticação
    if (config.auth) {
      const authResult = await authMiddleware(req, config.auth);
      if (authResult.status !== 200) {
        return authResult;
      }
    }

    // Validação
    if (config.validation) {
      const validationResult = await validationMiddleware(config.validation)(req);
      if (validationResult.status !== 200) {
        return validationResult;
      }
    }

    return NextResponse.next();
  };
}
