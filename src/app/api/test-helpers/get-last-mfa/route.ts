/**
 * API HELPER APENAS PARA TESTES E2E
 * Retorna o último código MFA gerado (apenas em desenvolvimento)
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // ⚠️ SEGURANÇA: Apenas em desenvolvimento, TEST_MODE ou E2E_MODE
  const allowed =
    process.env.NODE_ENV === 'development' ||
    process.env.TEST_MODE === 'true' ||
    process.env.E2E_MODE === '1';
  if (!allowed) {
    return NextResponse.json(
      { error: 'Endpoint disponível apenas em desenvolvimento ou TEST_MODE', success: false },
      { status: 403 }
    );
  }

  try {
    const g = global as unknown as { 
      __lastMFA?: { usuarioId: number; code: string; id: number; tipoAcao: string };
      __lastMFAByUser?: Record<number, { usuarioId: number; code: string; id: number; tipoAcao: string }>;
    };

    // If ?userId= is provided, look up the per-userId store (prevents cross-worker interference)
    const userIdParam = request.nextUrl.searchParams.get('userId');
    if (userIdParam) {
      const uid = Number(userIdParam);
      const entry = g.__lastMFAByUser?.[uid];
      if (!entry) {
        return NextResponse.json(
          { error: `Nenhum código MFA para o usuário ${uid}`, success: false },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        mfa: { usuarioId: entry.usuarioId, code: entry.code, tipoAcao: entry.tipoAcao }
      });
    }

    // Fallback: global single-slot (backward compat)
    if (!g.__lastMFA) {
      return NextResponse.json(
        { error: 'Nenhum código MFA gerado recentemente', success: false },
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
      { error: 'Erro ao buscar código MFA', success: false },
      { status: 500 }
    );
  }
}
