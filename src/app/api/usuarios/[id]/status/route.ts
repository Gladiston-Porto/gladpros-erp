import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toggleUserStatusSchema } from "@/shared/lib/validation";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { UserRole, canManageRole } from "@/shared/lib/user-hierarchy";
import { AuditoriaService } from "@/shared/lib/audit";
import { can, type Role } from "@/shared/lib/rbac-core";
import { logger } from "@/lib/api/logger";

interface Params {
  id: string;
}

export const PATCH = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<Params> }) => {
    const authUser = await requireUser(request);

    // Only roles with 'update' permission can change user status
    if (!can(authUser.role as Role, 'usuarios', 'update')) {
      return NextResponse.json({ error: "Forbidden", message: "Acesso negado", success: false }, { status: 403 });
    }

    const { id } = await params;
    const raw = await request.json().catch(() => ({}));
    const parsed = toggleUserStatusSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Body inválido" },
        { status: 400 }
      );
    }
    const { ativo } = parsed.data;

    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: "INVALID_ID", message: "ID de usuário inválido" },
        { status: 400 }
      );
    }

    // Impedir self-toggle
    if (Number(authUser.id) === userId) {
      return NextResponse.json(
        { error: "SELF_TOGGLE", message: "Não é possível alterar o status da própria conta" },
        { status: 400 }
      );
    }

    // Buscar nivel do alvo para aplicar hierarquia e dead-man ADMIN
    const rows = (await prisma.$queryRaw`
      SELECT nivel, status FROM Usuario WHERE id = ${userId} LIMIT 1
    `) as Array<{ nivel: string | null; status: string | null }>;
    const target = rows[0];
    if (!target) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Usuário não encontrado" }, { status: 404 });
    }

    const targetRoleRaw = String(target.nivel ?? '').toUpperCase();
    if ((Object.values(UserRole) as string[]).includes(targetRoleRaw)) {
      if (!canManageRole(authUser.role as UserRole, targetRoleRaw as UserRole)) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Você não pode gerenciar este usuário." },
          { status: 403 }
        );
      }
    }

    // Dead-man ADMIN: impedir desativar o último ADMIN
    if (targetRoleRaw === 'ADMIN' && !ativo) {
      const otherActiveAdmins = (await prisma.$queryRaw<Array<{ cnt: bigint | number }>>`
        SELECT COUNT(*) AS cnt FROM Usuario
        WHERE nivel = 'ADMIN' AND status = 'ATIVO' AND id <> ${userId}
      `)[0];
      if (Number(otherActiveAdmins?.cnt ?? 0) === 0) {
        return NextResponse.json(
          { error: "LAST_ADMIN", message: "Não é possível desativar o último ADMIN ativo do sistema." },
          { status: 400 }
        );
      }
    }

    // Atualizar status do usuário
    // BUG-01 fix (P1): When deactivating, increment tokenVersion to immediately
    // invalidate active JWT sessions (mirrors the logic in toggle-status/route.ts)
    if (ativo) {
      await prisma.$executeRaw`
        UPDATE Usuario
        SET status = 'ATIVO',
            atualizadoEm = NOW()
        WHERE id = ${userId}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE Usuario
        SET status = 'INATIVO',
            atualizadoEm = NOW(),
            tokenVersion = tokenVersion + 1
        WHERE id = ${userId}
      `;
    }

    // Registrar auditoria
    try {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      await AuditoriaService.registrarAtualizacaoUsuario(
        userId,
        { status: target.status },
        { status: ativo ? 'ATIVO' : 'INATIVO' },
        Number(authUser.id),
        ip
      );
    } catch (auditError) {
      logger.error('[PATCH /[id]/status] Erro ao registrar auditoria', {}, auditError);
    }

    return NextResponse.json({ data: { ativo }, success: true });
  });
