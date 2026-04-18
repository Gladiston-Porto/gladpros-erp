/**
 * API: COMPRAS - DETALHES E ATUALIZAÇÃO
 * Arquivo: src/app/api/estoque/compras/[id]/route.ts
 * 
 * Endpoints:
 * - GET /api/estoque/compras/[id] - Detalhes da compra
 * - PUT /api/estoque/compras/[id] - Atualiza compra
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  notFoundResponse,
  validationErrorResponse,
  businessErrorResponse,
  withErrorHandler,
  requireAuth,
  EstoquePermissions,
  logger,
  ApiErrorCode,
  createLogContext,
  forbiddenResponse
} from '@/lib/api';

/**
 * GET /api/estoque/compras/[id]
 * 
 * Retorna detalhes completos da compra
 * 
 * @permissao VIEW_ESTOQUE
 */
async function getHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. AUTENTICAÇÃO
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;

  // 2. AUTORIZAÇÃO
  if (!user || !EstoquePermissions.VIEW.includes(user.papel as any)) {
    return forbiddenResponse('Você não tem permissão para visualizar compras');
  }

  // 3. VALIDAÇÃO ID
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  // 4. LOG
  logger.info(`Buscando compra ${id}`, createLogContext(request, user));

  // 5. BUSCA NO BANCO
  const compra = await prisma.compra.findUnique({
    where: { id },
    include: {
      fornecedor: true,
      projeto: {
        select: {
          id: true,
          numeroProjeto: true,
          titulo: true,
          status: true
        }
      },
      itens: {
        include: {
          material: {
            select: {
              id: true,
              codigo: true,
              nome: true,
              unidade: { select: { codigo: true } }
            }
          },
          equipamento: {
            select: {
              id: true,
              codigo: true,
              nome: true
            }
          },
          lote: {
            select: {
              id: true,
              codigoLote: true,
              dataFabricacao: true,
              dataValidade: true
            }
          },
          recebedor: {
            select: {
              id: true,
              nomeCompleto: true
            }
          }
        }
      },
      criador: {
        select: {
          id: true,
          nomeCompleto: true,
          email: true
        }
      }
    }
  });

  // 6. VALIDAÇÃO EXISTÊNCIA
  if (!compra) {
    return notFoundResponse('Compra não encontrada');
  }

  // 7. ENRIQUECIMENTO
  const compraEnriquecida = {
    ...compra,
    totalItens: compra.itens.length,
    itensRecebidos: compra.itens.filter(i => i.dataRecebimento !== null).length,
    diasDesdeCompra: Math.ceil((Date.now() - compra.dataCompra.getTime()) / (1000 * 60 * 60 * 24)),
    totalmenteRecebida: compra.itens.every(i => i.dataRecebimento !== null)
  };

  // 8. LOG SUCESSO
  logger.info(`Compra ${id} encontrada`, createLogContext(request, user));

  // 9. RESPOSTA
  return successResponse({ compra: compraEnriquecida });
}

/**
 * PUT /api/estoque/compras/[id]
 * 
 * Atualiza dados da compra (apenas se não recebida)
 * 
 * @permissao PURCHASE_ESTOQUE
 */
async function putHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. AUTENTICAÇÃO
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;

  // 2. AUTORIZAÇÃO
  if (!user || !EstoquePermissions.PURCHASE.includes(user.papel as any)) {
    return forbiddenResponse('Você não tem permissão para atualizar compras');
  }

  // 3. VALIDAÇÃO ID
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  // 4. PARSE BODY
  const body = await request.json();

  // 5. VALIDAÇÃO ZOD (parcial)
  const updateSchema = z.object({
    fornecedorId: z.number().int().positive().optional(),
    numeroNf: z.string().max(60).optional(),
    dataCompra: z.string().transform(val => new Date(val)).optional(),
    dataEntrega: z.string().transform(val => new Date(val)).optional(),
    valorTotal: z.number().positive().optional(),
    desconto: z.number().optional(),
    frete: z.number().optional(),
    formaPagamento: z.string().max(60).optional(),
    status: z.enum(['PENDENTE', 'APROVADA', 'CANCELADA', 'RECEBIDA']).optional(),
    observacoes: z.string().optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser fornecido para atualização'
  });

  const validation = updateSchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.issues.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    return validationErrorResponse(errors);
  }

  const dados = validation.data;

  // 6. LOG
  logger.info(`Atualizando compra ${id}`, createLogContext(request, user));

  // 7. VERIFICA EXISTÊNCIA
  const compraExistente = await prisma.compra.findUnique({
    where: { id },
    include: {
      itens: true
    }
  });

  if (!compraExistente) {
    return notFoundResponse('Compra não encontrada');
  }

  // 8. VALIDAÇÃO: não permite atualizar se já recebida
  const algumItemRecebido = compraExistente.itens.some(i => i.dataRecebimento !== null);
  if (algumItemRecebido && dados.status !== 'CANCELADA') {
    return businessErrorResponse(
      'Não é possível atualizar uma compra que já teve itens recebidos',
      ApiErrorCode.INVALID_INPUT
    );
  }

  // 9. ATUALIZAÇÃO
  const compra = await prisma.compra.update({
    where: { id },
    data: dados as any,
    include: {
      fornecedor: {
        select: {
          id: true,
          nome: true,
          documento: true
        }
      },
      projeto: {
        select: {
          id: true,
          numeroProjeto: true,
          titulo: true
        }
      },
      itens: {
        include: {
          material: {
            select: {
              id: true,
              codigo: true,
              nome: true
            }
          }
        }
      }
    }
  });

  // 10. LOG SUCESSO
  logger.info(
    `Compra ${id} atualizada`,
    createLogContext(request, user)
  );

  // 11. RESPOSTA
  return successResponse(
    { compra },
    'Compra atualizada com sucesso'
  );
}

export const GET = withErrorHandler(getHandler);
export const PUT = withErrorHandler(putHandler);
