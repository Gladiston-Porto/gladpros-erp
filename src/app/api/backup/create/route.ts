// src/app/api/backup/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/shared/lib/rbac';
import { withErrorHandler } from '@/lib/api/error-handler';

export const POST = withErrorHandler(async (request: NextRequest) => {
    const user = await requireUser(request);

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }

    const body = await request.json();
    const { type, includeDocuments } = body;

    // Validate backup type
    const validTypes = ['full', 'database', 'documents'];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de backup inválido' },
        { status: 400 }
      );
    }

    // In production, trigger actual backup process
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const backup = {
      id: backupId,
      type: type || 'full',
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      includeDocuments: includeDocuments !== false,
      size: null, // Will be updated when backup completes
      downloadUrl: null, // Will be set when backup completes
    };

    return NextResponse.json(backup, { status: 201 });
  });
