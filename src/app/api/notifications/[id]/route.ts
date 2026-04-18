import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/shared/lib/notifications';
import { withErrorHandler } from '@/lib/api/error-handler';

// PUT /api/notifications/[id]/read - Marcar notificação como lida
export const PUT = withErrorHandler(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const userId = parseInt(req.headers.get('x-user-id') || '');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

  const { id: notificationId } = await context.params;
    const success = await NotificationService.markAsRead(userId, notificationId);

    if (!success) {
      return NextResponse.json(
        { error: 'Falha ao marcar notificação como lida' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  });

// DELETE /api/notifications/[id] - Deletar notificação
export const DELETE = withErrorHandler(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const userId = parseInt(req.headers.get('x-user-id') || '');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

  const { id: notificationId } = await context.params;
    const success = await NotificationService.delete(userId, notificationId);

    if (!success) {
      return NextResponse.json(
        { error: 'Falha ao deletar notificação' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  });
