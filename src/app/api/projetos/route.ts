import { NextRequest, NextResponse } from 'next/server'
import { ProjectService } from '@/domains/projects/services/ProjectService'
import { requireProjectPermission, shouldMaskFinancials } from '@/shared/lib/rbac-projects'
import { createProjetoSchema, listarProjetosSchema } from '@/domains/projects/validators'
import { ZodError } from 'zod'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

/**
 * GET /api/projetos - Lista projetos com filtros e paginação
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
    // Verificar permissão de leitura
    const user = await requireProjectPermission(request, 'canRead')
    
    // Obter parâmetros da URL
    const { searchParams } = new URL(request.url)
    const rawParams = Object.fromEntries(searchParams.entries())
    
    // Converter tipos para o schema
    const queryParams: Record<string, unknown> = {}
    
    // Converter arrays de string (status, prioridade)
    if (rawParams.status) {
      queryParams.status = rawParams.status.split(',')
    }
    if (rawParams.prioridade) {
      queryParams.prioridade = rawParams.prioridade.split(',')
    }
    
    // Converter números
    if (rawParams.pagina) {
      queryParams.pagina = Number(rawParams.pagina)
    }
    if (rawParams.limite) {
      queryParams.limite = Number(rawParams.limite)
    }
    if (rawParams.clienteId) {
      queryParams.clienteId = Number(rawParams.clienteId)
    }
    if (rawParams.responsavelId) {
      queryParams.responsavelId = Number(rawParams.responsavelId)
    }
    
    // Passar outros parâmetros
    if (rawParams.busca) queryParams.busca = rawParams.busca
    if (rawParams.ordenarPor) queryParams.ordenarPor = rawParams.ordenarPor
    if (rawParams.ordenarDirecao) queryParams.ordenarDirecao = rawParams.ordenarDirecao
    
    // Validar filtros
    const filters = listarProjetosSchema.parse(queryParams)
    
    // Se for USUARIO, filtrar apenas projetos onde é responsável
    if (user.role === 'USUARIO') {
      filters.responsavelId = Number(user.id)
    }
    
    // Buscar projetos
    const service = new ProjectService()
    const resultado = await service.listar(filters)
    
    // Mascarar dados financeiros se necessário
    const maskFinancials = shouldMaskFinancials(user.role)
    if (maskFinancials) {
      resultado.data = resultado.data.map(projeto => ({
        ...projeto,
        orcamento: undefined,
        custoTotal: undefined,
      }))
    }
    
    // ✅ CORREÇÃO: Transformar paginacao → pagination para match com frontend
    return NextResponse.json({
      data: resultado.data,
      pagination: {
        page: resultado.paginacao.paginaAtual,
        pageSize: resultado.paginacao.porPagina,
        totalRecords: resultado.paginacao.totalItens,
        totalPages: resultado.paginacao.totalPaginas,
      }
    })
    
  });

/**
 * POST /api/projetos - Criar novo projeto
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
    // Verificar permissão de criação
    const user = await requireProjectPermission(request, 'canCreate')
    
    // Parsear body
    const body = await request.json()
    
    // Validar dados de entrada
    const data = createProjetoSchema.parse(body)
    
    // Criar projeto
    const service = new ProjectService()
    const projeto = await service.criar(data, Number(user.id))
    
    // Mascarar dados financeiros se necessário
    const maskFinancials = shouldMaskFinancials(user.role)
    if (maskFinancials) {
      return NextResponse.json({
        ...projeto,
        orcamento: undefined,
        custoTotal: undefined,
      }, { status: 201 })
    }
    
    return NextResponse.json(projeto, { status: 201 })
    
  });
