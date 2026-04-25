// src/app/api/reports/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

export const GET = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'reports', 'read')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }
    const { id } = await params;

    // Mock report data - em produção, buscar do banco
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

export const PUT = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'reports', 'read')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();

    const updatedReport = {
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(updatedReport);
  });

export const DELETE = withErrorHandler(async (request: NextRequest) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'reports', 'read')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  });
