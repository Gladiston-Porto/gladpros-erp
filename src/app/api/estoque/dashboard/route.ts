/**
 * API: DASHBOARD ESTOQUE
 * Arquivo: src/app/api/estoque/dashboard/route.ts
 * 
 * Endpoint:
 * - GET /api/estoque/dashboard - Métricas gerais do estoque
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  withErrorHandler,
  logger,
  createLogContext,
  forbiddenResponse
} from '@/lib/api';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

export const dynamic = 'force-dynamic';

/**
 * GET /api/estoque/dashboard
 * 
 * Retorna métricas e indicadores gerais do estoque
 * 
 * @permissao VIEW_ESTOQUE
 */
async function handler(request: NextRequest) {
  // 1. AUTENTICAÇÃO
  try {
    const user = await requireUser(request);
    
    // 2. AUTORIZAÇÃO
    if (!can(user.role as Role, 'estoque', 'read')) {
      return forbiddenResponse('Você não tem permissão para visualizar o dashboard');
    }
  
  // 3. LOG
  logger.info('Carregando dashboard estoque', createLogContext(request, user as any));
  
  // 4. CONSULTAS PARALELAS
  const [
    // Materiais
    totalMateriais,
    materiaisAtivos,
    materiaisAbaixoMinimo,
    saldoTotalResult,
    valorTotalEstoqueResult,
    
    // Equipamentos
    totalEquipamentos,
    equipamentosDisponiveis,
    equipamentosEmUso,
    equipamentosManutencao,
    valorTotalEquipamentosResult,
    
    // Alertas
    alertasAtivos,
    alertasCriticos,
    
    // Movimentações (últimos 30 dias)
    movimentacoesUltimos30Dias,
    
    // Compras (últimos 30 dias)
    comprasUltimos30Dias,
    valorComprasUltimos30Dias,
    
    // Localizações
    totalLocalizacoes,
    
    // Fornecedores ativos
    fornecedoresAtivos
  ] = await Promise.all([
    // Materiais
    prisma.material.count(),
    prisma.material.count({ where: { ativo: true } }),
    prisma.$queryRaw<any[]>`
      SELECT COUNT(DISTINCT m.id) as total
      FROM materiais m
      LEFT JOIN materiais_saldo ms ON ms.material_id = m.id
      WHERE m.ativo = true
      GROUP BY m.id
      HAVING COALESCE(SUM(ms.quantidade), 0) < m.estoque_minimo
    `,
    prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(quantidade), 0) as total
      FROM materiais_saldo
    `,
    prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(m.preco_unitario * ms.quantidade), 0) as total
      FROM materiais m
      INNER JOIN materiais_saldo ms ON ms.material_id = m.id
      WHERE m.ativo = true
    `,
    
    // Equipamentos
    prisma.equipamento.count(),
    prisma.equipamento.count({ where: { status: 'DISPONIVEL', ativo: true } }),
    prisma.equipamento.count({ where: { status: 'EM_USO' } }),
    prisma.equipamento.count({ where: { status: 'EM_MANUTENCAO' } }),
    prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(valor_aquisicao), 0) as total
      FROM equipamentos
      WHERE ativo = true
    `,
    
    // Alertas
    prisma.alertaEstoque.count({ where: { ativo: true, resolvidoPor: null } }),
    prisma.alertaEstoque.count({ where: { ativo: true, resolvidoPor: null, prioridade: 'CRITICA' } }),
    
    // Movimentações
    prisma.materialMovimentacao.count({
      where: {
        criadoEm: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    }),
    
    // Compras
    prisma.compra.count({
      where: {
        dataCompra: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    }),
    prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(valor_total), 0) as total
      FROM compras
      WHERE data_compra >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `,
    
    // Localizações
    prisma.localizacao.count({ where: { ativo: true } }),
    
    // Fornecedores
    prisma.fornecedor.count({ where: { ativo: true } })
  ]);
  
  // 5. PROCESSAMENTO DOS RESULTADOS
  const materiaisAbaixoMinimoCount = materiaisAbaixoMinimo.length > 0 ? Number(materiaisAbaixoMinimo[0].total) : 0;
  const saldoTotal = saldoTotalResult.length > 0 ? Number(saldoTotalResult[0].total) : 0;
  const valorTotalEstoque = valorTotalEstoqueResult.length > 0 ? Number(valorTotalEstoqueResult[0].total) : 0;
  const valorTotalEquipamentos = valorTotalEquipamentosResult.length > 0 ? Number(valorTotalEquipamentosResult[0].total) : 0;
  const valorCompras30Dias = valorComprasUltimos30Dias.length > 0 ? Number(valorComprasUltimos30Dias[0].total) : 0;
  
  // 6. CONSULTA: Top 5 materiais mais movimentados (últimos 30 dias)
  const topMateriaisMovimentados = await prisma.$queryRaw<any[]>`
    SELECT 
      m.id,
      m.codigo,
      m.nome,
      COUNT(mm.id) as total_movimentacoes,
      SUM(CASE WHEN mm.tipo = 'SAIDA' THEN mm.quantidade ELSE 0 END) as total_saidas
    FROM materiais m
    INNER JOIN materiais_movimentacoes mm ON mm.material_id = m.id
    WHERE mm.criado_em >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY m.id
    ORDER BY total_movimentacoes DESC
    LIMIT 5
  `;
  
  // 7. CONSULTA: Top 5 equipamentos mais alocados
  const topEquipamentosAlocados = await prisma.$queryRaw<any[]>`
    SELECT 
      e.id,
      e.codigo,
      e.nome,
      COUNT(pe.id) as total_alocacoes,
      SUM(DATEDIFF(
        COALESCE(pe.data_devolucao_real, CURDATE()),
        pe.data_alocacao
      )) as total_dias_uso
    FROM equipamentos e
    INNER JOIN projetos_equipamentos pe ON pe.equipamento_id = e.id
    GROUP BY e.id
    ORDER BY total_alocacoes DESC
    LIMIT 5
  `;
  
  // 8. CONSULTA: Movimentações por tipo (últimos 30 dias)
  const movimentacoesPorTipo = await prisma.materialMovimentacao.groupBy({
    by: ['tipo'],
    where: {
      criadoEm: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    },
    _count: true,
    _sum: {
      quantidade: true
    }
  });
  
  // 9. CONSULTA: Alertas por tipo
  const alertasPorTipo = await prisma.alertaEstoque.groupBy({
    by: ['tipo', 'prioridade'],
    where: {
      ativo: true,
      resolvidoPor: null
    },
    _count: true
  });
  
  // 10. MONTAGEM DO DASHBOARD
  const dashboard = {
    // RESUMO GERAL
    resumo: {
      totalMateriais,
      materiaisAtivos,
      materiaisAbaixoMinimo: materiaisAbaixoMinimoCount,
      saldoTotalMateriais: saldoTotal,
      valorTotalEstoque,
      
      totalEquipamentos,
      equipamentosDisponiveis,
      equipamentosEmUso,
      equipamentosEmManutencao: equipamentosManutencao,
      valorTotalEquipamentos,
      
      alertasAtivos,
      alertasCriticos,
      
      totalLocalizacoes,
      fornecedoresAtivos
    },
    
    // ATIVIDADES RECENTES (30 DIAS)
    atividadesRecentes: {
      movimentacoes: movimentacoesUltimos30Dias,
      compras: comprasUltimos30Dias,
      valorCompras: valorCompras30Dias
    },
    
    // TOP ITENS
    topItens: {
      materiaisMaisMovimentados: topMateriaisMovimentados.map((m: any) => ({
        id: m.id,
        codigo: m.codigo,
        nome: m.nome,
        totalMovimentacoes: Number(m.total_movimentacoes),
        totalSaidas: Number(m.total_saidas)
      })),
      equipamentosMaisAlocados: topEquipamentosAlocados.map((e: any) => ({
        id: e.id,
        codigo: e.codigo,
        nome: e.nome,
        totalAlocacoes: Number(e.total_alocacoes),
        totalDiasUso: Number(e.total_dias_uso)
      }))
    },
    
    // ESTATÍSTICAS
    estatisticas: {
      movimentacoesPorTipo: movimentacoesPorTipo.map(m => ({
        tipo: m.tipo,
        quantidade: m._count,
        totalQuantidade: Number(m._sum.quantidade || 0)
      })),
      alertasPorTipo: alertasPorTipo.reduce((acc: any, a) => {
        if (!acc[a.tipo]) acc[a.tipo] = {};
        const count = typeof a._count === 'number' ? a._count : (a._count as any)._all || 0;
        acc[a.tipo][a.prioridade] = count;
        return acc;
      }, {})
    },
    
    // INDICADORES
    indicadores: {
      percentualMateriaisAbaixoMinimo: totalMateriais > 0 
        ? ((materiaisAbaixoMinimoCount / totalMateriais) * 100).toFixed(2) 
        : 0,
      percentualEquipamentosDisponiveis: totalEquipamentos > 0
        ? ((equipamentosDisponiveis / totalEquipamentos) * 100).toFixed(2)
        : 0,
      percentualEquipamentosEmUso: totalEquipamentos > 0
        ? ((equipamentosEmUso / totalEquipamentos) * 100).toFixed(2)
        : 0,
      mediaMovimentacoesDia: (movimentacoesUltimos30Dias / 30).toFixed(2),
      mediaComprasDia: (comprasUltimos30Dias / 30).toFixed(2)
    }
  };
  
  // 11. LOG SUCESSO
  logger.info('Dashboard carregado', createLogContext(request, user as any));
  
  // 12. RESPOSTA
  return successResponse({ dashboard });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });
    }
    throw error;
  }
}

export const GET = withErrorHandler(handler);
