import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClientePermission } from '@/shared/lib/rbac'
import { clienteFiltersSchema } from '@/shared/lib/validations/cliente'
import { z } from 'zod'
import { AuditService } from '@/shared/lib/audit'
import { apiRateLimit } from '@/shared/lib/rate-limit'
import {
  buildClienteDependencyConflictDetails,
  calculateClienteDiff,
  getClientesBlockingDependenciesMap,
  hasBlockingDependencies,
} from '@/shared/lib/helpers/cliente'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = 'nodejs'

const bulkSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'delete']),
  scope: z.enum(['selected', 'allFiltered']),
  ids: z.array(z.number().int().positive()).optional(),
  filters: clienteFiltersSchema.partial().optional()
})

function buildWhereFromFilters(filters: unknown) {
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
      { docLast4: { contains: q } }
    ]
  }
  if (filterData?.tipo && filterData.tipo !== 'all') {
    where.tipo = filterData.tipo
  }
  if (filterData?.ativo !== undefined && filterData.ativo !== 'all') {
    const isAtivo = filterData.ativo === true || filterData.ativo === 'true'
    where.status = isAtivo ? 'ATIVO' : 'INATIVO'
  }
  if (filterData?.addressCity) {
    where.addressCity = { contains: String(filterData.addressCity).trim() }
  }
  if (filterData?.addressState) {
    where.addressState = String(filterData.addressState).trim().toUpperCase()
  }
  if (filterData?.addressCounty) {
    where.addressCounty = { contains: String(filterData.addressCounty).trim() }
  }
  return where
}

export const POST = withErrorHandler(async (request: NextRequest) => {
    const rateLimitResult = await apiRateLimit.isAllowed(request, 'clientes:bulk')
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: rateLimitResult.message ?? 'Muitas requisições', success: false },
        { status: 429 }
      )
    }

    // Parse body first to determine action, then authenticate with the right permission in a single call
    const body = await request.json().catch(() => ({}))
    const { action, scope, ids, filters } = bulkSchema.parse(body)

    // Autenticação + RBAC em uma única chamada — evita dupla verificação de JWT
    const permission = action === 'delete' ? 'canDelete' : 'canUpdate'
    const user = await requireClientePermission(request, permission)
    const userId = Number(user.id)

    let where: Record<string, unknown> = {}
    if (scope === 'selected') {
      if (!ids || ids.length === 0) {
        return NextResponse.json({ error: 'Validation failed', message: 'Nenhum ID informado', success: false }, { status: 400 })
      }
      where.id = { in: ids }
    } else {
      where = buildWhereFromFilters(filters || {})
    }

    let count = 0
    if (action === 'activate' || action === 'deactivate') {
      const affected = await prisma.cliente.findMany({
        where,
        select: { id: true, tipo: true, nomeCompleto: true, razaoSocial: true, nomeFantasia: true, email: true, telefone: true, endereco: true, status: true, docHash: true }
      })
      if (affected.length === 0) {
        return NextResponse.json({ success: true, data: { processed: 0 } })
      }
      const idsAffected = affected.map((r) => r.id)
      if (action === 'deactivate') {
        const dependencyMap = await getClientesBlockingDependenciesMap(idsAffected)
        const blockedClientes = affected
          .map((cliente) => {
            const dependencyCounts = dependencyMap.get(cliente.id) ?? {
              activeServiceOrders: 0,
              activeProjetos: 0,
              activeInvoices: 0,
            }

            if (!hasBlockingDependencies(dependencyCounts)) {
              return null
            }

            return {
              id: cliente.id,
              nome: cliente.tipo === 'PF'
                ? (cliente.nomeCompleto || `Cliente #${cliente.id}`)
                : (cliente.nomeFantasia || cliente.razaoSocial || `Cliente #${cliente.id}`),
              ...buildClienteDependencyConflictDetails(dependencyCounts),
            }
          })
          .filter((cliente): cliente is NonNullable<typeof cliente> => cliente !== null)

        if (blockedClientes.length > 0) {
          return NextResponse.json(
            {
              error: 'Conflict',
              message: 'Um ou mais clientes possuem dependências ativas e não podem ser inativados',
              details: {
                operation: action,
                totalBlocked: blockedClientes.length,
                blockedClientes: blockedClientes.slice(0, 20),
              },
              success: false,
            },
            { status: 409 }
          )
        }
      }
      const newStatus = action === 'activate' ? 'ATIVO' : 'INATIVO'
      const res = await prisma.cliente.updateMany({
        where: { id: { in: idsAffected } },
        data: { status: newStatus, ativo: newStatus === 'ATIVO' }
      })
      count = res.count

      // Registrar auditoria
      const diffs = affected.map((oldRow) => ({
        clienteId: oldRow.id,
        diff: calculateClienteDiff(
          oldRow as unknown as Record<string, unknown>,
          { ...oldRow, status: newStatus } as Record<string, unknown>
        )
      }))
      for (const d of diffs) {
        AuditService.logAction(userId, 'Cliente', d.clienteId, 'UPDATE_BULK_STATUS', d.diff)
          .catch((err) => console.error('[AUDIT] Falha ao registrar bulk status:', err))
      }
    } else if (action === 'delete') {
      // Soft delete — nunca apaga fisicamente. Muda status para INATIVO.
      const affected = await prisma.cliente.findMany({
        where,
        select: { id: true, tipo: true, nomeCompleto: true, razaoSocial: true, nomeFantasia: true, email: true, status: true }
      })
      if (affected.length === 0) {
        return NextResponse.json({ success: true, data: { processed: 0 } })
      }
      const idsAffected = affected.map((r) => r.id)
      const dependencyMap = await getClientesBlockingDependenciesMap(idsAffected)
      const blockedClientes = affected
        .map((cliente) => {
          const dependencyCounts = dependencyMap.get(cliente.id) ?? {
            activeServiceOrders: 0,
            activeProjetos: 0,
            activeInvoices: 0,
          }

          if (!hasBlockingDependencies(dependencyCounts)) {
            return null
          }

          return {
            id: cliente.id,
            nome: cliente.tipo === 'PF'
              ? (cliente.nomeCompleto || `Cliente #${cliente.id}`)
              : (cliente.nomeFantasia || cliente.razaoSocial || `Cliente #${cliente.id}`),
            ...buildClienteDependencyConflictDetails(dependencyCounts),
          }
        })
        .filter((cliente): cliente is NonNullable<typeof cliente> => cliente !== null)

      if (blockedClientes.length > 0) {
        return NextResponse.json(
          {
            error: 'Conflict',
            message: 'Um ou mais clientes possuem dependências ativas e não podem ser inativados',
            details: {
              operation: action,
              totalBlocked: blockedClientes.length,
              blockedClientes: blockedClientes.slice(0, 20),
            },
            success: false,
          },
          { status: 409 }
        )
      }
      const res = await prisma.cliente.updateMany({
        where: { id: { in: idsAffected } },
        data: { status: 'INATIVO', ativo: false }
      })
      count = res.count
      for (const oldRow of affected) {
        AuditService.logAction(userId, 'Cliente', oldRow.id, 'DELETE_BULK', { old: { id: oldRow.id, status: oldRow.status } })
          .catch((err) => console.error('[AUDIT] Falha ao registrar bulk delete:', err))
      }
    }

    return NextResponse.json({ success: true, data: { processed: count } })
  });
