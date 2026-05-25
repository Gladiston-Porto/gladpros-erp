#!/usr/bin/env node
/**
 * scripts/run-audit.mjs
 *
 * Orquestrador oficial de auditoria de módulo (Mecanismo 5 do Audit Loop Fechado).
 *
 * Diferença vs rodar scripts manualmente:
 *   1. Self-test canário: injeta padrão proibido (INFORMATION_SCHEMA) em arquivo
 *      temporário e roda check-module-health esperando detecção. Se o detector
 *      ignorar o canário → o gate está cego → ABORTA a auditoria.
 *   2. Orquestra na ordem correta: validate-known-bugs → canário → health-check →
 *      certify-module.
 *   3. Persiste um audit manifest em relatorios/auditorias/<mod>-YYYY-MM-DD.json
 *      com timestamp de cada etapa.
 *
 * Uso:
 *   node scripts/run-audit.mjs --module=auth
 *   npm run audit:module -- --module=auth
 *
 * Exit codes:
 *   0  → auditoria OK (Production Ready)
 *   1  → falha em algum gate (validar/health/certify)
 *   10 → canário falhou (detector cego) — auditoria abortada
 *   11 → uso inválido
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const REPORTS_DIR = join(ROOT, "relatorios");
const AUDIT_DIR = join(REPORTS_DIR, "auditorias");

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => a.slice(2).split("="))
    .map(([k, v]) => [k, v ?? true])
);

const moduleName = args.module;

if (!moduleName) {
  console.error("❌ Uso: node scripts/run-audit.mjs --module=<nome>");
  process.exit(11);
}

const startedAt = new Date().toISOString();
const today = startedAt.slice(0, 10);
const steps = [];

function runStep(name, command, { allowFail = false } = {}) {
  console.log(`\n▶ ${name}\n   $ ${command}`);
  const startedStep = Date.now();
  let exitCode = 0;
  let stdout = "";
  let stderr = "";
  try {
    stdout = execSync(command, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    exitCode = typeof e.status === "number" ? e.status : 1;
    stdout = e.stdout?.toString?.() ?? "";
    stderr = e.stderr?.toString?.() ?? "";
  }
  const durationMs = Date.now() - startedStep;
  const passed = exitCode === 0;
  steps.push({ name, command, exitCode, passed, durationMs });
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  if (!passed && !allowFail) {
    console.error(`\n❌ Etapa "${name}" falhou (exit ${exitCode}). Auditoria abortada.`);
    flushManifest({ status: "FAILED", failedAt: name, exitCode });
    process.exit(1);
  }
  console.log(`   ${passed ? "✅" : "⚠️"} ${name} — exit ${exitCode} (${durationMs}ms)`);
  return { exitCode, stdout, stderr };
}

function flushManifest(extra = {}) {
  if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true });
  const manifestPath = join(AUDIT_DIR, `${moduleName}-${today}.json`);
  const existing = existsSync(manifestPath)
    ? safeReadJson(manifestPath)
    : {};
  const manifest = {
    module: moduleName,
    startedAt,
    finishedAt: new Date().toISOString(),
    orchestrator: "scripts/run-audit.mjs",
    steps,
    transitions: existing.transitions || [],
    findings: existing.findings || [],
    ...extra,
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`\n📋 Audit manifest: relatorios/auditorias/${moduleName}-${today}.json`);
}

function safeReadJson(p) {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return {};
  }
}

// ─── Self-test canário (Mecanismo 5) ────────────────────────────────────────
// Injeta `INFORMATION_SCHEMA` num arquivo temporário do scope e roda o
// health-check esperando que ele detecte. Se ignorar → detector cego.

function runCanary() {
  console.log("\n🐤 Canário: validando que o detector de anti-patterns está vivo...");
  // Caminho do canário derivado do scope do módulo (src/app/api/<mod>/__canary__.ts).
  // Pode ser sobrescrito via audit-baseline.json -> canaryPath (futuro).
  const moduleScopeDir = join(ROOT, "src", "app", "api", moduleName);
  const canaryPath = join(moduleScopeDir, "__canary__.ts");
  if (!existsSync(moduleScopeDir)) {
    console.error(`❌ Canário: scope ${moduleScopeDir} não existe. Criar audit-baseline ou módulo antes de auditar.`);
    flushManifest({ status: "ABORTED_SCOPE_MISSING" });
    process.exit(10);
  }
  const canaryContent = [
    "// Auto-generated canary for run-audit.mjs. SAFE TO DELETE.",
    "// Should be detected by check-module-health.mjs as P1.",
    "export const _canary = `SELECT * FROM INFORMATION_SCHEMA.COLUMNS`;",
    "",
  ].join("\n");

  try {
    writeFileSync(canaryPath, canaryContent, "utf8");
  } catch (e) {
    console.error(`❌ Canário: falha ao escrever ${canaryPath}: ${e.message}`);
    process.exit(10);
  }

  let detected = false;
  try {
    execSync(`node scripts/check-module-health.mjs --module=${moduleName}`, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    // Saiu 0 → não detectou
    detected = false;
  } catch (e) {
    const out = (e.stdout?.toString?.() ?? "") + (e.stderr?.toString?.() ?? "");
    detected = /INFORMATION_SCHEMA/i.test(out) || (typeof e.status === "number" && e.status !== 0);
  } finally {
    try { unlinkSync(canaryPath); } catch {}
  }

  steps.push({
    name: "canary:health-check-detects-INFORMATION_SCHEMA",
    command: `node scripts/check-module-health.mjs --module=${moduleName}`,
    passed: detected,
    exitCode: detected ? 0 : 999,
    durationMs: 0,
  });

  if (!detected) {
    console.error("\n❌ CANÁRIO FALHOU: check-module-health não detectou INFORMATION_SCHEMA no canário.");
    console.error("   O detector está CEGO para o scope deste módulo. Auditoria abortada.");
    flushManifest({ status: "ABORTED_CANARY_FAILED" });
    process.exit(10);
  }

  console.log("   ✅ Canário detectado — detector está vivo.");
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

console.log(`🔍 GladPros — run-audit (${moduleName}) — ${startedAt}`);

runStep("validate:known-bugs", "node scripts/validate-known-bugs.mjs");
runCanary();
runStep("health:check", `node scripts/check-module-health.mjs --module=${moduleName}`);
runStep("certify:module", `node scripts/certify-module.mjs --module=${moduleName}`);

flushManifest({ status: "OK" });

console.log("\n✅ Auditoria concluída sem bloqueios.");
process.exit(0);
