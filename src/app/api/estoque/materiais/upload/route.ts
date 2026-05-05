/**
 * POST /api/estoque/materiais/upload
 * Upload de foto de material para Cloudinary.
 * Aceita multipart/form-data com campo "file" (imagem).
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

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB (Cloudinary free limit)

export async function POST(request: NextRequest) {
  // Auth
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Não autenticado', success: false }, { status: 401 });
  }

  // RBAC — precisa de permissão de escrita no estoque
  if (!can(user.role as import('@/shared/lib/rbac-core').Role, 'estoque', 'create') &&
      !can(user.role as import('@/shared/lib/rbac-core').Role, 'estoque', 'update')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }

  // Configuração validada
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

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Tipo de arquivo inválido. Use JPEG, PNG ou WebP.', success: false },
        { status: 400 }
      );
    }

    // Validar tamanho
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Arquivo muito grande. Máximo 10 MB.', success: false },
        { status: 400 }
      );
    }

    // Converter para buffer e fazer upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'gladpros/materiais',
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error || !result) reject(error ?? new Error('Upload failed'));
          else resolve(result as { secure_url: string; public_id: string });
        }
      ).end(buffer);
    });

    return NextResponse.json({
      data: { url: result.secure_url, publicId: result.public_id },
      success: true,
    });
  } catch {
    return NextResponse.json(
      { error: 'Upload failed', message: 'Erro ao fazer upload da imagem', success: false },
      { status: 500 }
    );
  }
}
