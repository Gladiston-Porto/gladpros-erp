// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

// Mock data for demonstration - in production, this would come from database
const mockReports = [
  {
    id: '1',
    name: 'Relatório de Clientes Ativos',
    type: 'clientes' as const,
    status: 'published' as const,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    createdBy: 'João Silva',
    schedule: {
      frequency: 'weekly' as const,
      recipients: ['admin@empresa.com'],
    },
  },
  {
    id: '2',
    name: 'Relatório Financeiro Mensal',
    type: 'financeiro' as const,
    status: 'published' as const,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
    createdBy: 'Maria Santos',
  },
  {
    id: '3',
    name: 'Relatório de Propostas',
    type: 'propostas' as const,
    status: 'draft' as const,
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z',
    createdBy: 'Pedro Costa',
  },
];

export const GET = withErrorHandler(async (request: NextRequest) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'reports', 'read')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }
    // const user = await requireUser();

    // In production, fetch from database with user permissions
    const reports = mockReports;

    return NextResponse.json(reports);
  });

export const POST = withErrorHandler(async (request: NextRequest) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'reports', 'read')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }
    // const user = await requireUser();
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: 'Nome e tipo são obrigatórios' },
        { status: 400 }
      );
    }

    // In production, save to database
    const newReport = {
      id: Date.now().toString(),
      name: body.name,
      type: body.type,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'Sistema', // Mock created by
      description: body.description || '',
      schedule: body.schedule?.enabled ? body.schedule : undefined,
    };

    return NextResponse.json(newReport, { status: 201 });
  });
