// src/lib/auth-middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: string;
}

export class AuthError extends Error {
  constructor(message: string, public status: number = 401) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function requireAuth(req?: NextRequest): Promise<AuthenticatedUser> {
  try {
    let token: string | undefined;

    // Tentar pegar token do header Authorization
    if (req) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    // Se não encontrou no header, tentar nos cookies
    if (!token) {
      const cookieStore = await cookies();
      const tokenCookie = cookieStore.get('authToken');
      token = tokenCookie?.value;
    }

    if (!token) {
      throw new AuthError('Token de acesso não fornecido', 401);
    }

    const secretRaw = process.env.JWT_SECRET;
    if (!secretRaw) {
      throw new AuthError('Configuração de JWT não encontrada', 500);
    }
    if (secretRaw.length < 32) {
      throw new AuthError('JWT_SECRET deve ter pelo menos 32 caracteres', 500);
    }
    const secret = new TextEncoder().encode(secretRaw);

    // Verificar e decodificar token usando jose
    const { payload: decoded } = await jwtVerify(token, secret, {
      issuer: "gladpros",
      audience: "gladpros-app"
    });
    
    if (!decoded || !decoded.sub || typeof decoded.sub !== 'string') {
      throw new AuthError('Token inválido', 401);
    }

    // Extrair dados do payload
    const id = parseInt(decoded.sub);
    const email = decoded.email as string;
    const role = (decoded.role as string) || 'USUARIO';

    if (isNaN(id) || !email) {
      throw new AuthError('Token inválido', 401);
    }

    return {
      id,
      email,
      role
    };

  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError('Token inválido ou expirado', 401);
  }
}

export function createAuthErrorResponse(error: AuthError) {
  return NextResponse.json(
    { 
      error: error.message,
      code: 'AUTH_REQUIRED' 
    },
    { status: error.status }
  );
}

export async function withAuth<T>(
  handler: (req: NextRequest, user: AuthenticatedUser) => Promise<T>,
  req: NextRequest
): Promise<T | NextResponse> {
  try {
    const user = await requireAuth(req);
    return await handler(req, user);
  } catch (error) {
    if (error instanceof AuthError) {
      return createAuthErrorResponse(error);
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}