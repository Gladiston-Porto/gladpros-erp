import { withErrorHandler } from '@/lib/api/error-handler';
// src/app/api/usuarios/route.ts
export const runtime = "nodejs";

import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateTempPassword } from "@/shared/lib/passwords";
import { renderWelcomeEmail } from "@/shared/lib/emails/welcome";
import { sendMail } from "@/shared/lib/mailer";
import { requireUser } from '@/shared/lib/rbac';
import { UserRole, canManageRole, getManageableRoles } from "@/shared/lib/user-hierarchy";
import { can, type Role } from "@/shared/lib/rbac-core";
import { withBusinessCache } from "@/shared/lib/cache/business-cache";
import { AuditLogger } from "@/shared/lib/audit";
import { logger } from "@/lib/api/logger";
import { apiRateLimit } from '@/shared/lib/rate-limit';
import { signFirstAccessJWT } from "@/shared/lib/jwt";
import { getUsuarioColumns } from "@/shared/lib/usuario-query";

// Minimal shapes for raw SQL rows (A10: PII fica fora da listagem)
type UserRow = {
  id: number;
  email: string;
  nomeCompleto?: string | null;
  nivel?: string | null;
  status?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  estado?: string | null;
  ultimoLoginEm?: Date | null;
  criadoEm?: Date | null;
  atualizadoEm?: Date | null;
  avatarUrl?: string | null;
  expiresAt?: Date | string | null;
  primeiroAcesso?: boolean | number | null;
  bloqueado?: boolean | number | null;
};

type CountRow = { cnt: number };
type SqlValue = string | number | null | Date | boolean;

import { withRetry } from "@/lib/utils/retry";

/** Enums alinhados ao Prisma (note: Prisma model uses 'nivel' e 'StatusUsuario') */
const Roles = z.enum(["ADMIN", "GERENTE", "USUARIO", "FINANCEIRO", "ESTOQUE", "CLIENTE"]);
const Status = z.enum(["ATIVO", "INATIVO"]);

/* =========================================================
 * GET /api/usuarios
 * Lista com paginação e filtros: q, role, status, page, pageSize
 * Requer autenticação
 * =======================================================*/
