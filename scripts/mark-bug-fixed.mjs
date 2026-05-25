#!/usr/bin/env node
/**
 * scripts/mark-bug-fixed.mjs
 *
 * Único caminho autorizado para marcar um bug como FIXED em known-bugs.json
 * (Mecanismo 4 do Audit Loop Fechado).
 *
 * Substitui edição manual do JSON pelo agente. Garante que toda transição
 * OPEN → FIXED só acontece quando TODOS os critérios são satisfeitos.
 *
 * Uso:
 *   node scripts/mark-bug-fixed.mjs --id=AUTH-P2-005 --commit=<sha> \
 *        --by=copilot-agent [--audit-ref=reauditoria-...]
 *
 * Critérios validados (todos obrigatórios):
 *   1. Bug existe e está OPEN.
 *   2. fixCommit é um commit git válido (git cat-file).
 *   3. regressionTest existe E contém tag `@bug:<ID>`.
 *   4. jest do regressionTest passa.
 *   5. verificationPattern global → 0 ocorrências fora de allowedMatches/excludeGlobs.
 *   6. Se reincidenceCount >= 1 → exige semgrepRule OU healthCheckRule.
 *
 * Se qualquer critério falhar → exit ≠ 0 e o JSON NÃO é modificado.
 *
 * Em caso de sucesso, grava:
 *   - status = "FIXED"
 *   - fixedAt = hoje (YYYY-MM-DD)
 *   - fixedBy
 *   - fixCommit
 *   - stateHistory.push({ date, from, to, by, auditRef })
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { runVerificationGlobal, getReincidenceCount } from "./lib/verification.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const KNOWN_BUGS_PATH = resolve(ROOT, "relatorios/known-bugs.json");

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => a.slice(2).split("="))
    .map(([k, v]) => [k, v ?? true])
);

const id = args.id;
const commit = args.commit;
const by = args.by || "copilot-agent";
const auditRef = args["audit-ref"] || null;

if (!id || !commit) {
  console.error("❌ Uso: node scripts/mark-bug-fixed.mjs --id=<BUG-ID> --commit=<sha> [--by=...] [--audit-ref=...]");
  process.exit(2);
}

if (!existsSync(KNOWN_BUGS_PATH)) {
  console.error(`❌ known-bugs.json não encontrado: ${KNOWN_BUGS_PATH}`);
  process.exit(2);
}

const data = JSON.parse(readFileSync(KNOWN_BUGS_PATH, "utf8"));
const bug = (data.bugs || []).find((b) => b.id === id);

if (!bug) {
  console.error(`❌ Bug ${id} não encontrado em known-bugs.json.`);
  process.exit(2);
}

if (bug.status === "FIXED") {
  console.error(`❌ Bug ${id} já está marcado como FIXED. Para reabrir, edite manualmente status para OPEN e incremente reincidenceCount.`);
  process.exit(2);
}

const failures = [];

// Critério 1: bug deve estar OPEN
if (bug.status !== "OPEN") {
  failures.push(`status atual é "${bug.status}" — só transições OPEN → FIXED são automatizadas.`);
}

// Critério 2: commit válido
function isValidGitCommit(hash) {
  if (!hash || /pending|todo|tbd|placeholder/i.test(hash)) return false;
  try {
    execSync(`git cat-file -e ${hash}^{commit}`, {
      cwd: ROOT,
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

if (!isValidGitCommit(commit)) {
  failures.push(`commit "${commit}" não existe no histórico git (cat-file falhou).`);
}

// Critério 3: regressionTest existe e tem tag @bug:ID
if (!bug.regressionTest) {
  failures.push("regressionTest ausente no bug — defina o caminho do teste antes de marcar como FIXED.");
} else {
  const testPath = resolve(ROOT, bug.regressionTest);
  if (!existsSync(testPath)) {
    failures.push(`regressionTest "${bug.regressionTest}" não existe.`);
  } else {
    const content = readFileSync(testPath, "utf8");
    if (!content.includes(`@bug:${id}`)) {
      failures.push(`regressionTest "${bug.regressionTest}" não contém tag obrigatória @bug:${id}.`);
    }
  }
}

// Critério 4: jest passa
if (failures.length === 0 && bug.regressionTest) {
  console.log(`▶ Executando regressionTest: ${bug.regressionTest}`);
  try {
    execSync(`npx jest ${bug.regressionTest} --runInBand --silent`, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    console.log("   ✅ jest OK");
  } catch (e) {
    failures.push(`jest do regressionTest falhou. Rode manualmente: npx jest ${bug.regressionTest}`);
  }
}

// Critério 5: verificationPattern global = 0 ocorrências não autorizadas
const result = runVerificationGlobal(bug, ROOT);
if (result.mode === "semantic-skip") {
  if (!bug.verificationPatternNote && !bug.healthCheckRule) {
    failures.push(
      "verificationPattern=null exige verificationPatternNote (justificativa semântica) OU healthCheckRule (invariante automatizada)."
    );
  }
} else if (!result.ok) {
  failures.push(
    `verificationPattern global detectou ${result.violations?.length ?? 0} ocorrência(s) fora de allowedMatches/excludeGlobs (mode=${result.mode}). Corrija ou registre em allowedMatches com reason.`
  );
  if (result.violations?.length) {
    console.error("   Primeiras ocorrências:");
    for (const v of result.violations.slice(0, 5)) {
      console.error(`     ${v.file}:${v.line} → ${v.snippet}`);
    }
  }
}

// Critério 6: reincidência exige regra automatizada
const reinc = getReincidenceCount(bug);
if (reinc >= 1 && !bug.semgrepRule && !bug.healthCheckRule) {
  failures.push(
    `reincidenceCount=${reinc} exige semgrepRule OU healthCheckRule (prevenção automatizada). Edite o bug antes de marcar como FIXED.`
  );
}

if (failures.length > 0) {
  console.error(`\n❌ Não foi possível marcar ${id} como FIXED. Critérios reprovados:\n`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error("\nNenhuma alteração feita em known-bugs.json.");
  process.exit(1);
}

// Aplica mudança
const today = new Date().toISOString().slice(0, 10);
const previousStatus = bug.status;
bug.status = "FIXED";
bug.fixedAt = today;
bug.fixedBy = by;
bug.fixCommit = commit;
bug.stateHistory = Array.isArray(bug.stateHistory) ? bug.stateHistory : [];
bug.stateHistory.push({
  date: today,
  from: previousStatus,
  to: "FIXED",
  by,
  auditRef: auditRef || undefined,
  source: "scripts/mark-bug-fixed.mjs",
});

writeFileSync(KNOWN_BUGS_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");

console.log(`\n✅ ${id} marcado como FIXED.`);
console.log(`   fixCommit: ${commit}`);
console.log(`   fixedBy:   ${by}`);
console.log(`   stateHistory atualizado (${bug.stateHistory.length} entrada(s)).`);
process.exit(0);
