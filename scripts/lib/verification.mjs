/**
 * scripts/lib/verification.mjs
 *
 * Biblioteca compartilhada para validar `verificationPattern` de bugs do
 * known-bugs.json em modo "scope global" (Mecanismo 2 do Audit Loop Fechado).
 *
 * Formatos aceitos de verificationPattern:
 *   1. string  → forma legada. Tratada como regex aplicada apenas em affectedFiles.
 *   2. null    → bug semântico (sem regex). Verificação fica a cargo do regressionTest.
 *   3. object  → forma nova:
 *      {
 *        "type": "regex",
 *        "pattern": "INFORMATION_SCHEMA",
 *        "scope": ["src/app/api/auth/**"],
 *        "excludeGlobs": ["**\/*.test.ts", "**\/__tests__/**"],
 *        "excludeComments": true,
 *        "allowedMatches": [
 *          { "file": "src/shared/lib/usuario-query.ts", "reason": "wrapper canônico" }
 *        ],
 *        "expectedMatches": 0
 *      }
 *
 * Função principal:
 *   runVerificationGlobal(bug, rootDir) → {
 *     mode: 'object' | 'string-legacy' | 'semantic-skip',
 *     scanned: number,        // arquivos varridos
 *     matches: [{file,line,snippet,allowedReason?}],
 *     violations: [{file,line,snippet}],
 *     allowedHits: [{file,line,snippet,reason}],
 *     ok: boolean,
 *   }
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep, posix } from "node:path";

// ── Glob mínimo (sem dependências) ──────────────────────────────────────────
//
// Suporta: *, **, ?, e segmentos literais. Suficiente para os padrões usados
// neste projeto (ex: "src/app/api/auth/**", "**/*.test.ts").

function globToRegex(glob) {
  // Normaliza separador para "/"
  let g = glob.replace(/\\/g, "/");
  let re = "^";
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*") {
      if (g[i + 1] === "*") {
        // ** → qualquer coisa (inclui /)
        re += ".*";
        i++;
        // consumir uma "/" subsequente se houver
        if (g[i + 1] === "/") i++;
      } else {
        // * → qualquer coisa exceto "/"
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if (".+^$|()[]{}".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  re += "$";
  return new RegExp(re);
}

function matchGlob(filePath, glob) {
  const f = filePath.replace(/\\/g, "/");
  return globToRegex(glob).test(f);
}

function matchAnyGlob(filePath, globs) {
  if (!globs || !globs.length) return false;
  return globs.some((g) => matchGlob(filePath, g));
}

// ── Walk directory ───────────────────────────────────────────────────────────

const DEFAULT_INCLUDE_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".prisma"]);
const ALWAYS_SKIP_DIRS = new Set([
  "node_modules", ".next", ".turbo", "dist", "build", "coverage",
  "playwright-report", "test-results", ".git",
]);

function walkScope(rootDir, scopeGlob, accumulator) {
  // scopeGlob pode ser um diretório ("src/app/api/auth/") ou um glob ("src/app/api/auth/**").
  // Estratégia: pegar o prefixo literal antes do primeiro "*", caminhar a partir dele,
  // e filtrar com o glob completo.
  const normalized = scopeGlob.replace(/\\/g, "/");
  const starIdx = normalized.indexOf("*");
  const literalPrefix = starIdx === -1 ? normalized : normalized.slice(0, starIdx);
  const startDir = literalPrefix.replace(/\/$/, "");
  const absStart = join(rootDir, startDir);

  if (!existsSync(absStart)) return;

  const stat = statSync(absStart);
  if (stat.isFile()) {
    const rel = relative(rootDir, absStart).split(sep).join("/");
    if (starIdx === -1 || matchGlob(rel, normalized)) {
      accumulator.add(rel);
    }
    return;
  }

  const stack = [absStart];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (ALWAYS_SKIP_DIRS.has(entry.name)) continue;
        stack.push(join(dir, entry.name));
      } else if (entry.isFile()) {
        const ext = entry.name.slice(entry.name.lastIndexOf("."));
        if (!DEFAULT_INCLUDE_EXT.has(ext)) continue;
        const abs = join(dir, entry.name);
        const rel = relative(rootDir, abs).split(sep).join("/");
        if (starIdx === -1 || matchGlob(rel, normalized)) {
          accumulator.add(rel);
        }
      }
    }
  }
}

// ── Detecção de comentário ───────────────────────────────────────────────────

function isCommentLine(line) {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("#")
  );
}

// ── Normalização do verificationPattern ─────────────────────────────────────

