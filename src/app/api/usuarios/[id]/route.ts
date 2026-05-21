// src/app/api/usuarios/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AuditLogger } from "@/shared/lib/audit";
import { userUpdateApiSchema } from "@/shared/lib/validation";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import { buildUsuarioSelect, getUsuarioColumns } from "@/shared/lib/usuario-query";
import { UserRole, canManageRole } from "@/shared/lib/user-hierarchy";
import { logger } from "@/lib/api/logger";
import { apiRateLimit } from '@/shared/lib/rate-limit';
import { withRetry } from "@/lib/utils/retry";

/**
 * Campos permitidos quando um usuário edita o próprio perfil.
 * Jamais inclui role/status/email/senha — alterar isso exige permissão de admin.
 */
const SELF_EDIT_FIELDS = new Set([
  "nomeCompleto",
  "telefone",
  "dataNascimento",
  "endereco1",
  "endereco2",
  "cidade",
  "estado",
  "cep",
  "zipcode",
  "anotacoes",
  "avatarUrl",
]);

/** Retorna a role (nivel) do usuário pelo id, ou null se não existir. */
async function getTargetUserRole(id: number): Promise<UserRole | null> {
  const rows = (await prisma.$queryRaw`
    SELECT nivel FROM Usuario WHERE id = ${id} LIMIT 1
  `) as Array<{ nivel: string | null }>;
  const nivel = rows[0]?.nivel;
  if (!nivel) return null;
  const upper = String(nivel).trim().toUpperCase();
  if ((Object.values(UserRole) as string[]).includes(upper)) {
    return upper as UserRole;
  }
  return null;
}

/** Conta ADMINs ativos (exceto um id opcional que será excluído/mudado). */
async function countActiveAdmins(excludeId?: number): Promise<number> {
  const rows = (await prisma.$queryRaw`
    SELECT COUNT(*) AS cnt FROM Usuario
    WHERE nivel = 'ADMIN' AND status = 'ATIVO'
      AND (${excludeId ?? 0} = 0 OR id <> ${excludeId ?? 0})
  `) as Array<{ cnt: bigint | number }>;
  return Number(rows[0]?.cnt ?? 0);
}

type UserRow = {
  id: number;
  email: string;
  nomeCompleto?: string | null;
  nome?: string | null;
  role?: string | null;
  nivel?: string | null;
  status?: string | null;
  telefone?: string | null;
  celular?: string | null;
  telefone1?: string | null;
  phone?: string | null;
  dataNascimento?: Date | string | null;
  nascimento?: Date | string | null;
  data_nascimento?: Date | string | null;
  birthdate?: Date | string | null;
  dob?: Date | string | null;
  endereco1?: string | null;
  endereco2?: string | null;
  cidade?: string | null;
  estado?: string | null;
  zipcode?: string | null;
  cep?: string | null;
  anotacoes?: string | null;
  ultimoLoginEm?: Date | null;
  criadoEm?: Date | null;
  atualizadoEm?: Date | null;
  avatarUrl?: string | null;
  expiresAt?: Date | string | null
};

/* helper para suportar context.params Promise (Next 15 HMR) */
async function resolveParams(context: unknown) {
  const c = context as { params?: unknown };
  const maybe = (c?.params ?? c) as unknown;
  const isPromise = typeof (maybe as { then?: unknown })?.then === "function";
  const params = isPromise ? await (maybe as Promise<unknown>) : maybe;
  return (params as Record<string, unknown>) ?? {};
}

const USER_DETAIL_COLUMNS = [
  "id",
  "email",
  "nomeCompleto",
  "nome",
  "role",
  "nivel",
  "status",
  "telefone",
  "celular",
  "telefone1",
  "phone",
  "dataNascimento",
  "nascimento",
  "data_nascimento",
  "birthdate",
  "dob",
  "endereco1",
  "endereco2",
  "cidade",
  "estado",
  "zipcode",
  "cep",
  "anotacoes",
  "ultimoLoginEm",
  "criadoEm",
  "atualizadoEm",
  "avatarUrl",
  "expiresAt",
];

