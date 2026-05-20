/**
 * Workforce Service (v2.1)
 *
 * Core functions for the Workforce/Contractor Payments module.
 */

import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { postLedgerTransaction } from '@/shared/services/ledgerPostingService';
import {
    PayType,
    AssignmentStatus,
    AssignmentSource,
    TimesheetStatus,
    TimesheetEntryStatus,
    MilestoneStatus,
    PayableStatus,
    PayableSource,
    PaymentMethod
} from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface GetOrCreateAssignmentParams {
    workerId: number;
    jobId?: number | null;
    projectId?: number | null;
    payType?: PayType;
    costRateHourly?: number;
    fixedCostAmount?: number;
    role?: string;
    createdById: number;
}

export interface GeneratePayableParams {
    workerId: number;
    periodStart?: Date;
    periodEnd?: Date;
    createdById: number;
}

export interface MarkPayableAsPaidParams {
    payableId: number;
    paidById: number;
    empresaId: number;
    paymentMethod: PaymentMethod;
    bankAccountId: number;
    paymentRef?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Busca ou cria categoria de despesa para Contract Labor
 */
async function getOrCreateContractLaborCategory(empresaId: number): Promise<number> {
    const NOME = 'Contract Labor / Subcontractors';

    let category = await prisma.expenseCategory.findFirst({
        where: { empresaId, nome: NOME }
    });

    if (!category) {
        category = await prisma.expenseCategory.create({
            data: {
                empresaId,
                nome: NOME,
            }
        });
    }

    return category.id;
}

// ============================================================================
// COMPAT LAYER: getOrCreateAssignmentDefault
// ============================================================================

/**
 * Idempotent function to get or create an Assignment.
 *
 * If called multiple times with same params, returns existing Assignment.
 * Creates audit log when auto-creating via COMPAT_LAYER.
 */
export async function getOrCreateAssignmentDefault(
    params: GetOrCreateAssignmentParams
) {
    const workerId = params.workerId;
    const payType = params.payType || PayType.HOURLY;
    const effectiveFrom = new Date();
    effectiveFrom.setHours(0, 0, 0, 0);

    // Try to find existing active assignment
    const existing = await prisma.assignment.findFirst({
        where: {
            workerId,
            jobId: params.jobId || null,
            projectId: params.projectId || null,
            payType,
            status: AssignmentStatus.ACTIVE,
            effectiveTo: null
        },
        orderBy: { effectiveFrom: 'desc' }
    });

    if (existing) {
        return existing;
    }

    // Get default rate from Worker's financial profile
    let rate = params.costRateHourly;
    if (!rate && payType === PayType.HOURLY) {
        const worker = await prisma.worker.findUnique({
            where: { id: workerId }
        });
        rate = worker?.defaultHourlyRate?.toNumber() || 0;
    }

    // Create new Assignment
    const created = await prisma.assignment.create({
        data: {
            workerId,
            jobId: params.jobId,
            projectId: params.projectId,
            payType,
            costRateHourly: payType === PayType.HOURLY ? rate : null,
            fixedCostAmount: payType === PayType.FIXED ? params.fixedCostAmount : null,
            effectiveFrom,
            status: AssignmentStatus.ACTIVE,
            role: params.role,
            source: AssignmentSource.COMPAT_LAYER,
            createdById: params.createdById
        }
    });

    // Audit log
    await prisma.auditoria.create({
        data: {
            usuarioId: params.createdById,
            tabela: 'assignments',
            registroId: created.id,
            acao: 'CREATE',
            payload: JSON.stringify({
                dadosAntigos: null,
                dadosNovos: {
                    source: 'COMPAT_LAYER',
                    workerId,
                    jobId: params.jobId,
                    projectId: params.projectId
                }
            })
        }
    });

    return created;
}

// ============================================================================
// TIMESHEET WORKFLOW
// ============================================================================

/**
 * Submit a timesheet for approval.
 */
export async function submitTimesheet(timesheetId: number, submittedById: number) {
    const timesheet = await prisma.timesheet.findUnique({
        where: { id: timesheetId }
    });

    if (!timesheet) {
        throw new Error(`Timesheet #${timesheetId} não encontrado`);
    }

    if (timesheet.status !== TimesheetStatus.DRAFT) {
        throw new Error(`Timesheet precisa estar em DRAFT para ser submetido. Status atual: ${timesheet.status}`);
    }

    return prisma.timesheet.update({
        where: { id: timesheetId },
        data: {
            status: TimesheetStatus.SUBMITTED,
            submittedAt: new Date(),
            submittedById
        }
    });
}

/**
 * Approve a submitted timesheet.
 */
export async function approveTimesheet(timesheetId: number, approvedById: number) {
    const timesheet = await prisma.timesheet.findUnique({
        where: { id: timesheetId },
        include: {
            entries: true,
            assignment: true
        }
    });

    if (!timesheet) {
        throw new Error(`Timesheet #${timesheetId} não encontrado`);
    }

    if (timesheet.status !== TimesheetStatus.SUBMITTED) {
        throw new Error(`Timesheet precisa estar SUBMITTED para ser aprovado. Status atual: ${timesheet.status}`);
    }

    // Calculate totals
    const totalHours = timesheet.entries.reduce(
        (sum, entry) => sum + Number(entry.hours), 0
    );
    const hourlyRate = Number(timesheet.assignment.costRateHourly || 0);
    const totalCost = totalHours * hourlyRate;

    return prisma.$transaction([
        prisma.timesheet.update({
            where: { id: timesheetId },
            data: {
                status: TimesheetStatus.APPROVED,
                approvedAt: new Date(),
                approvedById,
                totalHours,
                totalCost
            }
        }),
        prisma.timesheetEntry.updateMany({
            where: { timesheetId },
            data: { status: TimesheetEntryStatus.APPROVED }
        })
    ]);
}

/**
 * Approve a milestone.
 */
export async function approveMilestone(milestoneId: number, approvedById: number) {
    const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId }
    });

    if (!milestone) {
        throw new Error(`Milestone #${milestoneId} não encontrado`);
    }

    if (milestone.status !== MilestoneStatus.SUBMITTED) {
        throw new Error(`Milestone precisa estar SUBMITTED para ser aprovado. Status atual: ${milestone.status}`);
    }

    return prisma.milestone.update({
        where: { id: milestoneId },
        data: {
            status: MilestoneStatus.APPROVED,
            approvedAt: new Date(),
            approvedById
        }
    });
}

