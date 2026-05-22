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

// ── grep util ────────────────────────────────────────────────────────────────

function grep(pattern, searchPath) {
  try {
    const cmd = [
      "grep", "-rn", "-E",
      `'${pattern}'`,
      `"${searchPath}"`,
      '--include="*.ts"',
      '--include="*.tsx"',
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
  if (openBugs.length === 0) return [];

  // When --module, filter to bugs of that module
  const bugsToCheck = moduleArg
    ? openBugs.filter((b) => !b.module || b.module === moduleArg)
    : openBugs;

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

  for (const bug of bugsToCheck) {
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

      const lines = fileContent.split("\n");
      let found = false;
      let foundLine = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comment lines
        if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue;
        try {
          if (new RegExp(bug.verificationPattern).test(line)) {
            // Skip if in allowed files
            const isAllowed = bug.allowedInFiles?.some((af) => affectedFile.includes(af));
            if (!isAllowed) {
              found = true;
              foundLine = i + 1;
              break;
            }
          }
        } catch { /* invalid regex */ }
      }

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
    allowedFiles: ["src/app/api/dev/", "src/app/api/webhooks/", "__tests__", ".test.ts", ".spec.ts", "src/shared/lib/rbac.ts"],
    fix: "Use: empresaId: user.empresaId (obtido via requireUser())",
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
    // When --module is specified, only consider files that mention the module name
    if (moduleArg && !line.includes(moduleArg)) return false;

    // Skip pure comment lines
    const codePart = line.split(":").slice(2).join(":").trim();
    if (/^\s*(\/\/|\/\*|\*)/.test(codePart)) return false;

    // Skip allowed files
    if (rule.allowedFiles?.some((f) => line.includes(f))) return false;

    // Multiline context check: if the rule defines multilineContextLines,
    // also check the following N lines in the actual file for the presence of `success:`
    if (rule.multilineContextLines) {
      const parts = line.split(":");
      const filePath = parts[0];
      const lineNum = parseInt(parts[1], 10);
      if (filePath && !isNaN(lineNum)) {
        try {
          if (!fileCache.has(filePath)) {
            const content = readFileSync(path.join(ROOT, filePath), "utf-8").split("\n");
            fileCache.set(filePath, content);
          }
          const lines = fileCache.get(filePath);
          const endLine = Math.min(lineNum + rule.multilineContextLines, lines.length);
          const context = lines.slice(lineNum - 1, endLine).join("\n");
          if (/success\s*:/.test(context)) return false; // has success in context window
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
  const label = onlyStagedFiles
    ? "⚠️  KNOWN-BUGS: Fix incompleto detectado (N-1 problem)"
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
    console.log("");
  }
}

console.log("\n" + "─".repeat(62));
console.log(`${BOLD}Total: ${totalErrors} violação(ões)${scopeLabel}${RESET}`);

if (P1_errors.length > 0 || knownBugP1s.length > 0) {
  console.log(`${RED}${BOLD}Commit bloqueado — corrija os P1 antes de continuar.${RESET}\n`);
  process.exit(1);
} else {
  console.log(`${YELLOW}P1 limpo. Revise P2/P3 antes de deploy.${RESET}\n`);
  process.exit(0);
}
