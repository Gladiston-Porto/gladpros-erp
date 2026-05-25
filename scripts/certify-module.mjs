#!/usr/bin/env node
/**
 * certify-module.mjs
 * Certificação programática de módulos GladPros ERP.
 *
 * Uso:
 *   node scripts/certify-module.mjs --module=usuarios
 *   node scripts/certify-module.mjs --module=financeiro --report
 *
 * Exit codes:
 *   0 — Production Ready (zero P1/P2 abertos, todos com teste de regressão)
 *   1 — Not Ready (P1/P2 abertos ou sem teste de regressão)
 *   2 — Conditionally Ready (apenas P3 abertos, sem regressionTest em bugs fixos)
 *   3 — Needs Re-audit (governance.json sem evidência recente)
 */

import { readFileSync, existsSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { execSync } from 'child_process';
import { runVerificationGlobal, getReincidenceCount } from './lib/verification.mjs';

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT = resolve(import.meta.dirname, '..');
const REPORTS_DIR = join(ROOT, 'relatorios');
const GOVERNANCE_DIR = join(REPORTS_DIR, 'modulos');
const KNOWN_BUGS_PATH = join(REPORTS_DIR, 'known-bugs.json');

const RE_AUDIT_DAYS = 90; // Módulo precisa de re-auditoria após N dias sem evidência

// ─── CLI Args ─────────────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => a.slice(2).split('='))
    .map(([k, v]) => [k, v ?? true])
);

const moduleName = args.module;
const doReport = !!args.report;
const allModules = !!args.all;

if (!moduleName && !allModules) {
  console.error('❌ Uso: node scripts/certify-module.mjs --module=<nome> [--report] [--all]');
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    return null;
  }
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function pad(str, len) {
  return String(str).padEnd(len);
}

function getKnownBugsByModule(mod) {
  const data = readJson(KNOWN_BUGS_PATH);
  if (!data || !Array.isArray(data.bugs)) return [];
  return data.bugs.filter(b => b.module === mod);
}

function getKnownBugModules() {
  const data = readJson(KNOWN_BUGS_PATH);
  if (!data || !Array.isArray(data.bugs)) return [];

  return [...new Set(
    data.bugs
      .map(b => b?.module)
      .filter(Boolean)
  )].sort();
}

