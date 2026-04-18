import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandler } from '@/lib/api/error-handler';

/**
 * API para exportar propostas em CSV
 * POST /api/propostas/export/csv
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
    const body = await request.json()
    const { filename = 'propostas', filters = {} } = body

    // Build where clause based on filters
    const where: Record<string, unknown> = {}

    if (filters.q) {
      where.OR = [
        { titulo: { contains: filters.q } },
        { numeroProposta: { contains: filters.q } },
        {
          Cliente: {
            nome: { contains: filters.q }
          }
        }
      ]
    }

    if (filters.status && filters.status !== 'all') {
      where.status = filters.status
    }

    if (filters.clienteId) {
      where.clienteId = filters.clienteId
    }

    // Fetch data
    const propostas = await prisma.proposta.findMany({
      where: where as Record<string, unknown>,
      include: {
        Cliente: {
          select: {
            nome: true,
            email: true
          }
        }
      } as Record<string, unknown>,
      orderBy: {
        criadoEm: 'desc'
      }
    })

    // Generate CSV
    const headers = [
      'Número',
      'Título',
      'Cliente',
      'Status',
      'Valor Cliente (USD)',
      'Valor Estimado (USD)',
      'Criado Em',
      'Validade',
      'Assinado Em',
      'Contato',
      'Email Contato',
      'Endereço Execução'
    ]

    const rows = propostas.map((proposta: Record<string, unknown>) => [
      String(proposta.numeroProposta || ''),
      String(proposta.titulo || ''),
      String((proposta.Cliente as Record<string, unknown>)?.nome || ''),
      String(proposta.status || ''),
      proposta.precoPropostaCliente ? Number(proposta.precoPropostaCliente).toFixed(2) : '',
      proposta.valorEstimado ? Number(proposta.valorEstimado).toFixed(2) : '',
      proposta.criadoEm ? new Date(proposta.criadoEm as string | Date).toLocaleDateString('en-US') : '',
      proposta.validadeProposta ? new Date(proposta.validadeProposta as string | Date).toLocaleDateString('en-US') : '',
      proposta.assinadoEm ? new Date(proposta.assinadoEm as string | Date).toLocaleDateString('en-US') : '',
      String(proposta.contatoNome || ''),
      String(proposta.contatoEmail || ''),
      String(proposta.localExecucaoEndereco || '')
    ])

    const csvContent = [headers, ...rows]
      .map((row: (string | number)[]) => row.map((field: string | number) => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    })

  });
