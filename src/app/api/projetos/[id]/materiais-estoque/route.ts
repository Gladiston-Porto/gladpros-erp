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

// ─── GET ─────────────────────────────────────────────────────────────────────

async function getHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'projetos', 'read')) {
    return forbiddenResponse('Sem permissão para visualizar materiais do projeto');
  }

  const { id } = await context.params;
  const projetoId = Number(id);
  if (isNaN(projetoId)) {
    return NextResponse.json({ error: 'ID inválido', success: false }, { status: 400 });
  }

  const alocacoes = await prisma.projetoMaterialEstoque.findMany({
    where: { projetoId },
    orderBy: { criadoEm: 'desc' },
    include: {
      material: {
        select: { id: true, codigo: true, nome: true, unidade: { select: { codigo: true, nome: true } } }
      },
    }
  });

  return successResponse({ alocacoes });
}

// ─── POST ─────────────────────────────────────────────────────────────────────

async function postHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'projetos', 'create')) {
    return forbiddenResponse('Sem permissão para adicionar materiais ao projeto');
  }

  const { id } = await context.params;
  const projetoId = Number(id);
  if (isNaN(projetoId)) {
    return NextResponse.json({ error: 'ID inválido', success: false }, { status: 400 });
  }

  const body = await request.json();
  const validation = addMaterialSchema.safeParse(body);
  if (!validation.success) {
    return validationErrorResponse(
      validation.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
    );
  }
  const dados = validation.data;

  // Verificar projeto existe
  const projeto = await prisma.projeto.findUnique({
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

  // Verificar saldo disponível total (todas as localizações)
  const saldos = await prisma.materialSaldo.findMany({
    where: { materialId: dados.materialId },
    select: { id: true, quantidade: true, reservado: true, localizacaoId: true }
  });
  const totalDisponivel = saldos.reduce(
    (acc, s) => acc + Number(s.quantidade) - Number(s.reservado),
    0
  );

  logger.info('Adicionando material ao projeto', createLogContext(request, user), {
    projetoId,
    materialId: dados.materialId,
    quantidade: dados.quantidade,
    totalDisponivel
  });

  const empresaId = 1; // single-tenant

  if (totalDisponivel >= dados.quantidade - 0.001) {
    // ── CAMINHO 1: Saldo suficiente → RESERVADA ──────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      const alocacao = await tx.projetoMaterialEstoque.create({
        data: {
          projetoId,
          materialId: dados.materialId,
          quantidadeReservada: dados.quantidade,
          custoUnitario: custoUnitarioResolvido,
          cobrarCliente: dados.cobrarCliente,
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

      // Reservar o saldo — incrementa `reservado` na localização preferida
      // (preferência: localizacaoId informado, ou primeira com saldo disponível)
      let qtdAReservar = dados.quantidade;
      const saldosOrdenados = dados.localizacaoId
        ? [...saldos].sort((a, b) =>
            a.localizacaoId === dados.localizacaoId ? -1 :
            b.localizacaoId === dados.localizacaoId ? 1 : 0
          )
        : saldos;

      for (const saldo of saldosOrdenados) {
        if (qtdAReservar <= 0) break;
        const disponivel = Number(saldo.quantidade) - Number(saldo.reservado);
        if (disponivel <= 0) continue;
        const reservarAqui = Math.min(qtdAReservar, disponivel);
        await tx.materialSaldo.update({
          where: { id: saldo.id },
          data: { reservado: { increment: reservarAqui } }
        });
        qtdAReservar -= reservarAqui;
      }

      return alocacao;
    });

    logger.info('Material reservado para projeto', createLogContext(request, user), {
      projetoId, materialId: dados.materialId, alocacaoId: result.id
    });

    return successResponse(
      { alocacao: result, acao: 'RESERVADA' },
      `Material "${material.nome}" reservado com sucesso para o projeto.`
    );

  } else {
    // ── CAMINHO 2: Saldo insuficiente → PENDENTE_SC + SC automática ───────────
    const qtdNecessaria = dados.quantidade;
    const qtdSuficiente = Math.max(0, totalDisponivel);
    const qtdParaComprar = qtdNecessaria - qtdSuficiente;

    const result = await prisma.$transaction(async (tx) => {
      // Criar alocação com PENDENTE_SC
      const alocacao = await tx.projetoMaterialEstoque.create({
        data: {
          projetoId,
          materialId: dados.materialId,
          quantidadeReservada: qtdSuficiente, // reserva o que tem disponível agora
          custoUnitario: custoUnitarioResolvido,
          cobrarCliente: dados.cobrarCliente,
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

      // Se há algum saldo disponível, reservar o que tem
      if (qtdSuficiente > 0) {
        let qtdAReservar = qtdSuficiente;
        for (const saldo of saldos) {
          if (qtdAReservar <= 0) break;
          const disponivel = Number(saldo.quantidade) - Number(saldo.reservado);
          if (disponivel <= 0) continue;
          const reservarAqui = Math.min(qtdAReservar, disponivel);
          await tx.materialSaldo.update({
            where: { id: saldo.id },
            data: { reservado: { increment: reservarAqui } }
          });
          qtdAReservar -= reservarAqui;
        }
      }

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

      return { alocacao, sc };
    });

    logger.info('SC automática gerada por insuficiência de estoque', createLogContext(request, user), {
      projetoId, materialId: dados.materialId, scId: result.sc.id, qtdParaComprar
    });

    return successResponse(
      { alocacao: result.alocacao, sc: result.sc, acao: 'PENDENTE_SC' },
      `Estoque insuficiente para "${material.nome}". Solicitação de compra (SC #${result.sc.id}) criada automaticamente para ${qtdParaComprar} unidades. Aguardando aprovação do financeiro.`,
      201
    );
  }
}

export const GET = withErrorHandler(getHandler);
export const POST = withErrorHandler(postHandler);
