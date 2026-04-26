// src/app/api/auth/me/sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/shared/lib/rbac";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api/error-handler";

export const runtime = "nodejs";

// GET /api/auth/me/sessions — lista sessões ativas do usuário logado
export const GET = withErrorHandler(async (req: NextRequest) => {
  const me = await requireUser(req);
  const userId = Number(me.id);

  // Ler token atual do cookie para identificar sessão corrente
  const currentToken = req.cookies.get("session_token")?.value ?? null;

  const sessions = await prisma.$queryRaw<Array<{
    id: number;
    ip: string | null;
    userAgent: string | null;
    cidade: string | null;
    pais: string | null;
    ultimaAtividade: Date;
    criadoEm: Date;
    token: string;
  }>>`
    SELECT id, ip, userAgent, cidade, pais, ultimaAtividade, criadoEm, token
    FROM SessaoAtiva
    WHERE usuarioId = ${userId}
    ORDER BY ultimaAtividade DESC
  `;

  const result = sessions.map((s) => ({
    id: s.id,
    ip: s.ip ?? "—",
    userAgent: s.userAgent ?? null,
    cidade: s.cidade ?? null,
    pais: s.pais ?? null,
    ultimaAtividade: s.ultimaAtividade instanceof Date
      ? s.ultimaAtividade.toISOString()
      : String(s.ultimaAtividade),
    criadoEm: s.criadoEm instanceof Date
      ? s.criadoEm.toISOString()
      : String(s.criadoEm),
    isCurrent: currentToken !== null && s.token === currentToken,
  }));

  return NextResponse.json({ data: result, success: true });
});

// POST /api/auth/me/sessions/revoke-others — encerra todas as sessões exceto a atual
export const POST = withErrorHandler(async (req: NextRequest) => {
  const me = await requireUser(req);
  const userId = Number(me.id);

  const currentToken = req.cookies.get("session_token")?.value ?? null;

  if (currentToken) {
    await prisma.$executeRaw`
      DELETE FROM SessaoAtiva
      WHERE usuarioId = ${userId}
      AND token != ${currentToken}
    `;
  } else {
    await prisma.$executeRaw`
      DELETE FROM SessaoAtiva
      WHERE usuarioId = ${userId}
    `;
  }

  await prisma.auditLog.create({
    data: {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      entidade: "SessaoAtiva",
      entidadeId: String(userId),
      acao: "REVOKE_ALL_SESSIONS",
      diff: JSON.stringify({ action: "revoke-others" }),
    },
  });

  return NextResponse.json({ success: true, message: "Sessões encerradas com sucesso" });
});
