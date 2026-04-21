import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'propostas', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }

  const body = await request.json()
  const { filename = 'propostas', filters = {} } = body

  const where: Record<string, unknown> = { deletedAt: null }

  if (filters.q) {
    where.OR = [
      { titulo: { contains: filters.q } },
      { numeroProposta: { contains: filters.q } },
      { Cliente: { nomeCompleto: { contains: filters.q } } }
    ]
  }

  if (filters.status && filters.status !== 'all') {
    where.status = filters.status
  }

  if (filters.clienteId) {
    where.clienteId = Number(filters.clienteId)
  }

  const propostas = await prisma.proposta.findMany({
    where,
    select: {
      numeroProposta: true,
      titulo: true,
      status: true,
      precoPropostaCliente: true,
      criadoEm: true,
      validadeProposta: true,
      Cliente: { select: { nomeCompleto: true } }
    },
    orderBy: { criadoEm: 'desc' },
    take: 500,
  })

  // Sanitizar todos os campos antes de interpolar no HTML (VUL-05 XSS)
  const safeQ = filters.q ? escapeHtml(String(filters.q)) : null
  const safeStatus = filters.status && filters.status !== 'all' ? escapeHtml(String(filters.status)) : null

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Relatório de Propostas</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { color: #0098DA; border-bottom: 2px solid #0098DA; padding-bottom: 10px; }
          .summary { background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; color: #1e293b; }
          .status { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .status-RASCUNHO { background-color: #f3f4f6; color: #374151; }
          .status-ENVIADA { background-color: #dbeafe; color: #1e40af; }
          .status-ASSINADA { background-color: #fef3c7; color: #d97706; }
          .status-APROVADA { background-color: #dcfce7; color: #16a34a; }
          .status-CANCELADA { background-color: #fee2e2; color: #dc2626; }
          .number { text-align: right; }
          .truncate { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        </style>
      </head>
      <body>
        <h1>Relatório de Propostas</h1>
        <div class="summary">
          <p><strong>Gerado em:</strong> ${new Date().toLocaleDateString('en-US')} às ${new Date().toLocaleTimeString('en-US')}</p>
          <p><strong>Total de propostas:</strong> ${propostas.length}</p>
          ${safeQ ? `<p><strong>Filtro de busca:</strong> ${safeQ}</p>` : ''}
          ${safeStatus ? `<p><strong>Status filtrado:</strong> ${safeStatus}</p>` : ''}
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
            ${propostas.map((p) => `
              <tr>
                <td><strong>${escapeHtml(p.numeroProposta ?? '')}</strong></td>
                <td class="truncate">${escapeHtml(p.titulo ?? '')}</td>
                <td>${escapeHtml(p.Cliente?.nomeCompleto ?? '')}</td>
                <td><span class="status status-${escapeHtml(p.status ?? '')}">${escapeHtml(p.status ?? '')}</span></td>
                <td class="number">${p.precoPropostaCliente ? `USD ${Number(p.precoPropostaCliente).toFixed(2)}` : 'N/A'}</td>
                <td>${p.criadoEm ? new Date(p.criadoEm).toLocaleDateString('en-US') : ''}</td>
                <td>${p.validadeProposta ? new Date(p.validadeProposta).toLocaleDateString('en-US') : 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${propostas.length === 0 ? '<p style="text-align: center; color: #64748b; margin: 40px 0;">Nenhuma proposta encontrada com os filtros aplicados.</p>' : ''}
      </body>
    </html>
  `

  const safeFilename = String(filename).replace(/[^a-zA-Z0-9_-]/g, '_')

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeFilename}.html"`,
      'Cache-Control': 'no-store',
    },
  })
})
