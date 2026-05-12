/**
 * /api/estoque/alertas
 * 
 * Endpoints para alertas de estoque
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  withErrorHandler,
  getPaginationParams,
  getSortParams,
  getSearchParams,
  createPrismaOrderBy,
  mergeWhereConditions,
  logger,
  createLogContext,
  forbiddenResponse
} from '@/lib/api';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

export const dynamic = 'force-dynamic';

/**
 * GET /api/estoque/alertas
 * 
 * Lista alertas de estoque
 */
async function getHandler(request: NextRequest) {
  const user = await requireUser(request);
  
  if (!can(user.role as Role, 'estoque', 'read')) {
    return forbiddenResponse('Você não tem permissão para visualizar alertas');
  }
  
  // 3. LOG
  logger.info('Listando alertas', createLogContext(request, user));
  
  // 4. PARÂMETROS
  const { skip, take, page, pageSize } = getPaginationParams(request, 20, 100);
  const { orderBy, order } = getSortParams(
    request, 
    'criadoEm',
    ['id', 'tipo', 'prioridade', 'resolvido', 'criadoEm']
  );
  const { filters } = getSearchParams(request);
  
  // 5. FILTROS CUSTOMIZADOS
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereFilters: any = {};
  
  // Filtro por tipo
  if (filters?.tipo) {
    whereFilters.tipo = filters.tipo;
  }
  
  // Filtro por prioridade
  if (filters?.prioridade) {
    whereFilters.prioridade = filters.prioridade;
  }
  
  // Filtro por status (resolvido/não resolvido)
  if (filters?.resolvido !== undefined) {
    if (filters.resolvido === 'true') {
      whereFilters.resolvidoPor = { not: null };
    } else {
      whereFilters.resolvidoPor = null;
    }
  }
  
  // Filtro por material
  if (filters?.materialId) {
    whereFilters.materialId = Number(filters.materialId);
  }
  
  // Filtro por equipamento
  if (filters?.equipamentoId) {
    whereFilters.equipamentoId = Number(filters.equipamentoId);
  }
  
  // Filtro: apenas alertas ativos (não resolvidos)
  if (filters?.apenasAtivos === 'true') {
    whereFilters.resolvidoPor = null;
  }
  
  // 6. WHERE FINAL
  const where = mergeWhereConditions(whereFilters);
  
  // 7. CONSULTA PRINCIPAL
  const [alertas, total] = await Promise.all([
    prisma.alertaEstoque.findMany({
      where,
      skip,
      take,
      orderBy: createPrismaOrderBy({ orderBy, order }),
      include: {
        material: {
          select: { id: true, codigo: true, nome: true }
        },
        equipamento: {
          select: { id: true, codigo: true, nome: true }
        }
      }
    }),
    prisma.alertaEstoque.count({ where })
  ]);
  
  // 8. ESTATÍSTICAS RÁPIDAS
  const stats = await prisma.alertaEstoque.groupBy({
    by: ['tipo', 'prioridade'],
    where: { resolvidoPor: null, ativo: true },
    _count: true
  });
  
  // 9. LOG SUCESSO
  logger.info(
    `Alertas listados: ${total} total, ${stats.length} tipos ativos`,
    createLogContext(request, user)
  );
  
  // 10. RESPOSTA
  return successResponse({
    alertas: {
      data: alertas,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    },
    estatisticas: {
       
      totalAtivos: stats.reduce((acc, s) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const count = typeof s._count === 'number' ? s._count : (s._count as any)._all || 0;
         
        return acc + count;
       
      }, 0),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      porTipo: stats.reduce((acc: any, s) => {
         
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const count = typeof s._count === 'number' ? s._count : (s._count as any)._all || 0;
         
        acc[s.tipo] = (acc[s.tipo] || 0) + count;
        return acc;
      }, {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      porPrioridade: stats.reduce((acc: any, s) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const count = typeof s._count === 'number' ? s._count : (s._count as any)._all || 0;
        acc[s.prioridade] = (acc[s.prioridade] || 0) + count;
        return acc;
      }, {})
    }
  });
}

export const GET = withErrorHandler(getHandler);

/**
 * POST /api/estoque/alertas/gerar
 * 
 * Gera alertas automáticos baseado em regras
 */
 
