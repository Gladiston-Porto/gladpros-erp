import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandler } from '@/lib/api/error-handler';

/**
 * API para exportar propostas em PDF
 * POST /api/propostas/export/pdf
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

    // Generate HTML for PDF
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Propostas</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: #333; 
            }
            h1 { 
              color: #2563eb; 
              border-bottom: 2px solid #2563eb;
              padding-bottom: 10px;
            }
            .summary { 
              background-color: #f8fafc; 
              padding: 15px; 
              border-radius: 8px; 
              margin: 20px 0; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px; 
              font-size: 12px;
            }
            th, td { 
              border: 1px solid #e2e8f0; 
              padding: 8px; 
              text-align: left; 
            }
            th { 
              background-color: #f1f5f9; 
              font-weight: bold;
              color: #1e293b;
            }
            .status { 
              padding: 4px 8px; 
              border-radius: 4px; 
              font-size: 11px; 
              font-weight: bold;
            }
            .status-RASCUNHO { background-color: #f3f4f6; color: #374151; }
            .status-ENVIADA { background-color: #dbeafe; color: #1e40af; }
            .status-ASSINADA { background-color: #fef3c7; color: #d97706; }
            .status-APROVADA { background-color: #dcfce7; color: #16a34a; }
            .status-CANCELADA { background-color: #fee2e2; color: #dc2626; }
            .number { text-align: right; }
            .truncate { 
              max-width: 200px; 
              overflow: hidden; 
              text-overflow: ellipsis; 
              white-space: nowrap; 
            }
          </style>
        </head>
        <body>
          <h1>Relatório de Propostas</h1>
          
          <div class="summary">
            <p><strong>Gerado em:</strong> ${new Date().toLocaleDateString('en-US')} às ${new Date().toLocaleTimeString('en-US')}</p>
            <p><strong>Total de propostas:</strong> ${propostas.length}</p>
            ${filters.q ? `<p><strong>Filtro de busca:</strong> ${filters.q}</p>` : ''}
            ${filters.status && filters.status !== 'all' ? `<p><strong>Status filtrado:</strong> ${filters.status}</p>` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Título</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Valor Cliente</th>
                <th>Criado Em</th>
                <th>Validade</th>
              </tr>
            </thead>
            <tbody>
              ${propostas.map((proposta: Record<string, unknown>) => `
                <tr>
                  <td><strong>${String(proposta.numeroProposta || '')}</strong></td>
                  <td class="truncate">${String(proposta.titulo || '')}</td>
                  <td>${String((proposta.Cliente as Record<string, unknown>)?.nome || '')}</td>
                  <td><span class="status status-${String(proposta.status || '')}">${String(proposta.status || '')}</span></td>
                  <td class="number">${proposta.precoPropostaCliente ? `USD ${Number(proposta.precoPropostaCliente).toFixed(2)}` : 'N/A'}</td>
                  <td>${proposta.criadoEm ? new Date(proposta.criadoEm as string | Date).toLocaleDateString('en-US') : ''}</td>
                  <td>${proposta.validadeProposta ? new Date(proposta.validadeProposta as string | Date).toLocaleDateString('en-US') : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${propostas.length === 0 ? '<p style="text-align: center; color: #64748b; margin: 40px 0;">Nenhuma proposta encontrada com os filtros aplicados.</p>' : ''}
        </body>
      </html>
    `

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.html"`,
      },
    })

  });
