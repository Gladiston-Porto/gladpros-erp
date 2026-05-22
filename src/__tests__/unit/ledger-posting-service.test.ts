import { postLedgerTransaction } from "@/shared/services/ledgerPostingService"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    ledgerTransaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

const mockLedgerTransaction = prisma.ledgerTransaction as unknown as {
  findUnique: jest.Mock
  create: jest.Mock
}

describe("ledgerPostingService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLedgerTransaction.findUnique.mockResolvedValue(null)
    mockLedgerTransaction.create.mockResolvedValue({ id: 1, entries: [] })
  })

  it("posta uma transação balanceada com duas partidas", async () => {
    await postLedgerTransaction({
      empresaId: 1,
      data: new Date("2025-01-15T12:00:00-06:00"),
      sourceType: "INVOICE_PAYMENT",
      sourceId: 10,
      entries: [
        { accountCode: "CASH", debit: 125 },
        { accountCode: "ACCOUNTS_RECEIVABLE", credit: 125 },
      ],
    })

    expect(mockLedgerTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        empresaId: 1,
        sourceType: "INVOICE_PAYMENT",
        sourceId: 10,
        status: "POSTED",
        entries: expect.objectContaining({
          create: expect.arrayContaining([
            expect.objectContaining({ accountCode: "CASH" }),
            expect.objectContaining({ accountCode: "ACCOUNTS_RECEIVABLE" }),
          ]),
        }),
      }),
    }))
  })

  it("bloqueia transação desbalanceada", async () => {
    await expect(postLedgerTransaction({
      empresaId: 1,
      data: new Date("2025-01-15T12:00:00-06:00"),
      sourceType: "EXPENSE_PAYMENT",
      sourceId: 11,
      entries: [
        { accountCode: "EXPENSE", debit: 100 },
        { accountCode: "CASH", credit: 99 },
      ],
    })).rejects.toThrow("Ledger transaction is not balanced")

    expect(mockLedgerTransaction.create).not.toHaveBeenCalled()
  })

  it("bloqueia valores negativos", async () => {
    await expect(postLedgerTransaction({
      empresaId: 1,
      data: new Date("2025-01-15T12:00:00-06:00"),
      sourceType: "EXPENSE_PAYMENT",
      sourceId: 12,
      entries: [
        { accountCode: "EXPENSE", debit: -100 },
        { accountCode: "CASH", credit: -100 },
      ],
    })).rejects.toThrow("Ledger entries cannot have negative debit or credit")

    expect(mockLedgerTransaction.create).not.toHaveBeenCalled()
  })

  it("bloqueia partida com débito e crédito simultâneos", async () => {
    await expect(postLedgerTransaction({
      empresaId: 1,
      data: new Date("2025-01-15T12:00:00-06:00"),
      sourceType: "OWNER_COMPENSATION",
      sourceId: 13,
      entries: [
        { accountCode: "OWNER_EQUITY_DRAW", debit: 100, credit: 100 },
        { accountCode: "CASH", credit: 100 },
      ],
    })).rejects.toThrow("Ledger entry cannot have both debit and credit")

    expect(mockLedgerTransaction.create).not.toHaveBeenCalled()
  })

  it("reusa transação existente para a mesma origem", async () => {
    mockLedgerTransaction.findUnique.mockResolvedValueOnce({ id: 99, entries: [] })

    const result = await postLedgerTransaction({
      empresaId: 1,
      data: new Date("2025-01-15T12:00:00-06:00"),
      sourceType: "INVOICE_PAYMENT",
      sourceId: 10,
      entries: [
        { accountCode: "CASH", debit: 125 },
        { accountCode: "ACCOUNTS_RECEIVABLE", credit: 125 },
      ],
    })

    expect(result).toEqual({ id: 99, entries: [] })
    expect(mockLedgerTransaction.create).not.toHaveBeenCalled()
  })
})
