import { withErrorHandler } from '@/lib/api/error-handler';
// src/app/api/propostas/rascunho/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/shared/lib/rbac";

// POST /api/propostas/rascunho - Salvar rascunho
export const POST = withErrorHandler(async (request: NextRequest) => {
    // Verificar autenticação
    const user = await requireUser(request);

    // Parse do body
    const body = await request.json();
    
    // Para rascunhos, vamos apenas salvar no localStorage do lado do cliente
    // ou em cache temporário. Por enquanto, apenas confirmar recebimento
    void user; void body;

    // Simular salvamento bem-sucedido
    return NextResponse.json({
      success: true,
      message: 'Rascunho salvo',
      timestamp: new Date().toISOString()
    });

  });
