import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/shared/lib/notifications';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser, requireRoles } from '@/shared/lib/rbac';

// GET /api/notifications - Buscar notificações do usuário
export const GET = withErrorHandler(async (req: NextRequest) => {
    const user = await requireUser(req);
    const userId = Number(user.id);

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const unreadOnly = url.searchParams.get('unread_only') === 'true';

    const result = await NotificationService.getUserNotifications(userId, {
      limit,
      offset,
      unreadOnly
    });

    return NextResponse.json(result);

  });

// POST /api/notifications - Criar nova notificação (apenas para admins)
export const POST = withErrorHandler(async (req: NextRequest) => {
    const user = await requireUser(req);
    requireRoles(user.role, ['ADMIN']);

    const { userId, type, title, message, data, expiresAt } = await req.json();

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Dados obrigatórios: userId, type, title, message' },
        { status: 400 }
      );
    }

    const notificationId = await NotificationService.create({
      userId,
      type,
      title,
      message,
      data,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });

    return NextResponse.json({
      success: true,
      notificationId
    });

  });
