// src/app/api/auth/mfa/backup-codes/route.ts
// Geração e consulta de backup codes para MFA
// POST — gera 8 novos códigos (invalida os anteriores, retorna plaintext UMA VEZ)
// GET  — retorna status: total, remaining, generatedAt
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/shared/lib/rbac";
import { withErrorHandler } from "@/lib/api/error-handler";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const BACKUP_CODE_COUNT = 8;
const CODE_LENGTH = 10;

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem I, O, 0, 1 (confusos)
  const maxUnbiased = 256 - (256 % chars.length);
  let out = "";

  while (out.length < CODE_LENGTH) {
    const bytes = randomBytes(CODE_LENGTH);
    for (const byte of bytes) {
      if (byte >= maxUnbiased) continue;
      out += chars[byte % chars.length];
      if (out.length === CODE_LENGTH) break;
    }
  }

  return out;
}

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser(req);

  type Row = { total: number; remaining: number; generatedAt: Date | null };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN usadoEm IS NULL THEN 1 ELSE 0 END) as remaining,
      MAX(criadoEm) as generatedAt
    FROM MfaBackupCode
    WHERE usuarioId = ${Number(user.id)}
  `;

  const row = rows[0] ?? { total: 0, remaining: 0, generatedAt: null };

  return NextResponse.json({
    success: true,
    data: {
      total: Number(row.total ?? 0),
      remaining: Number(row.remaining ?? 0),
      generatedAt: row.generatedAt ?? null,
    },
  });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser(req);
  const userId = Number(user.id);

  // Gerar 8 códigos
  const plainCodes: string[] = [];
  const hashes: string[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = generateCode();
    plainCodes.push(code);
    hashes.push(await bcrypt.hash(code, 10)); // bcrypt rounds 10: backup codes são menos sensíveis
  }

  // Invalidar anteriores e criar novos em transação
  await prisma.$transaction([
    prisma.$executeRaw`DELETE FROM MfaBackupCode WHERE usuarioId = ${userId}`,
    ...hashes.map(hash =>
      prisma.$executeRaw`
        INSERT INTO MfaBackupCode (empresaId, usuarioId, codeHash, criadoEm)
        VALUES (1, ${userId}, ${hash}, NOW())
      `
    ),
  ]);

  // Formata os códigos em grupos de 5 caracteres para facilitar leitura: ABCDE-FGHIJ
  const formatted = plainCodes.map(c => `${c.slice(0, 5)}-${c.slice(5)}`);

  return NextResponse.json({
    success: true,
    data: {
      codes: formatted,
      total: BACKUP_CODE_COUNT,
      warning: "Guarde esses códigos em local seguro. Cada código pode ser usado apenas uma vez. Esta é a única vez que serão exibidos.",
    },
  });
});
