import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decryptDoc } from '@/shared/lib/crypto'
import { withErrorHandler } from '@/lib/api/error-handler';
import { hasRole, requireUser } from '@/shared/lib/rbac';
import { z } from 'zod';

export const runtime = 'nodejs'

export const GET = withErrorHandler(async (request: NextRequest) => {
    const debugEnabled = process.env.NODE_ENV !== 'production' || process.env.CLIENTES_DEBUG_ENDPOINTS === '1'
    if (!debugEnabled) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Endpoint indisponível', success: false },
        { status: 404 }
      )
    }

    const authUser = await requireUser(request);
    if (!hasRole(authUser.role, ['ADMIN'])) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão para acessar este endpoint', success: false },
        { status: 403 }
      );
    }

    const url = new URL(request.url)
    const paginationSchema = z.object({
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(200).default(100),
    })
    const { page, pageSize } = paginationSchema.parse({
      page: url.searchParams.get('page') ?? undefined,
      pageSize: url.searchParams.get('pageSize') ?? undefined,
    })

    const skip = (page - 1) * pageSize

    // Busca rows e total em paralelo — evita query sequencial desnecessária
    const [rows, total] = await Promise.all([
      prisma.cliente.findMany({
        skip,
        take: pageSize,
        select: { id: true, documentoEnc: true, docLast4: true }
      }),
      prisma.cliente.count()
    ])

    let failures = 0

    // Decrypt em paralelo — evita N+1 sequencial por linha
    const results = await Promise.all(
      rows.map(async (r): Promise<{ id: number; docLast4: string | null; ok: boolean }> => {
        if (!r.documentoEnc) return { id: r.id, docLast4: r.docLast4, ok: true }
        try {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _plain = await decryptDoc(r.documentoEnc)
          return { id: r.id, docLast4: r.docLast4, ok: true }
        } catch {
          failures++
          return { id: r.id, docLast4: r.docLast4, ok: false }
        }
      })
    )

    return NextResponse.json({
      data: {
        page,
        pageSize,
        total,
        failures,
        results,
      },
      success: true,
    })
  });