// ============================================================================
// PAYABLE GENERATION (with automatic LOCK)
// ============================================================================

/**
 * Generate a Payable from approved Timesheets and Milestones.
 * 
 * IMPORTANT: Automatically LOCKs all included items.
 */
export async function generatePayable(params: GeneratePayableParams) {
    const { workerId, periodStart, periodEnd, createdById } = params;

    return prisma.$transaction(async (tx) => {

        // 1. Find approved Timesheets
        const timesheets = await tx.timesheet.findMany({
            where: {
                assignment: { workerId },
                status: TimesheetStatus.APPROVED,
                ...(periodStart && { periodStart: { gte: periodStart } }),
                ...(periodEnd && { periodEnd: { lte: periodEnd } })
            },
            include: {
                entries: true,
                assignment: true
            }
        });

        // 2. Find approved Milestones
        const milestones = await tx.milestone.findMany({
            where: {
                assignment: { workerId },
                status: MilestoneStatus.APPROVED
            },
            include: { assignment: true }
        });

        if (timesheets.length === 0 && milestones.length === 0) {
            throw new Error('Nenhum item aprovado encontrado para gerar Payable');
        }

        // 3. Calculate total
        const timesheetTotal = timesheets.reduce(
            (sum, t) => sum + Number(t.totalCost), 0
        );
        const milestoneTotal = milestones.reduce(
            (sum, m) => sum + Number(m.amount), 0
        );
        const totalAmount = timesheetTotal + milestoneTotal;

        // 4. Create Payable
        const payable = await tx.payable.create({
            data: {
                workerId,
                periodStart: periodStart || timesheets[0]?.periodStart,
                periodEnd: periodEnd || timesheets[timesheets.length - 1]?.periodEnd,
                status: PayableStatus.PENDING,
                totalAmount,
                createdFrom: timesheets.length > 0 ? PayableSource.TIMESHEET : PayableSource.MILESTONE,
                createdById
            }
        });

        // 5. Create LineItems from Timesheets
        for (const ts of timesheets) {
            for (const entry of ts.entries) {
                await tx.payableLineItem.create({
                    data: {
                        payableId: payable.id,
                        jobId: entry.jobId || ts.assignment.jobId,
                        projectId: entry.projectId || ts.assignment.projectId,
                        description: `Horas ${entry.date.toISOString().split('T')[0]}`,
                        quantity: entry.hours,
                        unitCost: ts.assignment.costRateHourly || 0,
                        lineTotal: Number(entry.hours) * Number(ts.assignment.costRateHourly || 0),
                        sourceType: 'TIMESHEET_ENTRY',
                        sourceId: entry.id
                    }
                });
            }
        }

        // 6. Create LineItems from Milestones
        for (const ms of milestones) {
            await tx.payableLineItem.create({
                data: {
                    payableId: payable.id,
                    jobId: ms.jobId || ms.assignment.jobId,
                    projectId: ms.projectId || ms.assignment.projectId,
                    description: ms.description,
                    quantity: 1,
                    unitCost: ms.amount,
                    lineTotal: ms.amount,
                    sourceType: 'MILESTONE',
                    sourceId: ms.id
                }
            });
        }

        // 7. LOCK all included items
        await tx.timesheet.updateMany({
            where: { id: { in: timesheets.map(t => t.id) } },
            data: { status: TimesheetStatus.LOCKED }
        });

        await tx.timesheetEntry.updateMany({
            where: { timesheetId: { in: timesheets.map(t => t.id) } },
            data: { status: TimesheetEntryStatus.LOCKED }
        });

        await tx.milestone.updateMany({
            where: { id: { in: milestones.map(m => m.id) } },
            data: { status: MilestoneStatus.LOCKED }
        });

        return payable;
    });
}

