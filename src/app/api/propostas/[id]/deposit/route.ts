import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { requireUser } from '@/shared/lib/rbac'
import { can, type Role } from '@/shared/lib/rbac-core'
import { withErrorHandler } from '@/lib/api/error-handler'

interface RouteParams {
  params: Promise<{ id: string }>
}

const patchSchema = z.object({
  depositoPago: z.boolean(),
  depositoMetodo: z
    .enum(['CHECK', 'ZELLE', 'VENMO', 'TRANSFER', 'CASH', 'OTHER'])
    .optional(),
  depositoValor: z.number().positive().optional(),
  depositoPagoEm: z.string().datetime().optional(),
  depositoNotas: z.string().max(500).optional(),
})

/** PATCH /api/propostas/[id]/deposit — mark deposit as paid/unpaid */
export const PATCH = withErrorHandler(
  async (request: NextRequest, { params }: RouteParams) => {
    const user = await requireUser(request)

    // Only ADMIN, GERENTE, FINANCEIRO can update deposit
    if (
      !can(user.role as Role, 'financeiro', 'read') &&
      !can(user.role as Role, 'propostas', 'update')
    ) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão para atualizar depósito', success: false },
        { status: 403 }
      )
    }

    const { id } = await params
    const propostaId = parseInt(id)

    const body = patchSchema.safeParse(await request.json())
    if (!body.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: body.error.issues[0]?.message ?? 'Dados inválidos',
          success: false,
        },
        { status: 400 }
      )
    }

    const proposta = await prisma.proposta.findFirst({
      where: { id: propostaId, deletedAt: null },
      select: { id: true, numeroProposta: true, status: true },
    })

    if (!proposta) {
      return NextResponse.json(
        { error: 'Not found', message: 'Proposta não encontrada', success: false },
        { status: 404 }
      )
    }

    const { depositoPago, depositoMetodo, depositoValor, depositoPagoEm, depositoNotas } =
      body.data

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.proposta.update({
        where: { id: propostaId },
        data: {
          depositoPago,
          depositoMetodo: depositoMetodo ?? null,
          depositoValor: depositoValor ?? undefined,
          depositoPagoEm: depositoPago
            ? (depositoPagoEm ? new Date(depositoPagoEm) : new Date())
            : null,
          depositoNotas: depositoNotas ?? null,
          atualizadoEm: new Date(),
        },
        select: {
          id: true,
          depositoPago: true,
          depositoMetodo: true,
          depositoValor: true,
          depositoPagoEm: true,
          depositoNotas: true,
          percentualSinal: true,
        },
      })

      await tx.propostaLog.create({
        data: {
          id: randomUUID(),
          propostaId,
          actorId: parseInt(user.id) || null,
          action: depositoPago ? 'DEPOSIT_PAID' : 'DEPOSIT_UNPAID',
          newJson: JSON.stringify({
            depositoPago,
            depositoMetodo,
            depositoValor,
          }),
          ip: request.headers.get('x-forwarded-for') ?? 'unknown',
          userAgent: request.headers.get('user-agent') ?? 'unknown',
        },
      })

      return result
    })

    return NextResponse.json({ data: updated, success: true })
  }
)

/** GET /api/propostas/[id]/deposit — get deposit status */
export const GET = withErrorHandler(
  async (request: NextRequest, { params }: RouteParams) => {
    const user = await requireUser(request)

    if (!can(user.role as Role, 'propostas', 'read')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão', success: false },
        { status: 403 }
      )
    }

    const { id } = await params
    const propostaId = parseInt(id)

    const proposta = await prisma.proposta.findFirst({
      where: { id: propostaId, deletedAt: null },
      select: {
        id: true,
        depositoPago: true,
        depositoMetodo: true,
        depositoValor: true,
        depositoPagoEm: true,
        depositoNotas: true,
        percentualSinal: true,
        precoPropostaCliente: true,
        documensoDocumentId: true,
        documensoStatus: true,
      },
    })

    if (!proposta) {
      return NextResponse.json(
        { error: 'Not found', message: 'Proposta não encontrada', success: false },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: proposta, success: true })
  }
)
