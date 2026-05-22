// src/app/api/usuarios/alerts/inactive/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import { withErrorHandler } from "@/lib/api/error-handler";
import { z } from "zod";

/**
 * GET /api/usuarios/alerts/inactive?days=30
 *
 * Retorna usuários ATIVOS que não fizeram login há mais de X dias.
 * Inclui também usuários que nunca fizeram login (ultimoLoginEm IS NULL)
 * e já foram criados há mais de X dias (ou seja, não são novos).
 *
 * Usado pelo dashboard de usuários para exibir o stat card "Sem acesso recente"
 * e para triagem administrativa de contas abandonadas.
 *
 * RBAC: apenas roles com acesso de leitura ao módulo usuarios (ADMIN).
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const authUser = await requireUser(req);

  if (!can(authUser.role as Role, "usuarios", "read")) {
    return NextResponse.json(
      { error: "Acesso negado.", success: false },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);

  const querySchema = z.object({
    days: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : 30))
      .refine((v) => v >= 1 && v <= 365, { message: "days deve ser entre 1 e 365" }),
  });

  const parsed = querySchema.safeParse({ days: searchParams.get("days") ?? undefined });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetros inválidos", message: parsed.error.issues[0]?.message, success: false },
      { status: 400 }
    );
  }

  const { days } = parsed.data;

  // Threshold: X dias atrás em UTC
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);

  const rows = await prisma.$queryRaw<
    Array<{
      id: number;
      email: string;
      nomeCompleto: string | null;
      nivel: string | null;
      ultimoLoginEm: Date | null;
      criadoEm: Date;
      avatarUrl: string | null;
    }>
  >`
    SELECT
      id,
      email,
      nomeCompleto,
      nivel,
      ultimoLoginEm,
      criadoEm,
      avatarUrl
    FROM Usuario
    WHERE
      empresaId = ${authUser.empresaId}
      AND status = 'ATIVO'
      AND (
        -- Nunca fez login e a conta tem mais de X dias
        (ultimoLoginEm IS NULL AND criadoEm < ${threshold})
        OR
        -- Fez login mas há mais de X dias
        (ultimoLoginEm IS NOT NULL AND ultimoLoginEm < ${threshold})
      )
    ORDER BY ultimoLoginEm ASC, criadoEm ASC
    LIMIT 100
  `;

  const users = rows.map((u) => ({
    id: u.id,
    email: u.email,
    nomeCompleto: u.nomeCompleto ?? u.email,
    role: u.nivel ?? "USUARIO",
    ultimoLoginEm: u.ultimoLoginEm ? u.ultimoLoginEm.toISOString() : null,
    criadoEm: u.criadoEm.toISOString(),
    avatarUrl: u.avatarUrl ?? null,
    diasSemAcesso: u.ultimoLoginEm
      ? Math.floor((Date.now() - u.ultimoLoginEm.getTime()) / 86_400_000)
      : Math.floor((Date.now() - u.criadoEm.getTime()) / 86_400_000),
  }));

  return NextResponse.json({
    data: {
      count: users.length,
      days,
      threshold: threshold.toISOString(),
      users,
    },
    success: true,
  });
});