// ============================================================================
// PAYABLE PAYMENT (with Expense creation - NO HARDCODE)
// ============================================================================

/**
 * Mark a Payable as PAID.
 * Creates an Expense record linked to the Payable.
 * 
 * REFATORADO: empresaId e categoriaId vêm do contexto, não hardcoded.
 */
export async function markPayableAsPaid(params: MarkPayableAsPaidParams) {
    const { payableId, paidById, empresaId, paymentMethod, bankAccountId, paymentRef } = params;

    return prisma.$transaction(async (tx) => {
        // 1. Get Payable with Worker
        const payable = await tx.payable.findUniqueOrThrow({
            where: { id: payableId },
            include: { worker: true }
        });

        if (payable.status !== PayableStatus.APPROVED) {
            throw new Error(`Payable precisa estar APPROVED para ser pago. Status atual: ${payable.status}`);
        }

        if (payable.expenseId) {
            throw new Error(`Payable #${payableId} já foi pago (Expense #${payable.expenseId})`);
        }

        if (!payable.worker) {
            throw new Error(`Payable #${payableId} não tem Worker vinculado`);
        }

        const claimed = await tx.payable.updateMany({
            where: {
                id: payableId,
                status: PayableStatus.APPROVED,
                expenseId: null,
            },
            data: {
                status: PayableStatus.PAID,
                paidAt: new Date(),
                paidById,
                paymentMethod,
                paymentRef,
            },
        });
        if (claimed.count !== 1) {
            throw new Error(`Payable #${payableId} já foi pago ou não está disponível para pagamento`);
        }

        // 2. Categoria e lançamentos no contexto da empresa autenticada.
        const categoriaId = await getOrCreateContractLaborCategory(empresaId);
        const amount = new Decimal(payable.totalAmount);
        const account = await tx.bankAccount.findFirst({
            where: { id: bankAccountId, empresaId, ativo: true },
            select: { id: true, saldoAtual: true, limiteCredito: true },
        });
        if (!account) {
            throw new Error('Conta bancária não encontrada ou inativa');
        }

        // 3. Create Expense
        const expense = await tx.expense.create({
            data: {
                empresaId,
                categoriaId,
                descricao: `Pagamento Worker: ${payable.worker.name}`,
                 
                valor: payable.totalAmount,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tipo: 'SERVI\u00c7OS' as any,
                dataEmissao: new Date(),
                 
                dataVencimento: new Date(),
                 
                dataPagamento: new Date(),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                status: 'PAGA' as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formaPagamento: paymentMethod as any,
                observacoes: `Payable #${payable.id} | Worker #${payable.workerId} | Ref: ${paymentRef || 'N/A'}`
            }
        });

        const availableBalance = new Decimal(account.saldoAtual).plus(account.limiteCredito ?? 0);
        if (availableBalance.lt(amount)) {
            throw new Error('Saldo insuficiente na conta bancária');
        }

        const accountClaim = await tx.bankAccount.updateMany({
            where: {
                id: bankAccountId,
                empresaId,
                saldoAtual: {
                    gte: amount.minus(account.limiteCredito ?? 0),
                },
            },
            data: {
                saldoAtual: { decrement: amount },
            },
        });
        if (accountClaim.count === 0) {
            throw new Error('Saldo insuficiente na conta bancária');
        }

        const updatedAccount = await tx.bankAccount.findUniqueOrThrow({
            where: { id: bankAccountId },
            select: { saldoAtual: true },
        });

        await tx.bankTransaction.create({
            data: {
                accountId: bankAccountId,
                empresaId,
                tipo: 'DEBITO',
                categoria: 'WORKFORCE_PAYABLE',
                valor: amount,
                descricao: `Pagamento Worker: ${payable.worker.name}`,
                documento: paymentRef,
                dataTransacao: new Date(),
                saldoAnterior: new Decimal(updatedAccount.saldoAtual).plus(amount),
                saldoPosterior: updatedAccount.saldoAtual,
                expenseId: expense.id,
                observacoes: `Payable #${payable.id} | Worker #${payable.workerId}`,
            }
        });

        await postLedgerTransaction(
            {
                empresaId,
                data: new Date(),
                descricao: `Pagamento payable #${payable.id} - ${payable.worker.name}`,
                sourceType: 'EXPENSE_PAYMENT',
                sourceId: expense.id,
                entries: [
                    {
                        accountCode: 'EXPENSE',
                        debit: amount,
                        memo: `Payable #${payable.id}`,
                    },
                    {
                        accountCode: 'CASH',
                        credit: amount,
                        memo: `Bank account #${bankAccountId}`,
                    },
                ],
            },
            tx,
        );

        // 4. Update Payable
        const updatedPayable = await tx.payable.update({
            where: { id: payableId },
            data: {
                expenseId: expense.id
            }
        });

        // 5. Audit log
        await tx.auditoria.create({
            data: {
                usuarioId: paidById,
                tabela: 'payables',
                registroId: payableId,
                acao: 'UPDATE',
                payload: JSON.stringify({
                    dadosAntigos: { status: PayableStatus.APPROVED },
                    dadosNovos: {
                        status: PayableStatus.PAID,
                        expenseId: expense.id,
                        paymentMethod,
                        paymentRef
                    }
                })
            }
        });

        return { payable: updatedPayable, expense };
    });
}
