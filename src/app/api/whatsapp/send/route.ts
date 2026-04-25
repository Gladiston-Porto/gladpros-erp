// src/app/api/whatsapp/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';

export const POST = withErrorHandler(async (request: NextRequest) => {
    await requireUser(request);

    const body = await request.json();
    const { to, message } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Número de destino e mensagem são obrigatórios' },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneRegex = /^\+?55\d{10,11}$/;
    if (!phoneRegex.test(to.replace(/\s+/g, ''))) {
      return NextResponse.json(
        { error: 'Formato de telefone inválido. Use: +55XXXXXXXXXXX' },
        { status: 400 }
      );
    }

    // In production, integrate with WhatsApp Business API
    // For now, simulate sending
    const messageId = `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({
      success: true,
      messageId,
      to,
      status: 'sent',
      timestamp: new Date().toISOString(),
    });
  });
