// src/app/api/documents/[id]/share/route.ts
import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';

export const POST = withErrorHandler(async (request: Request) => {
    // Authentication not needed for mock implementation
    // const user = await requireUser();
    // const { id } = await params; // Not used in mock implementation
    const body = await request.json();
    const { shareWith, permissions } = body;

    if (!shareWith || !Array.isArray(shareWith)) {
      return NextResponse.json(
        { error: 'Lista de usuários para compartilhar é obrigatória' },
        { status: 400 }
      );
    }

    // In production, create sharing records in database
    const shareRecords = shareWith.map((userId: string) => ({
      documentId: 'mock-document-id', // Mock document ID
      sharedWith: userId,
      permissions: permissions || ['read'],
      sharedAt: new Date().toISOString(),
      sharedBy: 1, // Mock user ID
    }));

    return NextResponse.json({
      message: 'Documento compartilhado com sucesso',
      shares: shareRecords,
    });
  });

export const DELETE = withErrorHandler(async (request: Request) => {
    // Authentication not needed for mock implementation
    // const user = await requireUser();
    // const { id } = await params; // Not used in mock implementation
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      );
    }

    // In production, remove sharing record from database

    return NextResponse.json({
      message: 'Compartilhamento removido com sucesso',
      documentId: 'mock-document-id', // Mock document ID
      userId,
    });
  });
