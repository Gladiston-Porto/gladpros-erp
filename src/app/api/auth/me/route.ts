import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/shared/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withErrorHandler } from '@/lib/api/error-handler';
import { z } from "zod";

export const runtime = "nodejs"

export const GET = withErrorHandler(async (req: NextRequest) => {
  const me = await requireUser(req)

  // Buscar dados completos do usuário no banco
  const userRows = await prisma.$queryRaw<Array<{
    id: number;
    email: string;
    nomeCompleto: string | null;
    telefone: string | null;
    endereco1: string | null;
    endereco2: string | null;
    cidade: string | null;
    estado: string | null;
    zipcode: string | null;
    avatarUrl: string | null;
    dataNascimento: Date | string | null;
    createdAt: Date;
  }>>`
    SELECT id, email, nomeCompleto, telefone, endereco1, endereco2, cidade, estado, zipcode, avatarUrl, dataNascimento, criadoEm as createdAt
    FROM Usuario
    WHERE id = ${Number(me.id)}
    LIMIT 1
  `

  if (!userRows.length) {
    return NextResponse.json({ error: "Usuário não encontrado", success: false }, { status: 404 })
  }

  const user = userRows[0]

  // Normaliza dataNascimento para YYYY-MM-DD (input[type=date])
  let dataNascimento: string | null = null;
  if (user.dataNascimento) {
    const d = user.dataNascimento instanceof Date ? user.dataNascimento : new Date(user.dataNascimento as string);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dataNascimento = `${y}-${m}-${day}`;
    }
  }

  return NextResponse.json({
    success: true,
    id: me.id,
    email: user.email,
    role: me.role,
    status: me.status,
    nome: user.nomeCompleto ?? null,
    nomeCompleto: user.nomeCompleto ?? null,
    telefone: user.telefone ?? null,
    endereco1: user.endereco1 ?? null,
    endereco2: user.endereco2 ?? null,
    cidade: user.cidade ?? null,
    estado: user.estado ?? null,
    zipcode: user.zipcode ?? null,
    avatarUrl: user.avatarUrl ?? null,
    dataNascimento,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt)
  })
});

const UpdateMeSchema = z.object({
  nomeCompleto: z.string().min(2).max(191).optional(),
  telefone: z.string().max(20).optional().or(z.literal("")),
  endereco1: z.string().max(191).optional().or(z.literal("")),
  endereco2: z.string().max(191).optional().or(z.literal("")),
  cidade: z.string().max(96).optional().or(z.literal("")),
  estado: z.string().max(2).optional().or(z.literal("")),
  zipcode: z.string().max(16).optional().or(z.literal("")),
  dataNascimento: z.string().optional().or(z.literal("")),
});

export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const me = await requireUser(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido", success: false }, { status: 400 });
  }

  const parsed = UpdateMeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", message: parsed.error.issues[0]?.message ?? "Dados inválidos", success: false }, { status: 400 });
  }

  const data = parsed.data;
  const userId = Number(me.id);

  // Normalizar dataNascimento se fornecido
  let dataNascimentoIso: string | null = null;
  if (data.dataNascimento) {
    const v = data.dataNascimento.trim();
    const mIso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const mUs = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (mIso) dataNascimentoIso = v;
    else if (mUs) { const [, mm, dd, yyyy] = mUs; dataNascimentoIso = `${yyyy}-${mm}-${dd}`; }
  }

  // Atualizar usando $executeRaw seguro com campos fixos — sem INFORMATION_SCHEMA, sem $executeRawUnsafe
  await prisma.$executeRaw`
    UPDATE Usuario SET
      nomeCompleto = COALESCE(${data.nomeCompleto ?? null}, nomeCompleto),
      telefone = CASE WHEN ${data.telefone !== undefined} THEN ${data.telefone || null} ELSE telefone END,
      endereco1 = CASE WHEN ${data.endereco1 !== undefined} THEN ${data.endereco1 || null} ELSE endereco1 END,
      endereco2 = CASE WHEN ${data.endereco2 !== undefined} THEN ${data.endereco2 || null} ELSE endereco2 END,
      cidade = CASE WHEN ${data.cidade !== undefined} THEN ${data.cidade || null} ELSE cidade END,
      estado = CASE WHEN ${data.estado !== undefined} THEN ${data.estado || null} ELSE estado END,
      zipcode = CASE WHEN ${data.zipcode !== undefined} THEN ${data.zipcode || null} ELSE zipcode END,
      dataNascimento = CASE WHEN ${dataNascimentoIso !== null} THEN ${dataNascimentoIso} ELSE dataNascimento END,
      atualizadoEm = NOW()
    WHERE id = ${userId}
  `;

  return NextResponse.json({ success: true });
});
