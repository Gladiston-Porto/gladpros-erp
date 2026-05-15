import { NextRequest, NextResponse } from 'next/server'
import { InventoryMovementService } from '@/domains/projects/services/inventory-movement.service'
import { requireProjectAccess, requireProjectPermission } from '@/shared/lib/rbac-projects'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

const querySchema = z.object({
  materialId: z.coerce.number().int().positive().optional(),
  tipo: z.enum(['LIBERACAO', 'DEVOLUCAO', 'AJUSTE', 'PERDA']).optional(),
  status: z.enum(['PENDENTE', 'PROCESSANDO', 'CONCLUIDA', 'ERRO']).optional(),
  dataInicio: z.string().datetime({ offset: true }).optional(),
  dataFim: z.string().datetime({ offset: true }).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/projetos/[id]/movimentacoes
 * Lista movimentações de estoque de um projeto
 * Requer permissão: canRead
 *
 * Query params:
 * - materialId: Filtrar por material específico
 * - tipo: Filtrar por tipo (LIBERACAO, DEVOLUCAO, AJUSTE, PERDA)
 * - status: Filtrar por status (PENDENTE, PROCESSANDO, CONCLUIDA, ERRO)
 * - dataInicio: Filtrar por data inicial (ISO 8601)
 * - dataFim: Filtrar por data final (ISO 8601)
 * - pagina: Número da página (padrão: 1)
 * - limite: Itens por página (padrão: 20, max: 100)
 */
export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    // Verifica permissão de leitura
    const user = await requireProjectPermission(request, 'canRead')

    // Extrai e valida parâmetro do projeto
    const { id: projetoIdStr } = await context.params
    const projetoId = Number(projetoIdStr)

    if (isNaN(projetoId)) {
      return NextResponse.json(
        { error: 'ID do projeto inválido' },
        { status: 400 }
      )
    }
    await requireProjectAccess(user, projetoId, 'canRead')

    const { searchParams } = new URL(request.url)
    const query = querySchema.safeParse({
      materialId: searchParams.get('materialId') ?? undefined,
      tipo: searchParams.get('tipo') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      dataInicio: searchParams.get('dataInicio') ?? undefined,
      dataFim: searchParams.get('dataFim') ?? undefined,
      pagina: searchParams.get('pagina') ?? undefined,
      limite: searchParams.get('limite') ?? undefined,
    })

    if (!query.success) {
      return NextResponse.json(
        { error: 'Validation failed', message: query.error.issues[0]?.message ?? 'Parâmetros inválidos', success: false },
        { status: 400 }
      )
    }

    const {
      materialId,
      tipo: tipoMovimentacao,
      status: statusIntegracao,
      dataInicio,
      dataFim,
      pagina,
      limite,
    } = query.data
    const dataInicioDate = dataInicio ? new Date(dataInicio) : undefined
    const dataFimDate = dataFim ? new Date(dataFim) : undefined

    // Busca movimentações
    const service = new InventoryMovementService()
    const resultado = await service.listar({
      projetoId,
      materialId,
      tipoMovimentacao,
      statusIntegracao,
      dataInicio: dataInicioDate,
      dataFim: dataFimDate,
      pagina,
      limite,
    })

    return NextResponse.json({
      data: resultado.data,
      pagination: {
        page: resultado.paginacao.paginaAtual,
        pageSize: resultado.paginacao.itensPorPagina,
        total: resultado.paginacao.totalItens,
        totalPages: resultado.paginacao.totalPaginas,
      },
      success: true,
    })

  });