function runHealthCheck(mod) {
  try {
    const output = execSync(`node scripts/check-module-health.mjs --module=${mod}`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { exitCode: 0, output };
  } catch (err) {
    const output = `${err?.stdout ?? ''}${err?.stderr ?? ''}`;
    const code = typeof err?.status === 'number' ? err.status : 1;
    return { exitCode: code, output };
  }
}

function isValidGitCommit(hash) {
  if (!hash || /pending|todo|tbd|placeholder/i.test(hash)) return false;
  try {
    execSync(`git cat-file -e ${hash}^{commit}`, {
      cwd: ROOT,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function regressionTestHasBugTag(testPath, bugId) {
  if (!testPath || !bugId) return false;
  const fullPath = join(ROOT, testPath);
  if (!existsSync(fullPath)) return false;

  try {
    const content = readFileSync(fullPath, 'utf8');
    return content.includes(`@bug:${bugId}`);
  } catch {
    return false;
  }
}

function runRegressionTest(testPath) {
  try {
    const output = execSync(`npx jest ${testPath} --runInBand`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, output };
  } catch (err) {
    const output = `${err?.stdout ?? ''}${err?.stderr ?? ''}`;
    return { ok: false, output };
  }
}

// ─── Gate Checks ──────────────────────────────────────────────────────────────

function checkModule(mod) {
  const govPath = join(GOVERNANCE_DIR, mod, 'governance.json');
  const governance = readJson(govPath);

  const findings = [];
  let exitCode = 0; // otimista

  if (!governance) {
    findings.push({ level: 'BLOQUEANTE', msg: `governance.json não encontrado em relatorios/modulos/${mod}/` });
    return { mod, status: 'Needs Re-audit', exitCode: 3, findings };
  }

  // Gate A: P1/P2 abertos bloqueiam
  const openBugs = governance.bugs?.abertos ?? [];
  const openP1P2 = openBugs.filter(id => {
    const bug = getBugById(id);
    const level = bug?.severity ?? bug?.priority;
    return level === 'P1' || level === 'P2';
  });

  if (openP1P2.length > 0) {
    findings.push({ level: 'BLOQUEANTE', msg: `${openP1P2.length} bug(s) P1/P2 abertos: ${openP1P2.join(', ')}` });
    exitCode = 1;
  }

  // Gate A2: governance deve refletir known-bugs (evita falso verde por desincronização)
  const knownBugs = getKnownBugsByModule(mod);
  const knownOpen = knownBugs.filter(b => b.status === 'OPEN');
  const knownOpenP3 = knownOpen.filter(b => (b.severity ?? b.priority) === 'P3');
  const knownOpenCritical = knownOpen.filter(b => (b.severity ?? b.priority) === 'P1' || (b.severity ?? b.priority) === 'P2');
  const missingInGovernance = knownOpenCritical
    .map(b => b.id)
    .filter(id => !openBugs.includes(id));

  if (missingInGovernance.length > 0) {
    findings.push({
      level: 'BLOQUEANTE',
      msg: `governance desincronizado: known-bugs OPEN P1/P2 não listados em governance.bugs.abertos: ${missingInGovernance.join(', ')}`,
    });
    exitCode = 1;
  }

  const missingOpenP3InGovernance = knownOpenP3
    .map(b => b.id)
    .filter(id => !openBugs.includes(id));

  if (missingOpenP3InGovernance.length > 0) {
    findings.push({
      level: 'AVISO',
      msg: `governance desincronizado: known-bugs OPEN P3 não listados em governance.bugs.abertos: ${missingOpenP3InGovernance.join(', ')}`,
    });
    if (exitCode === 0) exitCode = 2;
  }

  // Gate A3: governance não pode referenciar bugs inexistentes/fechados como abertos
  const invalidOpenRefs = openBugs.filter(id => {
    const bug = getBugById(id);
    return !bug || bug.module !== mod || bug.status !== 'OPEN';
  });

  if (invalidOpenRefs.length > 0) {
    findings.push({
      level: 'BLOQUEANTE',
      msg: `governance.bugs.abertos contém referência inválida (não OPEN/no módulo): ${invalidOpenRefs.join(', ')}`,
    });
    exitCode = 1;
  }

  const openP3 = openBugs.filter(id => {
    const bug = getBugById(id);
    const level = bug?.severity ?? bug?.priority;
    return level === 'P3';
  });

  if (openP3.length > 0) {
    findings.push({ level: 'BLOQUEANTE', msg: `${openP3.length} bug(s) P3 abertos: ${openP3.join(', ')}` });
    exitCode = 1;
  }

  // Gate B: Bugs fixos sem regressionTest bloqueiam certificação
  const fixedBugs = governance.bugs?.corrigidos ?? [];
  const fragileBugs = fixedBugs.filter(id => {
    const bug = getBugById(id);
    if (!bug) return false;
    const hasTest = bug.regressionTest && bug.regressionTest !== '';
    return !hasTest;
  });

  if (fragileBugs.length > 0) {
    findings.push({
      level: 'BLOQUEANTE',
      msg: `${fragileBugs.length} bug(s) corrigidos sem regressionTest: ${fragileBugs.join(', ')}`
    });
    exitCode = 1;
  }

  // Gate B2: bugs corrigidos precisam estar FIXED no known-bugs e no mesmo módulo
  const invalidFixedRefs = fixedBugs.filter(id => {
    const bug = getBugById(id);
    return !bug || bug.module !== mod || bug.status !== 'FIXED';
  });

  if (invalidFixedRefs.length > 0) {
    findings.push({
      level: 'BLOQUEANTE',
      msg: `governance.bugs.corrigidos contém referência inválida (não FIXED/no módulo): ${invalidFixedRefs.join(', ')}`,
    });
    exitCode = 1;
  }

  // Gate B3: regressionTest de bugs corrigidos deve existir e conter tag @bug:ID
  const invalidRegressionEvidence = fixedBugs.filter(id => {
    const bug = getBugById(id);
    if (!bug) return false;
    if (!bug.regressionTest) return true;

    const fullPath = join(ROOT, bug.regressionTest);
    if (!existsSync(fullPath)) return true;
    return !regressionTestHasBugTag(bug.regressionTest, id);
  });

  if (invalidRegressionEvidence.length > 0) {
    findings.push({
      level: 'BLOQUEANTE',
      msg: `evidência de regressão inválida para bug(s) corrigidos: ${invalidRegressionEvidence.join(', ')}`,
    });
    exitCode = 1;
  }

  // Gate B4: fixCommit de bugs corrigidos deve ser um commit válido
  const invalidFixCommitEvidence = fixedBugs.filter(id => {
    const bug = getBugById(id);
    if (!bug) return false;
    return !isValidGitCommit(bug.fixCommit);
  });

  if (invalidFixCommitEvidence.length > 0) {
    findings.push({
      level: 'BLOQUEANTE',
      msg: `fixCommit inválido/ausente para bug(s) corrigidos: ${invalidFixCommitEvidence.join(', ')}`,
    });
    exitCode = 1;
  }

  // Gate B5: regression tests devem executar verde na certificação
  const criticalRegressionTests = [...new Set(
    fixedBugs
      .map(id => getBugById(id))
      .filter(Boolean)
      .filter(bug => Boolean(bug.regressionTest))
      .map(bug => bug.regressionTest)
  )];

  const failedRegressionRuns = [];
  for (const testPath of criticalRegressionTests) {
    const run = runRegressionTest(testPath);
    if (!run.ok) failedRegressionRuns.push(testPath);
  }

  if (failedRegressionRuns.length > 0) {
    findings.push({
      level: 'BLOQUEANTE',
      msg: `regressionTest falhou para bug(s) corrigidos: ${failedRegressionRuns.join(', ')}`,
    });
    exitCode = 1;
  }

  // Gate F: detector global de fix parcial (Mecanismo 2 do Audit Loop Fechado)
  //         Aplica verificationPattern em todo o scope (não só affectedFiles).
  //         Se houver match fora de allowedMatches/excludeGlobs → grava transition
  //         FIXED → REOPENED no audit manifest e bloqueia certificação.
  const transitions = [];
  for (const id of fixedBugs) {
    const bug = getBugById(id);
    if (!bug) continue;
    const result = runVerificationGlobal(bug, ROOT);
    if (!result.ok) {
      const evidence = (result.violations || []).slice(0, 10).map(v => ({
        file: v.file, line: v.line, match: v.snippet,
      }));
      transitions.push({
        bugId: id,
        from: 'FIXED',
        to: 'REOPENED',
        trigger: 'certify-module:Gate-F (verificationPattern global)',
        detectedAt: new Date().toISOString(),
        evidence,
        reason: result.error || `${result.violations.length} ocorrência(s) fora de allowedMatches/excludeGlobs (scanned=${result.scanned}).`,
        actionRequired: result.error
          ? 'Corrigir verificationPattern no known-bugs.json e reexecutar a certificação.'
          : 'Eliminar as ocorrências listadas OU registrá-las em allowedMatches com reason explícito antes de marcar como FIXED novamente.',
      });
      findings.push({
        level: 'BLOQUEANTE',
        msg: `bug ${id} marcado FIXED mas verificationPattern detectou ${result.violations?.length ?? 0} ocorrência(s) restante(s) no scope (mode=${result.mode}).`,
      });
      if (exitCode === 0 || exitCode === 2 || exitCode === 3) exitCode = 4;
      else if (exitCode === 1) exitCode = 4; // priorizar fix parcial sobre genérico
    }
  }

  // Gate G: bug reincidente exige prevenção automatizada (Mecanismo 3).
  for (const id of [...fixedBugs, ...openBugs]) {
    const bug = getBugById(id);
    if (!bug) continue;
    const reinc = getReincidenceCount(bug);
    if (reinc >= 1 && !bug.semgrepRule && !bug.healthCheckRule) {
      findings.push({
        level: 'BLOQUEANTE',
        msg: `bug ${id} tem reincidenceCount=${reinc} sem semgrepRule nem healthCheckRule. Reincidência exige regra automatizada de prevenção.`,
      });
      if (exitCode === 0 || exitCode === 2 || exitCode === 3) exitCode = 5;
    }
    if (reinc >= 2 && bug.priority !== 'P1') {
      findings.push({
        level: 'AVISO',
        msg: `bug ${id} reincidiu ${reinc}× — política do projeto exige escalonamento para P1 (atual: ${bug.priority}).`,
      });
    }
  }

  // Gate C: Validade da certificação (tempo desde última auditoria)
  const lastAudit = governance.ultimaAuditoria ?? governance.ultimaCertificacao;
  const dias = daysSince(lastAudit);
  if (dias > RE_AUDIT_DAYS) {
    findings.push({
      level: 'AVISO',
      msg: `Última auditoria há ${dias} dias (limite: ${RE_AUDIT_DAYS}). Módulo precisa de re-auditoria.`
    });
    if (exitCode === 0) exitCode = 3;
  }

  // Gate D: Status do governance.json
  const govStatus = governance.statusAtual ?? 'desconhecido';
  if (govStatus === 'Not Ready' || govStatus === 'Needs Re-audit') {
    findings.push({ level: 'BLOQUEANTE', msg: `governance.statusAtual = "${govStatus}"` });
    exitCode = exitCode < 1 ? 1 : exitCode;
  }

  // Gate E: Health check real do módulo (regex + known-bugs N-1 checker)
  const health = runHealthCheck(mod);
  const hasP2 = /P2 — Funcional/.test(health.output);
  const hasP3 = /P3 — Qualidade/.test(health.output);

  if (health.exitCode !== 0) {
    findings.push({
      level: 'BLOQUEANTE',
      msg: `health-check encontrou P1 no módulo (${mod}). Rode: node scripts/check-module-health.mjs --module=${mod}`,
    });
    exitCode = 1;
  }

  if (hasP2) {
    findings.push({
      level: 'BLOQUEANTE',
      msg: `health-check encontrou P2 no módulo (${mod}).` ,
    });
    exitCode = 1;
  }

  if (hasP3 && exitCode === 0) {
    findings.push({
      level: 'BLOQUEANTE',
      msg: `health-check encontrou P3 no módulo (${mod}).`,
    });
    exitCode = 1;
  }

  // Determinar status final
  let status;
  if (exitCode === 0) status = 'Production Ready';
  else if (exitCode === 4) status = 'Not Ready (Fix Parcial Detectado)';
  else if (exitCode === 5) status = 'Not Ready (Reincidência Sem Prevenção)';
  else if (exitCode === 1) status = 'Not Ready';
  else if (exitCode === 2) status = 'Conditionally Ready';
  else status = 'Needs Re-audit';

  // Emite audit manifest com transitions se houver (Mecanismo 2 — evidência rastreável)
  if (transitions.length > 0) {
    const date = new Date().toISOString().slice(0, 10);
    const auditDir = join(REPORTS_DIR, 'auditorias');
    if (!existsSync(auditDir)) mkdirSync(auditDir, { recursive: true });
    const manifestPath = join(auditDir, `${mod}-${date}.json`);
    const existing = readJson(manifestPath) || {};
    const manifest = {
      module: mod,
      auditedAt: new Date().toISOString(),
      source: 'scripts/certify-module.mjs',
      status,
      exitCode,
      transitions: [...(existing.transitions || []), ...transitions],
      findings,
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log(`   📋 Audit manifest atualizado: relatorios/auditorias/${mod}-${date}.json (${transitions.length} transition(s))`);
  }

  return { mod, status, exitCode, findings, governance, dias, transitions };
}

function getBugById(id) {
  const data = readJson(KNOWN_BUGS_PATH);
  if (!data || !Array.isArray(data.bugs)) return null;
  return data.bugs.find(b => b.id === id) ?? null;
}

// ─── Reporter ─────────────────────────────────────────────────────────────────

function printResult({ mod, status, exitCode, findings, dias }) {
  const emoji = { 'Production Ready': '✅', 'Conditionally Ready': '⚠️', 'Not Ready': '❌', 'Needs Re-audit': '🔄' };
  console.log(`\n${emoji[status] ?? '?'} ${pad(mod, 20)} → ${status}`);

  if (dias !== undefined && dias !== Infinity) {
    console.log(`   Última auditoria: há ${dias} dias`);
  }

  for (const f of findings) {
    const prefix = f.level === 'BLOQUEANTE' ? '   ❌' : '   ⚠️';
    console.log(`${prefix} ${f.msg}`);
  }

  if (findings.length === 0) {
    console.log('   Todos os gates passaram. Nenhum problema encontrado.');
  }
}

function generateReport(results) {
  const date = new Date().toISOString().slice(0, 10);
  const lines = [
    `# Relatório de Certificação — GladPros ERP`,
    ``,
    `**Data:** ${date}`,
    `**Script:** scripts/certify-module.mjs`,
    ``,
    `| Módulo | Status | Issues |`,
    `|--------|--------|--------|`,
  ];

  for (const r of results) {
    const count = r.findings?.length ?? 0;
    lines.push(`| ${r.mod} | ${r.status} | ${count} |`);
  }

  lines.push('');
  lines.push('## Detalhes');
  for (const r of results) {
    lines.push(`\n### ${r.mod}`);
    lines.push(`- Status: **${r.status}**`);
    if (r.findings?.length) {
      for (const f of r.findings) {
        lines.push(`- [${f.level}] ${f.msg}`);
      }
    } else {
      lines.push('- Nenhum problema encontrado.');
    }
  }

  const reportPath = join(REPORTS_DIR, `certificacao-${date}.md`);
  writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log(`\n📄 Relatório salvo em: relatorios/certificacao-${date}.md`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function getModuleList() {
  if (allModules) {
    const governanceModules = existsSync(GOVERNANCE_DIR)
      ? readdirSync(GOVERNANCE_DIR).filter(d => existsSync(join(GOVERNANCE_DIR, d, 'governance.json')))
      : [];

    const knownBugModules = getKnownBugModules();
    return [...new Set([...governanceModules, ...knownBugModules])].sort();
  }
  return [moduleName];
}

(async () => {
  console.log('🔍 GladPros — Certificação de Módulos\n');

  const modules = getModuleList();

  if (modules.length === 0) {
    console.error('❌ Nenhum módulo encontrado em relatorios/modulos/');
    process.exit(1);
  }

  const results = modules.map(checkModule);

  for (const r of results) {
    printResult(r);
  }

  if (doReport) {
    generateReport(results);
  }

  const worst = Math.max(...results.map(r => r.exitCode));

  console.log('\n─────────────────────────────────────────────');
  if (worst === 0) console.log('✅ Certificação: PRODUCTION READY (todos os gates passaram)');
  else if (worst === 1) console.log('❌ Certificação: NOT READY (P1/P2 abertos bloqueiam produção)');
  else if (worst === 2) console.log('⚠️  Certificação: CONDITIONALLY READY (apenas P3/avisos)');
  else console.log('🔄 Certificação: NEEDS RE-AUDIT (documentação desatualizada)');

  process.exit(worst);
})();
