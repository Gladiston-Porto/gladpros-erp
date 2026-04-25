// src/app/api/reports/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

export const POST = withErrorHandler(async (request: NextRequest) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'reports', 'read')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }

    const body = await request.json();
    const {
      dataType,
      format,
      filters,
      fields,
    } = body;

    if (!dataType || !format) {
      return NextResponse.json(
        { error: 'Tipo de dados e formato são obrigatórios' },
        { status: 400 }
      );
    }

    // Validate format
    const validFormats = ['csv', 'xlsx', 'json'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: 'Formato inválido. Use: csv, xlsx, json' },
        { status: 400 }
      );
    }

    // Mock export data based on type
    let exportData: Record<string, unknown>[] = [];
    let filename = '';

    switch (dataType) {
      case 'clients':
        exportData = [
          {
            id: 1,
            nome: 'Empresa XYZ Ltda',
            email: 'contato@empresa.com',
            telefone: '+5511999999999',
            status: 'ativo',
            criadoEm: '2024-01-15',
            ultimoContato: '2024-01-20',
          },
          {
            id: 2,
            nome: 'Tech Solutions SA',
            email: 'vendas@tech.com',
            telefone: '+5511888888888',
            status: 'ativo',
            criadoEm: '2024-01-10',
            ultimoContato: '2024-01-18',
          },
        ];
        filename = 'clientes_export';
        break;

      case 'proposals':
        exportData = [
          {
            id: 1,
            numero: 'PROP-2024-001',
            cliente: 'Empresa XYZ Ltda',
            valor: 15000.00,
            status: 'aprovada',
            criadoEm: '2024-01-15',
            aprovadoEm: '2024-01-20',
          },
          {
            id: 2,
            numero: 'PROP-2024-002',
            cliente: 'Tech Solutions SA',
            valor: 25000.00,
            status: 'enviada',
            criadoEm: '2024-01-18',
            aprovadoEm: null,
          },
        ];
        filename = 'propostas_export';
        break;

      case 'revenue':
        exportData = [
          {
            periodo: '2024-01',
            receita: 45230.00,
            propostas: 45,
            conversao: 68.5,
            clientesNovos: 12,
          },
          {
            periodo: '2024-02',
            receita: 52150.00,
            propostas: 52,
            conversao: 72.1,
            clientesNovos: 15,
          },
        ];
        filename = 'receita_export';
        break;

      default:
        return NextResponse.json(
          { error: 'Tipo de dados inválido' },
          { status: 400 }
        );
    }

    // Generate response based on format
    if (format === 'csv') {
      const csvData = generateCSV(exportData);
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    }

    if (format === 'xlsx') {
      // In production, generate actual Excel file
      return NextResponse.json({
        message: 'Excel generation started',
        downloadUrl: `/exports/${filename}.xlsx`,
        format: 'xlsx',
      });
    }

    // JSON format
    return NextResponse.json({
      data: exportData,
      metadata: {
        totalRecords: exportData.length,
        exportedAt: new Date().toISOString(),
        exportedBy: 1, // Mock user ID
        filters: filters || {},
        fields: fields || [],
      },
    });

  });

function generateCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Handle null values and format dates/numbers
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      }).join(',')
    ),
  ];

  return csvRows.join('\n');
}
