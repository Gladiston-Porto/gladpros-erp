/**
 * API: COMPRAS - RECEBIMENTO
 * Arquivo: src/app/api/estoque/compras/[id]/receber/route.ts
 * 
 * Endpoint:
 * - POST /api/estoque/compras/[id]/receber - Recebe compra e atualiza estoque
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  notFoundResponse,
  businessErrorResponse,
  validationErrorResponse,
  withErrorHandler,
  requireAuth,
  EstoquePermissions,
  logger,
  ApiErrorCode,
  createLogContext,
  forbiddenResponse
} from '@/lib/api';

/**
 * POST /api/estoque/compras/[id]/receber
 * 
 * Recebe compra e atualiza estoque (cria entradas e lotes se necessário)
 * 
 * @permissao PURCHASE_ESTOQUE
 */
async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. AUTENTICAÇÃO
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;

  // 2. AUTORIZAÇÃO
  if (!user || !EstoquePermissions.PURCHASE.includes(user.papel as any)) {
    return forbiddenResponse('Você não tem permissão para receber compras');
  }

  // 3. VALIDAÇÃO ID
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  // 4. PARSE BODY
  const body = await request.json();

  // 5. VALIDAÇÃO ZOD
  const receberSchema = z.object({
    dataRecebimento: z.string().transform(val => new Date(val)),
    itensRecebidos: z.array(z.object({
      itemId: z.number().int().positive(),
      quantidadeRecebida: z.number().positive(),
      localizacaoId: z.number().int().positive(),
      lote: z.object({
        codigoLote: z.string().min(1).max(50),
        dataFabricacao: z.string().transform(val => new Date(val)).optional(),
        dataValidade: z.string().transform(val => new Date(val)).optional()
      }).optional()
    })).min(1, 'Deve informar pelo menos 1 item para receber')
  });

  const validation = receberSchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.issues.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    return validationErrorResponse(errors);
  }

  const dados = validation.data;

  // 6. LOG
  logger.info(`Recebendo compra ${id}`, createLogContext(request, user));

  // 7. BUSCA COMPRA
  const compra = await prisma.compra.findUnique({
    where: { id },
    include: {
      itens: true
    }
  });

  if (!compra) {
    return notFoundResponse('Compra não encontrada');
  }

  // 8. VALIDAÇÃO: compra não cancelada
  if (compra.status === 'CANCELADA') {
    return businessErrorResponse(
      'Não é possível receber uma compra cancelada',
      ApiErrorCode.INVALID_INPUT
    );
  }

  // 9. VALIDAÇÃO: todos itens informados existem
  const idsItensInformados = dados.itensRecebidos.map(i => i.itemId);
  const itensExistentes = compra.itens.filter(i => idsItensInformados.includes(i.id));
  
  if (itensExistentes.length !== idsItensInformados.length) {
    return validationErrorResponse([{
      field: 'itensRecebidos',
      message: 'Um ou mais itens informados não pertencem a esta compra'
    }]);
  }

  // 10. VALIDAÇÃO: itens já recebidos
  const itensJaRecebidos = itensExistentes.filter(i => i.dataRecebimento !== null);
  if (itensJaRecebidos.length > 0) {
    return businessErrorResponse(
      `${itensJaRecebidos.length} item(ns) já foi(ram) recebido(s)`,
      ApiErrorCode.INVALID_INPUT
    );
  }

  // 11. TRANSACTION: Recebe itens + atualiza estoque
  const resultado = await prisma.$transaction(async (tx) => {
    const movimentacoesCriadas = [];
    
    for (const itemReceber of dados.itensRecebidos) {
      const item = itensExistentes.find(i => i.id === itemReceber.itemId)!;
      
      // Se item é de material, criar movimentação de entrada
      if (item.tipoItem === 'MATERIAL' && item.materialId) {
        let loteId = item.loteId;
        
        // Cria lote se informado
        if (itemReceber.lote) {
          const novoLote = await tx.materialLote.create({
            data: {
              materialId: item.materialId,
              codigoLote: itemReceber.lote.codigoLote,
              dataFabricacao: itemReceber.lote.dataFabricacao,
              dataValidade: itemReceber.lote.dataValidade
            }
          });
          loteId = novoLote.id;
        }
        
        // Cria movimentação de entrada
        const movimentacao = await tx.materialMovimentacao.create({
          data: {
            materialId: item.materialId,
            tipo: 'ENTRADA',
            quantidade: itemReceber.quantidadeRecebida,
            localizacaoDestinoId: itemReceber.localizacaoId,
            loteId,
            motivo: `Entrada via compra ${compra.numeroNf || id}`,
            criadoPor: user.id
          }
        });
        
        movimentacoesCriadas.push(movimentacao);
        
        // Atualiza saldo
        await tx.materialSaldo.upsert({
          where: {
            materialId_loteId_localizacaoId: {
              materialId: item.materialId,
              loteId: loteId || 0,
              localizacaoId: itemReceber.localizacaoId
            }
          },
          create: {
            materialId: item.materialId,
            loteId,
            localizacaoId: itemReceber.localizacaoId,
            quantidade: itemReceber.quantidadeRecebida
          },
          update: {
            quantidade: {
              increment: itemReceber.quantidadeRecebida
            }
          }
        });
      }
      
      // Se item é equipamento, apenas registra recebimento
      // (equipamentos são cadastrados individualmente)
      
      // Marca item como recebido
      await tx.compraItem.update({
        where: { id: item.id },
        data: {
          dataRecebimento: dados.dataRecebimento,
          recebidoPor: user.id
        }
      });
    }
    
    // Verifica se todos itens foram recebidos
    const todosItensAtualizados = await tx.compraItem.findMany({
      where: { compraId: id }
    });
    
    const todosRecebidos = todosItensAtualizados.every(i => i.dataRecebimento !== null);
    
    // Atualiza status da compra
    await tx.compra.update({
      where: { id },
      data: {
        status: todosRecebidos ? 'RECEBIDA' : 'PARCIAL',
        dataEntrega: dados.dataRecebimento
      }
    });
    
    return {
      compra: await tx.compra.findUnique({
        where: { id },
        include: {
          itens: true,
          fornecedor: {
            select: {
              id: true,
              nome: true
            }
          }
        }
      }),
      movimentacoes: movimentacoesCriadas.length
    };
  });

  // 12. LOG SUCESSO
  logger.info(
    `Compra ${id} recebida: ${dados.itensRecebidos.length} itens, ${resultado.movimentacoes} movimentações`,
    createLogContext(request, user)
  );

  // 13. RESPOSTA
  return successResponse(
    {
      compra: resultado.compra,
      itensRecebidos: dados.itensRecebidos.length,
      movimentacoesCriadas: resultado.movimentacoes
    },
    `Compra recebida com sucesso: ${dados.itensRecebidos.length} item(ns)`
  );
}

export const POST = withErrorHandler(handler);
