import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const inventarioItemSchema = z.object({
  materialId: z.number().int().positive(),
  localizacaoId: z.number().int().positive(),
  loteId: z.number().int().positive().optional(),
  quantidadeContada: z.number().min(0),
  motivo: z.string().max(200).optional(),
});

const inventarioSchema = z.object({
  itens: z.array(inventarioItemSchema).min(1).max(500),
  motivo: z.string().max(200).default('Contagem física de inventário'),
});

// POST /api/estoque/inventario - Execute physical inventory count
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'estoque', 'create')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const body = await request.json();
  const validated = inventarioSchema.parse(body);

  const resultados = await prisma.$transaction(async (tx) => {
    const ajustes = [];

    for (const item of validated.itens) {
      // Get current balance
      const saldo = await tx.materialSaldo.findFirst({
        where: {
          materialId: item.materialId,
          localizacaoId: item.localizacaoId,
          loteId: item.loteId || null,
        }
      });

      const quantidadeAtual = saldo ? Number(saldo.quantidade) : 0;
      const diferenca = item.quantidadeContada - quantidadeAtual;

      if (diferenca === 0) {
        ajustes.push({
          materialId: item.materialId,
          localizacaoId: item.localizacaoId,
          loteId: item.loteId || null,
          quantidadeAnterior: quantidadeAtual,
          quantidadeContada: item.quantidadeContada,
          diferenca: 0,
          ajuste: 'NENHUM',
        });
        continue;
      }

      const tipo = diferenca > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO';

      // Create stock movement
      await tx.materialMovimentacao.create({
        data: {
          tipo,
          materialId: item.materialId,
          loteId: item.loteId || null,
          localizacaoDestinoId: diferenca > 0 ? item.localizacaoId : null,
          localizacaoOrigemId: diferenca < 0 ? item.localizacaoId : null,
          quantidade: new Decimal(Math.abs(diferenca)),
          motivo: item.motivo || validated.motivo,
          criadoPor: Number(user.id),
        }
      });

      // Update or create balance
      if (saldo) {
        await tx.materialSaldo.update({
          where: { id: saldo.id },
          data: { quantidade: new Decimal(item.quantidadeContada) },
        });
      } else {
        await tx.materialSaldo.create({
          data: {
            materialId: item.materialId,
            localizacaoId: item.localizacaoId,
            loteId: item.loteId || null,
            quantidade: new Decimal(item.quantidadeContada),
          }
        });
      }

      ajustes.push({
        materialId: item.materialId,
        localizacaoId: item.localizacaoId,
        loteId: item.loteId || null,
        quantidadeAnterior: quantidadeAtual,
        quantidadeContada: item.quantidadeContada,
        diferenca,
        ajuste: tipo,
      });
    }

    return ajustes;
  });

  const totalAjustes = resultados.filter(r => r.ajuste !== 'NENHUM').length;

  return NextResponse.json({
    message: `Inventário processado: ${totalAjustes} ajustes de ${resultados.length} itens`,
    data: resultados,
    resumo: {
      totalItens: resultados.length,
      ajustesPositivos: resultados.filter(r => r.ajuste === 'AJUSTE_POSITIVO').length,
      ajustesNegativos: resultados.filter(r => r.ajuste === 'AJUSTE_NEGATIVO').length,
      semAlteracao: resultados.filter(r => r.ajuste === 'NENHUM').length,
    }
  });
});

// GET /api/estoque/inventario - Get current stock snapshot
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'estoque', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);

  const localizacaoId = searchParams.get('localizacaoId');
  const materialId = searchParams.get('materialId');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (localizacaoId) where.localizacaoId = parseInt(localizacaoId);
  if (materialId) where.materialId = parseInt(materialId);

  const saldos = await prisma.materialSaldo.findMany({
    where,
    include: {
      material: { select: { id: true, nome: true, codigo: true, unidade: true } },
      localizacao: { select: { id: true, nome: true, codigo: true } },
      lote: { select: { id: true, codigoLote: true, dataValidade: true } },
    },
    orderBy: [{ material: { nome: 'asc' } }, { localizacao: { nome: 'asc' } }],
  });

  return NextResponse.json({ data: saldos });
});
