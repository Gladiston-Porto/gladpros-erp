// src/app/api/auth/first-access/magic/route.ts
// Magic link de primeiro acesso — troca o token por authToken e redireciona para /primeiro-acesso
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyFirstAccessJWT, signAuthJWT } from "@/shared/lib/jwt";
import { RateLimiter } from "@/shared/lib/rate-limit";
import { logger } from "@/lib/api/logger";
import type { Role } from "@/shared/lib/jwt";

const limiter = new RateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: "Muitas tentativas." });

export async function GET(req: NextRequest) {
  const rl = await limiter.isAllowed(req);
  if (!rl.allowed) {
    return NextResponse.redirect(new URL("/login?erro=magic-link-rate-limit", req.url));
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?erro=magic-link-invalido", req.url));
  }

  let userId: number;
  try {
    const claims = await verifyFirstAccessJWT(token);
    userId = claims.userId;
  } catch (err) {
    logger.warn("[first-access/magic] Token inválido ou expirado", {}, err);
    return NextResponse.redirect(new URL("/login?erro=magic-link-expirado", req.url));
  }

  // Buscar usuário e verificar que ainda está aguardando primeiro acesso
  type UserRow = { id: number; nivel: string; status: string; primeiroAcesso: boolean | number; email: string; tokenVersion: number | null }
  const rows = await prisma.$queryRaw<UserRow[]>`
    SELECT id, email, nivel, status, primeiroAcesso, tokenVersion
    FROM Usuario
    WHERE id = ${userId} LIMIT 1
  `;

  const user = rows[0];
  if (!user) {
    return NextResponse.redirect(new URL("/login?erro=usuario-nao-encontrado", req.url));
  }

  const jaConfigurou = user.primeiroAcesso === false || user.primeiroAcesso === 0;
  if (jaConfigurou) {
    // Usuário já completou o primeiro acesso — redirecionar para login normal
    return NextResponse.redirect(new URL("/login?info=conta-ja-configurada", req.url));
  }

  if (user.status !== "ATIVO") {
    return NextResponse.redirect(new URL("/login?erro=conta-inativa", req.url));
  }

  // Emitir authToken temporário para permitir o setup de primeiro acesso
  const authToken = await signAuthJWT({
    sub: String(user.id),
    role: user.nivel as Role,
    email: user.email,
    status: "ATIVO",
    tokenVersion: user.tokenVersion ?? 0,
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const target = new URL(`/primeiro-acesso?userId=${user.id}`, appUrl);

  const res = NextResponse.redirect(target);
  res.cookies.set("authToken", authToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60, // 30 minutos — apenas para completar o setup
  });

  logger.info("[first-access/magic] Magic link utilizado", { userId: user.id, email: user.email });
  return res;
}
