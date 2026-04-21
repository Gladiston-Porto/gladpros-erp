import { NextRequest, NextResponse } from 'next/server'
import { InventoryMovementService } from '@/domains/projects/services/inventory-movement.service'
import { requireProjectPermission } from '@/shared/lib/rbac-projects'
import { withErrorHandler } from '@/lib/api/error-handler';
import type { TipoMovimentacaoEstoque, StatusIntegracaoEstoque } from '@/domains/projects/interfaces/inventory-gateway.interface';

export const runtime = "nodejs"

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
    await requireProjectPermission(request, 'canRead')
    
    // Extrai e valida parâmetro do projeto
    const { id: projetoIdStr } = await context.params
    const projetoId = Number(projetoIdStr)
    
    if (isNaN(projetoId)) {
      return NextResponse.json(
        { error: 'ID do projeto inválido' },
        { status: 400 }
      )
    }
    
    // Extrai query parameters
    const { searchParams } = new URL(request.url)
    
    const materialIdParam = searchParams.get('materialId')
    const tipoMovimentacao = (searchParams.get('tipo') as TipoMovimentacaoEstoque) || undefined
    const statusIntegracao = (searchParams.get('status') as StatusIntegracaoEstoque) || undefined
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')
    const paginaParam = searchParams.get('pagina')
    const limiteParam = searchParams.get('limite')
    
    // Valida e converte parâmetros
    const materialId = materialIdParam ? Number(materialIdParam) : undefined
    if (materialIdParam && isNaN(materialId!)) {
      return NextResponse.json(
        { error: 'ID do material inválido' },
        { status: 400 }
      )
    }
    
    const pagina = paginaParam ? Number(paginaParam) : 1
    if (isNaN(pagina) || pagina < 1) {
      return NextResponse.json(
        { error: 'Número de página inválido' },
        { status: 400 }
      )
    }
    
    let limite = limiteParam ? Number(limiteParam) : 20
    if (isNaN(limite) || limite < 1) {
      return NextResponse.json(
        { error: 'Limite inválido' },
        { status: 400 }
      )
    }
    // Limita máximo de itens por página
    if (limite > 100) limite = 100
    
    // Valida datas se fornecidas
    const dataInicioDate = dataInicio ? new Date(dataInicio) : undefined
    const dataFimDate = dataFim ? new Date(dataFim) : undefined
    
    if (dataInicio && isNaN(dataInicioDate!.getTime())) {
      return NextResponse.json(
        { error: 'Data de início inválida' },
        { status: 400 }
      )
    }
    
    if (dataFim && isNaN(dataFimDate!.getTime())) {
      return NextResponse.json(
        { error: 'Data de fim inválida' },
        { status: 400 }
      )
    }
    
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
    
    return NextResponse.json(resultado)
    
  });