/* GET /api/usuarios/:id */
export const GET = withErrorHandler(async (req: Request, context: unknown) => {
    const authUser = await requireUser(req);
    const params = await resolveParams(context);
    const idVal = (params as Record<string, unknown>)?.id;
    const id = Number(idVal);
    if (!id) return NextResponse.json({ error: "INVALID_ID", message: "ID inválido", success: false }, { status: 400 });

    // Users can view their own profile; roles with 'read' permission can view anyone
    if (Number(authUser.id) !== id && !can(authUser.role as Role, 'usuarios', 'read')) {
      return NextResponse.json({ error: "FORBIDDEN", message: "Sem permissão", success: false }, { status: 403 });
    }

    const userSelect = await buildUsuarioSelect(USER_DETAIL_COLUMNS);
    const rows = (await withRetry(() =>
      prisma.$queryRawUnsafe(`SELECT ${userSelect} FROM Usuario WHERE id = ? LIMIT 1`, id)
    )) as unknown as UserRow[];
    const found = rows[0];
    if (!found) return NextResponse.json({ error: "NOT_FOUND", message: "Usuário não encontrado", success: false }, { status: 404 });

    // normalizar para o frontend (campos esperados pelo form/serviço)
    let dobStr: string | null = null;
    const rawDob =
      found.dataNascimento ??
      found.nascimento ??
      found.data_nascimento ??
      found.birthdate ??
      found.dob ??
      null;
    if (rawDob instanceof Date) {
      const yyyy = rawDob.getUTCFullYear();
      const mm = String(rawDob.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(rawDob.getUTCDate()).padStart(2, "0");
      dobStr = `${mm}/${dd}/${yyyy}`;
    } else if (typeof rawDob === "string") {
      // suporta 'YYYY-MM-DD' e variantes com hora ('YYYY-MM-DD HH:mm:ss' ou ISO)
      const s10 = rawDob.slice(0, 10);
      const m = s10.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        const [, y, m2, d2] = m;
        dobStr = `${m2}/${d2}/${y}`;
      }
    }

    const nomeCalc = found.nomeCompleto ?? found.nome ?? (found as unknown as { nome_completo?: string })?.nome_completo ?? (found as unknown as { full_name?: string })?.full_name ?? null;
    const normalized = {
      id: found.id,
      email: found.email,
      nomeCompleto: nomeCalc && String(nomeCalc).trim().length > 0 ? String(nomeCalc) : found.email,
      role: found.role ?? found.nivel ?? null,
      status: found.status ?? null,
      telefone: found.telefone ?? found.celular ?? found.telefone1 ?? found.phone ?? null,
      dataNascimento: dobStr,
      endereco1: found.endereco1 ?? null,
      endereco2: found.endereco2 ?? null,
      cidade: found.cidade ?? null,
      estado: found.estado ?? null,
      cep: found.zipcode ?? found.cep ?? null,
      anotacoes: found.anotacoes ?? null,
      ultimoLoginEm: found.ultimoLoginEm ?? null,
      criadoEm: found.criadoEm ?? null,
      atualizadoEm: found.atualizadoEm ?? null,
      avatarUrl: found.avatarUrl ?? null,
      expiresAt: found.expiresAt ? (found.expiresAt instanceof Date ? found.expiresAt.toISOString() : String(found.expiresAt)) : null,
    };

    // Verificar se há worker vinculado a este usuário
    const workerRecord = await prisma.worker.findFirst({
      where: { usuarioId: id },
      select: { id: true, name: true, classification: true },
    }).catch(() => null);

    return NextResponse.json({
      data: {
        ...normalized,
        workerId: workerRecord?.id ?? null,
        worker: workerRecord
          ? { id: workerRecord.id, name: workerRecord.name, classification: workerRecord.classification }
          : null,
      },
      success: true,
    }, { status: 200 });
  });

