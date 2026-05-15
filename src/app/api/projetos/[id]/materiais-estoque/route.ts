/**
 * API: PROJETO MATERIAIS DE ESTOQUE
 * Endpoint: /api/projetos/[id]/materiais-estoque
 *
 * Gerencia a alocação de materiais do catálogo de estoque em projetos.
 * Ao adicionar um material:
 *  - Se há saldo disponível → status RESERVADA (reserva o saldo)
 *  - Se não há saldo suficiente → status PENDENTE_SC + gera SC automática (origemTipo: PROJETO)
 *
 * GET  /api/projetos/[id]/materiais-estoque  — lista alocações do projeto
 * POST /api/projetos/[id]/materiais-estoque  — adiciona material ao projeto (com auto-reserva/auto-SC)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { ProjectPermissions, requireProjectAccess } from '@/shared/lib/rbac-projects';
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

const addMaterialSchema = z.object({
  materialId: z.number().int().positive('Material é obrigatório'),
  quantidade: z.number().positive('Quantidade deve ser maior que 0'),
  localizacaoId: z.number().int().positive().optional(),
  custoUnitario: z.number().positive().optional(),
  cobrarCliente: z.boolean().default(true),
  observacoes: z.string().max(500).optional(),
  // Embalagem snapshot fields
  embalagemId: z.number().int().positive().optional(),
  qtdEmbalagens: z.number().int().positive().optional(),
  embalagemBaseQtyAtTime: z.number().positive().optional(),
  embalagemPrecoAtTime: z.number().positive().optional(),
  embalagemUnitAtTime: z.string().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

function maskAlocacaoFinancials<T extends Record<string, unknown>>(alocacao: T, canSeeFinancials: boolean) {
  if (canSeeFinancials) return alocacao;
  const {
    custoUnitario: _custoUnitario,
    custoTotal: _custoTotal,
    cobrarCliente: _cobrarCliente,
    embalagemPrecoAtTime: _embalagemPrecoAtTime,
    ...safe
  } = alocacao;
  return safe;
}

function maskScFinancials<T extends Record<string, unknown> | null>(sc: T, canSeeFinancials: boolean) {
  if (!sc || canSeeFinancials) return sc;
  const source = sc as Record<string, unknown>;
  return {
    id: source.id,
    status: source.status,
    origemTipo: source.origemTipo,
    origemId: source.origemId,
  };
}

async function reservarSaldoDisponivel(
  tx: Prisma.TransactionClient,
  materialId: number,
  quantidade: number,
  localizacaoId?: number
): Promise<number> {
  const saldos = await tx.materialSaldo.findMany({
    where: { materialId },
    select: { id: true, quantidade: true, reservado: true, localizacaoId: true },
  });

  const saldosOrdenados = localizacaoId
    ? [...saldos].sort((a, b) =>
        a.localizacaoId === localizacaoId ? -1 : b.localizacaoId === localizacaoId ? 1 : 0
      )
    : saldos;

  let restante = quantidade;
  let reservado = 0;

  for (const saldo of saldosOrdenados) {
    if (restante <= 0) break;
    const disponivel = Number(saldo.quantidade) - Number(saldo.reservado);
    if (disponivel <= 0) continue;

    const reservarAqui = Math.min(restante, disponivel);
    const updatedRows = await tx.$executeRaw`
      UPDATE materiais_saldo
      SET reservado = reservado + ${reservarAqui}, atualizado_em = NOW()
      WHERE id = ${saldo.id} AND (quantidade - reservado) >= ${reservarAqui}
    `;

    if (updatedRows !== 1) {
      throw new Error('Saldo de estoque foi alterado por outra operação. Tente reservar novamente.');
    }

    reservado += reservarAqui;
    restante -= reservarAqui;
  }

  return reservado;
}

// ─── GET ─────────────────────────────────────────────────────────────────────

async function getHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  const role = user.role as Role;
  if (!can(role, 'projetos', 'read') || !can(role, 'estoque', 'read')) {
    return forbiddenResponse('Sem permissão para visualizar materiais do projeto');
  }

  const { id } = await context.params;
  const projetoId = Number(id);
  if (isNaN(projetoId)) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'ID inválido', success: false },
      { status: 400 }
    );
  }
  await requireProjectAccess(user, projetoId, 'canRead');
  const query = listQuerySchema.safeParse({
    page: request.nextUrl.searchParams.get('page') ?? undefined,
    pageSize: request.nextUrl.searchParams.get('pageSize') ?? undefined,
  });
  if (!query.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: query.error.issues[0]?.message ?? 'Parâmetros inválidos', success: false },
      { status: 400 }
    );
  }

  const { page, pageSize } = query.data;
  const canSeeFinancials = ProjectPermissions.canViewFinancials(user.role);

  const [total, alocacoes] = await Promise.all([
    prisma.projetoMaterialEstoque.count({ where: { projetoId } }),
    prisma.projetoMaterialEstoque.findMany({
      where: { projetoId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { criadoEm: 'desc' },
      select: {
        id: true,
        projetoId: true,
        materialId: true,
        quantidadeReservada: true,
        quantidadeUsada: true,
        status: true,
        dataReserva: true,
        dataUso: true,
        observacoes: true,
        criadoEm: true,
        atualizadoEm: true,
        material: {
          select: { id: true, codigo: true, nome: true, unidade: { select: { codigo: true, nome: true } } }
        },
        ...(canSeeFinancials
          ? {
              custoUnitario: true,
              custoTotal: true,
              cobrarCliente: true,
              embalagemPrecoAtTime: true,
            }
          : {}),
      },
    }),
  ]);

  return successResponse({
    alocacoes,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

// ─── POST ─────────────────────────────────────────────────────────────────────

async function postHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  const role = user.role as Role;
  if (!can(role, 'projetos', 'update') || !can(role, 'estoque', 'update')) {
    return forbiddenResponse('Sem permissão para adicionar materiais ao projeto');
  }

  const { id } = await context.params;
  const projetoId = Number(id);
  if (isNaN(projetoId)) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'ID inválido', success: false },
      { status: 400 }
    );
  }
  await requireProjectAccess(user, projetoId, 'canManageMaterials');

  const body = await request.json();
  const validation = addMaterialSchema.safeParse(body);
  if (!validation.success) {
    return validationErrorResponse(
      validation.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
    );
  }
  const dados = validation.data;
  const canUpdateFinancials = can(role, 'financeiro', 'update');
  const canSeeFinancials = ProjectPermissions.canViewFinancials(user.role);
  const touchesFinancialFields =
    Object.prototype.hasOwnProperty.call(body, 'custoUnitario') ||
    Object.prototype.hasOwnProperty.call(body, 'cobrarCliente') ||
    Object.prototype.hasOwnProperty.call(body, 'embalagemPrecoAtTime');

  if (touchesFinancialFields && !canUpdateFinancials) {
    return forbiddenResponse('Sem permissão para alterar custo/cobrança de materiais');
  }

  // Verificar projeto existe dentro do escopo autorizado.
  const projeto = await prisma.projeto.findFirst({
    where: { id: projetoId },
    select: { id: true, numeroProjeto: true, titulo: true, status: true }
  });
  if (!projeto) return notFoundResponse('Projeto não encontrado');

  // Verificar material existe
  const material = await prisma.material.findUnique({
    where: { id: dados.materialId },
    select: { id: true, codigo: true, nome: true, pontoReposicao: true, custoMedio: true, ultimoCusto: true }
  });
  if (!material) return notFoundResponse('Material não encontrado no catálogo');

  // Resolve custo unitário: usa o informado ou fallback para custo médio / último custo do material
  const custoUnitarioResolvido = dados.custoUnitario
    ?? (material.custoMedio !== null ? Number(material.custoMedio) : null)
    ?? (material.ultimoCusto !== null ? Number(material.ultimoCusto) : null);
  const cobrarClienteResolvido = canUpdateFinancials ? dados.cobrarCliente : false;

  logger.info('Adicionando material ao projeto', createLogContext(request, user), {
    projetoId,
    materialId: dados.materialId,
    quantidade: dados.quantidade,
    localizacaoId: dados.localizacaoId ?? null
  });

  const empresaId = 1; // single-tenant

  const result = await prisma.$transaction(async (tx) => {
    const quantidadeReservada = await reservarSaldoDisponivel(
      tx,
      dados.materialId,
      dados.quantidade,
      dados.localizacaoId
    );

    if (quantidadeReservada >= dados.quantidade - 0.001) {
      const alocacao = await tx.projetoMaterialEstoque.create({
        data: {
          projetoId,
          materialId: dados.materialId,
          quantidadeReservada: dados.quantidade,
          custoUnitario: custoUnitarioResolvido,
          cobrarCliente: cobrarClienteResolvido,
          status: 'RESERVADA',
          dataReserva: new Date(),
          observacoes: dados.observacoes,
          criadoPor: Number(user.id),
          ...(dados.embalagemBaseQtyAtTime && {
            embalagemId: dados.embalagemId ?? null,
            qtdEmbalagens: dados.qtdEmbalagens,
            embalagemBaseQtyAtTime: dados.embalagemBaseQtyAtTime,
            embalagemPrecoAtTime: dados.embalagemPrecoAtTime,
            embalagemUnitAtTime: dados.embalagemUnitAtTime,
          }),
        }
      });

      return { alocacao, sc: null, acao: 'RESERVADA' as const, qtdParaComprar: 0 };
    }

    const qtdNecessaria = dados.quantidade;
    const qtdSuficiente = Math.max(0, quantidadeReservada);
    const qtdParaComprar = qtdNecessaria - qtdSuficiente;

    const alocacao = await tx.projetoMaterialEstoque.create({
      data: {
        projetoId,
        materialId: dados.materialId,
        quantidadeReservada: qtdSuficiente,
        custoUnitario: custoUnitarioResolvido,
        cobrarCliente: cobrarClienteResolvido,
        status: 'PENDENTE_SC',
        dataReserva: qtdSuficiente > 0 ? new Date() : null,
        observacoes: dados.observacoes,
        criadoPor: Number(user.id),
        ...(dados.embalagemBaseQtyAtTime && {
          embalagemId: dados.embalagemId ?? null,
          qtdEmbalagens: dados.qtdEmbalagens,
          embalagemBaseQtyAtTime: dados.embalagemBaseQtyAtTime,
          embalagemPrecoAtTime: dados.embalagemPrecoAtTime,
          embalagemUnitAtTime: dados.embalagemUnitAtTime,
        }),
      }
    });

    // Criar SC automática para a quantidade faltante
    const sc = await tx.solicitacaoCompra.create({
      data: {
        empresaId,
        origemTipo: 'PROJETO',
        origemId: projetoId,
        status: 'RASCUNHO',
        solicitanteId: Number(user.id),
        valorEstimado: custoUnitarioResolvido
          ? custoUnitarioResolvido * qtdParaComprar
          : 0,
        observacoes: `SC gerada automaticamente pelo sistema.\nProjeto: ${projeto.numeroProjeto} — ${projeto.titulo}.\nMaterial: ${material.codigo} — ${material.nome}.\nSaldo disponível: ${qtdSuficiente}, Necessário: ${qtdNecessaria}, Para comprar: ${qtdParaComprar}.`,
        itens: {
          create: [{
            materialId: dados.materialId,
            descricao: `${material.codigo} — ${material.nome}`,
            quantidadeSolicitada: qtdParaComprar,
            custoEstimado: custoUnitarioResolvido ?? null,
            status: 'PENDENTE',
          }]
        }
      }
    });

    return { alocacao, sc, acao: 'PENDENTE_SC' as const, qtdParaComprar };
  });

  if (result.acao === 'RESERVADA') {
    logger.info('Material reservado para projeto', createLogContext(request, user), {
      projetoId, materialId: dados.materialId, alocacaoId: result.alocacao.id
    });

    return successResponse(
      {
        alocacao: maskAlocacaoFinancials(result.alocacao as unknown as Record<string, unknown>, canSeeFinancials),
        acao: result.acao,
      },
      `Material "${material.nome}" reservado com sucesso para o projeto.`
    );
  }

  logger.info('SC automática gerada por insuficiência de estoque', createLogContext(request, user), {
    projetoId, materialId: dados.materialId, scId: result.sc?.id, qtdParaComprar: result.qtdParaComprar
  });

  return successResponse(
    {
      alocacao: maskAlocacaoFinancials(result.alocacao as unknown as Record<string, unknown>, canSeeFinancials),
      sc: maskScFinancials(result.sc as unknown as Record<string, unknown> | null, canSeeFinancials),
      acao: result.acao,
    },
    `Estoque insuficiente para "${material.nome}". Solicitação de compra (SC #${result.sc?.id}) criada automaticamente para ${result.qtdParaComprar} unidades. Aguardando aprovação do financeiro.`,
    201
  );
}

export const GET = withErrorHandler(getHandler);
export const POST = withErrorHandler(postHandler);
