// src/app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Webhook verification for WhatsApp Business API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const envVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (process.env.NODE_ENV === 'production' && !envVerifyToken) {
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 500 });
  }
  const VERIFY_TOKEN = envVerifyToken ?? 'your_verify_token';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Webhook verification failed' }, { status: 403 });
}

// Valida assinatura HMAC-SHA256 do Meta
function verifyWebhookSignature(rawBody: string, signature: string | null, appSecret: string): boolean {
  if (!signature) return false;
  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Handle incoming WhatsApp messages
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  // Validar assinatura em produção
  if (process.env.NODE_ENV === 'production') {
    if (!appSecret) {
      return NextResponse.json({ error: 'Webhook não configurado' }, { status: 500 });
    }
    const signature = request.headers.get('x-hub-signature-256');
    if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = body as {
    object?: string;
    entry?: Array<{
      changes?: Array<{
        field?: string;
        value?: {
          messages?: Array<{ from?: string; type?: string; text?: { body?: string }; timestamp?: string }>;
          statuses?: Array<{ id?: string; status?: string; timestamp?: string }>;
        };
      }>;
    }>;
  };

  if (payload.object === 'whatsapp_business_account') {
    payload.entry?.forEach((entry) => {
      entry.changes?.forEach((change) => {
        if (change.field === 'messages') {
          // Mensagens recebidas — processar status de entrega
          change.value?.statuses?.forEach((status) => {
            // status.id = messageId, status.status = 'sent' | 'delivered' | 'read' | 'failed'
            // TODO: atualizar registro de entrega no banco quando implementado
            void status;
          });
        }
      });
    });
  }

  return NextResponse.json({ status: 'ok' });
}
