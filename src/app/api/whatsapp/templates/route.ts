// src/app/api/whatsapp/templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';

// Mock WhatsApp message templates
const mockTemplates = [
  {
    id: '1',
    name: 'welcome_client',
    language: 'pt_BR',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Olá {{cliente_nome}}! Bem-vindo ao GladPros. Sua conta foi criada com sucesso.',
      },
    ],
    status: 'APPROVED',
  },
  {
    id: '2',
    name: 'proposal_sent',
    language: 'pt_BR',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Olá {{cliente_nome}}! Sua proposta {{numero_proposta}} foi enviada. Acesse: {{link_proposta}}',
      },
    ],
    status: 'APPROVED',
  },
  {
    id: '3',
    name: 'payment_reminder',
    language: 'pt_BR',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Olá {{cliente_nome}}! Lembrete: o pagamento da proposta {{numero_proposta}} vence em {{dias_vencimento}} dias.',
      },
    ],
    status: 'APPROVED',
  },
];

export const GET = withErrorHandler(async (request: NextRequest) => {
    await requireUser(request);

    // Em produção, buscar da WhatsApp Business API
    return NextResponse.json(mockTemplates);
  });

export const POST = withErrorHandler(async (request: NextRequest) => {
    await requireUser(request);

    const body = await request.json();
    const { name, language, category, components } = body;

    if (!name || !components) {
      return NextResponse.json(
        { error: 'Nome e componentes são obrigatórios' },
        { status: 400 }
      );
    }

    // In production, create template via WhatsApp Business API
    const newTemplate = {
      id: Date.now().toString(),
      name,
      language: language || 'pt_BR',
      category: category || 'UTILITY',
      components,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(newTemplate, { status: 201 });
  });
