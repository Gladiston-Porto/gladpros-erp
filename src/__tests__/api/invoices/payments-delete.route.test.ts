jest.mock("next/server", () => ({
  NextRequest: jest.fn().mockImplementation((url: string) => ({
    url,
    method: "DELETE",
    nextUrl: { searchParams: new URLSearchParams() },
    headers: { get: () => null },
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data: unknown, options?: { status?: number }) => ({
      status: options?.status ?? 200,
      _data: data,
    })),
  },
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    invoicePayment: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    invoice: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    bankAccount: {
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
    bankTransaction: {
      create: jest.fn(),
    },
    ledgerTransaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    revenue: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock("@/shared/lib/rbac", () => ({
  requireUser: jest.fn(),
  can: jest.fn(),
}))

jest.mock("@/lib/api/error-handler", () => ({
  withErrorHandler: jest.fn().mockImplementation((handler: Function) => async (...args: unknown[]) => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHENTICATED") {
        return { status: 401, _data: { error: "Unauthorized", success: false } }
      }
      return { status: 500, _data: { error: "Internal server error", success: false } }
    }
  }),
}))

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireUser, can } from "@/shared/lib/rbac"

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>
const mockCan = can as jest.MockedFunction<typeof can>

const mockUser = {
  id: "user-1",
  email: "admin@gladpros.com",
  role: "ADMIN",
  empresaId: 1,
  nivel: 1,
}

function makeRequest() {
  return new NextRequest("http://localhost/api/invoices/1/payments/10")
}

function makeContext(invoiceId = "1", paymentId = "10") {
  return { params: Promise.resolve({ id: invoiceId, paymentId }) }
}

describe("DELETE /api/invoices/[id]/payments/[paymentId]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireUser.mockResolvedValue(mockUser as never)
    mockCan.mockReturnValue(true)
    ;(mockPrisma.$transaction as jest.Mock).mockImplementation((cb: Function) => cb(mockPrisma))
    ;(mockPrisma.invoicePayment.findUnique as jest.Mock).mockResolvedValue({
      id: 10,
      invoiceId: 1,
      valor: 250,
      dataPagamento: new Date("2025-02-01T12:00:00-06:00"),
      bankAccountId: 9,
    })
    ;(mockPrisma.invoicePayment.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
    ;(mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      status: "PARTIAL_PAID",
      valorPago: 250,
      valorTotal: 1000,
      empresaId: 1,
      dataPagamento: new Date("2025-02-01T12:00:00-06:00"),
    })
    ;(mockPrisma.bankAccount.findFirst as jest.Mock).mockResolvedValue({
      id: 9,
      saldoAtual: 500,
    })
    ;(mockPrisma.bankAccount.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      saldoAtual: 250,
    })
    ;(mockPrisma.invoice.update as jest.Mock).mockResolvedValue({
      id: 1,
      status: "SENT",
      valorPago: 0,
      saldo: 1000,
      valorTotal: 1000,
    })
    ;(mockPrisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
    ;(mockPrisma.ledgerTransaction.findUnique as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.ledgerTransaction.create as jest.Mock).mockResolvedValue({ id: 88, entries: [] })
    ;(mockPrisma.invoicePayment.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
    ;(mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({})
    ;(mockPrisma.bankTransaction.create as jest.Mock).mockResolvedValue({})
    ;(mockPrisma.bankAccount.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
    ;(mockPrisma.revenue.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })
  })

  it("estorna pagamento com reversão de ledger, banco e receita específica", async () => {
    const { DELETE } = await import("@/app/api/invoices/[id]/payments/[paymentId]/route")

    const res = await DELETE(makeRequest(), makeContext())

    expect(res.status).toBe(200)
    expect(mockPrisma.ledgerTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        sourceType: "REVERSAL",
        sourceId: 10,
      }),
    }))
    expect(mockPrisma.bankTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        accountId: 9,
        tipo: "DEBITO",
        categoria: "INVOICE_PAYMENT_REVERSAL",
      }),
    }))
    expect(mockPrisma.bankAccount.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 9, empresaId: 1 }),
      data: expect.objectContaining({ saldoAtual: expect.objectContaining({ decrement: expect.anything() }) }),
    }))
    expect(mockPrisma.revenue.deleteMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        descricao: "Invoice #1 - pagamento #10",
      }),
    }))
  })

  it("bloqueia estorno quando a conta bancaria nao tem saldo suficiente", async () => {
    ;(mockPrisma.bankAccount.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 9,
      saldoAtual: 100,
    })

    const { DELETE } = await import("@/app/api/invoices/[id]/payments/[paymentId]/route")
    const res = await DELETE(makeRequest(), makeContext())

    expect(res.status).toBe(400)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })
})
