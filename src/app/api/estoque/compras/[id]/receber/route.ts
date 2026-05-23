/**
 * API: COMPRAS - RECEBIMENTO
 * Arquivo: src/app/api/estoque/compras/[id]/receber/route.ts
 *
 * Endpoint:
 * - POST /api/estoque/compras/[id]/receber - Recebe compra e atualiza estoque
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  notFoundResponse,
  businessErrorResponse,
  validationErrorResponse,
  withErrorHandler,
  logger,
  createLogContext,
  forbiddenResponse,
} from '@/lib/api';
import { ApiErrorCode } from '@/lib/api/types';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { recalcCustoMedio } from '@/server/services/materialCostService';

/**
 * POST /api/estoque/compras/[id]/receber
 *
 * Recebe compra e atualiza estoque (cria entradas e lotes se necessário)
 *
 * @permissao PURCHASE_ESTOQUE
 */
async function handler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);

  if (!can(user.role as Role, 'estoque', 'update')) {
    return forbiddenResponse('Você não tem permissão para receber compras');
  }

  // 3. VALIDAÇÃO ID
  const { id: idParam } = await params;
  const id = parseInt(idParam);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  // 4. PARSE BODY
  const body = await request.json();

  // 5. VALIDAÇÃO ZOD
  const receberSchema = z.object({
    dataRecebimento: z.string().transform((val) => new Date(val)),
    itensRecebidos: z
      .array(
        z.object({
          itemId: z.number().int().positive(),
          quantidadeRecebida: z.number().positive(),
          localizacaoId: z.number().int().positive(),
          lote: z
            .object({
              codigoLote: z.string().min(1).max(50),
              dataFabricacao: z
                .string()
                .transform((val) => new Date(val))
                .optional(),
              dataValidade: z
                .string()
                .transform((val) => new Date(val))
                .optional(),
            })
            .optional(),
        }),
      )
      .min(1, 'Deve informar pelo menos 1 item para receber'),
  });

  const validation = receberSchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    return validationErrorResponse(errors);
  }

  const dados = validation.data;

  // 6. LOG
  logger.info(`Recebendo compra ${id}`, createLogContext(request, user));

  // 7. BUSCA COMPRA com itens, embalagens e equipamentos
  const compra = await prisma.compra.findUnique({
    where: { id },
    include: {
      itens: {
        include: {
          materialEmbalagem: {
            select: {
              id: true,
              materialId: true,
              baseQtyPerUnit: true,
              packageType: true,
            },
          },
          equipamento: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!compra) {
    return notFoundResponse('Compra não encontrada');
  }

  // 8. VALIDAÇÃO: compra não cancelada
  if (compra.status === 'CANCELADA') {
    return businessErrorResponse(
      'Não é possível receber uma compra cancelada',
      ApiErrorCode.INVALID_STATE,
    );
  }

  // 9. VALIDAÇÃO: todos itens informados existem
  const idsItensInformados = dados.itensRecebidos.map((i) => i.itemId);
  const itensExistentes = compra.itens.filter((i) => idsItensInformados.includes(i.id));

  if (itensExistentes.length !== idsItensInformados.length) {
    return validationErrorResponse([
      {
        field: 'itensRecebidos',
        message: 'Um ou mais itens informados não pertencem a esta compra',
      },
    ]);
  }

  // 10. VALIDAÇÃO: itens já recebidos
  const itensJaRecebidos = itensExistentes.filter((i) => i.dataRecebimento !== null);
  if (itensJaRecebidos.length > 0) {
    return businessErrorResponse(
      `${itensJaRecebidos.length} item(ns) já foi(ram) recebido(s)`,
      ApiErrorCode.INVALID_STATE,
    );
  }

  // 11. TRANSACTION: Recebe itens + atualiza estoque
  const resultado = await prisma.$transaction(async (tx) => {
    const movimentacoesCriadas = [];

    for (const itemReceber of dados.itensRecebidos) {
      const item = itensExistentes.find((i) => i.id === itemReceber.itemId)!;

      // Se item é de material (direto ou via embalagem), criar movimentação de entrada
      // Determina materialId: pode vir direto ou via embalagem
      const materialIdFinal = item.materialId || item.materialEmbalagem?.materialId;

      if (item.tipoItem === 'MATERIAL' && materialIdFinal) {
        let loteId = item.loteId;

        // Calcula quantidade base (conversão se veio por embalagem)
        let qtyBase = itemReceber.quantidadeRecebida;
        let custoUnitarioBase: number | null = null;
        if (item.materialEmbalagem && item.materialEmbalagem.baseQtyPerUnit) {
          // Converte: quantidade recebida × baseQtyPerUnit
          qtyBase = itemReceber.quantidadeRecebida * Number(item.materialEmbalagem.baseQtyPerUnit);
          // Converte custo por embalagem → custo por unidade base
          if (item.custoUnitario) {
            custoUnitarioBase =
              Number(item.custoUnitario) / Number(item.materialEmbalagem.baseQtyPerUnit);
          }
        } else if (item.custoUnitario) {
          custoUnitarioBase = Number(item.custoUnitario);
        }

        // Cria lote se informado
        if (itemReceber.lote) {
          const novoLote = await tx.materialLote.create({
            data: {
              materialId: materialIdFinal,
              codigoLote: itemReceber.lote.codigoLote,
              dataFabricacao: itemReceber.lote.dataFabricacao,
              dataValidade: itemReceber.lote.dataValidade,
            },
          });
          loteId = novoLote.id;
        }

        // Cria movimentação de entrada (quantidade já convertida para unidade base)
        const movimentacao = await tx.materialMovimentacao.create({
          data: {
            materialId: materialIdFinal,
            tipo: 'ENTRADA',
            quantidade: qtyBase, // Quantidade em unidade base
            custoUnitario: custoUnitarioBase, // Custo por unidade base
            localizacaoDestinoId: itemReceber.localizacaoId,
            loteId,
            compraId: id,
            motivo: item.materialEmbalagem
              ? `Recebimento compra #${id} (${itemReceber.quantidadeRecebida} × ${item.materialEmbalagem.packageType} = ${qtyBase} un. base)`
              : `Recebimento compra #${id}${compra.numeroNf ? ` (NF ${compra.numeroNf})` : ''}`,
            criadoPor: Number(user.id),
          },
        });

        movimentacoesCriadas.push(movimentacao);

        // Atualiza saldo (Manually because upsert with null loteId issues)
        // Check existing
        const existingSaldo = await tx.materialSaldo.findFirst({
          where: {
            materialId: materialIdFinal,
            loteId: loteId ?? null,
            localizacaoId: itemReceber.localizacaoId,
          },
        });

        if (existingSaldo) {
          await tx.materialSaldo.update({
            where: { id: existingSaldo.id },
            data: {
              quantidade: { increment: qtyBase }, // Incrementa em unidade base
            },
          });
        } else {
          await tx.materialSaldo.create({
            data: {
              materialId: materialIdFinal,
              loteId: loteId ?? null,
              localizacaoId: itemReceber.localizacaoId,
              quantidade: qtyBase, // Quantidade em unidade base
              reservado: 0,
            },
          });
        }

        // Recalcula custo médio ponderado e atualiza ultimoCusto no Material
        // MUST be called after saldo update so aggregate reflects this receipt
        if (custoUnitarioBase !== null && custoUnitarioBase > 0) {
          await recalcCustoMedio(tx, materialIdFinal, qtyBase, custoUnitarioBase);
        }
      }

      // Se item é equipamento, atualiza status para DISPONIVEL
      if (item.tipoItem === 'EQUIPAMENTO' && item.equipamentoId && item.equipamento) {
        await tx.equipamento.update({
          where: { id: item.equipamentoId },
          data: {
            status: 'DISPONIVEL',
            // Opcional: registrar observação sobre recebimento
          },
        });
      }

      // Marca item como recebido
      await tx.compraItem.update({
        where: { id: item.id },
        data: {
          dataRecebimento: dados.dataRecebimento,
          recebidoPor: Number(user.id),
        },
      });
    }

    // Verifica se todos itens foram recebidos
    const todosItensAtualizados = await tx.compraItem.findMany({
      where: { compraId: id },
    });

    const todosRecebidos = todosItensAtualizados.every((i) => i.dataRecebimento !== null);

    // Atualiza status da compra
    await tx.compra.update({
      where: { id },
      data: {
        status: todosRecebidos ? 'RECEBIDA' : 'PARCIAL',
        dataEntrega: dados.dataRecebimento,
      },
    });

    // Cria Expense quando compra fica RECEBIDA (idempotente)
    if (todosRecebidos) {
      // Verificar se já existe Expense para esta compra (idempotência)
      const existingExpense = await tx.expense.findFirst({
        where: { compraId: id },
      });

      if (!existingExpense) {
        // Buscar Empresa do usuário
        const empresa = await tx.empresa.findFirst({
          where: { ativo: true },
        });

        if (empresa) {
          // Buscar ou criar categoria "Compras/Estoque"
          let categoria = await tx.expenseCategory.findFirst({
            where: {
              empresaId: empresa.id,
              nome: { contains: 'Compra' },
            },
          });

          if (!categoria) {
            categoria = await tx.expenseCategory.create({
              data: {
                empresaId: empresa.id,
                nome: 'Compras de Estoque',
                cor: '#F59E0B',
              },
            });
          }

          // Buscar compra com fornecedor para preencher dados
          const compraCompleta = await tx.compra.findUnique({
            where: { id },
            include: { fornecedor: true },
          });

          // Criar a Expense vinculada à compra
          await tx.expense.create({
            data: {
              empresaId: empresa.id,
              categoriaId: categoria.id,
              fornecedorId: compraCompleta?.fornecedorId || null,
              descricao: `Compra recebida #${id}${compraCompleta?.numeroNf ? ` (NF ${compraCompleta.numeroNf})` : ''}`,
              valor: compraCompleta?.valorTotal || 0,
              tipo: 'FORNECEDORES',
              formaPagamento: 'BOLETO', // Padrão, ajustar conforme necessidade
              status: 'PENDENTE',
              dataEmissao: compraCompleta?.dataCompra || new Date(),
              dataVencimento: compraCompleta?.dataEntrega || new Date(),
              compraId: id,
              criadoPor: Number(user.id),
            },
          });
        }
      }
    }

    return {
      compra: await tx.compra.findUnique({
        where: { id },
        include: {
          itens: true,
          fornecedor: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      }),
      movimentacoes: movimentacoesCriadas.length,
    };
  });

  // 12. LOG SUCESSO
  logger.info(
    `Compra ${id} recebida: ${dados.itensRecebidos.length} itens, ${resultado.movimentacoes} movimentações`,
    createLogContext(request, user),
  );

  // 13. RESPOSTA
  return successResponse(
    {
      compra: resultado.compra,
      itensRecebidos: dados.itensRecebidos.length,
      movimentacoesCriadas: resultado.movimentacoes,
    },
    `Compra recebida com sucesso: ${dados.itensRecebidos.length} item(ns)`,
  );
}

export const POST = withErrorHandler(handler);