async function _postGenerateHandler(request: NextRequest) {
  const user = await requireUser(request);
  
  if (!can(user.role as Role, 'estoque', 'create')) {
    return forbiddenResponse('Você não tem permissão para gerar alertas');
  }
  
   
  // 3. LOG
  logger.info('Gerando alertas automáticos', createLogContext(request, user));
  
  const alertasGerados = [];
  
  // 4. ALERTA: ESTOQUE ABAIXO DO MÍNIMO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const materiaisAbaixoMinimo = await prisma.$queryRaw<any[]>`
    SELECT 
      m.id,
      m.codigo,
      m.nome,
      m.estoque_minimo,
      COALESCE(SUM(ms.quantidade), 0) as saldo_total
    FROM materiais m
    LEFT JOIN materiais_saldo ms ON ms.material_id = m.id
    WHERE m.ativo = true
    GROUP BY m.id
    HAVING saldo_total < m.estoque_minimo
  `;
  
  for (const mat of materiaisAbaixoMinimo) {
    // Verifica se já existe alerta ativo
    const alertaExistente = await prisma.alertaEstoque.findFirst({
      where: {
        tipo: mat.saldo_total === 0 ? 'ESTOQUE_ZERO' : 'ESTOQUE_MINIMO',
        materialId: mat.id,
        resolvidoPor: null,
        ativo: true
      }
    });
    
    if (!alertaExistente) {
      const alerta = await prisma.alertaEstoque.create({
        data: {
          tipo: mat.saldo_total === 0 ? 'ESTOQUE_ZERO' : 'ESTOQUE_MINIMO',
          prioridade: mat.saldo_total === 0 ? 'CRITICA' : 'ALTA',
          materialId: mat.id,
          titulo: mat.saldo_total === 0 ? `Estoque zerado: ${mat.nome}` : `Estoque abaixo do mínimo: ${mat.nome}`,
          mensagem: `Material ${mat.saldo_total === 0 ? 'sem estoque' : 'abaixo do estoque mínimo'}. Saldo atual: ${mat.saldo_total}, Mínimo: ${mat.estoque_minimo}`,
          ativo: true
        }
      });
      alertasGerados.push(alerta);
    }
  }
  
  // 5. ALERTA: EQUIPAMENTOS EM MANUTENÇÃO
  const equipamentosManutencao = await prisma.equipamento.findMany({
    where: {
      ativo: true,
      status: 'EM_MANUTENCAO'
    }
  });
  
  for (const equip of equipamentosManutencao) {
    const alertaExistente = await prisma.alertaEstoque.findFirst({
      where: {
        tipo: 'MANUTENCAO_VENCIDA',
        equipamentoId: equip.id,
        resolvidoPor: null,
        ativo: true
      }
    });
    
    if (!alertaExistente) {
      const alerta = await prisma.alertaEstoque.create({
        data: {
          tipo: 'MANUTENCAO_VENCIDA',
          prioridade: 'MEDIA',
          equipamentoId: equip.id,
          titulo: `Equipamento em manutenção: ${equip.nome}`,
          mensagem: `Equipamento está em manutenção desde ${equip.ultimaManutencao?.toLocaleDateString() || 'data desconhecida'}`,
          ativo: true
        }
      });
      alertasGerados.push(alerta);
    }
  }
  
  // 6. ALERTA: VALIDADE PRÓXIMA
  const lotesPorVencer = await prisma.materialLote.findMany({
    where: {
      dataValidade: {
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
      }
    },
    include: {
      material: {
        select: { id: true, nome: true }
      }
    }
  });
  
  for (const lote of lotesPorVencer) {
    const diasRestantes = Math.ceil((lote.dataValidade!.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const tipoAlerta = diasRestantes <= 0 ? 'VALIDADE_VENCIDA' : 'VALIDADE_PROXIMA';
    
    const alertaExistente = await prisma.alertaEstoque.findFirst({
      where: {
        tipo: tipoAlerta,
        materialId: lote.materialId,
        resolvidoPor: null,
        ativo: true
      }
    });
    
    if (!alertaExistente) {
      const alerta = await prisma.alertaEstoque.create({
        data: {
          tipo: tipoAlerta,
          prioridade: diasRestantes <= 0 ? 'CRITICA' : (diasRestantes <= 7 ? 'ALTA' : 'MEDIA'),
          materialId: lote.materialId,
          titulo: diasRestantes <= 0 
            ? `Lote vencido: ${lote.material.nome}` 
            : `Lote próximo do vencimento: ${lote.material.nome}`,
          mensagem: diasRestantes <= 0
            ? `Lote ${lote.codigoLote} vencido em ${lote.dataValidade?.toLocaleDateString()}`
            : `Lote ${lote.codigoLote} vence em ${diasRestantes} dias (${lote.dataValidade?.toLocaleDateString()})`,
          ativo: true
        }
      });
      alertasGerados.push(alerta);
    }
  }
  
  // 7. LOG SUCESSO
  logger.info(
    `Alertas gerados: ${alertasGerados.length}`,
    createLogContext(request, user),
    { totalGerados: alertasGerados.length }
  );
  
  // 8. RESPOSTA
  return successResponse({
    totalGerados: alertasGerados.length,
    alertas: alertasGerados
  }, `${alertasGerados.length} alerta(s) gerado(s) com sucesso`);
}
