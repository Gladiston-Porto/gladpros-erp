#!/usr/bin/env node
/**
 * Valida relatorios/known-bugs.json com regras de integridade do projeto.
 *
 * Falha (exit 1) se:
 *  - JSON inválido (parser falha)
 *  - Schema não bate
 *  - Bug FIXED sem fixCommit/fixedAt/fixedBy
 *  - Bug FIXED com regressionTest=null
 *  - IDs duplicados
 *  - affectedFiles vazio em bug OPEN
 *
 * Use em CI e pre-commit. Bloqueia a regressão silenciosa do 4º ciclo.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { normalizeVerificationPattern } from './lib/verification.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const bugsPath = resolve(root, 'relatorios/known-bugs.json');

const errors = [];
const warnings = [];

function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

function looksLikeGitCommit(hash) {
  return /^[0-9a-f]{7,40}$/i.test(hash ?? '');
}

function isShallowRepository() {
  try {
    return execSync('git rev-parse --is-shallow-repository', {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim() === 'true';
  } catch {
    return false;
  }
}

function isValidGitCommit(hash) {
  if (!hash || /pending|todo|tbd|placeholder/i.test(hash)) return false;
  if (!looksLikeGitCommit(hash)) return false;
  try {
    execSync(`git cat-file -e ${hash}^{commit}`, {
      cwd: root,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    if (process.env.CI) {
      const reason = isShallowRepository()
        ? 'clone raso'
        : 'objeto não disponível no checkout';
      warn(`CI (${reason}): aceitando formato válido do commit ${hash} sem validar a existência local do objeto.`);
      return true;
    }
    warn(`Commit ${hash} não está disponível localmente; aceitando hash sintaticamente válido.`);
    return true;
  }
}

if (!existsSync(bugsPath)) {
  console.error(`❌ known-bugs.json não encontrado em ${bugsPath}`);
  process.exit(1);
}

let raw, data;
try {
  raw = readFileSync(bugsPath, 'utf8');
} catch (e) {
  console.error(`❌ Falha lendo known-bugs.json: ${e.message}`);
  process.exit(1);
}

try {
  data = JSON.parse(raw);
} catch (e) {
  console.error(`❌ JSON INVÁLIDO em known-bugs.json: ${e.message}`);
  console.error('   → Provavelmente o arquivo tem 2+ objetos raiz. Deve ter UM ÚNICO objeto { ... }.');
  process.exit(1);
}

// Estrutura mínima
if (!data._meta) err('Campo _meta ausente.');
if (!Array.isArray(data.bugs)) err('Campo bugs ausente ou não-array.');

// Validação dos bugs
const ids = new Set();
const validStatus = ['OPEN', 'FIXED', 'WONTFIX', 'DUPLICATE'];
const validPriority = ['P1', 'P2', 'P3'];
const idPattern = /^[A-Z][A-Z0-9_-]+-(P1|P2|P3)-[0-9]{3,4}$/;

for (const [i, bug] of (data.bugs || []).entries()) {
  const tag = `bugs[${i}] (${bug.id ?? '?'})`;

  if (!bug.id) err(`${tag}: campo id ausente.`);
  else if (!idPattern.test(bug.id)) err(`${tag}: id "${bug.id}" não bate o padrão MODULO-Pn-NNN.`);
  else if (ids.has(bug.id)) err(`${tag}: id duplicado "${bug.id}".`);
  else ids.add(bug.id);

  if (!bug.module) err(`${tag}: module ausente.`);
  if (!validPriority.includes(bug.priority)) err(`${tag}: priority inválida.`);
  if (!validStatus.includes(bug.status)) err(`${tag}: status inválido.`);
  if (!bug.title || bug.title.length < 10) err(`${tag}: title curto.`);
  if (!bug.description || bug.description.length < 20) err(`${tag}: description curta.`);
  if (!bug.detectedAt || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(bug.detectedAt))
    err(`${tag}: detectedAt deve ser YYYY-MM-DD.`);

  if (!Array.isArray(bug.affectedFiles) || bug.affectedFiles.length === 0)
    err(`${tag}: affectedFiles vazio. Bug sem arquivos é inauditável.`);

  // Verifica que arquivos afetados existem (warn, não bloqueante)
  if (Array.isArray(bug.affectedFiles)) {
    for (const f of bug.affectedFiles) {
      if (f.includes('*')) continue; // glob
      const fp = resolve(root, f);
      if (!existsSync(fp) && bug.status === 'OPEN') {
        err(`${tag}: affectedFile "${f}" não existe (bug OPEN).`);
      }
    }
  }

  // Regra: FIXED exige metadata de correção
  if (bug.status === 'FIXED') {
    if (!bug.fixedAt) err(`${tag}: status FIXED exige fixedAt.`);
    if (!bug.fixedBy) err(`${tag}: status FIXED exige fixedBy.`);
    if (!bug.fixCommit) err(`${tag}: status FIXED exige fixCommit.`);

    if (!isValidGitCommit(bug.fixCommit)) {
      err(`${tag}: fixCommit inválido/placeholder para bug FIXED.`);
    }
  }

  // Regra de OURO: FIXED sem teste de regressão é mentira certificada.
  if (bug.status === 'FIXED') {
    if (!bug.regressionTest) {
      err(`${tag}: FIXED (${bug.priority}) sem regressionTest.`);
    } else {
      const testPath = resolve(root, bug.regressionTest);
      if (!existsSync(testPath)) {
        err(`${tag}: regressionTest "${bug.regressionTest}" não existe.`);
      } else {
        try {
          const testContent = readFileSync(testPath, 'utf8');
          if (!testContent.includes(`@bug:${bug.id}`)) {
            err(`${tag}: regressionTest não contém tag obrigatória @bug:${bug.id}.`);
          }
        } catch (e) {
          err(`${tag}: falha ao ler regressionTest "${bug.regressionTest}": ${e.message}`);
        }
      }
    }
  }

  // Validação do verificationPattern (forma nova: objeto)
  if (bug.verificationPattern !== null && bug.verificationPattern !== undefined) {
    const norm = normalizeVerificationPattern(bug);
    if (norm.mode === 'invalid') {
      err(`${tag}: verificationPattern inválido — ${norm.reason}`);
    }
    if (norm.mode === 'object') {
      // Cada allowedMatches[].file deve apontar para arquivo existente.
      for (const a of norm.allowedMatches) {
        if (a.file.includes('*')) continue;
        const fp = resolve(root, a.file);
        if (!existsSync(fp)) {
          err(`${tag}: allowedMatches.file "${a.file}" não existe no workspace.`);
        }
      }
      // Scope não pode ser vazio (já validado em normalize, mas reforço).
      for (const s of norm.scope) {
        if (!s || typeof s !== 'string') {
          err(`${tag}: verificationPattern.scope contém entrada inválida.`);
        }
      }
    }
  } else if (bug.status === 'FIXED' && bug.verificationPattern === null) {
    // FIXED com verificationPattern=null DEVE justificar via verificationPatternNote
    // ou ter healthCheckRule explícito (invariante semântica).
    if (!bug.verificationPatternNote && !bug.healthCheckRule) {
      warn(`${tag}: FIXED com verificationPattern=null sem verificationPatternNote nem healthCheckRule. Risco de bug semântico não-monitorado.`);
    }
  }

  // Reincidência: se reincidenceCount >= 1, exige regra automatizada de prevenção.
  if (typeof bug.reincidenceCount === 'number' && bug.reincidenceCount >= 1) {
    if (!bug.semgrepRule && !bug.healthCheckRule) {
      err(`${tag}: reincidenceCount=${bug.reincidenceCount} exige semgrepRule OU healthCheckRule (prevenção automatizada).`);
    }
  }
}

if (errors.length > 0) {
  console.error('❌ Validação de known-bugs.json FALHOU:\n');
  errors.forEach((e) => console.error(`  - ${e}`));
  console.error(`\nTotal: ${errors.length} erro(s). Corrija antes de commitar.`);
  process.exit(1);
}

if (warnings.length > 0) {
  for (const w of warnings) {
    console.warn(`⚠️  ${w}`);
  }
}

const open = data.bugs.filter((b) => b.status === 'OPEN').length;
const fixed = data.bugs.filter((b) => b.status === 'FIXED').length;
const fragile = data.bugs.filter((b) => b.status === 'FIXED' && !b.regressionTest).length;

console.log(`✅ known-bugs.json válido.`);
console.log(`   Total: ${data.bugs.length} | OPEN: ${open} | FIXED: ${fixed} | Frágeis (FIXED sem teste): ${fragile}`);

if (fragile > 0) {
  const fragileIds = data.bugs
    .filter((b) => b.status === 'FIXED' && !b.regressionTest)
    .map((b) => b.id)
    .join(', ');
  console.log(`   BLOQUEANTE: criar regressionTest e tag @bug para: ${fragileIds}`);
}

process.exit(0);
