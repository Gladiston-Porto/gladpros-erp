/**
 * API para servir arquivos estáticos do diretório uploads
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, resolve } from "path";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';

const UPLOADS_DIR = resolve(process.cwd(), 'uploads');

export const GET = withErrorHandler(async (req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }) => {
    const { path: pathSegments } = await params;

    // Avatares são fotos de perfil públicas — o next/image optimizer não envia
    // cookies, então bypassamos auth apenas para o subdiretório avatars/
    const isAvatar = pathSegments[0] === 'avatars';

    if (!isAvatar) {
      await requireUser(req);
    }

    // Rejeitar segmentos com ".."
    if (pathSegments.some(seg => seg === '..' || seg.includes('\0'))) {
      return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
    }

    const filePath = resolve(join(UPLOADS_DIR, ...pathSegments));

    // Path traversal protection: garantir que o caminho resolvido está dentro de uploads/
    if (!filePath.startsWith(UPLOADS_DIR + '/') && filePath !== UPLOADS_DIR) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(filePath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT' || code === 'EISDIR') {
        return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
      }
      throw error;
    }

    // Determinar o tipo MIME baseado na extensão
    const extension = filePath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';

    switch (extension) {
      case 'pdf':
        contentType = 'application/pdf';
        break;
      case 'doc':
        contentType = 'application/msword';
        break;
      case 'docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case 'xls':
        contentType = 'application/vnd.ms-excel';
        break;
      case 'xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'txt':
        contentType = 'text/plain';
        break;
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
    }

    // Retornar o arquivo
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache por 1 ano
      },
    });
  });
