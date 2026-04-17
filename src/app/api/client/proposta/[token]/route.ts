import { NextRequest, NextResponse } from 'next/server'
import { validateTokenPublico } from '@/shared/lib/services/proposta-token'
import { applyRBACMasking, getUserPermissions, getPropostaContext } from '@/shared/lib/services/proposta-rbac'
import { withErrorHandler } from '@/lib/api/error-handler';

export const GET = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<{ token: string }> }) => {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 400 }
      )
    }

    // Validate token and get proposal
    const proposta = await validateTokenPublico(token)

    if (!proposta) {
      return NextResponse.json(
        { error: 'Proposta não encontrada ou token expirado' },
        { status: 404 }
      )
    }

    // Apply RBAC masking for client view (CLIENTE role = sem acesso a dados internos)
    const userPermissions = getUserPermissions('CLIENTE', undefined);
    const context = getPropostaContext(proposta, true, userPermissions); // isClientView = true
    const maskedProposta = applyRBACMasking(proposta, context);

    return NextResponse.json(maskedProposta)

  });