/* PATCH /api/usuarios/:id - parcial */
export const PATCH = withErrorHandler(async (req: Request, context: unknown) => {
    const authUser = await requireUser(req);
    const rateCheck = await apiRateLimit.isAllowed(req as Parameters<typeof apiRateLimit.isAllowed>[0]);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: rateCheck.message, success: false },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)) } }
      );
    }
    const params = await resolveParams(context);
  const idVal = (params as Record<string, unknown>)?.id;
  const id = Number(idVal);
    if (!id) return NextResponse.json({ error: "INVALID_ID", message: "ID inválido", success: false }, { status: 400 });

    const isSelfEdit = Number(authUser.id) === id;
    const hasUpdatePermission = can(authUser.role as Role, 'usuarios', 'update');

    // Precisa ser self-edit ou ter permissão de update no módulo
    if (!isSelfEdit && !hasUpdatePermission) {
      return NextResponse.json({ error: "FORBIDDEN", message: "Sem permissão", success: false }, { status: 403 });
    }

    // Admin-edit: verificar hierarquia contra o alvo
    const targetRole = await getTargetUserRole(id);
    if (!targetRole) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Usuário não encontrado", success: false }, { status: 404 });
    }
    if (!isSelfEdit && !canManageRole(authUser.role as UserRole, targetRole)) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Você não pode gerenciar este usuário.", success: false },
        { status: 403 }
      );
    }

  const raw = await req.json().catch(() => ({}));
  const parsed = userUpdateApiSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    const fieldErrors: Record<string, string> = {};
    for (const issue of issues) {
      const field = (issue.path[0] as string) || 'general';
      fieldErrors[field] = issue.message;
    }
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Dados inválidos. Verifique os campos.",
        fields: fieldErrors,
        success: false,
      },
      { status: 400 }
    );
  }
  const body = parsed.data as Record<string, unknown>;

    // Self-edit: bloquear qualquer campo sensível (role, status, email, senha)
    if (isSelfEdit) {
      for (const key of Object.keys(body)) {
        if (!SELF_EDIT_FIELDS.has(key)) {
          delete (body as Record<string, unknown>)[key];
        }
      }
    }

    // Se está alterando role, validar hierarquia sobre o NOVO role também
    if (!isSelfEdit && body.role) {
      const newRole = String(body.role).toUpperCase();
      if (!(Object.values(UserRole) as string[]).includes(newRole)) {
        return NextResponse.json(
          { error: "INVALID_ROLE", message: "Nível inválido.", success: false },
          { status: 400 }
        );
      }
      if (!canManageRole(authUser.role as UserRole, newRole as UserRole)) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Você não pode promover um usuário a este nível.", success: false },
          { status: 403 }
        );
      }
    }

    // Dead-man ADMIN: impedir rebaixar/desativar o último ADMIN ativo
    if (targetRole === UserRole.ADMIN) {
      const willDemote = body.role && String(body.role).toUpperCase() !== 'ADMIN';
      const willInactivate = body.status && String(body.status).toUpperCase() === 'INATIVO';
      if (willDemote || willInactivate) {
        const otherActiveAdmins = await countActiveAdmins(id);
        if (otherActiveAdmins === 0) {
          return NextResponse.json(
            { error: "LAST_ADMIN", message: "Não é possível remover o último ADMIN ativo do sistema." },
            { status: 400 }
          );
        }
      }
    }

    // Detectar colunas reais do schema para mapear campos dinamicamente (usando cache com TTL de 5 min)
  const cols = await getUsuarioColumns();

    const allowed = [
      "email",
      "nomeCompleto",
      "telefone",
      "dataNascimento",
      "endereco1",
      "endereco2",
      "cidade",
      "estado",
      "zipcode",
      "cep",
      "role",
      "nivel",
      "status",
      "senha",
      "avatarUrl",
      "anotacoes",
      "expiresAt",
    ] as const;

    const sets: string[] = [];
  const paramsVals: Array<string | number | null> = [];

    for (const key of allowed) {
      const raw = (body as Record<string, unknown>)[key];
      if (Object.prototype.hasOwnProperty.call(body, key) && raw !== undefined && raw !== null) {
        // ignorar strings vazias para não apagar dados sem intenção
        if (typeof raw === "string" && raw.trim() === "") continue;
        if (key === "senha") {
          const novaSenha = String(raw);
          const hash = await bcrypt.hash(novaSenha, 12);

          // Verificar se a nova senha já foi utilizada anteriormente (últimas 5)
          const historico = await prisma.historicoSenha.findMany({
            where: { usuarioId: id },
            orderBy: { criadaEm: "desc" },
            take: 5,
            select: { senhaHash: true },
          });
          for (const entrada of historico) {
            const jaUsada = await bcrypt.compare(novaSenha, entrada.senhaHash);
            if (jaUsada) {
              return NextResponse.json(
                { error: "Senha já utilizada anteriormente. Escolha uma senha diferente.", success: false },
                { status: 400 }
              );
            }
          }

          sets.push(`senha = ?`);
          paramsVals.push(hash);
          sets.push(`senhaAlteradaEm = NOW()`);
          // Registrar nova senha no histórico após o UPDATE (pendente — ver abaixo)
          (req as unknown as Record<string, unknown>)["_newPasswordHash"] = hash;
        } else if (key === "cep" && !(body as Record<string, unknown>)["zipcode"]) {
          // normalize cep -> zipcode or cep, conforme schema
          const target = cols.has("zipcode") ? "zipcode" : cols.has("cep") ? "cep" : null;
          if (target) {
            sets.push(`${target} = ?`);
            paramsVals.push(String(raw));
          }
        } else if (key === "nomeCompleto") {
          const target = cols.has("nomeCompleto") ? "nomeCompleto" : cols.has("nome") ? "nome" : null;
          if (target) {
            sets.push(`${target} = ?`);
            paramsVals.push(String(raw));
          }
        } else if (key === "dataNascimento") {
          // Accept 'YYYY-MM-DD' or 'MM/DD/YYYY'; store as 'YYYY-MM-DD'
          const v = String(raw).trim();
          let iso: string | null = null;
          const mIso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          const mUs = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          if (mIso) {
            iso = v;
          } else if (mUs) {
            const [, mm, dd, yyyy] = mUs;
            iso = `${yyyy}-${mm}-${dd}`;
          }
          const dobCol = cols.has("dataNascimento")
            ? "dataNascimento"
            : cols.has("nascimento")
            ? "nascimento"
            : cols.has("data_nascimento")
            ? "data_nascimento"
            : cols.has("dob")
            ? "dob"
            : null;
          if (dobCol) {
            sets.push(`${dobCol} = ?`);
            paramsVals.push(iso);
          }
        } else {
          // map API keys to DB columns
          let column = key;
          if (key === "nivel" || key === "role") column = cols.has("nivel") ? "nivel" : cols.has("role") ? "role" : key;
          if (key === "zipcode") column = cols.has("zipcode") ? "zipcode" : cols.has("cep") ? "cep" : key;
          if (cols.has(column)) {
            // telefone: manter formato americano (XXX)XXX-XXXX
            sets.push(`${column} = ?`);
            paramsVals.push(raw as string | number);
          }
        }
      }
    }

    // Handle expiresAt explicitly (supports null to clear the value — null is excluded by the main loop)
    if (Object.prototype.hasOwnProperty.call(body, "expiresAt") && cols.has("expiresAt")) {
      const expVal = (body as Record<string, unknown>)["expiresAt"];
      if (expVal === null) {
        sets.push("expiresAt = NULL");
      } else if (expVal !== undefined) {
        sets.push("expiresAt = ?");
        paramsVals.push(String(expVal));
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ data: null, success: true, message: "NO_CHANGES" });
    }

    // Se o role (nivel) mudou, invalidar todas as sessões ativas imediatamente
    const newRoleValue = body.role
      ? String(body.role).toUpperCase()
      : body.nivel
      ? String(body.nivel).toUpperCase()
      : null;
    if (!isSelfEdit && newRoleValue && newRoleValue !== String(targetRole).toUpperCase()) {
      sets.push("tokenVersion = tokenVersion + 1");
      // Expressão SQL literal — sem parâmetro adicional em paramsVals
    }

    // Capturar dados antes da atualização para auditoria
  const userSelect = await buildUsuarioSelect(USER_DETAIL_COLUMNS);
  const dadosAntes = (await withRetry(() =>
    prisma.$queryRawUnsafe(`SELECT ${userSelect} FROM Usuario WHERE id = ? LIMIT 1`, id)
  )) as unknown as UserRow[];
  const usuarioAntes = dadosAntes[0];

    // adicionar atualizadoEm
    const sql = `UPDATE Usuario SET ${sets.join(", ")}, atualizadoEm = NOW() WHERE id = ?`;
    paramsVals.push(id);

    await withRetry(() => prisma.$executeRawUnsafe(sql, ...paramsVals));

    // Registrar nova senha no HistoricoSenha (mantém reutilização bloqueada)
    const newPasswordHash = (req as unknown as Record<string, unknown>)["_newPasswordHash"];
    if (typeof newPasswordHash === "string") {
      try {
        await prisma.historicoSenha.create({ data: { usuarioId: id, senhaHash: newPasswordHash } });
        // Manter apenas as últimas 10 entradas para não crescer indefinidamente
        const antigas = await prisma.historicoSenha.findMany({
          where: { usuarioId: id },
          orderBy: { criadaEm: "desc" },
          skip: 10,
          select: { id: true },
        });
        if (antigas.length > 0) {
          await prisma.historicoSenha.deleteMany({ where: { id: { in: antigas.map((e) => e.id) } } });
        }
      } catch {
        // não bloqueia o fluxo principal
      }
    }

    // Capturar dados depois da atualização para auditoria
  const dadosDepois = (await withRetry(() =>
    prisma.$queryRawUnsafe(`SELECT ${userSelect} FROM Usuario WHERE id = ? LIMIT 1`, id)
  )) as unknown as UserRow[];
  const usuarioDepois = dadosDepois[0];

    // Registrar auditoria (não deve quebrar o fluxo se falhar)
    try {
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
      await AuditLogger.log({
        userId: Number(authUser.id),
        action: 'UPDATE_USER',
        resource: 'Usuario',
        resourceId: String(id),
        ip,
        details: { before: usuarioAntes, after: usuarioDepois },
        status: 'SUCCESS',
      });
    } catch (error) {
      logger.error("Erro ao registrar auditoria", {}, error);
      // Não quebra o fluxo principal
    }

    return NextResponse.json({ data: { id }, success: true });
  });

