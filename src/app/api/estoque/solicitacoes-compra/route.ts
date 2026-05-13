/**
 * API: SOLICITAÇÕES DE COMPRA — LISTAGEM E CRIAÇÃO
 * Arquivo: src/app/api/estoque/solicitacoes-compra/route.ts
 *
 * Endpoints:
 * - GET  /api/estoque/solicitacoes-compra — Lista SCs com filtros
 * - POST /api/estoque/solicitacoes-compra — Cria nova SC
 *
 * RBAC:
 *   - ESTOQUE, GERENTE, ADMIN: criar e ver próprias SCs
 *   - FINANCEIRO, GERENTE, ADMIN: ver todas as SCs
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  paginatedResponse,
  validationErrorResponse,
  withErrorHandler,
  getPaginationParams,
  logger,
  createLogContext,
  forbiddenResponse,
} from '@/lib/api';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

export const dynamic = 'force-dynamic';

// ========================================
// GET — listar SolicitacoesCompra
// ========================================

async function getHandler(request: NextRequest) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'estoque', 'read')) return forbiddenResponse();

  const { page, pageSize, skip } = getPaginationParams(request);
  const { searchParams } = new URL(request.url);

  const status = searchParams.get('status') ?? undefined;
  const origemTipo = searchParams.get('origemTipo') ?? undefined;
  const minha = searchParams.get('minha') === '1';

  const canViewAll = can(user.role as Role, 'financeiro', 'read') || can(user.role as Role, 'estoque', 'create');

  const where = {
    // Se não pode ver todas, filtra pelas próprias
    ...(!canViewAll ? { solicitanteId: Number(user.id) } : {}),
    ...(minha ? { solicitanteId: Number(user.id) } : {}),
    ...(status ? { status: status as never } : {}),
    ...(origemTipo ? { origemTipo: origemTipo as never } : {}),
  };

  const [total, solicitacoes] = await Promise.all([
    prisma.solicitacaoCompra.count({ where }),
    prisma.solicitacaoCompra.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      take: pageSize,
      skip,
      select: {
        id: true,
        status: true,
        origemTipo: true,
        origemId: true,
        valorEstimado: true,
        valorAprovado: true,
        valorTotalGasto: true,
        observacoes: true,
        enviadaEm: true,
        aprovadaEm: true,
        concluidaEm: true,
        criadoEm: true,
        solicitante: { select: { id: true, nomeCompleto: true } },
        aprovador: { select: { id: true, nomeCompleto: true } },
        itens: {
          select: { id: true, status: true, quantidadeSolicitada: true, quantidadeRecebida: true },
        },
        _count: { select: { compras: true } },
      },
    }),
  ]);

  return paginatedResponse(solicitacoes, page, pageSize, total);
}

// ========================================
// POST — criar SolicitacaoCompra
// ========================================

const itemSchema = z.object({
  materialId: z.number().int().positive().optional(),
  descricao: z.string().min(2).max(200),
  unidade: z.string().max(20).optional(),
  quantidadeSolicitada: z.number().positive('Quantidade deve ser maior que 0'),
  custoEstimado: z.number().min(0).optional(),
  observacoes: z.string().max(300).optional(),
});

const criarSCSchema = z.object({
  origemTipo: z.enum(['MANUAL', 'PROJETO', 'OS', 'ALERTA_ESTOQUE']).default('MANUAL'),
  origemId: z.number().int().positive().optional(),
  observacoes: z.string().optional(),
  itens: z.array(itemSchema).min(1, 'Adicione pelo menos 1 item'),
});

async function postHandler(request: NextRequest) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'estoque', 'create')) return forbiddenResponse();

  const body = await request.json();
  const parsed = criarSCSchema.safeParse(body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map(e => ({ field: e.path.join('.'), message: e.message }));
    return validationErrorResponse(errors);
  }
  const dados = parsed.data;

  // Calcular valor estimado total
  const valorEstimado = dados.itens.reduce((acc, item) => {
    return acc + (item.custoEstimado ?? 0) * item.quantidadeSolicitada;
  }, 0);

  const sc = await prisma.$transaction(async (tx) => {
    const nova = await tx.solicitacaoCompra.create({
      data: {
        empresaId: 1,
        origemTipo: dados.origemTipo,
        origemId: dados.origemId ?? null,
        status: 'RASCUNHO',
        solicitanteId: Number(user.id),
        valorEstimado,
        observacoes: dados.observacoes ?? null,
        itens: {
          create: dados.itens.map(item => ({
            materialId: item.materialId ?? null,
            descricao: item.descricao,
            unidade: item.unidade ?? null,
            quantidadeSolicitada: item.quantidadeSolicitada,
            custoEstimado: item.custoEstimado ?? null,
            observacoes: item.observacoes ?? null,
          })),
        },
      },
      include: {
        itens: true,
        solicitante: { select: { id: true, nomeCompleto: true } },
      },
    });

    return nova;
  });

  logger.info('SolicitacaoCompra criada', createLogContext(request, user), { scId: sc.id });

  return successResponse({ solicitacaoCompra: sc }, 'Solicitação de compra criada com sucesso');
}

export const GET = withErrorHandler(getHandler);
export const POST = withErrorHandler(postHandler);
