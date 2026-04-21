import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

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
      valorEstimado: true,
      criadoEm: true,
      validadeProposta: true,
      assinadaEm: true,
      contatoNome: true,
      contatoEmail: true,
      localExecucaoEndereco: true,
      Cliente: { select: { nomeCompleto: true, email: true } }
    },
    orderBy: { criadoEm: 'desc' },
    take: 5000,
  })

  const headers = [
    'Número', 'Título', 'Cliente', 'Status',
    'Valor Cliente (USD)', 'Valor Estimado (USD)',
    'Criado Em', 'Validade', 'Assinado Em',
    'Contato', 'Email Contato', 'Endereço Execução',
  ]

  const rows = propostas.map((p) => [
    p.numeroProposta ?? '',
    p.titulo ?? '',
    p.Cliente?.nomeCompleto ?? '',
    p.status ?? '',
    p.precoPropostaCliente ? Number(p.precoPropostaCliente).toFixed(2) : '',
    p.valorEstimado ? Number(p.valorEstimado).toFixed(2) : '',
    p.criadoEm ? new Date(p.criadoEm).toLocaleDateString('en-US') : '',
    p.validadeProposta ? new Date(p.validadeProposta).toLocaleDateString('en-US') : '',
    p.assinadaEm ? new Date(p.assinadaEm).toLocaleDateString('en-US') : '',
    p.contatoNome ?? '',
    p.contatoEmail ?? '',
    p.localExecucaoEndereco ?? '',
  ])

  const csvContent = [headers, ...rows]
    .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const safeFilename = String(filename).replace(/[^a-zA-Z0-9_-]/g, '_')

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeFilename}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
})
