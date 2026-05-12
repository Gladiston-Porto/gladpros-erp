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
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import {
  successResponse,
  forbiddenResponse,
  notFoundResponse,
  withErrorHandler,
  logger,
  createLogContext,
} from '@/lib/api';

export const dynamic = 'force-dynamic';

async function postHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'projetos', 'create')) {
    return forbiddenResponse('Sem permissão para gerenciar materiais do projeto');
  }

  const { id } = await context.params;
  const projetoId = Number(id);
  if (isNaN(projetoId)) {
    return NextResponse.json({ error: 'ID inválido', success: false }, { status: 400 });
  }

  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: {
      id: true,
      empresaId: true,
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

  // Buscar todos os saldos dos materiais pendentes em uma query
  const materialIds = [...new Set(pendentes.map(p => p.materialId))];
  const todosSaldos = await prisma.materialSaldo.findMany({
    where: { materialId: { in: materialIds } },
    select: { id: true, materialId: true, quantidade: true, reservado: true }
  });

  // Agrupar saldos por materialId
  const saldosPorMaterial = materialIds.reduce<Record<number, typeof todosSaldos>>((acc, mid) => {
    acc[mid] = todosSaldos.filter(s => s.materialId === mid);
    return acc;
  }, {});

  // Calcular disponível por material
  const disponivelPorMaterial: Record<number, number> = {};
  for (const mid of materialIds) {
    disponivelPorMaterial[mid] = (saldosPorMaterial[mid] ?? []).reduce(
      (acc, s) => acc + Number(s.quantidade) - Number(s.reservado),
      0
    );
  }

  // Verificar se há SC de RASCUNHO para este projeto já existente (reusar)
  const scExistente = await prisma.solicitacaoCompra.findFirst({
    where: { origemTipo: 'PROJETO', origemId: projetoId, status: 'RASCUNHO' },
    select: { id: true }
  });

  const resultado = await prisma.$transaction(async (tx) => {
    let qtdReservados = 0;
    const itensParaSC: { materialId: number; descricao: string; qtdParaComprar: number; custoEstimado: number | null }[] = [];

    for (const item of pendentes) {
      const disponivel = disponivelPorMaterial[item.materialId] ?? 0;
      const necessario = Number(item.quantidadeReservada); // quanto o projeto quer
      // Saldo que ainda precisa ser reservado (o quantidadeReservada atual pode ser parcial)
      // Vamos recalcular: quanto o item quer TOTAL vs quanto já tem reservado
      // Aqui item.quantidadeReservada é quanto JÁ foi reservado (pode ser 0)
      // Precisamos saber quanto o projeto QUERIA: isso é a qty total originalmente solicitada
      // Para simplificar: vamos tentar reservar `necessario` (o que ainda falta, já que está PENDENTE)
      const aReservar = necessario; // tentativa de reservar o total pendente

      if (disponivel >= aReservar - 0.001) {
        // Pode reservar!
        await tx.projetoMaterialEstoque.update({
          where: { id: item.id },
          data: { status: 'RESERVADA', dataReserva: new Date() }
        });

        // Reservar saldo
        let qtdRestante = aReservar;
        const saldos = saldosPorMaterial[item.materialId] ?? [];
        for (const saldo of saldos) {
          if (qtdRestante <= 0) break;
          const disp = Number(saldo.quantidade) - Number(saldo.reservado);
          if (disp <= 0) continue;
          const reservarAqui = Math.min(qtdRestante, disp);
          await tx.materialSaldo.update({
            where: { id: saldo.id },
            data: { reservado: { increment: reservarAqui } }
          });
          // Atualizar o saldo local para que próximas iterações sejam precisas
          saldo.reservado = (Number(saldo.reservado) + reservarAqui) as unknown as typeof saldo.reservado;
          qtdRestante -= reservarAqui;
        }
        // Atualizar disponível para próximos itens
        disponivelPorMaterial[item.materialId] = Math.max(0, disponivel - aReservar);
        qtdReservados++;
      } else {
        // Ainda não tem saldo: manter PENDENTE_SC e agrupar na SC
        itensParaSC.push({
          materialId: item.materialId,
          descricao: `${item.material.codigo} — ${item.material.nome}`,
          qtdParaComprar: aReservar,
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

        for (const item of itensParaSC) {
          if (!materialIdsExistentes.has(item.materialId)) {
            await tx.solicitacaoCompraItem.create({
              data: {
                scId: scExistente.id,
                materialId: item.materialId,
                descricao: item.descricao,
                quantidadeSolicitada: item.qtdParaComprar,
                custoEstimado: item.custoEstimado,
                status: 'PENDENTE',
              }
            });
          }
        }
        scId = scExistente.id;
      } else {
        // Criar nova SC automática
        const valorEstimado = itensParaSC.reduce((acc, i) =>
          acc + (i.custoEstimado ?? 0) * i.qtdParaComprar, 0
        );
        const novaS = await tx.solicitacaoCompra.create({
          data: {
            empresaId: projeto.empresaId,
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
