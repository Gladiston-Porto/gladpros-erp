/**
 * API: VERIFICAR E RESERVAR MATERIAIS DO PROJETO
 * Endpoint: POST /api/projetos/[id]/materiais-estoque/verificar-reservas
 *
 * Processa TODOS os ProjetoMaterialEstoque com status PENDENTE_SC do projeto:
 *  - Para cada item, re-verifica saldo disponível
 *  - Se agora há saldo → atualiza para RESERVADA, incrementa reservado no MaterialSaldo
 *  - Se ainda falta → mantém PENDENTE_SC, agrupa em uma nova SC (ou na SC existente RASCUNHO do projeto)
 *
 * Usado:
 *  1. Quando um Projeto é criado a partir de uma Proposta APROVADA (chamada automática)
 *  2. Quando compra chega e libera saldo (re-verifica projetos pendentes)
 *  3. Botão manual "Verificar Disponibilidade" na tela do projeto
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { requireProjectAccess } from '@/shared/lib/rbac-projects';
import {
  successResponse,
  forbiddenResponse,
  notFoundResponse,
  withErrorHandler,
  logger,
  createLogContext,
} from '@/lib/api';

export const dynamic = 'force-dynamic';

type MaterialBalance = {
  id: number;
  materialId: number;
  quantidade: number;
  reservado: number;
};

async function reservarSaldoDisponivel(
  tx: Prisma.TransactionClient,
  saldos: MaterialBalance[],
  quantidade: number
): Promise<number> {
  let restante = quantidade;
  let reservado = 0;

  for (const saldo of saldos) {
    if (restante <= 0) break;
    const disponivel = saldo.quantidade - saldo.reservado;
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
    saldo.reservado += reservarAqui;
  }

  return reservado;
}

async function postHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  const role = user.role as Role;
  if (!can(role, 'projetos', 'update') || !can(role, 'estoque', 'update')) {
    return forbiddenResponse('Sem permissão para gerenciar materiais do projeto');
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

  const projeto = await prisma.projeto.findFirst({
    where: { id: projetoId },
    select: {
      id: true,
      numeroProjeto: true,
      titulo: true,
      materiaisEstoque: {
        where: { status: 'PENDENTE_SC' },
        include: {
          material: { select: { id: true, codigo: true, nome: true } }
        }
      }
    }
  });
  if (!projeto) return notFoundResponse('Projeto não encontrado');

  const pendentes = projeto.materiaisEstoque;
  if (pendentes.length === 0) {
    return successResponse(
      { reservados: 0, aindaPendentes: 0, scId: null },
      'Nenhum material pendente encontrado para este projeto.'
    );
  }

  logger.info('Verificando reservas do projeto', createLogContext(request, user), {
    projetoId, pendentes: pendentes.length
  });

  // Buscar SCs do projeto para descobrir a quantidade ainda pendente por material.
  const materialIds = [...new Set(pendentes.map(p => p.materialId))];
  const [scItensPendentes, saldosDisponiveis] = await Promise.all([
    prisma.solicitacaoCompraItem.findMany({
      where: {
        materialId: { in: materialIds },
        status: { not: 'CANCELADO' },
        sc: {
          origemTipo: 'PROJETO',
          origemId: projetoId,
          status: { not: 'CANCELADA' },
        },
      },
      select: { materialId: true, quantidadeSolicitada: true },
    }),
    prisma.materialSaldo.findMany({
      where: { materialId: { in: materialIds } },
      select: { id: true, materialId: true, quantidade: true, reservado: true },
    }),
  ]);

  const qtdPendentePorMaterial = scItensPendentes.reduce<Record<number, number>>((acc, item) => {
    if (!item.materialId) return acc;
    acc[item.materialId] = (acc[item.materialId] ?? 0) + Number(item.quantidadeSolicitada);
    return acc;
  }, {});

  const saldosPorMaterial = saldosDisponiveis.reduce<Record<number, MaterialBalance[]>>((acc, saldo) => {
    acc[saldo.materialId] = [
      ...(acc[saldo.materialId] ?? []),
      {
        id: saldo.id,
        materialId: saldo.materialId,
        quantidade: Number(saldo.quantidade),
        reservado: Number(saldo.reservado),
      },
    ];
    return acc;
  }, {});

  // Verificar se há SC de RASCUNHO para este projeto já existente (reusar)
  const scExistente = await prisma.solicitacaoCompra.findFirst({
    where: { origemTipo: 'PROJETO', origemId: projetoId, status: 'RASCUNHO' },
    select: { id: true }
  });

  const resultado = await prisma.$transaction(async (tx) => {
    let qtdReservados = 0;
    const itensParaSC: { materialId: number; descricao: string; qtdParaComprar: number; custoEstimado: number | null }[] = [];

    for (const item of pendentes) {
      const aReservar = qtdPendentePorMaterial[item.materialId] ?? 0;

      if (aReservar <= 0) {
        continue;
      }

      const reservadoAgora = await reservarSaldoDisponivel(tx, saldosPorMaterial[item.materialId] ?? [], aReservar);

      if (reservadoAgora > 0) {
        await tx.projetoMaterialEstoque.update({
          where: { id: item.id },
          data: {
            quantidadeReservada: { increment: reservadoAgora },
            status: reservadoAgora >= aReservar - 0.001 ? 'RESERVADA' : 'PENDENTE_SC',
            dataReserva: new Date(),
          }
        });
      }

      if (reservadoAgora >= aReservar - 0.001) {
        qtdReservados++;
      } else {
        itensParaSC.push({
          materialId: item.materialId,
          descricao: `${item.material.codigo} — ${item.material.nome}`,
          qtdParaComprar: aReservar - reservadoAgora,
          custoEstimado: item.custoUnitario ? Number(item.custoUnitario) : null
        });
      }
    }

    let scId: number | null = null;

    if (itensParaSC.length > 0) {
      if (scExistente) {
        // Adicionar itens à SC existente (evitar duplicatas: verificar se materialId já está)
        const itensExistentes = await tx.solicitacaoCompraItem.findMany({
          where: { scId: scExistente.id },
          select: { materialId: true }
        });
        const materialIdsExistentes = new Set(itensExistentes.map(i => i.materialId));

        const novosItens = itensParaSC.filter(item => !materialIdsExistentes.has(item.materialId));
        if (novosItens.length > 0) {
          await tx.solicitacaoCompraItem.createMany({
            data: novosItens.map(item => ({
              scId: scExistente.id,
              materialId: item.materialId,
              descricao: item.descricao,
              quantidadeSolicitada: item.qtdParaComprar,
              custoEstimado: item.custoEstimado,
              status: 'PENDENTE',
            })),
          });
        }
        scId = scExistente.id;
      } else {
        // Criar nova SC automática
        const valorEstimado = itensParaSC.reduce((acc, i) =>
          acc + (i.custoEstimado ?? 0) * i.qtdParaComprar, 0
        );
        const novaS = await tx.solicitacaoCompra.create({
          data: {
            empresaId: 1, // single-tenant
            origemTipo: 'PROJETO',
            origemId: projetoId,
            status: 'RASCUNHO',
            solicitanteId: Number(user.id),
            valorEstimado,
            observacoes: `SC automática — Projeto ${projeto.numeroProjeto}: ${projeto.titulo}.\n${itensParaSC.length} materiais sem saldo disponível.`,
            itens: {
              create: itensParaSC.map(item => ({
                materialId: item.materialId,
                descricao: item.descricao,
                quantidadeSolicitada: item.qtdParaComprar,
                custoEstimado: item.custoEstimado,
                status: 'PENDENTE',
              }))
            }
          }
        });
        scId = novaS.id;
      }
    }

    return { qtdReservados, aindaPendentes: itensParaSC.length, scId };
  });

  logger.info('Verificação de reservas concluída', createLogContext(request, user), {
    projetoId, ...resultado
  });

  const msg = resultado.aindaPendentes === 0
    ? `Todos os ${resultado.qtdReservados} materiais foram reservados com sucesso.`
    : `${resultado.qtdReservados} materiais reservados. ${resultado.aindaPendentes} ainda pendentes — SC #${resultado.scId} ${scExistente ? 'atualizada' : 'criada'}.`;

  return successResponse(resultado, msg);
}

export const POST = withErrorHandler(postHandler);
