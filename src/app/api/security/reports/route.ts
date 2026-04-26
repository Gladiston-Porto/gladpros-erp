import { NextRequest, NextResponse } from "next/server";
import { SecurityService } from "@/shared/lib/security";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { type Role, can } from '@/shared/lib/rbac-core';

// GET - Relatórios de segurança (apenas ADMIN)
export const GET = withErrorHandler(async (request: NextRequest) => {
    const authUser = await requireUser(request);
    if (!can(authUser.role as Role, 'configuracoes', 'read')) {
        return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'failed-logins';
    const limit = parseInt(searchParams.get('limit') || '100');
    const hours = parseInt(searchParams.get('hours') || '24');
  const userIdParam = searchParams.get('userId');
  const userId = userIdParam ? parseInt(userIdParam) : undefined;

    let data;

    switch (type) {
      case 'login-attempts':
        if (userId && !Number.isNaN(userId)) {
          // Busca tentativas de um usuário específico (tanto sucesso quanto falha)
          data = await SecurityService.getLoginAttemptsByUser(userId, limit);
        } else {
          data = await SecurityService.getLoginAttempts(limit);
        }
        break;
      
      case 'failed-logins':
        data = await SecurityService.getFailedLogins(hours);
        break;
      
      case 'active-sessions':
        data = await SecurityService.getActiveSessions();
        break;
      
      default:
        return NextResponse.json(
          { message: "Tipo de relatório inválido" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      type,
      results: data,
      count: data.length
    });
  });
