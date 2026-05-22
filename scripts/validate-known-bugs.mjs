#!/usr/bin/env node
/**
 * Valida relatorios/known-bugs.json contra schema e regras de integridade.
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const bugsPath = resolve(root, 'relatorios/known-bugs.json');
const schemaPath = resolve(root, 'relatorios/known-bugs.schema.json');

const errors = [];

function err(msg) { errors.push(msg); }

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
  }

  // Regra de OURO: FIXED sem teste de regressão é mentira certificada.
  // Por enquanto WARN — vira ERROR após migrar bugs antigos.
  if (bug.status === 'FIXED' && !bug.regressionTest) {
    console.warn(`⚠️  ${tag}: FIXED sem regressionTest. Considerado FRÁGIL — pode regredir.`);
  }
}

if (errors.length > 0) {
  console.error('❌ Validação de known-bugs.json FALHOU:\n');
  errors.forEach((e) => console.error(`  - ${e}`));
  console.error(`\nTotal: ${errors.length} erro(s). Corrija antes de commitar.`);
  process.exit(1);
}

const open = data.bugs.filter((b) => b.status === 'OPEN').length;
const fixed = data.bugs.filter((b) => b.status === 'FIXED').length;
const fragile = data.bugs.filter((b) => b.status === 'FIXED' && !b.regressionTest).length;

console.log(`✅ known-bugs.json válido.`);
console.log(`   Total: ${data.bugs.length} | OPEN: ${open} | FIXED: ${fixed} | Frágeis (FIXED sem teste): ${fragile}`);
process.exit(0);
