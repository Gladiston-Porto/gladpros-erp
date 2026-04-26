import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

const resetAuthStateSchema = z.object({
  email: z.string().email().optional(),
  userId: z.number().int().positive().optional(),
}).refine((data) => data.email || data.userId, {
  message: "Informe email ou userId",
})

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development" && process.env.TEST_MODE !== "true") {
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

  if (!resolvedUserId) {
    return NextResponse.json(
      { error: "Usuário não encontrado", success: false },
      { status: 404 }
    )
  }

  await Promise.all([
    prisma.$executeRaw`DELETE FROM CodigoMFA WHERE usuarioId = ${resolvedUserId}`,
    prisma.$executeRaw`DELETE FROM TentativaLogin WHERE usuarioId = ${resolvedUserId}`,
    prisma.$executeRaw`
      UPDATE Usuario
      SET bloqueado = FALSE, bloqueadoEm = NULL
      WHERE id = ${resolvedUserId}
    `,
  ])

  const globalState = global as unknown as {
    __lastMFA?: { usuarioId: number }
  }
  if (globalState.__lastMFA?.usuarioId === resolvedUserId) {
    delete globalState.__lastMFA
  }

  return NextResponse.json({
    data: { userId: resolvedUserId },
    success: true,
  })
}
