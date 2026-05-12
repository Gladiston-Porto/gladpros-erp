/**
 * API: CRIAR SC A PARTIR DE ALERTA DE ESTOQUE
 * Endpoint: POST /api/estoque/alertas/[id]/criar-sc
 *
 * Fase 9: Alerta de estoque abaixo do ponto de reposição → SC proativa
 *
 * Fluxo:
 *  1. Lê o alerta + material vinculado
 *  2. Calcula quantidade sugerida: max(pontoReposicao - saldoAtual, 1)
 *  3. Cria SolicitacaoCompra (origemTipo: ALERTA_ESTOQUE, origemId: alertaId)
 *  4. Marca alerta como "SC gerada" (solucao: SC #N criada)
 *
 * Regras:
 *  - Alerta deve ter materialId (alertas de equipamento não podem gerar SC automática)
 *  - SC não duplicada: verifica se já existe SC RASCUNHO/ENVIADA/APROVADA para este alerta
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import {
  successResponse,
  validationErrorResponse,
  forbiddenResponse,
  notFoundResponse,
  withErrorHandler,
  logger,
  createLogContext,
} from '@/lib/api';

export const dynamic = 'force-dynamic';

const criarSCSchema = z.object({
  quantidadeSolicitada: z.number().positive().optional(),   // override da sugestão automática
  custoEstimado: z.number().positive().optional(),
  observacoes: z.string().max(500).optional(),
});

async function postHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'estoque', 'create')) {
    return forbiddenResponse('Sem permissão para criar solicitações de compra');
  }

  const { id } = await context.params;
  const alertaId = BigInt(id);

  const body = await request.json().catch(() => ({}));
  const validation = criarSCSchema.safeParse(body);
  if (!validation.success) {
    return validationErrorResponse(
      validation.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
    );
  }
  const dados = validation.data;

  // Buscar alerta com material
  const alerta = await prisma.alertaEstoque.findUnique({
    where: { id: alertaId },
    include: {
      material: {
        select: {
          id: true,
          codigo: true,
          nome: true,
          pontoReposicao: true,
          empresaId: true,
        }
      }
    }
  });

  if (!alerta) return notFoundResponse('Alerta não encontrado');
  if (!alerta.materialId || !alerta.material) {
    return NextResponse.json(
      { error: 'Alerta sem material vinculado', message: 'Apenas alertas de material podem gerar SC automática.', success: false },
      { status: 422 }
    );
  }

  // Verificar se já existe SC ativa para este alerta (evitar duplicata)
  const scDuplicada = await prisma.solicitacaoCompra.findFirst({
    where: {
      origemTipo: 'ALERTA_ESTOQUE',
      origemId: Number(alertaId),
      status: { in: ['RASCUNHO', 'ENVIADA', 'APROVADA', 'PARCIALMENTE_RECEBIDA'] }
    },
    select: { id: true, status: true }
  });

  if (scDuplicada) {
    return NextResponse.json(
      {
        error: 'SC já existe para este alerta',
        message: `Já existe uma SC (#${scDuplicada.id}) com status ${scDuplicada.status} para este alerta.`,
        success: false,
        data: { scId: scDuplicada.id }
      },
      { status: 409 }
    );
  }

  // Calcular saldo atual e quantidade sugerida
  const saldos = await prisma.materialSaldo.findMany({
    where: { materialId: alerta.materialId },
    select: { quantidade: true, reservado: true }
  });
  const saldoAtual = saldos.reduce(
    (acc, s) => acc + Number(s.quantidade) - Number(s.reservado),
    0
  );
  const pontoReposicao = Number(alerta.material.pontoReposicao ?? 0);
  const qtdSugerida = dados.quantidadeSolicitada ?? Math.max(pontoReposicao - saldoAtual, 1);

  logger.info('Criando SC a partir de alerta de estoque', createLogContext(request, user), {
    alertaId: alerta.id.toString(),
    materialId: alerta.materialId,
    saldoAtual,
    pontoReposicao,
    qtdSugerida
  });

  const sc = await prisma.$transaction(async (tx) => {
    const novaSC = await tx.solicitacaoCompra.create({
      data: {
        empresaId: alerta.material!.empresaId,
        origemTipo: 'ALERTA_ESTOQUE',
        origemId: Number(alertaId),
        status: 'RASCUNHO',
        solicitanteId: Number(user.id),
        valorEstimado: dados.custoEstimado ? dados.custoEstimado * qtdSugerida : 0,
        observacoes: dados.observacoes ??
          `SC criada a partir do alerta de estoque #${alertaId}.\nMaterial: ${alerta.material!.codigo} — ${alerta.material!.nome}.\nSaldo atual: ${saldoAtual}, Ponto de reposição: ${pontoReposicao}, Quantidade sugerida: ${qtdSugerida}.`,
        itens: {
          create: [{
            materialId: alerta.materialId!,
            descricao: `${alerta.material!.codigo} — ${alerta.material!.nome}`,
            quantidadeSolicitada: qtdSugerida,
            custoEstimado: dados.custoEstimado ?? null,
            status: 'PENDENTE',
          }]
        }
      }
    });

    // Atualizar alerta: registrar que SC foi gerada (sem resolver — o alerta fica ativo até receber o material)
    await tx.alertaEstoque.update({
      where: { id: alertaId },
      data: {
        solucao: `SC #${novaSC.id} criada em ${new Date().toLocaleDateString('en-US')} para reposição.`
      }
    });

    return novaSC;
  });

  return successResponse(
    { sc: { id: sc.id, status: sc.status } },
    `SC #${sc.id} criada com sucesso para reposição de "${alerta.material.nome}". Aguardando envio para aprovação.`,
    201
  );
}

export const POST = withErrorHandler(postHandler);