/* PUT /api/usuarios/:id - substitui (opcional) */
export const PUT = withErrorHandler(async (req: Request, context: unknown) => {
  // reutiliza a mesma lógica do PATCH para segurança simples
  return PATCH(req, context);
});

/* DELETE /api/usuarios/:id */
export const DELETE = withErrorHandler(async (req: Request,
  context: { params: Promise<{ id: string }> }) => {
    const authUser = await requireUser(req);
    const rateCheck = await apiRateLimit.isAllowed(req as Parameters<typeof apiRateLimit.isAllowed>[0]);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: rateCheck.message, success: false },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)) } }
      );
    }

    // Only roles with 'delete' permission can deactivate users
    if (!can(authUser.role as Role, 'usuarios', 'delete')) {
      return NextResponse.json({ error: "FORBIDDEN", message: "Sem permissão", success: false }, { status: 403 });
    }

    const params = await context.params;
    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "INVALID_ID", message: "ID inválido", success: false }, { status: 400 });

    // Cannot deactivate yourself
    if (Number(authUser.id) === id) {
      return NextResponse.json({ error: "Não é possível desativar a própria conta", message: "Não é possível desativar a própria conta", success: false }, { status: 400 });
    }

    // Verificar se o usuário existe
    const user = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, email: true, status: true, nivel: true }
    });

    if (!user) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Usuário não encontrado", success: false }, { status: 404 });
    }

    // Hierarquia: GERENTE não pode desativar ADMIN/outro GERENTE, etc.
    const targetRoleRaw = String(user.nivel ?? '').toUpperCase();
    if ((Object.values(UserRole) as string[]).includes(targetRoleRaw)) {
      if (!canManageRole(authUser.role as UserRole, targetRoleRaw as UserRole)) {
        return NextResponse.json(
          { code: "FORBIDDEN", message: "Você não pode gerenciar este usuário." },
          { status: 403 }
        );
      }
    }

    // Dead-man ADMIN: impedir desativar o último ADMIN
    if (targetRoleRaw === 'ADMIN' && user.status === 'ATIVO') {
      const otherActiveAdmins = await countActiveAdmins(id);
      if (otherActiveAdmins === 0) {
        return NextResponse.json(
          { error: "LAST_ADMIN", message: "Não é possível desativar o último ADMIN ativo do sistema." },
          { status: 400 }
        );
      }
    }

    // Se já está inativo, considerar como sucesso (idempotente)
    if (user.status === 'INATIVO') {
      return NextResponse.json({ data: null, success: true, message: "Usuário já estava inativo" });
    }

    // Soft delete: marcar como inativo em vez de excluir
    await prisma.usuario.update({
      where: { id },
      data: {
        status: 'INATIVO',
        atualizadoEm: new Date()
      }
    });

    // Registrar auditoria
    try {
      const req2 = req as unknown as import('next/server').NextRequest;
      const ip = req2.headers?.get('x-forwarded-for') || req2.headers?.get('x-real-ip') || 'unknown';
      await AuditLogger.log({
        userId: Number(authUser.id),
        action: 'DELETE_USER',
        resource: 'Usuario',
        resourceId: String(id),
        ip,
        details: { email: user.email, statusAnterior: user.status },
        status: 'SUCCESS',
      });
    } catch (auditError) {
      logger.error('[DELETE usuario] Erro ao registrar auditoria', {}, auditError);
    }

    return NextResponse.json({ data: null, success: true, message: "Usuário desativado com sucesso" });
  });
