// src/app/api/auth/me/avatar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/shared/lib/rbac";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api/error-handler";
import { writeFile, mkdir } from "fs/promises";
import { resolve, join } from "path";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

const AVATARS_DIR = resolve(process.cwd(), "uploads", "avatars");

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Magic bytes para validação real do tipo de arquivo
const MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg": [[0xFF, 0xD8, 0xFF]],
  "image/png": [[0x89, 0x50, 0x4E, 0x47]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38]], // GIF87a ou GIF89a
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header
};

function validateMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const bytes = new Uint8Array(buffer);
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return false;
  return signatures.some(sig => sig.every((byte, i) => bytes[i] === byte));
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const me = await requireUser(req);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado", success: false }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Formato não suportado. Use JPG, PNG, GIF ou WebP.", success: false }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande. Máximo 5MB.", success: false }, { status: 400 });
  }

  // Validar magic bytes — previne upload de executáveis com extensão de imagem
  const bytes = await file.arrayBuffer();
  if (!validateMagicBytes(bytes, file.type)) {
    return NextResponse.json({ error: "Arquivo inválido. O conteúdo não corresponde ao tipo informado.", success: false }, { status: 400 });
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const fileName = `avatar-${me.id}-${Date.now()}.${ext}`;

  // Garantir que o diretório existe
  await mkdir(AVATARS_DIR, { recursive: true });

  // Path traversal protection
  const filePath = resolve(join(AVATARS_DIR, fileName));
  if (!filePath.startsWith(AVATARS_DIR)) {
    return NextResponse.json({ error: "Caminho inválido", success: false }, { status: 400 });
  }

  await writeFile(filePath, Buffer.from(bytes));

  const avatarUrl = `/api/uploads/avatars/${fileName}`;

  // Atualizar avatarUrl diretamente — coluna existe no schema, sem INFORMATION_SCHEMA
  await prisma.$executeRaw`UPDATE Usuario SET avatarUrl = ${avatarUrl}, atualizadoEm = NOW() WHERE id = ${Number(me.id)}`;

  // Invalida o cache do layout do dashboard para que o avatar atualize no header
  revalidatePath('/(dashboard)', 'layout');

  return NextResponse.json({ success: true, avatarUrl });
});

// DELETE - remove a foto de perfil
export const DELETE = withErrorHandler(async (req: NextRequest) => {
  const me = await requireUser(req);

  await prisma.$executeRaw`UPDATE Usuario SET avatarUrl = NULL, atualizadoEm = NOW() WHERE id = ${Number(me.id)}`;

  return NextResponse.json({ success: true });
});
