import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireClientePermission } from '@/shared/lib/rbac';
import { apiRateLimit } from '@/shared/lib/rate-limit';
import { AuditService } from '@/shared/lib/audit';

// Schema específico para export
const exportFiltersSchema = z.object({
  q: z.string().optional(),
  tipo: z.string().optional().default(''),
  ativo: z.union([z.string(), z.literal('all')]).optional().default('all'),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressCounty: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(2000).optional().default(12),
  sortKey: z.enum(['nome', 'tipo', 'email', 'telefone', 'documento', 'cidadeEstado', 'status', 'criadoEm']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional()
})

// Schema para o body completo da requisição de export
const exportBodySchema = z.object({
  filters: z.record(z.string(), z.unknown()).optional(),
  selectedIds: z.array(z.number().int().positive()).max(500).optional(),
  filename: z.string().max(100).optional(),
})

function buildWhere(filters: unknown) {
  const where: Record<string, unknown> = {}
  const filterData = filters as {
    q?: string
    tipo?: string
    ativo?: string | boolean
    addressCity?: string
    addressState?: string
    addressCounty?: string
  } | undefined;
  
  if (filterData?.q && String(filterData.q).trim()) {
    const q = String(filterData.q).trim()
    where.OR = [
      { nomeCompleto: { contains: q } },
      { razaoSocial: { contains: q } },
      { nomeFantasia: { contains: q } },
      { email: { contains: q } },
      { docLast4: { contains: q } },
    ]
  }
  if (filterData?.tipo && filterData.tipo !== 'all') where.tipo = filterData.tipo
  if (filterData?.ativo !== undefined && filterData.ativo !== 'all') {
    const isAtivo = filterData.ativo === true || filterData.ativo === 'true'
    where.status = isAtivo ? 'ATIVO' : 'INATIVO'
  }
  if (filterData?.addressCity) where.addressCity = { contains: String(filterData.addressCity).trim() }
  if (filterData?.addressState) where.addressState = String(filterData.addressState).trim().toUpperCase()
  if (filterData?.addressCounty) where.addressCounty = { contains: String(filterData.addressCounty).trim() }
  return where
}

function sanitizeCsvCell(value: unknown) {
  const stringValue = String(value ?? '')
  return /^[=+\-@]/.test(stringValue) ? `'${stringValue}` : stringValue
}

export const POST = withErrorHandler(async (request: NextRequest) => {
    const rateLimitResult = await apiRateLimit.isAllowed(request, 'clientes:export:csv')
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: rateLimitResult.message ?? 'Muitas requisições', success: false },
        { status: 429 }
      )
    }

    const user = await requireClientePermission(request, 'canRead');

    const rawBody = await request.json().catch(() => ({}))
    const { filters: rawFilters, selectedIds, filename: rawFilename } = exportBodySchema.parse(rawBody)

    // Sanitizar filename — apenas caracteres alfanuméricos, hífen, underscore e ponto
    const filename = rawFilename
      ? rawFilename.replace(/[^\w\-_.]/g, '_').substring(0, 100)
      : 'clientes'

    // Dados SEMPRE buscados do banco — nunca aceitar dados do cliente diretamente
    const parsed = rawFilters ? exportFiltersSchema.partial().parse(rawFilters) : {}
    const where = buildWhere(parsed)

    if (selectedIds && selectedIds.length > 0) {
      where.id = { in: selectedIds }
    }

    const exportPage = Number(parsed.page ?? 1)
    const exportPageSize = selectedIds?.length
      ? selectedIds.length
      : Math.min(Number(parsed.pageSize ?? 2000), 2000)

    const dbRows = await prisma.cliente.findMany({
      where,
      select: {
        id: true,
        tipo: true,
        nomeCompleto: true,
        razaoSocial: true,
        nomeFantasia: true,
        email: true,
        telefone: true,
        addressCity: true,
        addressState: true,
        status: true,
        criadoEm: true,
      },
      orderBy: [{ status: 'desc' }, { atualizadoEm: 'desc' }],
      take: exportPageSize,
      skip: selectedIds?.length ? 0 : (exportPage - 1) * exportPageSize,
    })

    if (!dbRows.length) {
      return NextResponse.json({ error: 'Not Found', message: 'Nenhum cliente para exportar', success: false }, { status: 400 })
    }

    const rows = dbRows.map((c) => ({
      id: c.id,
      nomeCompletoOuRazao: c.tipo === 'PF' ? (c.nomeCompleto || '') : (c.nomeFantasia || c.razaoSocial || ''),
      tipo: c.tipo,
      email: c.email,
      telefone: c.telefone || '',
      addressCity: c.addressCity || '',
      addressState: c.addressState || '',
      ativo: c.status === 'ATIVO',
      criadoEm: c.criadoEm,
    }))

    const headers = ['ID', 'Nome/Empresa', 'Tipo', 'E-mail', 'Telefone', 'Cidade', 'Estado', 'Status', 'Criado Em']
    const lines = [
      headers.join(','),
      ...rows.map((c) => [
        c.id,
        c.nomeCompletoOuRazao,
        c.tipo,
        c.email,
        c.telefone,
        c.addressCity,
        c.addressState,
        c.ativo ? 'Ativo' : 'Inativo',
        c.criadoEm.toLocaleDateString('en-US', { timeZone: 'America/Chicago' }),
      ].map((f) => `"${sanitizeCsvCell(f).replace(/"/g, '""')}"`).join(','))
    ]
    const csv = lines.join('\n')

    // Auditoria de exportação
    AuditService.logAction(
      Number(user.id),
      'Cliente',
      0,
      'EXPORT_CSV',
      { count: rows.length, filters: rawFilters ?? {}, selectedIds: selectedIds ?? [] }
    ).catch((err) => console.error('[clientes/export/csv] AuditLog error:', err))

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    })
  });
