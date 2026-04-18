import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import logger from "./src/shared/lib/logger";
import { rateLimitMiddleware, isIpBlocked } from "./src/lib/security/rate-limiter";
import { applySecurityHeaders, getDevSecurityHeaders, getProdSecurityHeaders } from "./src/lib/security/headers";
import { jwtVerify } from "jose";

// JWT secret encoded for jose (Edge-compatible)
function getJwtSecret() {
  const raw = process.env.JWT_SECRET;
  if (!raw) throw new Error("Missing JWT_SECRET env var");
  return new TextEncoder().encode(raw);
}

export async function middleware(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  
  // 1. Verificar se IP está bloqueado
  if (await isIpBlocked(ip)) {
    return NextResponse.json(
      { error: 'IP bloqueado por atividade suspeita' },
      { status: 403 }
    );
  }

  // 2. Aplicar rate limiting (VUL-001)
  const rateLimitResponse = await rateLimitMiddleware(req);
  if (rateLimitResponse) {
    return rateLimitResponse; // Retorna 429 se exceder limite
  }

  // Log da requisição apenas em debug explícito (não logar cada request em produção)
  if (process.env.LOG_REQUESTS === 'true') {
    logger.info({
      method: req.method,
      pathname: req.nextUrl.pathname,
      ip,
      userAgent: req.headers.get('user-agent'),
    }, 'Request received');
  }

  const path = req.nextUrl.pathname;

  // Definição de rotas
  const isApi = path.startsWith('/api/');
  const isApiAuth = path.startsWith('/api/auth');
  const isPublicApi = path.startsWith('/api/webhooks') ||
    (path.startsWith('/api/test-helpers') && process.env.NODE_ENV !== 'production');
  const isPortal = path.startsWith('/portal/'); // Portal usa token de URL, não JWT
  const isPortalApi = path.startsWith('/api/portal/');
  const isNextInternal = path.startsWith('/_next') || path.startsWith('/static') || path.startsWith('/favicon.ico') || path.match(/\.(png|jpg|jpeg|gif|svg)$/);

  const isPublicPage =
    path === '/login' ||
    path === '/' ||
    path.startsWith('/esqueci-senha') ||
    path.startsWith('/reset-senha') ||
    path.startsWith('/primeiro-acesso') ||
    path.startsWith('/mfa');

  // 3. Verificação de Autenticação com validação JWT real (VUL-003)
  const token = req.cookies.get('authToken')?.value;
  let isValidToken = false;
  let jwtPayload: Record<string, unknown> | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret(), {
        issuer: "gladpros",
        audience: "gladpros-app",
      });
      isValidToken = true;
      jwtPayload = payload as Record<string, unknown>;
    } catch (error) {
      // Token expirado, assinatura inválida, ou malformado
      console.warn('[Middleware] JWT inválido:', (error as Error).message);
      isValidToken = false;
    }
  }

  // Proteção de Rotas
  if (!isNextInternal && !isApiAuth && !isPublicApi && !isPortal && !isPortalApi) {
    // Se não tem token válido
    if (!isValidToken) {
      // API: Retorna 401
      if (isApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Páginas Protegidas: Redireciona para Login
      if (!isPublicPage) {
        const url = req.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('callbackUrl', path);
        const response = NextResponse.redirect(url);
        // Limpar cookie inválido/expirado
        if (token) {
          response.cookies.delete('authToken');
        }
        return response;
      }
    }
    // Se tem token válido
    else {
      // Se tentar acessar login estando logado, vai para dashboard
      if (path === '/login' || path === '/') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
  }

  // 4. Configurar response — propagar claims JWT nos headers para API routes
  const requestHeaders = new Headers(req.headers);
  // Sempre remover headers de auth para prevenir spoofing (attacker não pode enviar x-user-id falso)
  requestHeaders.delete('x-user-id');
  requestHeaders.delete('x-user-role');
  requestHeaders.delete('x-user-email');
  if (jwtPayload) {
    requestHeaders.set('x-user-id', String(jwtPayload.sub ?? ''));
    requestHeaders.set('x-user-role', String(jwtPayload.role ?? ''));
    requestHeaders.set('x-user-email', String(jwtPayload.email ?? ''));
  }

  // Gerar nonce criptográfico para CSP (F4.6) — adicionado nos headers de request em único NextResponse
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  requestHeaders.set('x-nonce', nonce);

  // Único NextResponse.next() — evita dupla clonagem de headers
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  // 5. Aplicar security headers (VUL-009) — com nonce em produção
  const securityConfig = process.env.NODE_ENV === 'production' 
    ? getProdSecurityHeaders() 
    : getDevSecurityHeaders();
  
  const cspNonce = process.env.NODE_ENV === 'production' ? nonce : undefined;
  response = applySecurityHeaders(response, securityConfig, cspNonce);

  // 5. Configurar CORS seguro (VUL-002)
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'https://gladpros.com',
      'https://www.gladpros.com',
    ];

    const origin = req.headers.get('origin');
    
    // Verificar se origem é permitida
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 horas

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

