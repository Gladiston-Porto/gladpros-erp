// src/app/api/reports/[id]/route.ts
import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';

export const GET = withErrorHandler(async (request: Request,
  { params }: { params: Promise<{ id: string }> }) => {
    // Authentication not needed for mock implementation
    // const user = await requireUser(request);
    const { id } = await params;

    // Mock report data - in production, fetch from database
    const mockReport = {
      id,
      name: 'Relatório de Clientes Ativos',
      type: 'clientes',
      status: 'published',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      createdBy: 'João Silva',
      schedule: {
        frequency: 'weekly',
        recipients: ['admin@empresa.com'],
      },
    };

    return NextResponse.json(mockReport);
  });

export const PUT = withErrorHandler(async (request: Request,
  { params }: { params: Promise<{ id: string }> }) => {
    // Authentication not needed for mock implementation
    // const user = await requireUser(request);
    const { id } = await params;
    const body = await request.json();

    // In production, update in database
    const updatedReport = {
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(updatedReport);
  });

export const DELETE = withErrorHandler(async () => {
    // Authentication not needed for mock implementation
    // const user = await requireUser(request);
    // const { id } = await params; // Not used in mock implementation

    // In production, delete from database
    return NextResponse.json({ success: true });
  });