export const GET = withErrorHandler(async (req: NextRequest) => {
    // Verificar autenticação usando TokenService (compatível com dashboard)
    const user = await requireUser(req);
    
    // Verificar se usuário tem permissão de leitura
    if (!can(user.role as Role, 'usuarios', 'read')) {
      return NextResponse.json(
        { error: 'Acesso negado.' },
        { status: 403 }
      );
    }
    const { searchParams } = new URL(req.url);

    // validação leve dos params
    const querySchema = z.object({
      q: z.string().optional(),
      role: z.string().optional().refine((val) => !val || val.trim() === '' || Roles.safeParse(val).success, "role inválido"),
      status: z.string().optional().refine((val) => {
        if (!val || val.trim() === '') return true;
        // Aceitar boolean strings, enum values, ou strings vazias
        return val === 'true' || val === 'false' || Status.safeParse(val).success;
      }, "status inválido"),
      primeiroAcesso: z.string().optional().refine((val) => !val || val === 'true' || val === 'false', "primeiroAcesso deve ser 'true' ou 'false'"),
      sortKey: z.enum(["nome","email","role","ativo","criadoEm"]).optional(),
      sortDir: z.enum(["asc","desc"]).optional(),
      page: z
        .string()
        .optional()
        .transform((v) => (v ? parseInt(v, 10) : 1))
        .refine((v) => !isNaN(v as number) && (v as number) >= 1, "page inválida"),
      pageSize: z
        .string()
        .optional()
        .transform((v) => (v ? parseInt(v, 10) : 20))
        .refine((v) => !isNaN(v as number) && (v as number) >= 1 && (v as number) <= 100, "pageSize inválido"),
    });

    const parsed = querySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
  role: searchParams.get("role") ?? undefined,
  status: searchParams.get("status") ?? undefined,
  primeiroAcesso: searchParams.get("primeiroAcesso") ?? undefined,
  sortKey: searchParams.get("sortKey") ?? undefined,
  sortDir: searchParams.get("sortDir") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_QUERY", message: "Parâmetros de consulta inválidos", success: false },
        { status: 400 }
      );
    }
    const { page, pageSize, q: qq, role, status, primeiroAcesso, sortKey, sortDir } = parsed.data;

    // Tratar strings vazias como undefined
    const effectiveRole = role && role.trim() !== '' ? role as z.infer<typeof Roles> : undefined;
    const effectiveStatus = (() => {
      if (!status || status.trim() === '') return undefined;
      if (status === 'true') return 'ATIVO' as const;
      if (status === 'false') return 'INATIVO' as const;
      return status as z.infer<typeof Status>;
    })();
    // null = sem filtro, true = só aguardando, false = só quem já acessou
    const effectivePrimeiroAcesso = primeiroAcesso === 'true' ? true : primeiroAcesso === 'false' ? false : null;

    const skip = (page - 1) * pageSize;

    // Build WHERE
    const where: string[] = [];
    const params: SqlValue[] = [];

    // BUG-02 fix: Always filter by empresaId to prevent IDOR (even in single-tenant)
    where.push("empresaId = ?");
    params.push(user.empresaId);

    // Aplicar filtros hierárquicos baseados no papel do usuário
    const userRole = user.role as UserRole;
    const manageableRoles = getManageableRoles(userRole);

    // Se não for ADMIN, filtrar apenas usuários que pode gerenciar
    if (userRole !== UserRole.ADMIN) {
      if (manageableRoles.length === 0) {
        // Usuário não pode gerenciar ninguém
        return NextResponse.json(
          { error: 'Forbidden', message: 'Sem permissão para listar usuários.', success: false },
          { status: 403 }
        );
      }

      // Adicionar filtro para níveis gerenciáveis
      where.push(`nivel IN (${manageableRoles.map(() => '?').join(',')})`);
      params.push(...manageableRoles);
    }

    if (qq) {
      where.push("(email LIKE ? OR nomeCompleto LIKE ?)");
      const like = `%${qq}%`;
      params.push(like, like);
    }
    if (effectiveRole) {
      const roleValues = effectiveRole.split(",").map((r) => r.trim()).filter(Boolean);
      if (userRole !== UserRole.ADMIN && roleValues.some((r) => !canManageRole(userRole, r as UserRole))) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Sem permissão para filtrar por este nível.', success: false },
          { status: 403 }
        );
      }
      // Suporte a múltiplos roles separados por vírgula (ex: role=ADMIN,GERENTE)
      if (roleValues.length === 1) {
        where.push("nivel = ?");
        params.push(roleValues[0]);
      } else {
        where.push(`nivel IN (${roleValues.map(() => "?").join(",")})`);
        params.push(...roleValues);
      }
    }
    if (effectiveStatus) {
      where.push("status = ?");
      params.push(effectiveStatus);
    }
    if (effectivePrimeiroAcesso !== null) {
      where.push("primeiroAcesso = ?");
      params.push(effectivePrimeiroAcesso ? 1 : 0);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // ORDER BY mapping
    const orderKey = (() => {
      switch (sortKey) {
        case "nome": return "nomeCompleto";
        case "email": return "BINARY email";
        case "role": return "nivel";
        case "ativo": return "status";
        case "criadoEm":
        default: return "criadoEm";
      }
    })();
    const orderDir = (sortDir && sortDir.toUpperCase() === "ASC") ? "ASC" : "DESC";

    const cacheTtlSeconds = process.env.NODE_ENV === "development" ? 5 : 20;
    const cacheKey = `users:list:${user.id}:${userRole}:${JSON.stringify({
      qq: qq ?? "",
      effectiveRole: effectiveRole ?? "",
      effectiveStatus: effectiveStatus ?? "",
      effectivePrimeiroAcesso: effectivePrimeiroAcesso ?? "",
      sortKey: sortKey ?? "criadoEm",
      sortDir: sortDir ?? "desc",
      page,
      pageSize,
    })}`;

    const payload = await withBusinessCache(
      cacheKey,
      async () => {
        // A10: listagem expõe apenas colunas necessárias à tabela/CSV.
        // Campos sensíveis (endereco1/2, zipcode, anotacoes) ficam fora — eles
        // só são retornados em GET /api/usuarios/[id] para o editor.
        const itemsSql = `
          SELECT
            id,
            email,
            nomeCompleto,
            nivel,
            status,
            telefone,
            cidade,
            estado,
            ultimoLoginEm,
            criadoEm,
            atualizadoEm,
            avatarUrl,
            expiresAt,
            primeiroAcesso,
            bloqueado
          FROM Usuario
          ${whereSql}
          ORDER BY ${orderKey} ${orderDir}
          LIMIT ? OFFSET ?
        `;
        const itemsParams = [...params, pageSize, skip];
        const countSql = `SELECT COUNT(*) as cnt FROM Usuario ${whereSql}`;

        // BUG-11 fix: Stats query for accurate global active/inactive counts (respects role visibility)
        const statsWhereParts = [`empresaId = ?`];
        const statsParamsList: SqlValue[] = [user.empresaId];
        if (userRole !== UserRole.ADMIN && manageableRoles.length > 0) {
          statsWhereParts.push(`nivel IN (${manageableRoles.map(() => '?').join(',')})`);
          statsParamsList.push(...manageableRoles);
        }
        const statsWhereSql = `WHERE ${statsWhereParts.join(' AND ')}`;

        const [itemsRaw, countRaw, statsRaw] = (await Promise.all([
          withRetry(() => prisma.$queryRawUnsafe(itemsSql, ...itemsParams)),
          withRetry(() => prisma.$queryRawUnsafe(countSql, ...params)),
          withRetry(() => prisma.$queryRawUnsafe(
            `SELECT status, COUNT(*) as cnt FROM Usuario ${statsWhereSql} GROUP BY status`,
            ...statsParamsList
          )),
        ])) as unknown as [UserRow[], CountRow[], Array<{ status: string; cnt: bigint | number }>];

        const total = Number(countRaw?.[0]?.cnt ?? 0);
        const activeTotal = Number(statsRaw.find(r => r.status === 'ATIVO')?.cnt ?? 0);
        const inactiveTotal = Number(statsRaw.find(r => r.status === 'INATIVO')?.cnt ?? 0);

        const items = itemsRaw.map((it) => {
          return {
            id: it.id,
            email: it.email,
            nomeCompleto: it.nomeCompleto ?? it.email,
            role: it.nivel ?? null,
            status: it.status ?? null,
            telefone: it.telefone ?? null,
            cidade: it.cidade ?? null,
            estado: it.estado ?? null,
            ultimoLoginEm: it.ultimoLoginEm ?? null,
            criadoEm: it.criadoEm ?? null,
            atualizadoEm: it.atualizadoEm ?? null,
            avatarUrl: it.avatarUrl ?? null,
            expiresAt: it.expiresAt ? (it.expiresAt instanceof Date ? it.expiresAt.toISOString() : String(it.expiresAt)) : null,
            primeiroAcesso: Boolean(it.primeiroAcesso),
            bloqueado: it.bloqueado === true || it.bloqueado === 1,
            // Link de primeiro acesso expira em 7 dias após criadoEm
            linkExpirado: Boolean(it.primeiroAcesso) &&
              it.criadoEm != null &&
              (Date.now() - new Date(it.criadoEm).getTime()) > 7 * 24 * 60 * 60 * 1000,
          };
        });

        return { items, total, activeTotal, inactiveTotal };
      },
      { ttlSeconds: cacheTtlSeconds }
    );

    return NextResponse.json({
      data: payload.items,
      pagination: {
        page,
        pageSize,
        total: payload.total,
        totalPages: Math.ceil(payload.total / pageSize),
        activeTotal: payload.activeTotal,
        inactiveTotal: payload.inactiveTotal,
      },
      success: true,
    });
  });

