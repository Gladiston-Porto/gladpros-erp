// src/app/api/usuarios/[id]/resend-welcome/route.ts
// Reenvia o email de boas-vindas com nova senha provisória e magic link atualizado
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { generateTempPassword } from '@/shared/lib/passwords';
import { renderWelcomeEmail } from '@/shared/lib/emails/welcome';
import { sendMail } from '@/shared/lib/mailer';
import { signFirstAccessJWT } from '@/shared/lib/jwt';
import { AuditLogger } from '@/shared/lib/audit';
import { logger } from '@/lib/api/logger';
import bcrypt from 'bcryptjs';
import { withErrorHandler } from '@/lib/api/error-handler';

export const POST = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(req);

    if (!can(user.role as Role, 'usuarios', 'create')) {
      return NextResponse.json(
        { error: 'Sem permissão para reenviar email de boas-vindas', success: false },
        { status: 403 },
      );
    }

    const { id: idParam } = await params;
    const targetId = Number(idParam);
    if (!targetId || Number.isNaN(targetId)) {
      return NextResponse.json({ error: 'ID inválido', success: false }, { status: 400 });
    }

    // Buscar usuário alvo
    type TargetRow = {
      id: number;
      email: string;
      nomeCompleto: string | null;
      status: string;
      primeiroAcesso: boolean | number;
    };
    const rows = await prisma.$queryRaw<TargetRow[]>`
    SELECT id, email, nomeCompleto, status, primeiroAcesso FROM Usuario WHERE id = ${targetId} AND empresaId = ${user.empresaId} LIMIT 1
  `;

    const target = rows[0];
    if (!target) {
      return NextResponse.json(
        { error: 'Usuário não encontrado', success: false },
        { status: 404 },
      );
    }

    if (target.status !== 'ATIVO') {
      return NextResponse.json(
        { error: 'Não é possível reenviar o email para um usuário inativo', success: false },
        { status: 400 },
      );
    }

    const jaConfigurou = target.primeiroAcesso === false || target.primeiroAcesso === 0;
    if (jaConfigurou) {
      return NextResponse.json(
        {
          error: 'Este usuário já concluiu o primeiro acesso e não precisa do email de boas-vindas',
          success: false,
        },
        { status: 409 },
      );
    }

    // Gerar nova senha provisória e atualizar no banco
    // magicLinkConsumedAt = NULL reseta o consumo para o novo link funcionar (single-use reset)
    const tempPassword = generateTempPassword(12);
    const senhaHash = await bcrypt.hash(tempPassword, 12);
    await prisma.$executeRaw`
    UPDATE Usuario SET senha = ${senhaHash}, senhaProvisoria = 1, primeiroAcesso = 1, magicLinkConsumedAt = NULL WHERE id = ${targetId} AND empresaId = ${user.empresaId}
  `;

    // Gerar novo magic link
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    let firstAccessUrl: string | undefined;
    try {
      const magicToken = await signFirstAccessJWT(targetId, target.email);
      firstAccessUrl = `${appUrl.replace(/\/$/, '')}/api/auth/first-access/magic?token=${magicToken}`;
    } catch (err) {
      logger.warn('[resend-welcome] Falha ao gerar magic link', {}, err);
    }

    const displayName = target.nomeCompleto ?? target.email;
    const { subject, html } = renderWelcomeEmail({
      name: displayName,
      email: target.email,
      tempPassword,
      appUrl,
      supportEmail: process.env.SUPPORT_EMAIL ?? 'suporte@gladpros.com',
      firstAccessUrl,
    });

    try {
      await sendMail(target.email, subject, html);
    } catch (err) {
      logger.error(
        '[resend-welcome] Falha ao enviar email',
        { userId: Number(user.id) },
        { targetId, err },
      );
      return NextResponse.json(
        { error: 'Falha ao enviar o email. Tente novamente.', success: false },
        { status: 500 },
      );
    }

    // Auditoria
    try {
      await AuditLogger.log({
        userId: Number(user.id),
        userEmail: user.email,
        action: 'RESEND_WELCOME_EMAIL',
        resource: 'Usuario',
        resourceId: String(targetId),
        details: { targetEmail: target.email },
        status: 'SUCCESS',
      });
    } catch (auditErr) {
      logger.warn('[resend-welcome] Falha ao registrar auditoria', {}, auditErr);
    }

    logger.info(
      '[resend-welcome] Email reenviado',
      { userId: Number(user.id), userEmail: user.email ?? undefined },
      { targetId, targetEmail: target.email, sentBy: user.id },
    );

    return NextResponse.json({
      success: true,
      message: `Email de boas-vindas reenviado para ${target.email}`,
    });
  },
);
