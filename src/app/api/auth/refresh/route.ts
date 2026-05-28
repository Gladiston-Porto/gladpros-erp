/**
 * POST /api/auth/refresh
 *
 * Endpoint para refresh de Access Token
 *
 * Implementa VUL-003: Token Rotation
 *
 * Fluxo:
 * 1. Recebe refresh token do cookie httpOnly
 * 2. Valida o refresh token
 * 3. Gera novo par de tokens (access + refresh)
 * 4. Marca o refresh token antigo como usado
 * 5. Retorna novos tokens
 *
 * Segurança:
 * - Detecta reutilização de tokens (possível ataque)
 * - Rotation chain para auditoria
 * - IP e User-Agent tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/auth/token-service';
import { withErrorHandler } from '@/lib/api/error-handler';
import { apiRateLimit } from '@/shared/lib/rate-limit';
import {
  AUTH_ACCESS_TOKEN_MAX_AGE_SECONDS,
  AUTH_REFRESH_TOKEN_MAX_AGE_SECONDS,
} from '@/shared/lib/auth-constants';

export const POST = withErrorHandler(async (request: NextRequest) => {
  // 1. Extrair refresh token do cookie httpOnly (seguro)
  const cookieToken = request.cookies.get('refreshToken')?.value;
  const sessionToken = request.cookies.get('sessionToken')?.value;
  const refreshToken = cookieToken;

  if (!refreshToken) {
    return NextResponse.json(
      {
        error: 'REFRESH_TOKEN_REQUIRED',
        message: 'Refresh token é obrigatório',
        success: false,
      },
      { status: 400 },
    );
  }

  const ip =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // Protege endpoint sensível de rotação contra abuso/replay em massa.
  const rl = await apiRateLimit.checkLimit(request, `refresh:${ip}:${refreshToken.slice(0, 12)}`);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: rl.message,
        success: false,
        retryAfter: Math.ceil((rl.resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': rl.remaining.toString(),
          'Retry-After': Math.ceil((rl.resetTime - Date.now()) / 1000).toString(),
        },
      },
    );
  }

  // 2. Extrair metadados de segurança
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // 3. Executar token rotation
  try {
    const tokenPair = await refreshAccessToken(refreshToken, {
      ip,
      userAgent,
      sessionToken,
    });

    // 4. Setar novos tokens como cookies httpOnly — NUNCA no body JSON.
    // Retornar tokens no body quebraria o modelo de segurança (legível por JS → XSS).
    const isProd = process.env.NODE_ENV === 'production';
    const response = NextResponse.json({ success: true }, { status: 200 });

    response.cookies.set('authToken', tokenPair.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: AUTH_ACCESS_TOKEN_MAX_AGE_SECONDS,
      path: '/',
    });

    response.cookies.set('refreshToken', tokenPair.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: AUTH_REFRESH_TOKEN_MAX_AGE_SECONDS,
      path: '/api/auth',
    });

    return response;
  } catch (error: unknown) {
    // Tratar erros específicos de token
    const errorMessage = error instanceof Error ? error.message : 'Erro ao renovar token';

    // Verificar se é erro de segurança (reutilização)
    if (errorMessage.includes('já foi usado')) {
      return NextResponse.json(
        {
          error: 'TOKEN_REUSE_DETECTED',
          message: 'Token já foi usado. Todos os tokens foram revogados por segurança.',
          success: false,
        },
        { status: 403 },
      );
    }

    // Erro de token revogado
    if (errorMessage.includes('revogado')) {
      return NextResponse.json(
        {
          error: 'TOKEN_REVOKED',
          message: 'Token foi revogado',
          success: false,
        },
        { status: 403 },
      );
    }

    if (errorMessage.includes('Sessão inválida')) {
      return NextResponse.json(
        {
          error: 'SESSION_INVALID',
          message: 'Sessão revogada ou inválida. Faça login novamente.',
          success: false,
        },
        { status: 401 },
      );
    }

    // Token expirado
    if (errorMessage.includes('expirado')) {
      return NextResponse.json(
        {
          error: 'REFRESH_TOKEN_EXPIRED',
          message: 'Refresh token expirado. Faça login novamente.',
          success: false,
        },
        { status: 401 },
      );
    }

    // Token inválido
    if (errorMessage.includes('inválido') || errorMessage.includes('não encontrado')) {
      return NextResponse.json(
        {
          error: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token inválido',
          success: false,
        },
        { status: 401 },
      );
    }

    // Usuário inativo
    if (errorMessage.includes('inativo')) {
      return NextResponse.json(
        {
          error: 'USER_INACTIVE',
          message: 'Usuário inativo',
          success: false,
        },
        { status: 403 },
      );
    }

    // Erro genérico
    return NextResponse.json(
      {
        error: 'REFRESH_ERROR',
        message: 'Não foi possível renovar a sessão',
        success: false,
      },
      { status: 500 },
    );
  }
});
