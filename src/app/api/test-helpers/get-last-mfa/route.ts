/**
 * API HELPER APENAS PARA TESTES E2E
 * Retorna o último código MFA gerado (apenas em desenvolvimento)
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // ⚠️ SEGURANÇA: Apenas em desenvolvimento
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Endpoint disponível apenas em desenvolvimento' },
      { status: 403 }
    );
  }

  try {
    const g = global as unknown as { 
      __lastMFA?: { 
        usuarioId: number; 
        code: string; 
        id: number; 
        tipoAcao: string 
      } 
    };

    if (!g.__lastMFA) {
      return NextResponse.json(
        { error: 'Nenhum código MFA gerado recentemente' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      mfa: {
        usuarioId: g.__lastMFA.usuarioId,
        code: g.__lastMFA.code,
        tipoAcao: g.__lastMFA.tipoAcao
      }
    });

  } catch (error) {
    console.error('[TEST-HELPER] Erro ao buscar MFA:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar código MFA' },
      { status: 500 }
    );
  }
}
