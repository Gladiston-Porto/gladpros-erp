/**
 * API: RELATÓRIOS - CONSUMO
 * Arquivo: src/app/api/estoque/relatorios/consumo/route.ts
 * 
 * Endpoint:
 * - GET /api/estoque/relatorios/consumo - Relatório de consumo por projeto/período
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  successResponse,
  withErrorHandler,
  logger,
  createLogContext,
  forbiddenResponse,
  getSearchParams
} from '@/lib/api';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

export const dynamic = 'force-dynamic';

/**
 * GET /api/estoque/relatorios/consumo
 * 
 * Relatório detalhado de consumo de materiais
 * 
 * @permissao VIEW_ESTOQUE
 * @query projetoId, dataInicio, dataFim, materialId, categoriaId
 */
async function handler(request: NextRequest) {
  const user = await requireUser(request);
  
  if (!can(user.role as Role, 'estoque', 'read')) {
    return forbiddenResponse('Você não tem permissão para visualizar relatórios');
  }
  
  // 3. PARÂMETROS
  const { filters } = getSearchParams(request);
  
  const projetoId = filters?.projetoId ? Number(filters.projetoId) : undefined;
  const materialId = filters?.materialId ? Number(filters.materialId) : undefined;
  const categoriaId = filters?.categoriaId ? Number(filters.categoriaId) : undefined;
  
  const dataInicio = filters?.dataInicio 
    ? new Date(filters.dataInicio as string)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Padrão: 90 dias atrás
  
  const dataFim = filters?.dataFim 
    ? new Date(filters.dataFim as string)
    : new Date(); // Padrão: hoje
  
  // 4. LOG
  logger.info('Gerando relatório de consumo', createLogContext(request, user), {
    dataInicio,
    dataFim,
    projetoId,
    materialId
  });
  
  // 5. FILTROS WHERE
  const where: any = {
    tipo: 'SAIDA',
    criadoEm: {
      gte: dataInicio,
      lte: dataFim
    }
  };
  
  if (projetoId) where.projetoId = projetoId;
  if (materialId) where.materialId = materialId;
  
  // 6. CONSUMO POR PROJETO
  const consumoPorProjeto = await prisma.$queryRaw<any[]>`
    SELECT 
      p.id,
      p.codigo,
      p.nome,
      p.status,
      COUNT(DISTINCT mm.material_id) as total_materiais_distintos,
      COUNT(mm.id) as total_movimentacoes,
      SUM(mm.quantidade) as quantidade_total,
      SUM(mm.quantidade * m.preco_unitario) as valor_total
    FROM projetos p
    INNER JOIN materiais_movimentacoes mm ON mm.projeto_id = p.id
    INNER JOIN materiais m ON m.id = mm.material_id
    WHERE mm.tipo = 'SAIDA'
      AND mm.criado_em >= ${dataInicio}
      AND mm.criado_em <= ${dataFim}
      ${projetoId ? Prisma.sql`AND p.id = ${projetoId}` : Prisma.empty}
      ${materialId ? Prisma.sql`AND m.id = ${materialId}` : Prisma.empty}
      ${categoriaId ? Prisma.sql`AND m.categoria_id = ${categoriaId}` : Prisma.empty}
    GROUP BY p.id
    ORDER BY valor_total DESC
  `;
  
  // 7. CONSUMO POR MATERIAL
  const consumoPorMaterial = await prisma.$queryRaw<any[]>`
    SELECT 
      m.id,
      m.codigo,
      m.nome,
      c.nome as categoria,
      u.sigla as unidade,
      COUNT(DISTINCT mm.projeto_id) as total_projetos,
      COUNT(mm.id) as total_movimentacoes,
      SUM(mm.quantidade) as quantidade_total,
      m.preco_unitario,
      SUM(mm.quantidade * m.preco_unitario) as valor_total
    FROM materiais m
    INNER JOIN materiais_movimentacoes mm ON mm.material_id = m.id
    LEFT JOIN categorias c ON c.id = m.categoria_id
    LEFT JOIN unidades u ON u.id = m.unidade_id
    WHERE mm.tipo = 'SAIDA'
      AND mm.criado_em >= ${dataInicio}
      AND mm.criado_em <= ${dataFim}
      ${projetoId ? Prisma.sql`AND mm.projeto_id = ${projetoId}` : Prisma.empty}
      ${materialId ? Prisma.sql`AND m.id = ${materialId}` : Prisma.empty}
      ${categoriaId ? Prisma.sql`AND m.categoria_id = ${categoriaId}` : Prisma.empty}
    GROUP BY m.id
    ORDER BY valor_total DESC
  `;
  
  // 8. CONSUMO POR CATEGORIA
  const consumoPorCategoria = await prisma.$queryRaw<any[]>`
    SELECT 
      c.id,
      c.nome,
      COUNT(DISTINCT m.id) as total_materiais,
      COUNT(mm.id) as total_movimentacoes,
      SUM(mm.quantidade) as quantidade_total,
      SUM(mm.quantidade * m.preco_unitario) as valor_total
    FROM categorias c
    INNER JOIN materiais m ON m.categoria_id = c.id
    INNER JOIN materiais_movimentacoes mm ON mm.material_id = m.id
    WHERE mm.tipo = 'SAIDA'
      AND mm.criado_em >= ${dataInicio}
      AND mm.criado_em <= ${dataFim}
      ${projetoId ? Prisma.sql`AND mm.projeto_id = ${projetoId}` : Prisma.empty}
      ${materialId ? Prisma.sql`AND m.id = ${materialId}` : Prisma.empty}
      ${categoriaId ? Prisma.sql`AND c.id = ${categoriaId}` : Prisma.empty}
    GROUP BY c.id
    ORDER BY valor_total DESC
  `;
  
  // 9. CONSUMO POR PERÍODO (mensal)
  const consumoPorPeriodo = await prisma.$queryRaw<any[]>`
    SELECT 
      DATE_FORMAT(mm.criado_em, '%Y-%m') as periodo,
      COUNT(DISTINCT mm.material_id) as total_materiais,
      COUNT(mm.id) as total_movimentacoes,
      SUM(mm.quantidade) as quantidade_total,
      SUM(mm.quantidade * m.preco_unitario) as valor_total
    FROM materiais_movimentacoes mm
    INNER JOIN materiais m ON m.id = mm.material_id
    WHERE mm.tipo = 'SAIDA'
      AND mm.criado_em >= ${dataInicio}
      AND mm.criado_em <= ${dataFim}
      ${projetoId ? Prisma.sql`AND mm.projeto_id = ${projetoId}` : Prisma.empty}
      ${materialId ? Prisma.sql`AND m.id = ${materialId}` : Prisma.empty}
    GROUP BY periodo
    ORDER BY periodo DESC
  `;
  
  // 10. RESUMO GERAL
  const resumoGeral = await prisma.$queryRaw<any[]>`
    SELECT 
      COUNT(DISTINCT mm.projeto_id) as total_projetos,
      COUNT(DISTINCT mm.material_id) as total_materiais,
      COUNT(mm.id) as total_movimentacoes,
      SUM(mm.quantidade) as quantidade_total,
      SUM(mm.quantidade * m.preco_unitario) as valor_total,
      AVG(mm.quantidade * m.preco_unitario) as valor_medio_movimentacao
    FROM materiais_movimentacoes mm
    INNER JOIN materiais m ON m.id = mm.material_id
    WHERE mm.tipo = 'SAIDA'
      AND mm.criado_em >= ${dataInicio}
      AND mm.criado_em <= ${dataFim}
      ${projetoId ? Prisma.sql`AND mm.projeto_id = ${projetoId}` : Prisma.empty}
      ${materialId ? Prisma.sql`AND m.id = ${materialId}` : Prisma.empty}
      ${categoriaId ? Prisma.sql`AND m.categoria_id = ${categoriaId}` : Prisma.empty}
  `;
  
  // 11. FORMATAÇÃO DOS RESULTADOS
  const relatorio = {
    parametros: {
      dataInicio,
      dataFim,
      diasPeriodo: Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)),
      projetoId,
      materialId,
      categoriaId
    },
    
    resumo: resumoGeral.length > 0 ? {
      totalProjetos: Number(resumoGeral[0].total_projetos),
      totalMateriais: Number(resumoGeral[0].total_materiais),
      totalMovimentacoes: Number(resumoGeral[0].total_movimentacoes),
      quantidadeTotal: Number(resumoGeral[0].quantidade_total),
      valorTotal: Number(resumoGeral[0].valor_total),
      valorMedioMovimentacao: Number(resumoGeral[0].valor_medio_movimentacao)
    } : null,
    
    consumoPorProjeto: consumoPorProjeto.map((p: any) => ({
      id: p.id,
      codigo: p.codigo,
      nome: p.nome,
      status: p.status,
      totalMateriaisDistintos: Number(p.total_materiais_distintos),
      totalMovimentacoes: Number(p.total_movimentacoes),
      quantidadeTotal: Number(p.quantidade_total),
      valorTotal: Number(p.valor_total)
    })),
    
    consumoPorMaterial: consumoPorMaterial.map((m: any) => ({
      id: m.id,
      codigo: m.codigo,
      nome: m.nome,
      categoria: m.categoria,
      unidade: m.unidade,
      totalProjetos: Number(m.total_projetos),
      totalMovimentacoes: Number(m.total_movimentacoes),
      quantidadeTotal: Number(m.quantidade_total),
      precoUnitario: Number(m.preco_unitario),
      valorTotal: Number(m.valor_total)
    })),
    
    consumoPorCategoria: consumoPorCategoria.map((c: any) => ({
      id: c.id,
      nome: c.nome,
      totalMateriais: Number(c.total_materiais),
      totalMovimentacoes: Number(c.total_movimentacoes),
      quantidadeTotal: Number(c.quantidade_total),
      valorTotal: Number(c.valor_total)
    })),
    
    consumoPorPeriodo: consumoPorPeriodo.map((p: any) => ({
      periodo: p.periodo,
      totalMateriais: Number(p.total_materiais),
      totalMovimentacoes: Number(p.total_movimentacoes),
      quantidadeTotal: Number(p.quantidade_total),
      valorTotal: Number(p.valor_total)
    }))
  };
  
  // 12. LOG SUCESSO
  logger.info('Relatório de consumo gerado', createLogContext(request, user));
  
  // 13. RESPOSTA
  return successResponse({ relatorio });
}

export const GET = withErrorHandler(handler);
