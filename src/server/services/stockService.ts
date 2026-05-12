import { prisma } from '@/lib/prisma';
import { stock } from '@/config';

const DEFAULT_LOCATION_ID = stock.defaultLocationId;

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

interface StockOptions {
    localizacaoId?: number;
    userId?: number | null;
}

/**
 * Release all RESERVED materials back to stock when an OS is canceled.
 *
 * For each RESERVED ServiceOrderMaterial with a materialId:
 * 1. Creates a CANCELAMENTO_RESERVA movement
 * 2. Decrements materialSaldo.reservado
 * 3. Sets ServiceOrderMaterial.status to RETURNED (or CONSUMED if partially used)
 *
 * Must be called inside an existing prisma.$transaction.
 */
export async function releaseReservations(
    orderId: number,
    tx: Tx,
    options: StockOptions = {}
): Promise<void> {
    const localizacaoId = options.localizacaoId ?? DEFAULT_LOCATION_ID;

    const materials = await tx.serviceOrderMaterial.findMany({
        where: { serviceOrderId: orderId, status: 'RESERVED', materialId: { not: null } }
    });

    for (const mat of materials) {
        const materialId = mat.materialId!;
        const quantityUsed = Number(mat.quantityUsed || 0);
        const quantityToReturn = Number(mat.quantityPlanned) - quantityUsed;

        if (quantityToReturn <= 0) continue;

        await tx.materialMovimentacao.create({
            data: {
                tipo: 'CANCELAMENTO_RESERVA',
                materialId,
                loteId: null,
                quantidade: quantityToReturn,
                localizacaoOrigemId: localizacaoId,
                localizacaoDestinoId: null,
                projetoId: null,
                motivo: `Cancelamento reserva — encerramento OS #${orderId}`,
                criadoPor: options.userId ?? null,
            },
        });

        const saldo = await tx.materialSaldo.findFirst({
            where: { materialId, loteId: null, localizacaoId },
        });

        if (saldo) {
            await tx.materialSaldo.update({
                where: { id: saldo.id },
                data: { reservado: { decrement: quantityToReturn } },
            });
        }

        await tx.serviceOrderMaterial.update({
            where: { id: mat.id },
            data: {
                status: quantityUsed > 0 ? 'CONSUMED' : 'RETURNED',
                returnedAt: new Date(),
            },
        });
    }
}

/**
 * Consume all RESERVED materials when an OS transitions to COMPLETED.
 *
 * For each RESERVED ServiceOrderMaterial with a materialId:
 * 1. Creates a SAIDA movement (stock actually leaves)
 * 2. Decrements materialSaldo.quantidade AND materialSaldo.reservado
 * 3. Sets ServiceOrderMaterial.status to CONSUMED
 *
 * Must be called inside an existing prisma.$transaction.
 */
export async function consumeMaterials(
    orderId: number,
    tx: Tx,
    options: StockOptions = {}
): Promise<void> {
    const localizacaoId = options.localizacaoId ?? DEFAULT_LOCATION_ID;

    const materials = await tx.serviceOrderMaterial.findMany({
        where: { serviceOrderId: orderId, status: 'RESERVED', materialId: { not: null } }
    });

    // Pre-fetch unit costs to avoid N+1 and to populate SAIDA movements with cost data
    const materialIds = materials.map(m => m.materialId!).filter((id, i, arr) => arr.indexOf(id) === i);
    const materialCosts = await tx.material.findMany({
        where: { id: { in: materialIds } },
        select: { id: true, custoMedio: true, ultimoCusto: true },
    });
    const costMap = new Map(
        materialCosts.map(m => [
            m.id,
            m.custoMedio !== null ? Number(m.custoMedio)
              : m.ultimoCusto !== null ? Number(m.ultimoCusto)
              : null,
        ])
    );

    for (const mat of materials) {
        const materialId = mat.materialId!;
        // Account for any partial consumption that already happened
        const alreadyUsed = Number(mat.quantityUsed || 0);
        const quantity = Number(mat.quantityPlanned) - alreadyUsed;

        if (quantity <= 0) {
            // Already fully consumed; just mark status
            await tx.serviceOrderMaterial.update({
                where: { id: mat.id },
                data: { status: 'CONSUMED', consumedAt: new Date() },
            });
            continue;
        }

        await tx.materialMovimentacao.create({
            data: {
                tipo: 'SAIDA',
                materialId,
                loteId: null,
                quantidade: quantity,
                custoUnitario: costMap.get(materialId) ?? null,
                localizacaoOrigemId: localizacaoId,
                localizacaoDestinoId: null,
                projetoId: null,
                motivo: `Consumo — conclusão OS #${orderId} — ${mat.name}`,
                criadoPor: options.userId ?? null,
            },
        });

        const saldo = await tx.materialSaldo.findFirst({
            where: { materialId, loteId: null, localizacaoId },
        });

        if (saldo) {
            await tx.materialSaldo.update({
                where: { id: saldo.id },
                data: {
                    quantidade: { decrement: quantity },
                    reservado: { decrement: quantity },
                },
            });
        }

        await tx.serviceOrderMaterial.update({
            where: { id: mat.id },
            data: {
                quantityUsed: alreadyUsed + quantity,
                status: 'CONSUMED',
                consumedAt: new Date(),
            },
        });
    }
}
