import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';

/**
 * WebSocket endpoint placeholder — real-time notifications handled via polling at /api/notifications
 * This endpoint is kept for backwards compatibility.
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  return NextResponse.json({
    message: 'Real-time notifications migrated to polling via /api/notifications',
    usage: 'Use GET /api/notifications for notification list, PATCH /api/notifications for mark-as-read',
    userId,
    status: 'deprecated',
  });
});

export const POST = withErrorHandler(async () => {
  return NextResponse.json({
    message: 'Use the Event Bus system (eventBus.emit) for sending notifications',
    status: 'deprecated',
  });
});
