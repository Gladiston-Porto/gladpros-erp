// src/app/api/reports/[id]/export/route.ts
import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';

export const GET = withErrorHandler(async (request: Request,
  { params }: { params: Promise<{ id: string }> }) => {
    // Authentication not needed for mock implementation
    // const user = await requireUser(request);
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';

    // Mock data - in production, generate actual file
    const mockData = [
      ['Nome', 'E-mail', 'Telefone', 'Cidade', 'Status', 'Data Cadastro'],
      ['João Silva', 'joao@email.com', '(11) 99999-9999', 'São Paulo', 'Ativo', '2024-01-15'],
      ['Maria Santos', 'maria@email.com', '(21) 88888-8888', 'Rio de Janeiro', 'Ativo', '2024-01-20'],
      ['Pedro Costa', 'pedro@email.com', '(85) 77777-7777', 'Fortaleza', 'Inativo', '2024-01-10'],
    ];

    if (format === 'csv') {
      const csvContent = mockData.map(row =>
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="relatorio-${id}.csv"`,
        },
      });
    }

    if (format === 'excel') {
      // Mock Excel response - in production, generate actual Excel file
      const excelContent = 'Mock Excel content';

      return new NextResponse(excelContent, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="relatorio-${id}.xlsx"`,
        },
      });
    }

    // Default to PDF
    const pdfContent = 'Mock PDF content';

    return new NextResponse(pdfContent, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio-${id}.pdf"`,
      },
    });

  });
