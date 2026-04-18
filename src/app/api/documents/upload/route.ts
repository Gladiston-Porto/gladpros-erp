// src/app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/shared/lib/rbac';
import { withErrorHandler } from '@/lib/api/error-handler';
import { randomUUID } from 'crypto';

// MIME type → allowed magic bytes (primeiros bytes do arquivo)
const MAGIC_BYTES: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'application/msword': [[0xD0, 0xCF, 0x11, 0xE0]], // DOC
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B, 0x03, 0x04]], // DOCX (ZIP)
  'application/vnd.ms-excel': [[0xD0, 0xCF, 0x11, 0xE0]], // XLS
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [[0x50, 0x4B, 0x03, 0x04]], // XLSX (ZIP)
  'image/jpeg': [[0xFF, 0xD8, 0xFF]], // JPEG
  'image/png': [[0x89, 0x50, 0x4E, 0x47]], // PNG
  'image/gif': [[0x47, 0x49, 0x46, 0x38]], // GIF
  'text/plain': [], // sem magic bytes para texto puro
};

function validateMagicBytes(buffer: Uint8Array, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return false;
  if (signatures.length === 0) return true; // text/plain sem assinatura
  return signatures.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  );
}

function sanitizeFileName(name: string): string {
  // Remove path separators, null bytes e caracteres perigosos
  return name
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\0/g, '')
    .replace(/\.{2,}/g, '_')
    .substring(0, 100);
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const category = formData.get('category') as string;
  const tags = formData.get('tags') as string;

  if (!file) {
    return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 });
  }

  const allowedTypes = Object.keys(MAGIC_BYTES);

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 400 });
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10MB' }, { status: 400 });
  }

  // Validar magic bytes — lê apenas os primeiros 8 bytes
  const arrayBuffer = await file.arrayBuffer();
  const header = new Uint8Array(arrayBuffer.slice(0, 8));
  if (!validateMagicBytes(header, file.type)) {
    return NextResponse.json(
      { error: 'Conteúdo do arquivo não corresponde ao tipo informado' },
      { status: 400 }
    );
  }

  // UUID garante unicidade e evita colisões
  const documentId = randomUUID();
  const safeFileName = sanitizeFileName(file.name);

  // TODO: Em produção, salvar em S3/GCS usando documentId como key
  // Exemplo: await s3.putObject({ Key: `uploads/${documentId}/${safeFileName}`, Body: Buffer.from(arrayBuffer) })

  const document = {
    id: documentId,
    name: safeFileName,
    type: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    uploadedBy: user.nome || user.email,
    category: category || 'geral',
    tags: tags ? tags.split(',').map((tag) => tag.trim()) : [],
    status: 'active' as const,
    versions: 1,
    shared: false,
    // URL não expõe nome do arquivo — acesso controlado via API
    url: `/api/documents/${documentId}`,
  };

  return NextResponse.json(document, { status: 201 });
});
