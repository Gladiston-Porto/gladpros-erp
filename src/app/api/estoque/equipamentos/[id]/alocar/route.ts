/**
 * POST /api/estoque/equipamentos/[id]/alocar
 * 
 * Aloca equipamento para um projeto
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

// Schema de validação para alocação
const alocarSchema = z.object({
  projetoId: z.number().int().positive(),
  responsavelId: z.number().int().positive(),
  dataAlocacao: z.string().optional(),
  dataDevolucaoPrevista: z.string().optional(),
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
    return forbiddenResponse('Você não tem permissão para alocar equipamentos');
  }
  
  // 3. LOG
  logger.info(`Alocando equipamento ${params.id}`, createLogContext(request, user));
  
  // 4. VALIDAÇÃO DO BODY
  const body = await request.json();
  const validated = alocarSchema.parse(body);
  
  // 5. BUSCA EQUIPAMENTO
  const equipamento = await prisma.equipamento.findUnique({
    where: { id: parseInt(params.id) }
  });
  
  if (!equipamento) {
    return notFoundResponse('Equipamento');
  }
  
  // 6. VERIFICA SE ESTÁ DISPONÍVEL
  if (equipamento.status !== 'DISPONIVEL') {
    return businessErrorResponse(
      `Equipamento não está disponível (status: ${equipamento.status})`,
      ApiErrorCode.EQUIPMENT_IN_USE,
      { status: equipamento.status }
    );
  }
  
  // 7. VERIFICA SE PROJETO EXISTE
  const projeto = await prisma.projeto.findUnique({
    where: { id: validated.projetoId }
  });
  
  if (!projeto) {
    return notFoundResponse('Projeto');
  }
  
  // 8. CRIA ALOCAÇÃO E ATUALIZA EQUIPAMENTO
  const dataAlocacao = validated.dataAlocacao ? new Date(validated.dataAlocacao) : new Date();
  
  const [alocacao] = await prisma.$transaction([
    // Cria registro de alocação
    prisma.projetoEquipamento.create({
      data: {
        projetoId: validated.projetoId,
        equipamentoId: equipamento.id,
        responsavelId: validated.responsavelId,
        dataAlocacao,
        dataDevolucaoPrevista: validated.dataDevolucaoPrevista ? new Date(validated.dataDevolucaoPrevista) : null,
        observacoes: validated.observacoes,
        status: 'ALOCADO',
        criadoPor: Number(user.id)
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
        status: 'EM_USO',
        projetoAtualId: validated.projetoId,
        atualizadoPor: Number(user.id)
      }
    })
  ]);
  
  // 9. LOG SUCESSO
  logger.info(
    `Equipamento alocado: ${equipamento.nome} → Projeto ${validated.projetoId}`,
    createLogContext(request, user),
    { equipamentoId: equipamento.id, projetoId: validated.projetoId, alocacaoId: alocacao.id }
  );
  
  // 10. RESPOSTA
  return successResponse(alocacao, 'Equipamento alocado com sucesso', 201);
}

export const POST = withErrorHandler(handler);
