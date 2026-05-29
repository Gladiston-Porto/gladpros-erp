#!/usr/bin/env node
/**
 * GladPros ERP — Module Health Check
 *
 * Detecta anti-patterns conhecidos no codebase.
 * Também verifica relatorios/known-bugs.json: quando um commit toca um arquivo
 * listado em um bug OPEN, verifica se o padrão foi removido de TODOS os arquivos
 * daquele bug (previne o problema "N-1 fix" — corrigir todos menos 1).
 *
 * Roda automaticamente no pre-commit hook e pode ser chamado manualmente:
 *
 *   node scripts/check-module-health.mjs
 *   node scripts/check-module-health.mjs --module=usuarios
 *   node scripts/check-module-health.mjs --staged
 *
 * Exit 0 = nenhum P1 encontrado
 * Exit 1 = P1 encontrado (bloqueia commit)
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";
import { runVerificationGlobal } from "./lib/verification.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

const args = process.argv.slice(2);
const moduleArg = args.find((a) => a.startsWith("--module="))?.split("=")[1];
const onlyStagedFiles = args.includes("--staged");

function getModuleScopes(mod) {
  const defaults = [
    `src/app/api/${mod}/`,
    `src/app/${mod}/`,
    `src/components/${mod}/`,
    `src/domains/${mod}/`,
    `src/services/${mod}/`,
    `src/schemas/${mod}/`,
    `src/__tests__/api/${mod}/`,
  ];

  const custom = {
    auth: [
      "src/app/api/auth/",
      "src/app/login/",
      "src/app/mfa/",
      "src/app/desbloqueio/",
      "src/shared/lib/mfa",
      "src/shared/lib/blocking",
      "src/shared/lib/password",
      "src/shared/lib/validation",
      "src/shared/lib/email",
      "src/shared/lib/mfa-challenge",
      "src/lib/api/",
    ],
    usuarios: [
      "src/app/api/usuarios/",
      "src/__tests__/api/usuarios/",
      "src/shared/lib/user-hierarchy",
      "src/shared/lib/rbac",
    ],
  };

  return [...new Set([...(custom[mod] ?? []), ...defaults])];
}

function isLineInModuleScope(line, mod) {
  if (!mod) return true;
  const filePath = line.split(":")[0] ?? "";
  const scopes = getModuleScopes(mod);
  return scopes.some((s) => filePath.includes(s));
}

function findPatternLineInFile(fileContent, pattern) {
  try {
    const regex = new RegExp(pattern, "m");
    const match = regex.exec(fileContent);
    if (!match || typeof match.index !== "number") return -1;
    return fileContent.slice(0, match.index).split("\n").length;
  } catch {
    return -1;
  }
}

function getLineForText(fileContent, text) {
  const idx = fileContent.indexOf(text);
  if (idx < 0) return 1;
  return fileContent.slice(0, idx).split("\n").length;
}

// ── grep util ────────────────────────────────────────────────────────────────

function grep(pattern, searchPath) {
  try {
    const cmd = [
      "grep", "-rn", "-E",
      `'${pattern}'`,
      `"${searchPath}"`,
      '--include="*.ts"',
      '--include="*.tsx"',
      '2>/dev/null',
    ].join(" ");
    return execSync(cmd, { cwd: ROOT, encoding: "utf-8", shell: "/bin/bash" })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function grepStaged(pattern) {
  try {
    const files = execSync("git diff --cached --name-only --diff-filter=ACMR", {
      cwd: ROOT, encoding: "utf-8",
    }).trim().split("\n").filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));

    const results = [];
    for (const file of files) {
      try {
        const content = execSync(`git show ":${file}"`, { cwd: ROOT, encoding: "utf-8" });
        content.split("\n").forEach((line, idx) => {
          try {
            if (new RegExp(pattern).test(line)) {
              results.push(`${file}:${idx + 1}:${line.trim()}`);
            }
          } catch { /* invalid regex for this line */ }
        });
      } catch { /* file not in index */ }
    }
    return results;
  } catch {
    return [];
  }
}

// ── Known-bugs checker ───────────────────────────────────────────────────────
/**
 * Lê relatorios/known-bugs.json e verifica que bugs OPEN não têm padrão
 * remanescente em nenhum dos arquivos afetados.
 *
 * Quando --staged: detecta se o commit toca um arquivo de um bug OPEN
 * e verifica se o padrão ainda existe (mesmo fora do staged) — previne N-1 fix.
 */
