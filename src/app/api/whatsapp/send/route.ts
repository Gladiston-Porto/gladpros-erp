// src/app/api/whatsapp/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { z } from 'zod';

// E.164 US format: 11 digits starting with 1 (e.g. 15551234567)
const usPhoneE164 = /^1\d{10}$/;

const sendSchema = z.object({
  to: z.string().min(1, 'Número de destino obrigatório'),
  message: z.string().min(1, 'Mensagem obrigatória'),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);

  // Apenas roles com acesso a clientes (update) podem enviar mensagens WhatsApp
  if (!can(user.role as Role, 'clientes', 'update')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão para enviar mensagens', success: false },
      { status: 403 }
    );
  }

  const raw = await request.json();
  const parsed = sendSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: parsed.error.issues[0]?.message ?? 'Dados inválidos', success: false },
      { status: 400 }
    );
  }

  const { to, message } = parsed.data;

  // Normalizar: remover espaços, traços, parênteses e sinal +
  const normalized = to.replace(/[\s\-()+]/g, '');

  if (!usPhoneE164.test(normalized)) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        message: 'Formato de telefone inválido. Use formato US E.164: 15551234567 (11 dígitos começando com 1)',
        success: false,
      },
      { status: 400 }
    );
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (accessToken && phoneNumberId) {
    // Produção: chamada real à Meta API
    const metaRes = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalized,
          type: 'text',
          text: { body: message },
        }),
      }
    );

    if (!metaRes.ok) {
      const err = await metaRes.json().catch(() => ({})) as Record<string, string>;
      return NextResponse.json(
        { error: 'WhatsApp API error', message: err.error ?? 'Falha ao enviar mensagem', success: false },
        { status: 502 }
      );
    }

    const metaBody = await metaRes.json() as { messages?: Array<{ id: string }> };
    const messageId = metaBody.messages?.[0]?.id ?? `wa_${Date.now()}`;

    return NextResponse.json({
      data: { messageId, to: normalized, status: 'sent' },
      success: true,
    });
  }

  // Mock: ambiente sem credenciais configuradas
  const messageId = `wa_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  return NextResponse.json({
    data: { messageId, to: normalized, status: 'queued', mock: true },
    success: true,
  });
});
