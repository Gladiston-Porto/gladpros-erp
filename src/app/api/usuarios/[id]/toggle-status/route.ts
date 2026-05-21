// src/app/api/usuarios/[id]/toggle-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/shared/lib/rbac";
import { withErrorHandler } from '@/lib/api/error-handler';
import { AuditLogger } from "@/shared/lib/audit";
import { UserRole, canManageRole } from "@/shared/lib/user-hierarchy";
import { can, type Role } from "@/shared/lib/rbac-core";
import { logger } from "@/lib/api/logger";

export const PUT = withErrorHandler(async (req: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    // Verificar autenticação
    const user = await requireUser(req);

    // Verificar se usuário tem permissão via RBAC
    if (!can(user.role as Role, 'usuarios', 'update')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Acesso negado. Apenas administradores podem alterar status de usuários.', success: false },
        { status: 403 }
      );
    }

    const params = await context.params;
    const id = Number(params.id);

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "Bad Request", message: "ID inválido", success: false }, { status: 400 });
    }

    // Verificar se o usuário existe
    const existingUser = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, status: true, email: true, nivel: true }
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Not Found", message: "Usuário não encontrado", success: false }, { status: 404 });
    }

    // Impedir que usuário desative a si mesmo
    if (Number(user.id) === id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Não é possível alterar o status da própria conta", success: false },
        { status: 400 }
      );
    }

    // Hierarquia: só pode gerenciar quem está abaixo na pirâmide
    const targetRoleRaw = String(existingUser.nivel ?? '').toUpperCase();
    if ((Object.values(UserRole) as string[]).includes(targetRoleRaw)) {
      if (!canManageRole(user.role as UserRole, targetRoleRaw as UserRole)) {
        return NextResponse.json(
          { error: "Forbidden", message: "Você não pode gerenciar este usuário.", success: false },
          { status: 403 }
        );
      }
    }

    // Toggle status
    const newStatus = existingUser.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';

    // Dead-man ADMIN: impedir desativar o último ADMIN
    if (targetRoleRaw === 'ADMIN' && newStatus === 'INATIVO') {
      const otherActiveAdmins = (await prisma.$queryRaw<Array<{ cnt: bigint | number }>>`
        SELECT COUNT(*) AS cnt FROM Usuario
        WHERE nivel = 'ADMIN' AND status = 'ATIVO' AND id <> ${id}
      `)[0];
      if (Number(otherActiveAdmins?.cnt ?? 0) === 0) {
        return NextResponse.json(
          { error: "Bad Request", message: "Não é possível desativar o último ADMIN ativo do sistema.", success: false },
          { status: 400 }
        );
      }
    }

    // Atualizar usuário
    // Ao desativar: incrementar tokenVersion para invalidar todos os JWTs existentes
    // quando RBAC_TRUST_JWT=0 (DB é consultado por request, versão invalida imediatamente).
    // Com RBAC_TRUST_JWT=1: tokenVersion é ignorado — o bloqueio ocorre apenas quando
    // o cookie expirar (~8h) ou o JWT bruto expirar (7d). Para bloqueio imediato,
    // rotacionar JWT_SECRET no ambiente (invalida todos os tokens globalmente).
    await prisma.usuario.update({
      where: { id },
      data: {
        status: newStatus,
        ...(newStatus === 'INATIVO' ? { tokenVersion: { increment: 1 } } : {}),
        atualizadoEm: new Date()
      }
    });

    // Registrar auditoria
    try {
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      await AuditLogger.log({
        userId: Number(user.id),
        action: 'UPDATE_USER',
        resource: 'Usuario',
        resourceId: String(id),
        ip,
        details: { before: { status: existingUser.status }, after: { status: newStatus } },
        status: 'SUCCESS',
      });
    } catch (auditError) {
      logger.error('[toggle-status] Erro ao registrar auditoria', {}, auditError);
    }

    return NextResponse.json({ data: { status: newStatus }, success: true });

  });