/**
 * API: RELATÓRIOS - INVENTÁRIO
 * Arquivo: src/app/api/estoque/relatorios/inventario/route.ts
 * 
 * Endpoint:
 * - GET /api/estoque/relatorios/inventario - Relatório completo de inventário
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
 * GET /api/estoque/relatorios/inventario
 * 
 * Relatório completo de inventário (materiais + equipamentos)
 * 
 * @permissao VIEW_ESTOQUE
 * @query categoriaId, localizacaoId, apenasAtivos, incluirValores
 */
async function handler(request: NextRequest) {
  const user = await requireUser(request);
  
  if (!can(user.role as Role, 'estoque', 'read')) {
    return forbiddenResponse('Você não tem permissão para visualizar relatórios');
  }
  
  // 3. PARÂMETROS
  const { filters } = getSearchParams(request);
  
  const categoriaId = filters?.categoriaId ? Number(filters.categoriaId) : undefined;
  const localizacaoId = filters?.localizacaoId ? Number(filters.localizacaoId) : undefined;
  const apenasAtivos = filters?.apenasAtivos !== 'false'; // Default true
  const incluirValores = filters?.incluirValores === 'true'; // Default false
  
  // 4. LOG
  logger.info('Gerando relatório de inventário', createLogContext(request, user), {
    categoriaId,
    localizacaoId,
    apenasAtivos
  });
  
  // 5. INVENTÁRIO DE MATERIAIS POR LOCALIZAÇÃO
  const inventarioMateriais = await prisma.$queryRaw<any[]>`
    SELECT 
      m.id,
      m.codigo,
      m.nome,
      c.nome as categoria,
      u.sigla as unidade,
      l.id as localizacao_id,
      l.nome as localizacao,
      COALESCE(ms.quantidade, 0) as saldo,
      m.estoque_minimo,
      m.ponto_reposicao,
      ${incluirValores ? 'm.preco_unitario,' : ''}
      ${incluirValores ? 'COALESCE(ms.quantidade * m.preco_unitario, 0) as valor_total,' : ''}
      CASE 
        WHEN COALESCE(ms.quantidade, 0) = 0 THEN 'ZERADO'
        WHEN COALESCE(ms.quantidade, 0) < m.estoque_minimo THEN 'ABAIXO_MINIMO'
        WHEN COALESCE(ms.quantidade, 0) < m.ponto_reposicao THEN 'ABAIXO_REPOSICAO'
        ELSE 'NORMAL'
      END as status_estoque
    FROM materiais m
    LEFT JOIN categorias c ON c.id = m.categoria_id
    LEFT JOIN unidades u ON u.id = m.unidade_id
    LEFT JOIN materiais_saldo ms ON ms.material_id = m.id
    LEFT JOIN localizacoes l ON l.id = ms.localizacao_id
    WHERE ${apenasAtivos ? Prisma.sql`m.ativo = true` : Prisma.sql`1=1`}
      ${categoriaId ? Prisma.sql`AND m.categoria_id = ${categoriaId}` : Prisma.empty}
      ${localizacaoId ? Prisma.sql`AND l.id = ${localizacaoId}` : Prisma.empty}
    ORDER BY m.codigo, l.nome
  `;
  
  // 6. INVENTÁRIO DE EQUIPAMENTOS
  const inventarioEquipamentos = await prisma.equipamento.findMany({
    where: {
      ...(apenasAtivos ? { ativo: true } : {}),
      ...(categoriaId ? { categoriaId } : {})
    },
    include: {
      categoria: {
        select: {
          id: true,
          nome: true
        }
      },
      fornecedor: {
        select: {
          id: true,
          nome: true
        }
      }
    },
    orderBy: {
      codigo: 'asc'
    }
  });
  
  // 7. RESUMO POR CATEGORIA (MATERIAIS)
  const resumoMateriaisPorCategoria = await prisma.$queryRaw<any[]>`
    SELECT 
      c.id,
      c.nome,
      COUNT(DISTINCT m.id) as total_materiais,
      COUNT(DISTINCT ms.localizacao_id) as total_localizacoes,
      SUM(COALESCE(ms.quantidade, 0)) as quantidade_total,
      ${incluirValores ? 'SUM(COALESCE(ms.quantidade * m.preco_unitario, 0)) as valor_total,' : ''}
      SUM(CASE WHEN COALESCE(ms.quantidade, 0) < m.estoque_minimo THEN 1 ELSE 0 END) as materiais_abaixo_minimo
    FROM categorias c
    INNER JOIN materiais m ON m.categoria_id = c.id
    LEFT JOIN materiais_saldo ms ON ms.material_id = m.id
    WHERE ${apenasAtivos ? Prisma.sql`m.ativo = true` : Prisma.sql`1=1`}
      ${categoriaId ? Prisma.sql`AND c.id = ${categoriaId}` : Prisma.empty}
    GROUP BY c.id
    ORDER BY c.nome
  `;
  
  // 8. RESUMO POR LOCALIZAÇÃO (MATERIAIS)
  const resumoMateriaisPorLocalizacao = await prisma.$queryRaw<any[]>`
    SELECT 
      l.id,
      l.nome,
      l.tipo,
      COUNT(DISTINCT ms.material_id) as total_materiais,
      SUM(ms.quantidade) as quantidade_total,
      ${incluirValores ? 'SUM(ms.quantidade * m.preco_unitario) as valor_total,' : ''}
      COUNT(CASE WHEN ms.quantidade < m.estoque_minimo THEN 1 END) as materiais_abaixo_minimo
    FROM localizacoes l
    INNER JOIN materiais_saldo ms ON ms.localizacao_id = l.id
    INNER JOIN materiais m ON m.id = ms.material_id
    WHERE l.ativo = true
      ${categoriaId ? Prisma.sql`AND m.categoria_id = ${categoriaId}` : Prisma.empty}
      ${localizacaoId ? Prisma.sql`AND l.id = ${localizacaoId}` : Prisma.empty}
    GROUP BY l.id
    ORDER BY l.nome
  `;
  
  // 9. RESUMO EQUIPAMENTOS POR CATEGORIA
  const resumoEquipamentosPorCategoria = await prisma.equipamento.groupBy({
    by: ['categoriaId', 'status'],
    where: {
      ...(apenasAtivos ? { ativo: true } : {}),
      ...(categoriaId ? { categoriaId } : {})
    },
    _count: true
  });
  
  // 10. RESUMO EQUIPAMENTOS POR STATUS
  const resumoEquipamentosPorStatus = await prisma.equipamento.groupBy({
    by: ['status'],
    where: {
      ...(apenasAtivos ? { ativo: true } : {})
    },
    _count: true
  });
  
  // 11. TOTAIS GERAIS
  const totaisGerais = await prisma.$queryRaw<any[]>`
    SELECT 
      (SELECT COUNT(*) FROM materiais WHERE ${apenasAtivos ? 'ativo = true' : '1=1'}) as total_materiais,
      (SELECT COUNT(*) FROM equipamentos WHERE ${apenasAtivos ? 'ativo = true' : '1=1'}) as total_equipamentos,
      (SELECT COUNT(DISTINCT localizacao_id) FROM materiais_saldo) as total_localizacoes_com_estoque,
      (SELECT SUM(quantidade) FROM materiais_saldo) as quantidade_total_materiais,
      ${incluirValores ? `
        (SELECT SUM(ms.quantidade * m.preco_unitario) 
         FROM materiais_saldo ms 
         INNER JOIN materiais m ON m.id = ms.material_id 
         WHERE ${apenasAtivos ? 'm.ativo = true' : '1=1'}) as valor_total_materiais,
        (SELECT SUM(valor_aquisicao) 
         FROM equipamentos 
         WHERE ${apenasAtivos ? 'ativo = true' : '1=1'}) as valor_total_equipamentos,
      ` : ''}
      (SELECT COUNT(*) 
       FROM materiais m 
       LEFT JOIN materiais_saldo ms ON ms.material_id = m.id 
       WHERE ${apenasAtivos ? 'm.ativo = true' : '1=1'}
       GROUP BY m.id 
       HAVING COALESCE(SUM(ms.quantidade), 0) < m.estoque_minimo) as materiais_abaixo_minimo,
      (SELECT COUNT(*) FROM equipamentos WHERE status = 'DISPONIVEL' AND ${apenasAtivos ? 'ativo = true' : '1=1'}) as equipamentos_disponiveis,
      (SELECT COUNT(*) FROM equipamentos WHERE status = 'EM_USO') as equipamentos_em_uso
  `;
  
  // 12. FORMATAÇÃO DOS RESULTADOS
  const relatorio = {
    parametros: {
      categoriaId,
      localizacaoId,
      apenasAtivos,
      incluirValores,
      dataGeracao: new Date()
    },
    
    totaisGerais: totaisGerais.length > 0 ? {
      totalMateriais: Number(totaisGerais[0].total_materiais),
      totalEquipamentos: Number(totaisGerais[0].total_equipamentos),
      totalLocalizacoesComEstoque: Number(totaisGerais[0].total_localizacoes_com_estoque),
      quantidadeTotalMateriais: Number(totaisGerais[0].quantidade_total_materiais),
      ...(incluirValores ? {
        valorTotalMateriais: Number(totaisGerais[0].valor_total_materiais),
        valorTotalEquipamentos: Number(totaisGerais[0].valor_total_equipamentos),
        valorTotalInventario: Number(totaisGerais[0].valor_total_materiais) + Number(totaisGerais[0].valor_total_equipamentos)
      } : {}),
      materiaisAbaixoMinimo: Number(totaisGerais[0].materiais_abaixo_minimo),
      equipamentosDisponiveis: Number(totaisGerais[0].equipamentos_disponiveis),
      equipamentosEmUso: Number(totaisGerais[0].equipamentos_em_uso)
    } : null,
    
    inventarioMateriais: inventarioMateriais.map((m: any) => ({
      id: m.id,
      codigo: m.codigo,
      nome: m.nome,
      categoria: m.categoria,
      unidade: m.unidade,
      localizacaoId: m.localizacao_id,
      localizacao: m.localizacao,
      saldo: Number(m.saldo),
      estoqueMinimo: Number(m.estoque_minimo),
      pontoReposicao: Number(m.ponto_reposicao),
      ...(incluirValores ? {
        precoUnitario: Number(m.preco_unitario),
        valorTotal: Number(m.valor_total)
      } : {}),
      statusEstoque: m.status_estoque
    })),
    
    inventarioEquipamentos: inventarioEquipamentos.map((e: any) => ({
      id: e.id,
      codigo: e.codigo,
      nome: e.nome,
      numeroSerie: e.numeroSerie,
      categoria: e.categoria?.nome,
      fornecedor: e.fornecedor?.nome,
      status: e.status,
      dataAquisicao: e.dataAquisicao,
      ...(incluirValores ? {
        valorAquisicao: Number(e.valorAquisicao)
      } : {})
    })),
    
    resumoPorCategoria: {
      materiais: resumoMateriaisPorCategoria.map((c: any) => ({
        id: c.id,
        nome: c.nome,
        totalMateriais: Number(c.total_materiais),
        totalLocalizacoes: Number(c.total_localizacoes),
        quantidadeTotal: Number(c.quantidade_total),
        ...(incluirValores ? {
          valorTotal: Number(c.valor_total)
        } : {}),
        materiaisAbaixoMinimo: Number(c.materiais_abaixo_minimo)
      })),
      equipamentos: Object.entries(
        resumoEquipamentosPorCategoria.reduce((acc: any, e) => {
          const catId = e.categoriaId || 0;
          if (!acc[catId]) {
            acc[catId] = { categoriaId: catId, porStatus: {} };
          }
          const count = typeof e._count === 'number' ? e._count : (e._count as any)._all || 0;
          acc[catId].porStatus[e.status] = count;
          return acc;
        }, {})
      ).map(([id, data]: any) => data)
    },
    
    resumoPorLocalizacao: resumoMateriaisPorLocalizacao.map((l: any) => ({
      id: l.id,
      nome: l.nome,
      tipo: l.tipo,
      totalMateriais: Number(l.total_materiais),
      quantidadeTotal: Number(l.quantidade_total),
      ...(incluirValores ? {
        valorTotal: Number(l.valor_total)
      } : {}),
      materiaisAbaixoMinimo: Number(l.materiais_abaixo_minimo)
    })),
    
    resumoPorStatus: {
      equipamentos: resumoEquipamentosPorStatus.map((s: any) => {
        const count = typeof s._count === 'number' ? s._count : (s._count as any)._all || 0;
        return {
          status: s.status,
          total: count
        };
      })
    }
  };
  
  // 13. LOG SUCESSO
  logger.info('Relatório de inventário gerado', createLogContext(request, user));
  
  // 14. RESPOSTA
  return successResponse({ relatorio });
}

export const GET = withErrorHandler(handler);
