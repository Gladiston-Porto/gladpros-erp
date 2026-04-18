// src/app/api/webhooks/test/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Authentication not needed for mock implementation
    // const user = await requireUser();

    const body = await request.json();
    const { webhookId, event, payload } = body;

    if (!webhookId || !event) {
      return NextResponse.json(
        { error: 'ID do webhook e evento são obrigatórios' },
        { status: 400 }
      );
    }

    // Mock webhook data
    const mockWebhook = {
      id: webhookId,
      name: 'Test Webhook',
      url: 'https://api.exemplo.com/webhooks/test',
    };

    // Simulate webhook call
    const testPayload = {
      event,
      timestamp: new Date().toISOString(),
      data: payload || { test: true },
    };

    // eslint-disable-next-line no-console
    console.log(`[WEBHOOK] Teste enviado para ${mockWebhook.url}:`, testPayload);

    // In production, make actual HTTP request to webhook URL
    // For now, simulate success
    return NextResponse.json({
      success: true,
      webhook: mockWebhook,
      payload: testPayload,
      status: 'delivered',
    });
  } catch {
    return NextResponse.json(
      { error: 'Erro ao testar webhook' },
      { status: 500 }
    );
  }
}