function checkKnownBugs() {
  const knownBugsPath = path.join(ROOT, "relatorios", "known-bugs.json");
  if (!existsSync(knownBugsPath)) return [];

  let knownBugs;
  try {
    knownBugs = JSON.parse(readFileSync(knownBugsPath, "utf-8"));
  } catch {
    return [];
  }

  const openBugs = (knownBugs.bugs ?? []).filter((b) => b.status === "OPEN");
  const fixedBugs = (knownBugs.bugs ?? []).filter((b) => b.status === "FIXED");
  if (openBugs.length === 0 && fixedBugs.length === 0) return [];

  // When --module, filter to bugs of that module
  const openBugsToCheck = moduleArg
    ? openBugs.filter((b) => !b.module || b.module === moduleArg)
    : openBugs;

  const fixedBugsToCheck = moduleArg
    ? fixedBugs.filter((b) => !b.module || b.module === moduleArg)
    : fixedBugs;

  // When --staged, get the list of files in the commit
  let stagedFiles = [];
  if (onlyStagedFiles) {
    try {
      stagedFiles = execSync("git diff --cached --name-only --diff-filter=ACMR", {
        cwd: ROOT, encoding: "utf-8",
      }).trim().split("\n").filter(Boolean);
    } catch { /* not in a git repo */ }
  }

  const violations = [];

  for (const bug of openBugsToCheck) {
    if (!bug.verificationPattern || !bug.affectedFiles?.length) continue;

    // When --staged: only check bugs whose files are touched by this commit
    if (onlyStagedFiles) {
      const touchedBugFiles = bug.affectedFiles.filter((af) =>
        stagedFiles.some((sf) => sf.includes(af) || af.includes(sf))
      );
      if (touchedBugFiles.length === 0) continue;
    }

    // Verify ALL affected files — any file still containing the pattern = incomplete fix
    for (const affectedFile of bug.affectedFiles) {
      const fullPath = path.join(ROOT, affectedFile);
      if (!existsSync(fullPath)) continue;

      let fileContent;
      try {
        fileContent = readFileSync(fullPath, "utf-8");
      } catch { continue; }

      const isAllowed = bug.allowedInFiles?.some((af) => affectedFile.includes(af));
      const foundLine = isAllowed ? -1 : findPatternLineInFile(fileContent, bug.verificationPattern);
      const found = foundLine > 0;

      if (found) {
        violations.push({
          bugId: bug.id,
          priority: bug.priority ?? "P1",
          title: bug.title,
          file: affectedFile,
          line: foundLine,
          fix: bug.fix,
          isPartialFix: onlyStagedFiles,
        });
      }
    }
  }

  // Regressão grave: bug marcado FIXED com padrão ainda presente
  for (const bug of fixedBugsToCheck) {
    if (!bug.verificationPattern) continue;

    // Schema-objeto: usar helper global (honra allowedMatches/excludeGlobs/expectedMatches)
    if (typeof bug.verificationPattern === "object" && bug.verificationPattern !== null) {
      // Em --staged, só rodar se algum arquivo do scope foi tocado
      if (onlyStagedFiles) {
        const scopeStr = Array.isArray(bug.verificationPattern.scope)
          ? bug.verificationPattern.scope.join("|")
          : "";
        const touched = stagedFiles.some((sf) => scopeStr && scopeStr.includes(sf.split("/").slice(0, 4).join("/")));
        if (!touched) continue;
      }
      const result = runVerificationGlobal(bug, ROOT);
      if (!result.ok) {
        for (const v of result.violations) {
          violations.push({
            bugId: bug.id,
            priority: bug.priority ?? "P2",
            title: `${bug.title} (BUG FIXED REGREDIU)`,
            file: v.file,
            line: v.line,
            fix: bug.fix,
            isPartialFix: onlyStagedFiles,
            isFixedRegression: true,
          });
        }
      }
      continue;
    }

    // Legacy: string + affectedFiles
    if (!bug.affectedFiles?.length) continue;

    if (onlyStagedFiles) {
      const touchedBugFiles = bug.affectedFiles.filter((af) =>
        stagedFiles.some((sf) => sf.includes(af) || af.includes(sf))
      );
      if (touchedBugFiles.length === 0) continue;
    }

    for (const affectedFile of bug.affectedFiles) {
      const fullPath = path.join(ROOT, affectedFile);
      if (!existsSync(fullPath)) continue;

      let fileContent;
      try {
        fileContent = readFileSync(fullPath, "utf-8");
      } catch { continue; }

      const isAllowed = bug.allowedInFiles?.some((af) => affectedFile.includes(af));
      const foundLine = isAllowed ? -1 : findPatternLineInFile(fileContent, bug.verificationPattern);
      const found = foundLine > 0;

      if (found) {
        violations.push({
          bugId: bug.id,
          priority: bug.priority ?? "P1",
          title: `${bug.title} (BUG FIXED REGREDIU)`,
          file: affectedFile,
          line: foundLine,
          fix: bug.fix,
          isPartialFix: onlyStagedFiles,
          isFixedRegression: true,
        });
      }
    }
  }

  return violations;
}

