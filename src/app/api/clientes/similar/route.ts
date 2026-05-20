import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireClientePermission } from '@/shared/lib/rbac'
import { apiRateLimit } from '@/shared/lib/rate-limit'
import { withErrorHandler } from '@/lib/api/error-handler'
import { formatTelefone } from '@/shared/lib/helpers/cliente'

export const runtime = 'nodejs'

const similarQuerySchema = z.object({
  telefone: z.string().optional(),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  excludeId: z.coerce.number().int().positive().optional(),
})

type SimilarCliente = {
  id: number
  nome: string
  tipo: string
  email: string | null
}

type SimilarResult = {
  byTelefone: SimilarCliente[]
  byAddress: SimilarCliente[]
  hasMatches: boolean
}

/**
 * GET /api/clientes/similar
 *
 * Retorna clientes com telefone ou endereço similar aos parâmetros fornecidos.
 * Usada pelo formulário para aviso não-bloqueante de possível duplicidade.
 * NÃO bloqueia o cadastro — apenas informa o operador.
 *
 * Query params:
 *   telefone      - número de telefone (apenas dígitos)
 *   addressStreet - rua/endereço
 *   addressCity   - cidade
 *   addressState  - estado (2 letras)
 *   excludeId     - ID do cliente a excluir (para edição — não comparar consigo mesmo)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const rl = await apiRateLimit.isAllowed(request)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', message: rl.message, success: false },
      { status: 429 }
    )
  }

  const user = await requireClientePermission(request, 'canRead')

  const { searchParams } = new URL(request.url)
  const params = similarQuerySchema.safeParse({
    telefone: searchParams.get('telefone') ?? undefined,
    addressStreet: searchParams.get('addressStreet') ?? undefined,
    addressCity: searchParams.get('addressCity') ?? undefined,
    addressState: searchParams.get('addressState') ?? undefined,
    excludeId: searchParams.get('excludeId') ?? undefined,
  })

  if (!params.success) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos', message: params.error.issues[0]?.message, success: false },
      { status: 400 }
    )
  }

  const { telefone, addressStreet, addressCity, addressState, excludeId } = params.data

  // Normalizar telefone para dígitos apenas
  const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : undefined

  // Nenhum parâmetro de busca informado
  if (!telefoneLimpo && !addressStreet) {
    const resultado: SimilarResult = { byTelefone: [], byAddress: [], hasMatches: false }
    return NextResponse.json({ data: resultado, success: true })
  }

  const EMPRESA_ID = user.empresaId // single-tenant: GladPros only
  const baseWhere = {
    empresaId: EMPRESA_ID,
    status: 'ATIVO' as const,
    ...(excludeId ? { id: { not: excludeId } } : {}),
  }

  const select = {
    id: true,
    nomeCompleto: true,
    razaoSocial: true,
    tipo: true,
    email: true,
  }

  // Executar buscas em paralelo — apenas as que têm parâmetros suficientes
  const [byTelefoneRaw, byAddressRaw] = await Promise.all([
    telefoneLimpo && telefoneLimpo.length >= 10
      ? prisma.cliente.findMany({
          where: { ...baseWhere, telefone: telefoneLimpo },
          select,
          take: 5,
        })
      : Promise.resolve([]),

    addressStreet && addressCity
      ? prisma.cliente.findMany({
          where: {
            ...baseWhere,
            addressStreet: { contains: addressStreet },
            addressCity: { equals: addressCity },
            ...(addressState ? { addressState } : {}),
          },
          select,
          take: 5,
        })
      : Promise.resolve([]),
  ])

  const mapCliente = (c: {
    id: number
    nomeCompleto: string | null
    razaoSocial: string | null
    tipo: string
    email: string | null
  }): SimilarCliente => ({
    id: c.id,
    nome: c.nomeCompleto || c.razaoSocial || 'Cliente sem nome',
    tipo: c.tipo,
    email: c.email,
  })

  const byTelefone = byTelefoneRaw.map(mapCliente)
  const byAddress = byAddressRaw.map(mapCliente)

  // Normalizar telefone na resposta para exibição
  const resultado: SimilarResult = {
    byTelefone: byTelefone.map((c) => ({
      ...c,
      telefoneFormatado: formatTelefone(telefoneLimpo || ''),
    })),
    byAddress,
    hasMatches: byTelefone.length > 0 || byAddress.length > 0,
  }

  return NextResponse.json({ data: resultado, success: true })
})
