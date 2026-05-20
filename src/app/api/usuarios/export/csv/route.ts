import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import { apiRateLimit } from '@/shared/lib/rate-limit';
import { buildUsuarioSelect } from "@/shared/lib/usuario-query";

type UserRow = {
	id: number; email: string; nomeCompleto?: string | null; nome?: string | null;
	role?: string | null; nivel?: string | null; status?: string | null;
	telefone?: string | null; cidade?: string | null; estado?: string | null;
	cep?: string | null; zipcode?: string | null; criadoEm?: Date | null;
};

type ColumnRow = { COLUMN_NAME: string };

type SqlValue = string | number | null | Date | boolean;
const MAX_EXPORT_ROWS = 5000;

const USER_EXPORT_COLUMNS = [
	"id",
	"email",
	"nomeCompleto",
	"nome",
	"role",
	"nivel",
	"status",
	"telefone",
	"cidade",
	"estado",
	"cep",
	"zipcode",
	"criadoEm",
];

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 300): Promise<T> {
	let last: unknown;
	for (let i = 0; i <= retries; i++) {
		try { return await fn(); } catch (e) { last = e; await new Promise(r => setTimeout(r, delayMs)); }
	}
	throw last;
}

function sanitizeCsvCell(value: unknown) {
	const stringValue = String(value ?? "");
	return /^[=+\-@]/.test(stringValue) ? `'${stringValue}` : stringValue;
}

const FiltersSchema = z.object({
	q: z.string().optional(),
	role: z.string().optional().refine((val) => !val || val.trim() === '' || z.enum(["ADMIN","GERENTE","USUARIO","FINANCEIRO","ESTOQUE","CLIENTE"]).safeParse(val).success, "role inválido"),
	status: z.string().optional().refine((val) => {
		if (!val || val.trim() === '') return true;
		return val === 'true' || val === 'false' || z.enum(["ATIVO","INATIVO"]).safeParse(val).success;
	}, "status inválido"),
	sortKey: z.enum(["nome","email","role","ativo","criadoEm"]).optional(),
	sortDir: z.enum(["asc","desc"]).optional(),
}).optional();

export const POST = withErrorHandler(async (req: NextRequest) => {
		const authUser = await requireUser(req);
		const rateCheck = await apiRateLimit.isAllowed(req);
		if (!rateCheck.allowed) {
		  return NextResponse.json(
		    { error: 'Too Many Requests', message: rateCheck.message, success: false },
		    { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)) } }
		  );
		}
		if (!can(authUser.role as Role, 'usuarios', 'read')) {
			return NextResponse.json({ error: 'Forbidden', message: "Acesso negado", success: false }, { status: 403 });
		}

		const raw = await req.json().catch(() => ({}));
		const parsed = z.object({ filters: FiltersSchema }).safeParse(raw);
		if (!parsed.success) {
			return NextResponse.json({ message: "Payload inválido" }, { status: 400 });
		}
		const f = parsed.data.filters ?? {};
		const colsRows = (await prisma.$queryRaw`
			SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario'
		`) as unknown as ColumnRow[];
		const cols = new Set(colsRows.map((row) => String(row.COLUMN_NAME)));

		// Processar filtros
		const effectiveRole = f.role && f.role.trim() !== '' ? f.role : undefined;
		const effectiveStatus = (() => {
			if (!f.status || f.status.trim() === '') return undefined;
			if (f.status === 'true') return 'ATIVO';
			if (f.status === 'false') return 'INATIVO';
			return f.status;
		})();

		const where: string[] = [];
		const params: SqlValue[] = [];

		// BUG-03 fix: Always filter by empresaId to prevent IDOR
		where.push("empresaId = ?");
		params.push(authUser.empresaId);

		if (f.q) {
			const like = `%${f.q}%`;
			const searchClauses = ["email LIKE ?"];
			const searchParams: SqlValue[] = [like];
			if (cols.has("nomeCompleto")) {
				searchClauses.push("nomeCompleto LIKE ?");
				searchParams.push(like);
			}
			if (cols.has("nome")) {
				searchClauses.push("nome LIKE ?");
				searchParams.push(like);
			}
			where.push(`(${searchClauses.join(" OR ")})`);
			params.push(...searchParams);
		}
		if (effectiveRole) {
			if (cols.has("nivel") && cols.has("role")) {
				where.push("(role = ? OR nivel = ?)");
				params.push(effectiveRole, effectiveRole);
			} else if (cols.has("nivel")) {
				where.push("nivel = ?");
				params.push(effectiveRole);
			} else if (cols.has("role")) {
				where.push("role = ?");
				params.push(effectiveRole);
			}
		}
		if (effectiveStatus) { where.push("status = ?"); params.push(effectiveStatus); }
		const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

		const orderKey = (() => {
			switch (f.sortKey) {
				case "nome": return "COALESCE(nomeCompleto, nome)";
				case "email": return "email";
				case "role":
					if (cols.has("nivel") && cols.has("role")) return "COALESCE(role, nivel)";
					if (cols.has("nivel")) return "nivel";
					if (cols.has("role")) return "role";
					return "criadoEm";
				case "ativo": return "status";
				case "criadoEm":
				default: return "criadoEm";
			}
		})();
		const orderDir = (f.sortDir && f.sortDir.toUpperCase() === "ASC") ? "ASC" : "DESC";

		const selectColumns = await buildUsuarioSelect(USER_EXPORT_COLUMNS);
		const sql = `SELECT ${selectColumns} FROM Usuario ${whereSql} ORDER BY ${orderKey} ${orderDir} LIMIT ?`;
		const rows = (await withRetry(() => prisma.$queryRawUnsafe(sql, ...params, MAX_EXPORT_ROWS))) as unknown as UserRow[];

		// CSV
		const headers = ["ID","Nome Completo","E-mail","Nível","Status","Criado Em"];
		const lines = [headers.join(",")];
		for (const r of rows) {
			const nome = r.nome ?? r.nomeCompleto ?? "";
			const nivel = r.role ?? r.nivel ?? "";
			const status = r.status ?? "";
			const criado = r.criadoEm ? new Date(r.criadoEm).toLocaleDateString('en-US', { timeZone: 'America/Chicago' }) : "";
			const data = [r.id, nome, r.email, nivel, status, criado]
				.map((v) => `"${sanitizeCsvCell(v).replace(/"/g, '""')}"`)
				.join(",");
			lines.push(data);
		}
		const csv = lines.join("\n");
		return new NextResponse(csv, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': 'attachment; filename="usuarios.csv"',
			}
		});
	});
