// src/app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';

// Webhook verification for WhatsApp Business API
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify webhook token
  // Em produção, não aceita fallback para evitar configuração insegura.
  const envVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (process.env.NODE_ENV === 'production' && !envVerifyToken) {
    return NextResponse.json(
      { error: 'Webhook não configurado' },
      { status: 500 }
    );
  }
  const VERIFY_TOKEN = envVerifyToken || 'your_verify_token';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json(
    { error: 'Webhook verification failed' },
    { status: 403 }
  );
});

// Handle incoming WhatsApp messages
export const POST = withErrorHandler(async (request: NextRequest) => {
    const body = await request.json();

    // Process incoming messages
    if (body.object === 'whatsapp_business_account') {
      (body.entry as { changes?: unknown[] }[])?.forEach((entry) => {
        (entry.changes as { field?: string; value?: { messages?: unknown[] } }[])?.forEach((change) => {
          if (change.field === 'messages') {
            (change.value?.messages as { from?: string; type?: string; text?: { body?: string }; timestamp?: string }[])?.forEach((message) => {
              // Log only non-PII metadata (no message text)
              if (process.env.NODE_ENV === 'development') {
                console.log('[WHATSAPP] New message:', {
                  from: message.from ? `${message.from.slice(0, 4)}***` : 'unknown',
                  type: message.type,
                  timestamp: message.timestamp,
                });
              }

              // In production, process the message and respond accordingly
              // This could trigger notifications, update records, etc.
            });
          }
        });
      });
    }

    return NextResponse.json({ status: 'ok' });
  });
