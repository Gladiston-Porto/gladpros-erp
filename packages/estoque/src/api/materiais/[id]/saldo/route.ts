/**
 * GET /api/estoque/materiais/[id]/saldo
 * 
 * Obtém saldo do material por localização
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  notFoundResponse,
  withErrorHandler,
  requireAuth,
  EstoquePermissions,
  logger,
  createLogContext,
  forbiddenResponse
} from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * Handler GET
 */
async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. AUTENTICAÇÃO
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;
  
  // 2. AUTORIZAÇÃO
  if (!user || !EstoquePermissions.VIEW.includes(user.papel as any)) {
    return forbiddenResponse('Você não tem permissão para visualizar saldos');
  }
  
  // 3. LOG
  logger.info(`Consultando saldo material ${params.id}`, createLogContext(request, user));
  
  // 4. VERIFICA SE MATERIAL EXISTE
  const material = await prisma.material.findUnique({
    where: { id: parseInt(params.id) },
    select: {
      id: true,
      codigo: true,
      nome: true,
      unidade: {
        select: { id: true, codigo: true, nome: true }
      },
      estoqueMinimo: true,
      pontoReposicao: true
    }
  });
  
  if (!material) {
    return notFoundResponse('Material');
  }
  
  // 5. BUSCA SALDOS POR LOCALIZAÇÃO
  const saldos = await prisma.materialSaldo.findMany({
    where: { materialId: material.id },
    include: {
      localizacao: {
        select: {
          id: true,
          nome: true,
          tipo: true,
          codigo: true
        }
      }
    },
    orderBy: [
      { quantidade: 'desc' },
      { localizacao: { nome: 'asc' } }
    ]
  });
  
  // 6. CALCULA TOTAIS
  const saldoTotal = saldos.reduce((acc, s) => acc + Number(s.quantidade), 0);
  const saldoDisponivel = saldos
    .filter(s => !s.reservado)
    .reduce((acc, s) => acc + Number(s.quantidade), 0);
  const saldoReservado = saldos
    .filter(s => s.reservado)
    .reduce((acc, s) => acc + Number(s.quantidade), 0);
  
  // 7. BUSCA LOTES POR LOCALIZAÇÃO (se rastreia lote)
  let lotesPorLocalizacao: any[] = [];
  if (saldos.some(s => s.loteId)) {
    const lotes = await prisma.materialLote.findMany({
      where: {
        materialId: material.id,
        id: { in: saldos.filter(s => s.loteId).map(s => s.loteId!) }
      },
      select: {
        id: true,
        codigoLote: true,
        dataFabricacao: true,
        dataValidade: true
      }
    });
    
    lotesPorLocalizacao = saldos
      .filter(s => s.loteId)
      .map(s => ({
        localizacaoId: s.localizacaoId,
        localizacao: s.localizacao.nome,
        lote: lotes.find(l => l.id === s.loteId),
        quantidade: Number(s.quantidade),
        reservado: s.reservado
      }));
  }
  
  // 8. LOG SUCESSO
  logger.info(
    `Saldo consultado: ${material.nome} - Total: ${saldoTotal}`,
    createLogContext(request, user),
    { materialId: material.id, saldoTotal }
  );
  
  // 9. RESPOSTA
  return successResponse({
    material: {
      id: material.id,
      codigo: material.codigo,
      nome: material.nome,
      unidade: material.unidade,
      estoqueMinimo: Number(material.estoqueMinimo),
      pontoReposicao: Number(material.pontoReposicao)
    },
    resumo: {
      saldoTotal,
      saldoDisponivel,
      saldoReservado,
      localizacoesComEstoque: saldos.filter(s => Number(s.quantidade) > 0).length,
      abaixoMinimo: saldoTotal < Number(material.estoqueMinimo),
      abaixoPontoReposicao: saldoTotal < Number(material.pontoReposicao)
    },
    saldosPorLocalizacao: saldos.map(s => ({
      localizacaoId: s.localizacaoId,
      localizacao: {
        id: s.localizacao.id,
        nome: s.localizacao.nome,
        tipo: s.localizacao.tipo,
        codigo: s.localizacao.codigo
      },
      quantidade: Number(s.quantidade),
      reservado: s.reservado,
      loteId: s.loteId,
      atualizadoEm: s.atualizadoEm
    })),
    lotesPorLocalizacao
  });
}

export const GET = withErrorHandler(handler);
