// src/app/api/documents/[id]/route.ts
import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';

export const GET = withErrorHandler(async (request: Request,
  { params }: { params: Promise<{ id: string }> }) => {
    // Authentication not needed for mock implementation
    // const user = await requireUser();
    const { id } = await params;

    // In production, fetch document details from database
    const mockDocument = {
      id,
      name: 'Documento_Exemplo.pdf',
      type: 'application/pdf',
      size: 1024000,
      uploadedAt: '2024-01-15T10:00:00Z',
      uploadedBy: 'João Silva',
      category: 'geral',
      tags: ['exemplo'],
      status: 'active' as const,
      versions: 1,
      shared: false,
    };

    return NextResponse.json(mockDocument);
  });

export const PUT = withErrorHandler(async (request: Request,
  { params }: { params: Promise<{ id: string }> }) => {
    // Authentication not needed for mock implementation
    // const user = await requireUser();
    const { id } = await params;
    const body = await request.json();

    // In production, update document in database
    const updatedDocument = {
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(updatedDocument);
  });

export const DELETE = withErrorHandler(async (request: Request,
  { params }: { params: Promise<{ id: string }> }) => {
    // Authentication not needed for mock implementation
    // const user = await requireUser();
    const { id } = await params;

    // In production, delete document from database and storage
    // Check permissions before deletion

    return NextResponse.json({
      message: 'Documento deletado com sucesso',
      id,
    });
  });
