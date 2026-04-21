import { withErrorHandler } from '@/lib/api/error-handler';
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

/**
 * Endpoint de compatibilidade legado — mantido para clientes antigos.
 * Retorna payload vazio seguro para evitar erros 404/500 em chamadas legadas.
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'propostas', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const { searchParams } = new URL(request.url)
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '10'), 100)
  return NextResponse.json({ data: [], total: 0, page: 1, pageSize, totalPages: 0, success: true })
});
