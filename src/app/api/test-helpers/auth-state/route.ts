import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { clearRateLimitsByPattern } from "@/shared/lib/rate-limit"

export const runtime = "nodejs"

// Known passwords for QA seed users — only used to restore state in test environments.
// These values must stay in sync with tests/e2e/helpers/auth.ts QA_USERS map.
const QA_SEED_PASSWORDS: Record<number, string> = {
  13: 'Admin123!@#',   // qa.admin.clientes@teste.local
  14: 'Admin123!@#',   // qa.gerente@teste.local
  15: 'Admin123!@#',   // qa.financeiro@teste.local
  16: 'Admin123!@#',   // qa.estoque@teste.local
  17: 'Admin123!@#',   // qa.usuario@teste.local
}

const resetAuthStateSchema = z.object({
  email: z.string().email().optional(),
  userId: z.number().int().positive().optional(),
}).refine((data) => data.email || data.userId, {
  message: "Informe email ou userId",
})

export async function POST(req: NextRequest) {
  const isTestEnv = process.env.NODE_ENV === "development"
    || process.env.TEST_MODE === "true"
    || process.env.E2E_MODE === "1";

  if (!isTestEnv) {
    return NextResponse.json(
      { error: "Endpoint disponível apenas em desenvolvimento ou TEST_MODE", success: false },
      { status: 403 }
    )
  }

  const raw = await req.json().catch(() => ({}))
  const parsed = resetAuthStateSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        message: parsed.error.issues[0]?.message ?? "Dados inválidos",
        success: false,
      },
      { status: 400 }
    )
  }

  let resolvedUserId = parsed.data.userId

  if (!resolvedUserId && parsed.data.email) {
    const users = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id
      FROM Usuario
      WHERE email = ${parsed.data.email}
      LIMIT 1
    `
    resolvedUserId = users[0]?.id
  }

  // User not found is acceptable — nothing DB-level to reset
  if (resolvedUserId) {
    const seedPassword = QA_SEED_PASSWORDS[resolvedUserId]
    const passwordHash = seedPassword ? await bcrypt.hash(seedPassword, 12) : null

    await Promise.all([
      prisma.$executeRaw`DELETE FROM CodigoMFA WHERE usuarioId = ${resolvedUserId}`,
      prisma.$executeRaw`DELETE FROM TentativaLogin WHERE usuarioId = ${resolvedUserId}`,
      passwordHash
        ? prisma.$executeRaw`
            UPDATE Usuario
            SET bloqueado = FALSE, bloqueadoEm = NULL, tokenVersion = 0, senha = ${passwordHash}
            WHERE id = ${resolvedUserId}
          `
        : prisma.$executeRaw`
            UPDATE Usuario
            SET bloqueado = FALSE, bloqueadoEm = NULL, tokenVersion = 0
            WHERE id = ${resolvedUserId}
          `,
    ])

    const globalState = global as unknown as {
      __lastMFA?: { usuarioId: number }
    }
    if (globalState.__lastMFA?.usuarioId === resolvedUserId) {
      delete globalState.__lastMFA
    }
  }

  // Clear all in-memory rate limits so subsequent tests start with a clean slate
  clearRateLimitsByPattern();

  return NextResponse.json({
    data: { userId: resolvedUserId ?? null },
    success: true,
  })
}
