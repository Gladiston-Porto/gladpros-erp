/**
 * POST /api/estoque/compras/upload-nf
 * Upload de nota fiscal (PDF ou imagem) para Cloudinary.
 * Aceita multipart/form-data com campo "file".
 * Retorna a URL pública do arquivo.
 */

import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireUser } from '@/shared/lib/rbac';
import { can } from '@/shared/lib/rbac-core';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Não autenticado', success: false }, { status: 401 });
  }

  if (
    !can(user.role as import('@/shared/lib/rbac-core').Role, 'estoque', 'create') &&
    !can(user.role as import('@/shared/lib/rbac-core').Role, 'estoque', 'update')
  ) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json(
      { error: 'Configuration error', message: 'Cloudinary não configurado', success: false },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Validation failed', message: 'Arquivo não enviado', success: false }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Tipo inválido. Use PDF, JPEG ou PNG.', success: false },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Arquivo muito grande. Máximo 20 MB.', success: false },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const isPdf = file.type === 'application/pdf';

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'gladpros/compras/notas',
          resource_type: isPdf ? 'raw' : 'image',
          ...(isPdf
            ? {}
            : { transformation: [{ quality: 'auto', fetch_format: 'auto' }] }),
        },
        (error, result) => {
          if (error || !result) reject(error ?? new Error('Upload failed'));
          else resolve(result as { secure_url: string; public_id: string });
        }
      ).end(buffer);
    });

    return NextResponse.json({
      data: { url: result.secure_url, publicId: result.public_id, fileName: file.name },
      success: true,
    });
  } catch {
    return NextResponse.json(
      { error: 'Upload failed', message: 'Erro ao fazer upload da nota fiscal', success: false },
      { status: 500 }
    );
  }
}
