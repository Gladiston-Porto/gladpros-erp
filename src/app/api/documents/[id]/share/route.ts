import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

// Compartilhamento de documentos ainda não tem modelo no banco.
// Auth adicionada; funcionalidade real será implementada quando o modelo existir.
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'documents', 'update')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const body = await request.json();
   
  const { shareWith, permissions: _permissions } = body;

  if (!shareWith || !Array.isArray(shareWith) || shareWith.length === 0) {
    return NextResponse.json(
      { error: 'Lista de usuários para compartilhar é obrigatória', success: false },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: 'Compartilhamento de documentos ainda não implementado', success: false },
    { status: 501 }
  );
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'documents', 'delete')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'ID do usuário é obrigatório', success: false },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: 'Compartilhamento de documentos ainda não implementado', success: false },
    { status: 501 }
  );
});