export function normalizeVerificationPattern(bug) {
  const vp = bug.verificationPattern;
  if (vp === null || vp === undefined) {
    return { mode: "semantic-skip" };
  }
  if (typeof vp === "string") {
    // Legado: aplica apenas em affectedFiles, sem excludeGlobs.
    return {
      mode: "string-legacy",
      pattern: vp,
      affectedFiles: Array.isArray(bug.affectedFiles) ? bug.affectedFiles : [],
      allowedInFiles: Array.isArray(bug.allowedInFiles) ? bug.allowedInFiles : [],
    };
  }
  if (typeof vp === "object") {
    if (!vp.pattern) {
      return { mode: "invalid", reason: "verificationPattern.pattern ausente" };
    }
    if (!Array.isArray(vp.scope) || vp.scope.length === 0) {
      return { mode: "invalid", reason: "verificationPattern.scope obrigatório (array de globs)" };
    }
    const allowed = Array.isArray(vp.allowedMatches) ? vp.allowedMatches : [];
    for (const a of allowed) {
      if (!a.file || !a.reason) {
        return {
          mode: "invalid",
          reason: `allowedMatches exige { file, reason } — entrada inválida: ${JSON.stringify(a)}`,
        };
      }
    }
    return {
      mode: "object",
      pattern: vp.pattern,
      type: vp.type || "regex",
      scope: vp.scope,
      excludeGlobs: vp.excludeGlobs || [],
      excludeComments: vp.excludeComments !== false, // default true
      allowedMatches: allowed,
      expectedMatches: typeof vp.expectedMatches === "number" ? vp.expectedMatches : 0,
    };
  }
  return { mode: "invalid", reason: "verificationPattern com tipo desconhecido" };
}

// ── Execução ────────────────────────────────────────────────────────────────

export function runVerificationGlobal(bug, rootDir) {
  const norm = normalizeVerificationPattern(bug);

  if (norm.mode === "semantic-skip") {
    return {
      mode: norm.mode,
      scanned: 0,
      matches: [],
      violations: [],
      allowedHits: [],
      ok: true,
      note: "Bug semântico — verificação delegada ao regressionTest.",
    };
  }

  if (norm.mode === "invalid") {
    return {
      mode: norm.mode,
      scanned: 0,
      matches: [],
      violations: [],
      allowedHits: [],
      ok: false,
      error: norm.reason,
    };
  }

  let regex;
  try {
    regex = new RegExp(norm.pattern, "m");
  } catch (e) {
    return {
      mode: norm.mode,
      scanned: 0,
      matches: [],
      violations: [],
      allowedHits: [],
      ok: false,
      error: `regex inválida: ${e.message}`,
    };
  }

  // Coleta de arquivos a varrer
  const files = new Set();
  if (norm.mode === "string-legacy") {
    for (const f of norm.affectedFiles) files.add(f.replace(/\\/g, "/"));
  } else {
    for (const sc of norm.scope) walkScope(rootDir, sc, files);
  }

  const matches = [];
  const allowedHits = [];

  for (const rel of files) {
    const abs = join(rootDir, rel);
    if (!existsSync(abs)) continue;
    let content;
    try {
      content = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (norm.mode === "object" && norm.excludeComments && isCommentLine(line)) continue;
      if (!regex.test(line)) continue;

      const lineNum = i + 1;
      const snippet = line.trim().slice(0, 200);

      // Checa allowedMatches (somente modo object)
      if (norm.mode === "object") {
        const allowed = norm.allowedMatches.find((a) => rel === a.file || rel.endsWith(a.file));
        if (allowed) {
          allowedHits.push({ file: rel, line: lineNum, snippet, reason: allowed.reason });
          continue;
        }
        if (matchAnyGlob(rel, norm.excludeGlobs)) {
          allowedHits.push({ file: rel, line: lineNum, snippet, reason: "excludeGlobs" });
          continue;
        }
      } else if (norm.mode === "string-legacy") {
        const allowed = norm.allowedInFiles.find((a) => rel.includes(a));
        if (allowed) {
          allowedHits.push({ file: rel, line: lineNum, snippet, reason: `allowedInFiles: ${allowed}` });
          continue;
        }
      }

      matches.push({ file: rel, line: lineNum, snippet });
    }
  }

  const expected = norm.mode === "object" ? norm.expectedMatches : 0;
  const ok = matches.length === expected;

  return {
    mode: norm.mode,
    scanned: files.size,
    matches,
    violations: ok ? [] : matches,
    allowedHits,
    ok,
    expectedMatches: expected,
  };
}

// ── Util: descobrir reincidência ────────────────────────────────────────────

export function getReincidenceCount(bug) {
  if (typeof bug.reincidenceCount === "number") return bug.reincidenceCount;
  if (Array.isArray(bug.reincidenceHistory)) return bug.reincidenceHistory.length;
  return 0;
}
