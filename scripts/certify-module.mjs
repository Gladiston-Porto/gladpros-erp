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

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';

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
    return bug && (bug.severity === 'P1' || bug.severity === 'P2');
  });

  if (openP1P2.length > 0) {
    findings.push({ level: 'BLOQUEANTE', msg: `${openP1P2.length} bug(s) P1/P2 abertos: ${openP1P2.join(', ')}` });
    exitCode = 1;
  }

  const openP3 = openBugs.filter(id => {
    const bug = getBugById(id);
    return bug && bug.severity === 'P3';
  });

  if (openP3.length > 0) {
    findings.push({ level: 'AVISO', msg: `${openP3.length} bug(s) P3 abertos: ${openP3.join(', ')}` });
    if (exitCode === 0) exitCode = 2;
  }

  // Gate B: Bugs fixos sem regressionTest são frágeis
  const fixedBugs = governance.bugs?.corrigidos ?? [];
  const fragileBugs = fixedBugs.filter(id => {
    const bug = getBugById(id);
    if (!bug) return false;
    const isCritical = bug.severity === 'P1' || bug.severity === 'P2';
    const hasTest = bug.regressionTest && bug.regressionTest !== '';
    return isCritical && !hasTest;
  });

  if (fragileBugs.length > 0) {
    findings.push({
      level: 'AVISO',
      msg: `${fragileBugs.length} bug(s) P1/P2 corrigidos sem regressionTest (frágeis): ${fragileBugs.join(', ')}`
    });
    if (exitCode === 0) exitCode = 2;
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

  // Determinar status final
  let status;
  if (exitCode === 0) status = 'Production Ready';
  else if (exitCode === 1) status = 'Not Ready';
  else if (exitCode === 2) status = 'Conditionally Ready';
  else status = 'Needs Re-audit';

  return { mod, status, exitCode, findings, governance, dias };
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
    const { readdirSync } = await import('fs');
    if (existsSync(GOVERNANCE_DIR)) {
      return readdirSync(GOVERNANCE_DIR).filter(d =>
        existsSync(join(GOVERNANCE_DIR, d, 'governance.json'))
      );
    }
    return [];
  }
  return [moduleName];
}

(async () => {
  console.log('🔍 GladPros — Certificação de Módulos\n');

  const modules = allModules
    ? (existsSync(GOVERNANCE_DIR)
      ? (await import('fs')).readdirSync(GOVERNANCE_DIR).filter(d =>
          existsSync(join(GOVERNANCE_DIR, d, 'governance.json'))
        )
      : [])
    : [moduleName];

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
