/**
 * POST /api/estoque/equipamentos/[id]/devolver
 * 
 * Devolve equipamento de um projeto
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  notFoundResponse,
  withErrorHandler,
  logger,
  createLogContext,
  forbiddenResponse,
  businessErrorResponse,
  ApiErrorCode
} from '@/lib/api';
import { z } from 'zod';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

export const dynamic = 'force-dynamic';

// Schema de validação para devolução
const devolverSchema = z.object({
  dataDevolucaoReal: z.string().optional(),
  condicaoRetorno: z.enum(['EXCELENTE', 'BOM', 'REGULAR', 'RUIM', 'DANIFICADO']).optional(),
  observacoes: z.string().max(500).optional()
});

/**
 * Handler POST
 */
async function handler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const user = await requireUser(request);

  if (!can(user.role as Role, 'estoque', 'update')) {
    return forbiddenResponse('Você não tem permissão para devolver equipamentos');
  }
  
  // 3. LOG
  logger.info(`Devolvendo equipamento ${params.id}`, createLogContext(request, user));
  
  // 4. VALIDAÇÃO DO BODY
  const body = await request.json();
  const validated = devolverSchema.parse(body);
  
  // 5. BUSCA EQUIPAMENTO
  const equipamento = await prisma.equipamento.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      projetoAtual: {
        select: { id: true }
      }
    }
  });
  
  if (!equipamento) {
    return notFoundResponse('Equipamento');
  }
  
  // 6. VERIFICA SE ESTÁ EM USO
  if (equipamento.status !== 'EM_USO') {
    return businessErrorResponse(
      `Equipamento não está em uso (status: ${equipamento.status})`,
      ApiErrorCode.VALIDATION_ERROR,
      { status: equipamento.status }
    );
  }
  
  if (!equipamento.projetoAtualId) {
    return businessErrorResponse(
      'Equipamento não está alocado para nenhum projeto',
      ApiErrorCode.VALIDATION_ERROR
    );
  }
  
  // 7. BUSCA ALOCAÇÃO ATIVA
  const alocacaoAtiva = await prisma.projetoEquipamento.findFirst({
    where: {
      equipamentoId: equipamento.id,
      projetoId: equipamento.projetoAtualId,
      status: { in: ['ALOCADO', 'EM_USO'] }
    },
    orderBy: { dataAlocacao: 'desc' }
  });
  
  if (!alocacaoAtiva) {
    return businessErrorResponse(
      'Alocação ativa não encontrada',
      ApiErrorCode.NOT_FOUND
    );
  }
  
  // 8. ATUALIZA ALOCAÇÃO E EQUIPAMENTO
  const dataDevolucaoReal = validated.dataDevolucaoReal ? new Date(validated.dataDevolucaoReal) : new Date();
  
  const [alocacaoAtualizada] = await prisma.$transaction([
    // Atualiza registro de alocação
    prisma.projetoEquipamento.update({
      where: { id: alocacaoAtiva.id },
      data: {
        status: 'DEVOLVIDO',
        dataDevolucaoReal,
         
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        condicaoRetorno: validated.condicaoRetorno as any,
        condicaoRetornoObs: validated.observacoes
      },
      include: {
        projeto: {
          select: { id: true }
        },
        equipamento: {
          select: { id: true, nome: true, codigo: true }
        },
        criador: {
          select: { id: true, nomeCompleto: true }
        }
      }
    }),
    // Atualiza status do equipamento
    prisma.equipamento.update({
      where: { id: equipamento.id },
      data: {
        status: 'DISPONIVEL',
        projetoAtualId: null,
        atualizadoPor: Number(user.id)
      }
    })
  ]);
  
  // 9. LOG SUCESSO
  logger.info(
    `Equipamento devolvido: ${equipamento.nome} ← Projeto ${equipamento.projetoAtualId}`,
    createLogContext(request, user),
    { equipamentoId: equipamento.id, projetoId: equipamento.projetoAtualId, alocacaoId: alocacaoAtiva.id }
  );
  
  // 10. RESPOSTA
  return successResponse(alocacaoAtualizada, 'Equipamento devolvido com sucesso');
}

export const POST = withErrorHandler(handler);
