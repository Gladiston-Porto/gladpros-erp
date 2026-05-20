jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((data: unknown, options?: { status?: number }) => ({
      status: options?.status ?? 200,
      json: async () => data,
    })),
  },
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    usuario: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock("@/shared/lib/rbac", () => ({
  requireUser: jest.fn(),
}))

jest.mock("@/shared/lib/rbac-core", () => ({
  can: jest.fn(),
}))

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/shared/lib/rbac"
import { can } from "@/shared/lib/rbac-core"
import { GET } from "@/app/api/financeiro/aprovadores/route"

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>
const mockCan = can as jest.MockedFunction<typeof can>

const mockRequest = { url: "http://localhost/api/financeiro/aprovadores" } as never

describe("GET /api/financeiro/aprovadores", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireUser.mockResolvedValue({
      id: "1",
      email: "financeiro@gladpros.com",
      role: "FINANCEIRO",
      empresaId: 1,
    } as never)
    mockCan.mockReturnValue(true)
    ;(mockPrisma.usuario.findMany as jest.Mock).mockResolvedValue([
      { id: 1, nomeCompleto: "Admin User", email: "admin@gladpros.com", nivel: "ADMIN" },
    ])
  })

  it("retorna aprovadores ativos permitidos para o financeiro", async () => {
    const response = await GET(mockRequest)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockPrisma.usuario.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        status: "ATIVO",
        nivel: { in: ["ADMIN", "GERENTE", "FINANCEIRO"] },
      },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        nivel: true,
      },
      take: 100,
    }))
  })

  it("bloqueia role sem permissao financeira", async () => {
    mockCan.mockReturnValue(false)

    const response = await GET(mockRequest)
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.success).toBe(false)
    expect(mockPrisma.usuario.findMany).not.toHaveBeenCalled()
  })
})
