/**
 * Prisma Inventory Gateway — Real implementation
 * Integra o domain de projetos com o módulo de estoque via Prisma
 */
import { prisma } from '@/lib/prisma';
import type {
  IInventoryGateway,
  LiberarMaterialDTO,
  DevolverMaterialDTO,
  RespostaIntegracaoEstoque,
  DisponibilidadeMaterial,
} from '../interfaces/inventory-gateway.interface';

export class PrismaInventoryGateway implements IInventoryGateway {
  async liberarMaterial(dados: LiberarMaterialDTO): Promise<RespostaIntegracaoEstoque> {
    // Find the project material to get the actual materialId
    const projetoMaterial = await prisma.projetoMaterial.findUnique({
      where: { id: dados.materialId },
    });

    if (!projetoMaterial) {
      return { sucesso: false, mensagem: `Material de projeto ${dados.materialId} não encontrado` };
    }

    // Find the inventory material by code
    const material = await prisma.material.findFirst({
      where: { codigo: projetoMaterial.codigo ?? undefined },
    });

    if (!material) {
      // Material not tracked in inventory — allow release anyway
      return {
        sucesso: true,
        mensagem: `Material ${projetoMaterial.codigo} não rastreado no estoque — liberação registrada sem movimentação`,
        quantidadeProcessada: Number(dados.quantidade),
        processadoEm: new Date(),
      };
    }

    // Create inventory movement (SAIDA = release to project)
    const movimentacao = await prisma.materialMovimentacao.create({
      data: {
        tipo: 'SAIDA',
        materialId: material.id,
        quantidade: dados.quantidade,
        projetoId: dados.projetoId,
        motivo: dados.observacao ?? `Liberação para projeto ${dados.projetoId}`,
        criadoPor: dados.usuarioId,
      },
    });

    // Update balance: decrement disponivel via reservado
    const saldo = await prisma.materialSaldo.findFirst({
      where: { materialId: material.id },
      orderBy: { quantidade: 'desc' },
    });

    if (saldo) {
      await prisma.materialSaldo.update({
        where: { id: saldo.id },
        data: {
          quantidade: { decrement: dados.quantidade },
        },
      });
    }

    return {
      sucesso: true,
      estoqueExternoId: String(movimentacao.id),
      mensagem: 'Material liberado com sucesso',
      quantidadeProcessada: Number(dados.quantidade),
      processadoEm: new Date(),
    };
  }

  async devolverMaterial(dados: DevolverMaterialDTO): Promise<RespostaIntegracaoEstoque> {
    const projetoMaterial = await prisma.projetoMaterial.findUnique({
      where: { id: dados.materialId },
    });

    if (!projetoMaterial) {
      return { sucesso: false, mensagem: `Material de projeto ${dados.materialId} não encontrado` };
    }

    const material = await prisma.material.findFirst({
      where: { codigo: projetoMaterial.codigo ?? undefined },
    });

    if (!material) {
      return {
        sucesso: true,
        mensagem: `Material ${projetoMaterial.codigo} não rastreado no estoque — devolução registrada`,
        quantidadeProcessada: Number(dados.quantidade),
        processadoEm: new Date(),
      };
    }

    // Choose movement type based on condition
    const tipo = dados.condicao === 'PERDIDO' ? 'PERDA' : 'DEVOLUCAO';

    const movimentacao = await prisma.materialMovimentacao.create({
      data: {
        tipo,
        materialId: material.id,
        quantidade: dados.quantidade,
        projetoId: dados.projetoId,
        motivo: dados.observacao ?? `Devolução do projeto ${dados.projetoId} — ${dados.condicao ?? 'BOM'}`,
        criadoPor: dados.usuarioId,
      },
    });

    // Update balance: increment quantity (unless lost)
    if (tipo !== 'PERDA') {
      const saldo = await prisma.materialSaldo.findFirst({
        where: { materialId: material.id },
        orderBy: { quantidade: 'desc' },
      });

      if (saldo) {
        await prisma.materialSaldo.update({
          where: { id: saldo.id },
          data: {
            quantidade: { increment: dados.quantidade },
          },
        });
      }
    }

    return {
      sucesso: true,
      estoqueExternoId: String(movimentacao.id),
      mensagem: `Material devolvido com sucesso (${dados.condicao ?? 'BOM'})`,
      quantidadeProcessada: Number(dados.quantidade),
      processadoEm: new Date(),
    };
  }

  async consultarDisponibilidade(codigoMaterial: string): Promise<DisponibilidadeMaterial | null> {
    const material = await prisma.material.findUnique({
      where: { codigo: codigoMaterial },
      include: {
        saldos: true,
        unidade: { select: { codigo: true } },
      },
    });

    if (!material) return null;

    const totalDisponivel = material.saldos.reduce(
      (sum: number, s: { disponivel?: unknown; quantidade: unknown }) => sum + Number(s.disponivel ?? s.quantidade),
      0
    );

    return {
      codigoMaterial: material.codigo,
      nomeMaterial: material.nome,
      quantidadeDisponivel: totalDisponivel,
      unidadeMedida: material.unidade?.codigo ?? 'UN',
      atualizadoEm: material.atualizadoEm ?? material.criadoEm,
    };
  }

  async verificarConexao(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
