#!/usr/bin/env node
/**
 * scripts/run-full-audit.mjs
 *
 * Auditoria completa de módulo: combina o gate programático existente com
 * evidência manual estruturada no audit-baseline.json. Este comando existe para
 * impedir "verde falso": se a revisão manual profunda encontrar P1/P2 aberto,
 * o módulo continua Not Ready mesmo que audit:module passe.
 *
 * Uso:
 *   node scripts/run-full-audit.mjs --module=auth
 *   npm run audit:full -- --module=auth
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const REPORTS_DIR = join(ROOT, "relatorios");
const AUDIT_DIR = join(REPORTS_DIR, "auditorias");
const KNOWN_BUGS_PATH = join(REPORTS_DIR, "known-bugs.json");

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--"))
    .map((arg) => arg.slice(2).split("="))
    .map(([key, value]) => [key, value ?? true])
);

const moduleName = args.module;
const allModules = Boolean(args.all);

if (!moduleName && !allModules) {
  console.error("❌ Uso: node scripts/run-full-audit.mjs --module=<nome> ou --all");
  process.exit(11);
}

if (allModules) {
  const modulesDir = join(REPORTS_DIR, "modulos");
  const modules = existsSync(modulesDir)
    ? readdirSync(modulesDir).filter((entry) => existsSync(join(modulesDir, entry, "audit-baseline.json")))
    : [];

  if (modules.length === 0) {
    console.error("❌ Nenhum audit-baseline encontrado em relatorios/modulos/.");
    process.exit(11);
  }

  let worstExit = 0;
  for (const mod of modules) {
    console.log(`\n─────────────────────────────────────────────`);
    console.log(`▶ Full audit module: ${mod}`);
    try {
      execSync(`node scripts/run-full-audit.mjs --module=${mod}`, {
        cwd: ROOT,
        stdio: "inherit",
      });
    } catch (error) {
      worstExit = Math.max(worstExit, typeof error.status === "number" ? error.status : 1);
    }
  }

  process.exit(worstExit);
}

const startedAt = new Date().toISOString();
const today = startedAt.slice(0, 10);
const steps = [];
const findings = [];

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    findings.push({
      level: "P1",
      source: "json",
      message: `Falha ao ler JSON ${path}: ${error.message}`,
    });
    return null;
  }
}

function runStep(name, command, { allowFail = false } = {}) {
  console.log(`\n▶ ${name}\n   $ ${command}`);
  const startedStep = Date.now();
  let exitCode = 0;
  let stdout = "";
  let stderr = "";

  try {
    stdout = execSync(command, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    exitCode = typeof error.status === "number" ? error.status : 1;
    stdout = error.stdout?.toString?.() ?? "";
    stderr = error.stderr?.toString?.() ?? "";
  }

  const durationMs = Date.now() - startedStep;
  const passed = exitCode === 0;
  const step = { name, command, exitCode, passed, durationMs };
  steps.push(step);

  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  console.log(`   ${passed ? "✅" : "❌"} ${name} — exit ${exitCode} (${durationMs}ms)`);

  if (!passed && !allowFail) {
    findings.push({
      level: "P1",
      source: name,
      message: `Etapa obrigatória falhou: ${command}`,
    });
  }

  return step;
}

function getKnownBugs() {
  const data = readJson(KNOWN_BUGS_PATH);
  return Array.isArray(data?.bugs) ? data.bugs : [];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function addFinding(level, source, message, extra = {}) {
  findings.push({ level, source, message, ...extra });
}

function validateBaseline(baselinePath, baseline) {
  if (!baseline) {
    addFinding("P1", "baseline", `audit-baseline.json ausente ou inválido em ${baselinePath}`);
    return;
  }

  const requiredKeys = ["scope", "criticalInvariants", "expectedRoles", "knownBugs", "regressionTestsRequired"];
  for (const key of requiredKeys) {
    if (baseline[key] === undefined) addFinding("P1", "baseline", `baseline sem campo obrigatório: ${key}`);
  }

  if (!baseline.manualAudit) {
    addFinding(
      "P1",
      "manual-audit",
      "baseline sem seção manualAudit; auditoria completa precisa registrar áreas revisadas e achados manuais."
    );
  }
}

function validateManualAudit(baseline, knownBugs) {
  const manual = baseline?.manualAudit;
  if (!manual) return;

  if (!manual.lastReviewedAt) {
    addFinding("P1", "manual-audit", "manualAudit.lastReviewedAt ausente.");
  }

  const requiredAreas = Array.isArray(manual.requiredAreas) ? manual.requiredAreas : [];
  if (requiredAreas.length === 0) {
    addFinding("P1", "manual-audit", "manualAudit.requiredAreas vazio; reauditoria completa sem checklist real.");
  }

  for (const area of requiredAreas) {
    if (area.status !== "reviewed") {
      addFinding("P1", "manual-audit", `Área manual não revisada: ${area.id ?? area.name ?? "sem-id"}`);
    }
  }

  const manualFindings = Array.isArray(manual.findings) ? manual.findings : [];
  for (const finding of manualFindings) {
    const bug = knownBugs.find((item) => item.id === finding.bugId);
    if (!bug) {
      addFinding("P1", "manual-audit", `Achado manual sem bug registrado em known-bugs: ${finding.bugId}`);
      continue;
    }

    if (bug.module !== moduleName) {
      addFinding("P1", "manual-audit", `Achado manual ${finding.bugId} aponta para módulo ${bug.module}, esperado ${moduleName}.`);
    }

    const priority = bug.priority ?? finding.priority;
    if ((priority === "P1" || priority === "P2") && bug.status === "OPEN") {
      addFinding(
        priority,
        "manual-audit",
        `${finding.bugId} continua OPEN: ${bug.title}`,
        { bugId: finding.bugId }
      );
    }
  }
}

function runRegressionEvidence(baseline, knownBugs) {
  const moduleBugs = knownBugs.filter((bug) => bug.module === moduleName);
  const tests = unique([
    ...(Array.isArray(baseline?.regressionTestsRequired) ? baseline.regressionTestsRequired : []),
    ...moduleBugs.filter((bug) => bug.status === "FIXED").map((bug) => bug.regressionTest),
  ]);

  for (const testPath of tests) {
    runStep(`regression:${testPath}`, `npx jest ${testPath} --runInBand --silent`, { allowFail: false });
  }
}

function flushManifest(status, exitCode, baseline) {
  if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true });
  const manifestPath = join(AUDIT_DIR, `${moduleName}-${today}-full.json`);
  const manifest = {
    module: moduleName,
    startedAt,
    finishedAt: new Date().toISOString(),
    orchestrator: "scripts/run-full-audit.mjs",
    status,
    exitCode,
    baselineReviewedAt: baseline?.manualAudit?.lastReviewedAt ?? null,
    steps,
    findings,
  };

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`\n📋 Full audit manifest: relatorios/auditorias/${moduleName}-${today}-full.json`);
}

console.log(`🔎 GladPros — full audit (${moduleName}) — ${startedAt}`);

const baselinePath = join(REPORTS_DIR, "modulos", moduleName, "audit-baseline.json");
const baseline = readJson(baselinePath);
const knownBugs = getKnownBugs();

validateBaseline(baselinePath, baseline);

runStep("validate:known-bugs", "node scripts/validate-known-bugs.mjs");
runStep("audit:module", `node scripts/run-audit.mjs --module=${moduleName}`, { allowFail: true });
runRegressionEvidence(baseline, knownBugs);
validateManualAudit(baseline, knownBugs);

const hasBlocking = findings.some((finding) => finding.level === "P1" || finding.level === "P2");
const failedSteps = steps.filter((step) => !step.passed);
const exitCode = hasBlocking || failedSteps.length > 0 ? 1 : 0;
const status = exitCode === 0 ? "Production Ready" : "Not Ready";

flushManifest(status, exitCode, baseline);

if (exitCode === 0) {
  console.log("\n✅ Full audit concluída sem bloqueios.");
} else {
  console.log("\n❌ Full audit encontrou bloqueios.");
  for (const finding of findings) {
    console.log(`   ${finding.level} — ${finding.source}: ${finding.message}`);
  }
}

process.exit(exitCode);