// ── Rules ────────────────────────────────────────────────────────────────────

/**
 * allowedFiles: linhas que contiverem qualquer desses paths são ignoradas
 * commentLinePattern: regex para filtrar linhas de comentário
 */
const RULES = [
  // ── P1 — Críticos (bloqueiam commit) ──────────────────────────────────────
  {
    id: "P1-001",
    severity: "P1",
    description: "INFORMATION_SCHEMA consultada diretamente (fora do cache autorizado)",
    pattern: "FROM INFORMATION_SCHEMA",
    scope: "src/",
    allowedFiles: [
      "usuario-query.ts",   // cache autorizado para usuarios
      "db-metadata.ts",     // cache autorizado geral
    ],
    fix: "Use getUsuarioColumns() de @/shared/lib/usuario-query (cache TTL 5min)",
  },
  {
    id: "P1-002",
    severity: "P1",
    description: "Import do Prisma fora do caminho canônico @/lib/prisma",
    pattern: 'from .@/server/db|from .@/shared/lib/prisma',
    scope: "src/",
    allowedFiles: ["src/server/db.ts", "src/server/db-temp.ts", "src/lib/prisma.ts"],
    fix: 'Use: import { prisma } from "@/lib/prisma"',
  },
  {
    id: "P1-003",
    severity: "P1",
    description: "await dentro de .map() em código de API — N+1 queries sequenciais",
    pattern: "\\.map\\(async",
    scope: "src/app/api/",
    // Se Promise.all( aparecer nas 2 linhas anteriores, é padrão correto (paralelo)
    precedingContextLines: 2,
    precedingContextPattern: "Promise\\.all\\(",
    fix: "Use Promise.all() ou Prisma include",
  },
  {
    id: "P1-004",
    severity: "P1",
    description: "requireAuth / requireApiUser legados — use requireUser de @/shared/lib/rbac",
    pattern: "requireAuth\\(|requireApiUser\\(",
    scope: "src/app/api/",
    allowedFiles: ["src/lib/api/auth.ts", "src/shared/lib/requireServerUser.ts"],
    fix: 'Use: import { requireUser } from "@/shared/lib/rbac"',
  },

  // ── P2 — Funcionais ───────────────────────────────────────────────────────
  {
    id: "P2-001",
    severity: "P2",
    description: "empresaId hardcoded como 1 em rota de API — use user.empresaId",
    pattern: "empresaId:\\s*1[^0-9]",
    scope: "src/app/api/",
    allowedFiles: ["src/app/api/dev/", "src/app/api/webhooks/", "src/app/api/cron/", "__tests__", ".test.ts", ".spec.ts", "src/shared/lib/rbac.ts", "verificar-reservas/route.ts", "materials/reserve/route.ts", "criar-sc/route.ts"],
    fix: "Use: empresaId: user.empresaId (obtido via requireUser())",
  },
  {
    id: "P2-003",
    severity: "P2",
    description: "empresaId hardcoded em SQL (VALUES (1, ...)) em rota de API",
    pattern: "VALUES\\s*\\(\\s*1\\s*,",
    scope: "src/app/api/",
    allowedFiles: ["src/app/api/dev/", "src/app/api/webhooks/", "src/app/api/cron/", "__tests__", ".test.ts", ".spec.ts"],
    fix: "Use empresaId dinâmico do usuário autenticado (ex: ${user.empresaId})",
  },
  {
    id: "P2-002",
    severity: "P2",
    description: "Resposta de API sem campo success — quebra o contrato do frontend",
    pattern: "NextResponse\\.json\\(\\s*\\{(?![^}]*success)",
    scope: "src/app/api/",
    // For multi-line responses, also check the next N lines for `success:`
    multilineContextLines: 10,
    allowedFiles: [
      "src/app/api/dev/",
      "src/app/api/webhooks/",
      "src/app/api/auth/",
      "src/app/api/portal/",
    ],
    fix: "Adicione success: true|false em todas as respostas da API",
  },

  // ── P3 — Qualidade ────────────────────────────────────────────────────────
  {
    id: "P3-001",
    severity: "P3",
    description: "console.log em rota de API de produção",
    pattern: "console\\.log",
    scope: "src/app/api/",
    allowedFiles: ["src/app/api/dev/"],
    fix: 'Use: import { logger } from "@/lib/api/logger"',
  },
  {
    id: "P3-002",
    severity: "P3",
    description: "Formatação BRL / R$ — sistema usa USD/en-US",
    pattern: "R\\$|'BRL'",
    scope: "src/app/",
    fix: "Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })",
  },
];