/* =========================================================
 * POST /api/usuarios
 * Cria usuário SEM senha no formulário:
 *  - gera senha provisória
 *  - mustResetPassword = true
 *  - envia e-mail de boas-vindas
 * =======================================================*/
const EstadosMax = z.string().max(32);

// Adapted to the current Prisma schema (required fields are different).
const UserCreateSchema = z.object({
  email: z.string().email().max(191),
  // application-level fields are accepted but many are optional in schema
  nomeCompleto: z.string().max(191).optional().or(z.literal("")).transform((s) => s || undefined),
  role: Roles.optional(),
  status: Status.optional(),
  telefone: z.string().max(32).optional().or(z.literal(""))
    .transform((s) => s || undefined)
    .refine((v) => {
      if (!v) return true; // opcional é válido
      // Remove todos os caracteres não numéricos para validação
      const digits = v.replace(/\D/g, "");
      return digits.length === 10; // Apenas 10 dígitos para formato americano
    }, {
      message: "Telefone deve ter 10 dígitos. Exemplo: (469)334-6918"
    }),
  dataNascimento: z
    .union([z.string(), z.date()])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      if (v instanceof Date) {
        if (isNaN(v.getTime())) return undefined;
        const yyyy = v.getFullYear();
        const mm = String(v.getMonth() + 1).padStart(2, "0");
        const dd = String(v.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      }
      const s = String(v).trim();
      // Accept 'YYYY-MM-DD' format
      const mIso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (mIso) return s;
      
      // Accept MM/DD/YYYY format (US standard - original format)
      const mUs = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mUs) {
        const [, mm, dd, yyyy] = mUs as unknown as [string, string, string, string];
        const dayNum = parseInt(dd, 10);
        const monthNum = parseInt(mm, 10);
        
        // Validate day and month ranges
        if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
          return "INVALID_DATE"; // Return special value instead of throwing
        }
        
        const ddPad = dd.padStart(2, "0");
        const mmPad = mm.padStart(2, "0");
        return `${yyyy}-${mmPad}-${ddPad}`;
      }
      
      return "INVALID_DATE"; // Return special value instead of throwing
    })
    .refine((dateStr) => {
      if (!dateStr) return true; // opcional é válido
      if (dateStr === "INVALID_DATE") return false; // data inválida
      // Validação adicional: tentar criar Date para verificar se é uma data real
      const date = new Date(dateStr + 'T00:00:00.000Z');
      return !isNaN(date.getTime());
    }, {
      message: "Data de nascimento inválida. Use o formato MM/DD/YYYY (ex: 05/18/1979)"
    }),
  endereco1: z.string().max(191).optional().or(z.literal("")).transform((s) => s || undefined),
  endereco2: z.string().max(191).optional().or(z.literal("")).transform((s) => s || undefined),
  cidade: z.string().max(96).optional().or(z.literal("")).transform((s) => s || undefined),
  estado: EstadosMax.optional().or(z.literal("")).transform((s) => s || undefined),
  cep: z.string().max(16).optional().or(z.literal(""))
    .transform((s) => s || undefined)
    .refine((v) => {
      if (!v) return true; // opcional é válido
      // Remove caracteres não numéricos para validação
      const digits = v.replace(/\D/g, "");
      // CEP brasileiro tem 8 dígitos, mas permitir flexibilidade (5-9 dígitos)
      return digits.length >= 5 && digits.length <= 9 && digits === v.replace(/\D/g, "");
    }, {
      message: "CEP deve conter apenas números. Exemplo: 01234567"
    }),
  anotacoes: z.string().optional().or(z.literal(""))
    .transform((s) => (s && s.trim().length > 0 ? s : undefined)),
  expiresAt: z
    .union([z.string(), z.date()])
    .optional()
    .nullable()
    .transform((v) => {
      if (!v) return undefined;
      if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v.toISOString();
      const s = String(v).trim();
      const mIso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (mIso) return s;
      const mUs = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mUs) {
        const [, mm, dd, yyyy] = mUs as unknown as [string, string, string, string];
        return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      }
      return undefined;
    }),
  sendInviteEmail: z.boolean().optional(),
  exigirTrocaSenha: z.boolean().optional(),
  vincularWorker: z.boolean().optional(),
  workerClassification: z.enum(["W2_EMPLOYEE", "CONTRACTOR_1099", "SUBCONTRACTOR", "OWNER_OPERATOR"]).optional(),
}).strict();

