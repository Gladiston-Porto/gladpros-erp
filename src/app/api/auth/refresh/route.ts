/**
 * POST /api/auth/refresh
 * 
 * Endpoint para refresh de Access Token
 * 
 * Implementa VUL-003: Token Rotation
 * 
 * Fluxo:
 * 1. Recebe refresh token do cookie httpOnly (ou fallback body)
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

export const POST = withErrorHandler(async (request: NextRequest) => {
    // 1. Extrair refresh token do cookie httpOnly (seguro) com fallback para body
    const cookieToken = request.cookies.get('refreshToken')?.value;
    let bodyToken: string | undefined;
    try {
      const body = await request.json();
      bodyToken = body?.refreshToken;
    } catch {
      // Body vazio ou inválido — ok se tiver cookie
    }
    const refreshToken = cookieToken || bodyToken;
    
    if (!refreshToken) {
      return NextResponse.json(
        { 
          error: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh token é obrigatório',
          success: false
        },
        { status: 400 }
      );
    }
    
    // 2. Extrair metadados de segurança
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // 3. Executar token rotation
    try {
      const tokenPair = await refreshAccessToken(refreshToken, {
        ip,
        userAgent
      });

      // 4. Setar novos tokens como cookies httpOnly — NUNCA no body JSON.
      // Retornar tokens no body quebraria o modelo de segurança (legível por JS → XSS).
      const isProd = process.env.NODE_ENV === 'production';
      const response = NextResponse.json({ success: true }, { status: 200 });

      response.cookies.set('authToken', tokenPair.accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 15 * 60, // 15 minutos
        path: '/',
      });

      response.cookies.set('refreshToken', tokenPair.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 dias
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
            success: false
          },
          { status: 403 }
        );
      }
      
      // Erro de token revogado
      if (errorMessage.includes('revogado')) {
        return NextResponse.json(
          {
            error: 'TOKEN_REVOKED',
            message: 'Token foi revogado',
            success: false
          },
          { status: 403 }
        );
      }
      
      // Token expirado
      if (errorMessage.includes('expirado')) {
        return NextResponse.json(
          {
            error: 'REFRESH_TOKEN_EXPIRED',
            message: 'Refresh token expirado. Faça login novamente.',
            success: false
          },
          { status: 401 }
        );
      }
      
      // Token inválido
      if (errorMessage.includes('inválido') || errorMessage.includes('não encontrado')) {
        return NextResponse.json(
          {
            error: 'INVALID_REFRESH_TOKEN',
            message: 'Refresh token inválido',
            success: false
          },
          { status: 401 }
        );
      }
      
      // Usuário inativo
      if (errorMessage.includes('inativo')) {
        return NextResponse.json(
          {
            error: 'USER_INACTIVE',
            message: 'Usuário inativo',
            success: false
          },
          { status: 403 }
        );
      }
      
      // Erro genérico
      return NextResponse.json(
        {
          error: 'REFRESH_ERROR',
          message: errorMessage,
          success: false
        },
        { status: 500 }
      );
    }
    
  });
