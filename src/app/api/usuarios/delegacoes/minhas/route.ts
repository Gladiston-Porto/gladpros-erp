// src/app/api/usuarios/delegacoes/minhas/route.ts
// Retorna delegações ativas do usuário logado:
//   - delegacoesFeitas: delegações que o usuário criou (ainda ativas)
//   - delegacoesRecebidas: delegações que o usuário está cobrindo agora
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api/error-handler";
import { requireUser } from "@/shared/lib/rbac";

export const GET = withErrorHandler(async (req: Request) => {
  const authUser = await requireUser(req);
  const userId = Number(authUser.id);
  const agora = new Date();

  const [feitas, recebidas] = await Promise.all([
    prisma.delegacao.findMany({
      where: {
        deleganteId: userId,
        ativa: true,
        dataInicio: { lte: agora },
        dataFim: { gt: agora },
      },
      include: {
        delegatario: { select: { id: true, nomeCompleto: true, email: true, avatarUrl: true } },
      },
      orderBy: { dataFim: "asc" },
    }),
    prisma.delegacao.findMany({
      where: {
        delegatarioId: userId,
        ativa: true,
        dataInicio: { lte: agora },
        dataFim: { gt: agora },
      },
      include: {
        delegante: { select: { id: true, nomeCompleto: true, email: true, avatarUrl: true } },
      },
      orderBy: { dataFim: "asc" },
    }),
  ]);

  return NextResponse.json({
    data: { delegacoesFeitas: feitas, delegacoesRecebidas: recebidas },
    success: true,
  });
});
