/**
 * API: SC — DETALHE
 * Arquivo: src/app/api/estoque/solicitacoes-compra/[id]/route.ts
 *
 * Endpoints:
 * - GET   /api/estoque/solicitacoes-compra/[id] — detalhe completo
 * - PATCH /api/estoque/solicitacoes-compra/[id] — editar (apenas RASCUNHO)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  validationErrorResponse,
  withErrorHandler,
  notFoundResponse,
  forbiddenResponse,
  logger,
  createLogContext,
} from '@/lib/api';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

async function getHandler(request: NextRequest, { params }: Params) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'estoque', 'read')) return forbiddenResponse();

  const { id } = await params;
  const scId = Number(id);

  const sc = await prisma.solicitacaoCompra.findUnique({
    where: { id: scId },
    include: {
      solicitante: { select: { id: true, nomeCompleto: true } },
      aprovador: { select: { id: true, nomeCompleto: true } },
      itens: {
        include: {
          material: { select: { id: true, codigo: true, nome: true, unidade: { select: { codigo: true } } } },
        },
      },
      compras: {
        select: {
          id: true,
          status: true,
          valorTotal: true,
          numeroNf: true,
          notaFiscalUrl: true,
          dataCompra: true,
          fornecedor: { select: { id: true, nome: true } },
        },
      },
    },
  });

  if (!sc) return notFoundResponse('Solicitação de compra não encontrada');

  // ESTOQUE só vê próprias SCs
  const canViewAll = can(user.role as Role, 'financeiro', 'read');
  if (!canViewAll && sc.solicitanteId !== Number(user.id)) return forbiddenResponse();

  return successResponse({ solicitacaoCompra: sc });
}

const patchSchema = z.object({
  observacoes: z.string().optional(),
  itens: z
    .array(
      z.object({
        id: z.number().int().positive().optional(), // undefined = novo item
        materialId: z.number().int().positive().optional(),
        descricao: z.string().min(2).max(200),
        unidade: z.string().max(20).optional(),
        quantidadeSolicitada: z.number().positive(),
        custoEstimado: z.number().min(0).optional(),
        observacoes: z.string().max(300).optional(),
      })
    )
    .min(1)
    .optional(),
});

async function patchHandler(request: NextRequest, { params }: Params) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'estoque', 'write')) return forbiddenResponse();

  const { id } = await params;
  const scId = Number(id);

  const sc = await prisma.solicitacaoCompra.findUnique({ where: { id: scId } });
  if (!sc) return notFoundResponse('Solicitação de compra não encontrada');
  if (sc.status !== 'RASCUNHO') {
    return validationErrorResponse([{ field: 'status', message: 'Apenas SCs em RASCUNHO podem ser editadas' }]);
  }
  if (sc.solicitanteId !== Number(user.id) && !can(user.role as Role, 'financeiro', 'read')) {
    return forbiddenResponse();
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })));
  }
  const dados = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    let valorEstimado = sc.valorEstimado;

    if (dados.itens) {
      // Remove todos os itens existentes e recria
      await tx.solicitacaoCompraItem.deleteMany({ where: { scId } });
      await tx.solicitacaoCompraItem.createMany({
        data: dados.itens.map(item => ({
          scId,
          materialId: item.materialId ?? null,
          descricao: item.descricao,
          unidade: item.unidade ?? null,
          quantidadeSolicitada: item.quantidadeSolicitada,
          custoEstimado: item.custoEstimado ?? null,
          observacoes: item.observacoes ?? null,
        })),
      });

      valorEstimado = dados.itens.reduce((acc, item) => {
        return acc + (item.custoEstimado ?? 0) * item.quantidadeSolicitada;
      }, 0);
    }

    return tx.solicitacaoCompra.update({
      where: { id: scId },
      data: {
        observacoes: dados.observacoes ?? sc.observacoes,
        valorEstimado,
      },
      include: {
        itens: true,
        solicitante: { select: { id: true, nomeCompleto: true } },
      },
    });
  });

  logger.info('SolicitacaoCompra atualizada', createLogContext(request, user), { scId });
  return successResponse({ solicitacaoCompra: updated }, 'Solicitação atualizada');
}

export const GET = withErrorHandler(getHandler);
export const PATCH = withErrorHandler(patchHandler);