export const POST = withErrorHandler(async (req: NextRequest) => {
    // Verificar autenticação
    const user = await requireUser(req);

    // Rate limiting — prevenir criação em massa de contas
    const rateCheck = await apiRateLimit.isAllowed(req);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: rateCheck.message, success: false },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)) } }
      );
    }

    // Verificar se usuário tem permissão de criação — apenas ADMIN (conforme rbac-core)
    if (!can(user.role as Role, 'usuarios', 'create')) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem criar usuários.' },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "INVALID_BODY", message: "JSON inválido" }, { status: 400 });
    }

    const parsed = UserCreateSchema.safeParse(body);
    if (!parsed.success) {
      // Processar erros específicos para mensagens mais claras
      const errors = parsed.error.issues;
      const fieldErrors: Record<string, string> = {};
      
      for (const error of errors) {
        const field = error.path[0] as string;
        if (error.message.includes("INVALID_DATE_FORMAT") || error.message.includes("Data de nascimento inválida")) {
          fieldErrors[field] = "Data de nascimento inválida. Use o formato MM/DD/YYYY (exemplo: 05/18/1979)";
        } else if (field === "telefone" && error.message.includes("10 dígitos")) {
          fieldErrors[field] = "Telefone deve ter 10 dígitos. Exemplo: (469)334-6918";
        } else if (field === "cep" && error.message.includes("apenas números")) {
          fieldErrors[field] = "CEP deve conter apenas números. Exemplo: 01234567";
        } else if (field === "email") {
          fieldErrors[field] = "E-mail inválido";
        } else {
          fieldErrors[field] = error.message;
        }
      }
      
      return NextResponse.json(
        { 
          error: "VALIDATION_ERROR", 
          message: "Dados inválidos. Verifique os campos destacados.",
          fields: fieldErrors,
          issues: parsed.error.flatten() // manter para debug se necessário
        },
        { status: 400 }
      );
    }

    const { email: emailAddr, nomeCompleto, role, status, telefone, dataNascimento, endereco1, endereco2, cidade, estado, cep, anotacoes, expiresAt: expiresAtCreate, sendInviteEmail, exigirTrocaSenha, vincularWorker, workerClassification } = parsed.data;

    try {
      // Checagem por e-mail via SQL bruto (evita schema/stale do Prisma Client)
      const existsRows = (await withRetry(() => prisma.$queryRaw`
          SELECT id FROM Usuario WHERE email = ${emailAddr} LIMIT 1
      `)) as unknown as Array<{ id: number }>;
      const exists = existsRows.length > 0;
      if (exists) {
        return NextResponse.json({ error: "EMAIL_TAKEN", message: "E-mail já cadastrado" }, { status: 409 });
      }

      // 1) gerar senha provisória
      const tempPassword = generateTempPassword(12);
      const senhaHash = await bcrypt.hash(tempPassword, 12);

      // 2) Inserção resiliente ao schema: detectar colunas disponíveis (usando cache com TTL de 5 min)
      const cols = await getUsuarioColumns();

      const insertCols: string[] = ["email", "senha"]; // essenciais
      const values: SqlValue[] = [emailAddr, senhaHash];

      // status
      if (cols.has("status")) { insertCols.push("status"); values.push(status ?? "ATIVO"); }

      // role/nivel
      if (cols.has("nivel")) { insertCols.push("nivel"); values.push(role ?? "USUARIO"); }
      else if (cols.has("role")) { insertCols.push("role"); values.push(role ?? "USUARIO"); }

      // nome
      if (cols.has("nomeCompleto")) { insertCols.push("nomeCompleto"); values.push(nomeCompleto ?? null); }
      else if (cols.has("nome")) { insertCols.push("nome"); values.push(nomeCompleto ?? null); }

      // outros campos opcionais
      if (cols.has("telefone")) { insertCols.push("telefone"); values.push(telefone ?? null); }
      if (cols.has("dataNascimento")) { insertCols.push("dataNascimento"); values.push(dataNascimento ?? null); }
      if (cols.has("endereco1")) { insertCols.push("endereco1"); values.push(endereco1 ?? ""); }
      if (cols.has("endereco2")) { insertCols.push("endereco2"); values.push(endereco2 ?? ""); }
      if (cols.has("cidade")) { insertCols.push("cidade"); values.push(cidade ?? ""); }
      if (cols.has("estado")) { insertCols.push("estado"); values.push(estado ?? null); }
      if (cols.has("zipcode")) { insertCols.push("zipcode"); values.push(cep ?? null); }
      else if (cols.has("cep")) { insertCols.push("cep"); values.push(cep ?? null); }
      if (cols.has("anotacoes")) { insertCols.push("anotacoes"); values.push(anotacoes ?? null); }
      if (cols.has("expiresAt") && expiresAtCreate) { insertCols.push("expiresAt"); values.push(expiresAtCreate); }
      
      // Campos para controle de primeiro acesso e senha provisória
      const mustReset = exigirTrocaSenha !== false; // default true
      if (cols.has("primeiroAcesso")) { insertCols.push("primeiroAcesso"); values.push(mustReset); }
      if (cols.has("senhaProvisoria")) { insertCols.push("senhaProvisoria"); values.push(mustReset); }
      
      if (cols.has("criadoEm")) { insertCols.push("criadoEm"); values.push(new Date()); }
      if (cols.has("atualizadoEm")) { insertCols.push("atualizadoEm"); values.push(new Date()); }

      const placeholders = insertCols.map(() => "?").join(", ");
      const columnList = insertCols.map((c) => `\`${c}\``).join(", ");
      const sql = `INSERT INTO Usuario (${columnList}) VALUES (${placeholders})`;
      await withRetry(() => prisma.$executeRawUnsafe(sql, ...values));

    const createdRows = (await withRetry(() => prisma.$queryRaw`
      SELECT id, email, status, criadoEm, nomeCompleto, nivel FROM Usuario WHERE email = ${emailAddr} LIMIT 1
    `)) as unknown as Array<{ id: number; email: string; status: string; criadoEm: Date; nomeCompleto: string | null; nivel: string | null }>;
    const created = createdRows[0];

    // 3) e-mail de boas-vindas (include temp password)
    const appUrl: string = process.env.APP_URL ?? "http://localhost:3000";
    const assetsBaseUrl: string = process.env.ASSETS_BASE_URL ?? "";
    const supportEmail: string = process.env.SUPPORT_EMAIL ?? "suporte@gladpros.com";

    const displayName = nomeCompleto ?? created.email;

    // Gerar magic link de primeiro acesso (válido 7 dias, single-use via primeiroAcesso flag)
    let firstAccessUrl: string | undefined;
    try {
      const magicToken = await signFirstAccessJWT(created.id, created.email);
      firstAccessUrl = `${appUrl.replace(/\/$/, "")}/api/auth/first-access/magic?token=${magicToken}`;
    } catch (err) {
      logger.warn("[POST usuarios] Falha ao gerar magic link de primeiro acesso", {}, err);
    }

    const { subject, html /*, text*/ } = renderWelcomeEmail({
        name: displayName,
        email: created.email,
        tempPassword,
        appUrl,
        assetsBaseUrl,
        supportEmail,
        firstAccessUrl,
      });

      // Registrar auditoria da criação (não bloqueia o fluxo se falhar)
      try {
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        await AuditLogger.log({
          userId: Number(user.id),
          action: 'CREATE_USER',
          resource: 'Usuario',
          resourceId: String(created.id),
          ip,
          details: { email: created.email, role: role ?? 'USUARIO', nomeCompleto: nomeCompleto ?? null },
          status: 'SUCCESS',
        });
      } catch (auditError) {
        logger.error('[POST usuarios] Erro ao registrar auditoria', {}, auditError);
      }

      if (sendInviteEmail !== false) {
        try {
          await sendMail(created.email, subject, html);
        } catch (err) {
          logger.warn("[SMTP MAILER ERROR]", {}, err);
        }
      }

      // 4) criar Worker vinculado se solicitado
      let workerLinked = false;
      if (vincularWorker) {
        try {
          await prisma.worker.create({
            data: {
              name: nomeCompleto ?? emailAddr,
              email: emailAddr,
              emailNormalized: emailAddr.toLowerCase(),
              usuarioId: created.id,
              classification: (workerClassification ?? "CONTRACTOR_1099") as "W2_EMPLOYEE" | "CONTRACTOR_1099" | "SUBCONTRACTOR" | "OWNER_OPERATOR",
              type: "INDIVIDUAL",
              status: "ACTIVE",
            },
          });
          workerLinked = true;
        } catch (workerErr) {
          logger.warn("[POST usuarios] Falha ao criar Worker vinculado", {}, workerErr);
        }
      }

      return NextResponse.json({
        data: { ...created, workerLinked },
        success: true,
        message: workerLinked ? "Usuário criado com sucesso e vinculado ao Workforce" : "Usuário criado com sucesso",
      }, { status: 201 });
    } catch (err: unknown) {
      logger.error("POST /api/usuarios error", {}, err);
      
      // Tratamento específico para erros de autenticação
      if (err instanceof Error && err.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'UNAUTHENTICATED', message: 'Não autenticado' }, { status: 401 });
      }
      
      // Tratar erros específicos do banco de dados
      const e = err as { message?: string; code?: string } | undefined;
      const errorMessage = e?.message || String(err);
      const errorCode = e?.code;
      
      // Erro de data inválida do MySQL/MariaDB
      if (errorCode === "P2010" && errorMessage.includes("Incorrect date value")) {
        return NextResponse.json({
          error: "VALIDATION_ERROR",
          message: "Data de nascimento inválida. Use o formato MM/DD/YYYY (exemplo: 05/18/1979)",
          fields: {
            dataNascimento: "Data de nascimento inválida. Use o formato MM/DD/YYYY (exemplo: 05/18/1979)"
          }
        }, { status: 400 });
      }
      
      // Erro de constraint de telefone (se houver)
      if (errorMessage.toLowerCase().includes("telefone")) {
        return NextResponse.json({
          error: "VALIDATION_ERROR",
          message: "Telefone inválido. Deve ter 10 dígitos.",
          fields: {
            telefone: "Telefone deve ter 10 dígitos. Exemplo: (469)334-6918"
          }
        }, { status: 400 });
      }
      
      // Erro de CEP inválido
      if (errorMessage.toLowerCase().includes("cep")) {
        return NextResponse.json({
          error: "VALIDATION_ERROR",
          message: "CEP inválido. Deve conter apenas números.",
          fields: {
            cep: "CEP deve conter apenas números. Exemplo: 01234567"
          }
        }, { status: 400 });
      }
      
      // Erro genérico
      return NextResponse.json({ 
        error: "INTERNAL_ERROR", 
        message: "Erro interno do servidor. Verifique os dados e tente novamente." 
      }, { status: 500 });
    }
  });
