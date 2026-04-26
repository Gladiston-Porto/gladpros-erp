// src/app/api/auth/me/preferences/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/shared/lib/rbac";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api/error-handler";
import { z } from "zod";

export const runtime = "nodejs";

const VALID_TEMAS = ["light", "dark", "system"] as const;
const VALID_IDIOMAS = ["pt-BR", "en-US"] as const;
const VALID_TIMEZONES = ["America/Chicago", "America/New_York", "America/Los_Angeles"] as const;

const PreferencesSchema = z.object({
  tema: z.enum(VALID_TEMAS).optional(),
  idioma: z.enum(VALID_IDIOMAS).optional(),
  timezone: z.enum(VALID_TIMEZONES).optional(),
  itensPorPagina: z.number().int().min(5).max(100).optional(),
  notificacoesEmail: z.boolean().optional(),
  notificacoesSistema: z.boolean().optional(),
});

// GET /api/auth/me/preferences — lê preferências (ou cria com defaults se não existir)
export const GET = withErrorHandler(async (req: NextRequest) => {
  const me = await requireUser(req);
  const userId = Number(me.id);

  let pref = await prisma.userPreference.findUnique({
    where: { userId },
  });

  // Criar com defaults caso ainda não exista
  if (!pref) {
    pref = await prisma.userPreference.create({
      data: { userId },
    });
  }

  return NextResponse.json({
    data: {
      tema: pref.tema,
      idioma: pref.idioma,
      timezone: pref.timezone,
      formatoData: pref.formatoData,
      formatoMoeda: pref.formatoMoeda,
      itensPorPagina: pref.itensPorPagina,
      notificacoesEmail: pref.notificacoesEmail,
      notificacoesSistema: pref.notificacoesSistema,
    },
    success: true,
  });
});

// PUT /api/auth/me/preferences — atualiza preferências
export const PUT = withErrorHandler(async (req: NextRequest) => {
  const me = await requireUser(req);
  const userId = Number(me.id);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "JSON inválido", message: "O corpo da requisição é inválido", success: false },
      { status: 400 }
    );
  }

  const parsed = PreferencesSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dados inválidos";
    return NextResponse.json(
      { error: "Validation failed", message: msg, success: false },
      { status: 400 }
    );
  }

  const pref = await prisma.userPreference.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: { ...parsed.data },
  });

  await prisma.auditLog.create({
    data: {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      entidade: "UserPreference",
      entidadeId: String(userId),
      acao: "UPDATE_PREFERENCES",
      diff: JSON.stringify(parsed.data),
    },
  });

  return NextResponse.json({
    data: {
      tema: pref.tema,
      idioma: pref.idioma,
      timezone: pref.timezone,
      formatoData: pref.formatoData,
      formatoMoeda: pref.formatoMoeda,
      itensPorPagina: pref.itensPorPagina,
      notificacoesEmail: pref.notificacoesEmail,
      notificacoesSistema: pref.notificacoesSistema,
    },
    success: true,
  });
});