function checkAuthInvariantViolations() {
  if (moduleArg && moduleArg !== "auth") return [];

  const violations = [];

  const refreshPath = path.join(ROOT, "src/app/api/auth/refresh/route.ts");
  if (existsSync(refreshPath)) {
    const content = readFileSync(refreshPath, "utf-8");
    if (!/apiRateLimit\.checkLimit\(/.test(content)) {
      violations.push({
        rule: {
          id: "P2-AUTH-001",
          severity: "P2",
          description: "Refresh endpoint sem rate-limit obrigatório",
          fix: "Adicionar apiRateLimit.checkLimit() no POST /api/auth/refresh",
        },
        line: getLineForText(content, "export const POST"),
        file: "src/app/api/auth/refresh/route.ts",
      });
    }

    if (!/sessionToken\s*=\s*request\.cookies\.get\('sessionToken'\)/.test(content) || !/refreshAccessToken\(refreshToken,\s*\{[\s\S]*sessionToken/.test(content)) {
      violations.push({
        rule: {
          id: "P1-AUTH-002",
          severity: "P1",
          description: "Refresh endpoint sem vínculo obrigatório com sessionToken da sessão atual",
          fix: "Ler sessionToken do cookie e passá-lo para refreshAccessToken()",
        },
        line: getLineForText(content, "export const POST"),
        file: "src/app/api/auth/refresh/route.ts",
      });
    }
  }

  const sessionsPath = path.join(ROOT, "src/app/api/auth/me/sessions/route.ts");
  if (existsSync(sessionsPath)) {
    const content = readFileSync(sessionsPath, "utf-8");
    const hasLimit = /\bLIMIT\b/.test(content);
    const hasOffset = /\bOFFSET\b/.test(content);
    const hasPaginationPayload = /pagination\s*:\s*\{/.test(content);

    if (!hasLimit || !hasOffset || !hasPaginationPayload) {
      violations.push({
        rule: {
          id: "P2-AUTH-002",
          severity: "P2",
          description: "Me/sessions sem paginação/cap obrigatória",
          fix: "Aplicar LIMIT/OFFSET e retornar pagination no payload",
        },
        line: getLineForText(content, "export const GET"),
        file: "src/app/api/auth/me/sessions/route.ts",
      });
    }

    if (!/revokeAllUserTokensExceptSession\(/.test(content) && !/revokeAllUserTokens\(/.test(content)) {
      violations.push({
        rule: {
          id: "P1-AUTH-003",
          severity: "P1",
          description: "Me/sessions revoke-others sem revogação real dos refresh tokens",
          fix: "Revogar os refresh tokens das sessões removidas ao executar revoke-others",
        },
        line: getLineForText(content, "export const POST"),
        file: "src/app/api/auth/me/sessions/route.ts",
      });
    }
  }

  const sessionDetailPath = path.join(ROOT, "src/app/api/auth/me/sessions/[id]/route.ts");
  if (existsSync(sessionDetailPath)) {
    const content = readFileSync(sessionDetailPath, "utf-8");
    if (!/revokeTokensForSession\(/.test(content)) {
      violations.push({
        rule: {
          id: "P1-AUTH-004",
          severity: "P1",
          description: "DELETE de sessão sem revogação dos refresh tokens da sessão",
          fix: "Após apagar SessaoAtiva, revogar os refresh tokens vinculados à sessão",
        },
        line: getLineForText(content, "export const DELETE"),
        file: "src/app/api/auth/me/sessions/[id]/route.ts",
      });
    }
  }

  const logoutPath = path.join(ROOT, "src/app/api/auth/logout/route.ts");
  if (existsSync(logoutPath)) {
    const content = readFileSync(logoutPath, "utf-8");
    if (!/deviceTrust/.test(content) || !/revokeTokensForSession\(/.test(content)) {
      violations.push({
        rule: {
          id: "P2-AUTH-003",
          severity: "P2",
          description: "Logout sem limpeza/revogação completa da sessão atual e trusted device",
          fix: "Limpar cookie deviceTrust, remover DispositivoConfiavel atual e revogar refresh tokens da sessão",
        },
        line: getLineForText(content, "export const POST"),
        file: "src/app/api/auth/logout/route.ts",
      });
    }
  }

  const rbacPath = path.join(ROOT, "src/shared/lib/rbac.ts");
  if (existsSync(rbacPath)) {
    const content = readFileSync(rbacPath, "utf-8");
    if (!/claims\.sessionId/.test(content) || !/sessionToken/.test(content) || !/SessaoAtiva/.test(content)) {
      violations.push({
        rule: {
          id: "P1-AUTH-005",
          severity: "P1",
          description: "requireUser sem validação de sessão para JWTs vinculados a sessão",
          fix: "Quando claims.sessionId existir, validar sessionToken atual contra SessaoAtiva",
        },
        line: getLineForText(content, "export async function requireUser"),
        file: "src/shared/lib/rbac.ts",
      });
    }
  }

  const securityPath = path.join(ROOT, "src/shared/lib/security.ts");
  if (existsSync(securityPath)) {
    const content = readFileSync(securityPath, "utf-8");
    if (/revokeAllUserSessions\(usuarioId\)/.test(content)) {
      violations.push({
        rule: {
          id: "P2-AUTH-004",
          severity: "P2",
          description: "createSession continua revogando todas as sessões do usuário a cada login",
          fix: "Não apagar sessões existentes durante createSession; deixe a revogação explícita para logout/revoke-others",
        },
        line: getLineForText(content, "static async createSession"),
        file: "src/shared/lib/security.ts",
      });
    }
  }

  return violations;
}

function listTypeScriptFiles(dir) {
  try {
    const output = execSync(`find "${dir}" -type f -name "*.ts" -o -name "*.tsx"`, {
      cwd: ROOT,
      encoding: "utf-8",
      shell: "/bin/bash",
    });
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function checkUsuariosInvariantViolations() {
  if (moduleArg && moduleArg !== "usuarios") return [];

  const apiDir = path.join(ROOT, "src/app/api/usuarios");
  if (!existsSync(apiDir)) return [];

  const violations = [];
  const files = listTypeScriptFiles(apiDir).filter((file) => !/(__tests__|\.test\.|\.spec\.)/.test(file));

  for (const fullPath of files) {
    let lines;
    try {
      lines = readFileSync(fullPath, "utf-8").split("\n");
    } catch {
      continue;
    }

    const relative = path.relative(ROOT, fullPath);
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (/^\s*(\/\/|\/\*|\*)/.test(trimmed)) return;

      const isUsuarioSqlById = /\bFROM\s+Usuario\s+WHERE\s+id\s*=/.test(line)
        || /\bWHERE\s+id\s*=\s*\?/.test(line)
        || /\bWHERE\s+id\s*=\s*\$\{/.test(line);

      if (isUsuarioSqlById && !/empresaId/.test(line)) {
        violations.push({ file: relative, line: index + 1 });
        return;
      }

      const isPrismaUsuarioById = /where\s*:\s*\{\s*id\s*[,}]/.test(line);
      if (isPrismaUsuarioById) {
        const context = lines.slice(index, Math.min(lines.length, index + 5)).join("\n");
        if (!/empresaId/.test(context)) {
          violations.push({ file: relative, line: index + 1 });
        }
      }
    });
  }

  return violations.map((violation) => ({
    rule: {
      id: "P1-USUARIOS-EMPRESAID-ID",
      severity: "P1",
      description: "Query/update de Usuario por id sem empresaId no módulo usuarios",
      fix: "Adicionar empresaId ao WHERE/where junto com id para prevenir IDOR e fix parcial.",
    },
    file: violation.file,
    line: violation.line,
  }));
}

// ── Runner ────────────────────────────────────────────────────────────────────

let totalErrors = 0;
const P1_errors = [];
const P2_errors = [];
const P3_errors = [];

for (const rule of RULES) {
  // When --module is given, search within that module's directories
  let searchPath;
  if (moduleArg) {
    // Try to find the narrowest path that makes sense
    searchPath = path.join(ROOT, rule.scope ?? "src/");
  } else {
    searchPath = path.join(ROOT, rule.scope ?? "src/");
  }

  const raw = onlyStagedFiles ? grepStaged(rule.pattern) : grep(rule.pattern, searchPath);

  // Cache file contents for multiline context checks
  const fileCache = new Map();

  const violations = raw.filter((line) => {
    // When --module is specified, only consider files inside module scope map
    if (moduleArg && !isLineInModuleScope(line, moduleArg)) return false;

    // Skip pure comment lines
    const codePart = line.split(":").slice(2).join(":").trim();
    if (/^\s*(\/\/|\/\*|\*)/.test(codePart)) return false;

    // Skip allowed files
    if (rule.allowedFiles?.some((f) => line.includes(f))) return false;

    // Multiline context check: if the rule defines multilineContextLines,
    // also check the following N lines in the actual file for the presence of `success:`
    if (rule.multilineContextLines || rule.precedingContextLines) {
      const parts = line.split(":");
      const filePath = parts[0];
      const lineNum = parseInt(parts[1], 10);
      if (filePath && !isNaN(lineNum)) {
        try {
          if (!fileCache.has(filePath)) {
            const content = readFileSync(path.resolve(ROOT, filePath), "utf-8").split("\n");
            fileCache.set(filePath, content);
          }
          const lines = fileCache.get(filePath);

          // Check following lines for multilineContextLines (e.g. success: field)
          if (rule.multilineContextLines) {
            const endLine = Math.min(lineNum + rule.multilineContextLines, lines.length);
            const context = lines.slice(lineNum - 1, endLine).join("\n");
            if (/success\s*:/.test(context)) return false; // has success in context window
          }

          // Check preceding lines for precedingContextPattern (e.g. Promise.all before .map)
          if (rule.precedingContextLines && rule.precedingContextPattern) {
            const startLine = Math.max(0, lineNum - 1 - rule.precedingContextLines);
            const precContext = lines.slice(startLine, lineNum - 1).join("\n");
            if (new RegExp(rule.precedingContextPattern).test(precContext)) return false;
          }
        } catch { /* file unreadable — keep violation */ }
      }
    }

    return true;
  });

  if (violations.length > 0) {
    totalErrors += violations.length;
    const entry = { rule, violations };
    if (rule.severity === "P1") P1_errors.push(entry);
    else if (rule.severity === "P2") P2_errors.push(entry);
    else P3_errors.push(entry);
  }
}

const authInvariantViolations = checkAuthInvariantViolations();
if (authInvariantViolations.length > 0) {
  const grouped = new Map();

  for (const v of authInvariantViolations) {
    const key = v.rule.id;
    if (!grouped.has(key)) {
      grouped.set(key, { rule: v.rule, violations: [] });
    }
    grouped.get(key).violations.push(`${v.file}:${v.line}:invariante ausente`);
  }

  for (const entry of grouped.values()) {
    totalErrors += entry.violations.length;
    if (entry.rule.severity === "P1") P1_errors.push(entry);
    else if (entry.rule.severity === "P2") P2_errors.push(entry);
    else P3_errors.push(entry);
  }
}

const usuariosInvariantViolations = checkUsuariosInvariantViolations();
if (usuariosInvariantViolations.length > 0) {
  const grouped = new Map();

  for (const v of usuariosInvariantViolations) {
    const key = v.rule.id;
    if (!grouped.has(key)) {
      grouped.set(key, { rule: v.rule, violations: [] });
    }
    grouped.get(key).violations.push(`${v.file}:${v.line}:empresaId ausente no acesso por id`);
  }

  for (const entry of grouped.values()) {
    totalErrors += entry.violations.length;
    if (entry.rule.severity === "P1") P1_errors.push(entry);
    else if (entry.rule.severity === "P2") P2_errors.push(entry);
    else P3_errors.push(entry);
  }
}

// ── Run known-bugs check ──────────────────────────────────────────────────────

const knownBugViolations = checkKnownBugs();
const knownBugP1s = knownBugViolations.filter((v) => v.priority === "P1");
const knownBugP2s = knownBugViolations.filter((v) => v.priority === "P2");
const knownBugP3s = knownBugViolations.filter((v) => v.priority === "P3");

totalErrors += knownBugViolations.length;

// ── Output ────────────────────────────────────────────────────────────────────

const scopeLabel = moduleArg ? ` [módulo: ${moduleArg}]` : "";

if (totalErrors === 0) {
  console.log(`\n${GREEN}${BOLD}✅ Nenhum anti-pattern encontrado${scopeLabel}.${RESET}\n`);
  process.exit(0);
}

console.log(`\n${BOLD}GladPros ERP — Module Health Check${scopeLabel}${RESET}`);
console.log("─".repeat(62));

function printErrors(errors, color, label) {
  if (errors.length === 0) return;
  console.log(`\n${color}${BOLD}${label} (${errors.length} regra(s) violada(s))${RESET}`);
  for (const { rule, violations } of errors) {
    console.log(`\n  ${color}[${rule.id}]${RESET} ${rule.description}`);
    console.log(`  ${YELLOW}Fix:${RESET} ${rule.fix}`);
    console.log(`  ${YELLOW}Ocorrências (${violations.length}):${RESET}`);
    violations.slice(0, 5).forEach((v) => {
      const short = v.replace(ROOT + "/", "");
      console.log(`    ${short}`);
    });
    if (violations.length > 5) console.log(`    ... e mais ${violations.length - 5} ocorrências`);
  }
}

printErrors(P1_errors, RED, "🔴 P1 — Crítico (bloqueiam commit)");
printErrors(P2_errors, YELLOW, "🟠 P2 — Funcional");
printErrors(P3_errors, CYAN, "🟡 P3 — Qualidade");

// ── Known-bugs output ─────────────────────────────────────────────────────────
if (knownBugViolations.length > 0) {
  const hasFixedRegression = knownBugViolations.some((v) => v.isFixedRegression);
  const label = onlyStagedFiles
    ? "⚠️  KNOWN-BUGS: Fix incompleto detectado (N-1 problem)"
    : hasFixedRegression
      ? "📋 KNOWN-BUGS: Regressão detectada em bug marcado FIXED"
      : "📋 KNOWN-BUGS: Bugs em aberto com padrão ainda presente";

  console.log(`\n${RED}${BOLD}${label}${RESET}`);
  console.log(`  ${YELLOW}Esses bugs têm arquivos afetados onde o padrão ainda existe.${RESET}`);
  console.log(`  ${YELLOW}Não marque como FIXED em known-bugs.json até todos os arquivos estarem limpos.${RESET}\n`);

  for (const v of knownBugViolations) {
    const color = v.priority === "P1" ? RED : v.priority === "P2" ? YELLOW : CYAN;
    console.log(`  ${color}[${v.bugId}]${RESET} ${v.title}`);
    console.log(`    Arquivo com padrão ainda presente: ${v.file}:${v.line}`);
    console.log(`    Fix: ${v.fix}`);
    if (v.isPartialFix) {
      console.log(`    ${RED}${BOLD}ATENÇÃO: Você está commitando uma correção parcial — o padrão ainda existe neste arquivo!${RESET}`);
    }
    if (v.isFixedRegression) {
      console.log(`    ${RED}${BOLD}REGRESSÃO: bug marcado FIXED voltou a aparecer no código.${RESET}`);
    }
    console.log("");
  }
}

if (knownBugP2s.length > 0) {
  console.log(`\n${YELLOW}${BOLD}🟠 P2 — Funcional (known-bugs) (${knownBugP2s.length})${RESET}`);
}

if (knownBugP3s.length > 0) {
  console.log(`${CYAN}${BOLD}🟡 P3 — Qualidade (known-bugs) (${knownBugP3s.length})${RESET}`);
}

console.log("\n" + "─".repeat(62));
console.log(`${BOLD}Total: ${totalErrors} violação(ões)${scopeLabel}${RESET}`);

if (P1_errors.length > 0 || knownBugP1s.length > 0) {
  console.log(`${RED}${BOLD}Commit bloqueado — corrija os P1 antes de continuar.${RESET}\n`);
  process.exit(1);
} else if (onlyStagedFiles && knownBugP2s.length > 0) {
  console.log(`${RED}${BOLD}Commit bloqueado — correção parcial/regressão P2 detectada em known-bugs.${RESET}\n`);
  process.exit(1);
} else {
  console.log(`${YELLOW}P1 limpo. Revise P2/P3 antes de deploy.${RESET}\n`);
  process.exit(0);
}
