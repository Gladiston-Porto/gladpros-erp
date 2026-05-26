import { prisma } from '@/lib/prisma';
import type { LedgerAccountCode, LedgerSourceType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

type TransactionClient = Prisma.TransactionClient;

export interface LedgerEntryInput {
  accountCode: LedgerAccountCode;
  debit?: number | Decimal;
  credit?: number | Decimal;
  memo?: string;
}

export interface LedgerPostInput {
  empresaId: number;
  data: Date;
  descricao?: string;
  sourceType: LedgerSourceType;
  sourceId: number;
  entries: LedgerEntryInput[];
}

function toDecimal(value: number | Decimal | undefined): Decimal {
  return value instanceof Decimal ? value : new Decimal(value ?? 0);
}

function validateBalancedEntries(entries: LedgerEntryInput[]) {
  if (entries.length < 2) {
    throw new Error('Ledger transaction must have at least two entries');
  }

  const totals = entries.reduce(
    (acc, entry) => {
      const debit = toDecimal(entry.debit);
      const credit = toDecimal(entry.credit);
      if (debit.lt(0) || credit.lt(0)) {
        throw new Error('Ledger entries cannot have negative debit or credit');
      }
      if (debit.gt(0) && credit.gt(0)) {
        throw new Error('Ledger entry cannot have both debit and credit');
      }
      return {
        debit: acc.debit.plus(debit),
        credit: acc.credit.plus(credit),
      };
    },
    { debit: new Decimal(0), credit: new Decimal(0) },
  );

  if (!totals.debit.equals(totals.credit)) {
    throw new Error('Ledger transaction is not balanced');
  }

  if (totals.debit.equals(0)) {
    throw new Error('Ledger transaction total must be greater than zero');
  }
}

export async function postLedgerTransaction(
  input: LedgerPostInput,
  tx: TransactionClient = prisma,
) {
  validateBalancedEntries(input.entries);

  const existing = await tx.ledgerTransaction.findUnique({
    where: {
      empresaId_sourceType_sourceId: {
        empresaId: input.empresaId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
    },
    include: { entries: true },
  });

  if (existing) return existing;

  return tx.ledgerTransaction.create({
    data: {
      empresaId: input.empresaId,
      data: input.data,
      descricao: input.descricao ?? null,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      status: 'POSTED',
      entries: {
        create: input.entries.map((entry) => ({
          empresaId: input.empresaId,
          accountCode: entry.accountCode,
          debit: toDecimal(entry.debit),
          credit: toDecimal(entry.credit),
          memo: entry.memo ?? null,
        })),
      },
    },
    include: { entries: true },
  });
}
