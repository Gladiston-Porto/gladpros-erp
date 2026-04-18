// src/app/api/reports/[id]/data/route.ts
import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';

export const GET = withErrorHandler(async () => {
    // Authentication not needed for mock implementation
    // const user = await requireUser(request);
    // const { id } = await params; // Not used in mock implementation

    // Mock data based on report type - in production, query database
    const mockData = {
      headers: ['Nome', 'E-mail', 'Telefone', 'Cidade', 'Status', 'Data Cadastro'],
      rows: [
        ['João Silva', 'joao@email.com', '(11) 99999-9999', 'São Paulo', 'Ativo', '2024-01-15'],
        ['Maria Santos', 'maria@email.com', '(21) 88888-8888', 'Rio de Janeiro', 'Ativo', '2024-01-20'],
        ['Pedro Costa', 'pedro@email.com', '(85) 77777-7777', 'Fortaleza', 'Inativo', '2024-01-10'],
        ['Ana Oliveira', 'ana@email.com', '(11) 66666-6666', 'São Paulo', 'Ativo', '2024-01-25'],
        ['Carlos Mendes', 'carlos@email.com', '(71) 55555-5555', 'Salvador', 'Ativo', '2024-01-18'],
      ],
      summary: {
        totalRecords: 5,
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(mockData);
  });
