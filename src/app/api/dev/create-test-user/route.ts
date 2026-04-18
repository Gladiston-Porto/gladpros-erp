import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "NOT_ALLOWED" }, { status: 403 });
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const senha = await bcrypt.hash(String(password), 10);
  // Garantir colunas NOT NULL com defaults vazios e nivel padrão
  await prisma.$executeRawUnsafe(
    `INSERT INTO Usuario (email, senha, status, nivel, endereco1, endereco2, cidade, criadoEm, atualizadoEm)
     VALUES (?, ?, 'ATIVO', 'USUARIO', '', '', '', NOW(), NOW())
     ON DUPLICATE KEY UPDATE senha = VALUES(senha), status = 'ATIVO', atualizadoEm = NOW()`,
    email,
    senha
  );

  return NextResponse.json({ ok: true, email }, { status: 200 });
}
