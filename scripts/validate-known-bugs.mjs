#!/usr/bin/env node
// validate-known-bugs.mjs — Camada 0 do Swiss Cheese Model
// Valida integridade do known-bugs.json antes de qualquer commit ou CI.
// Falha com exit 1 se JSON inválido, IDs duplicados, OPEN sem affectedFiles,
// ou FIXED sem metadata mínima.
//
// Uso: node scripts/validate-known-bugs.mjs
//      npm run known-bugs:validate

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BUGS_FILE = join(__dirname, '..', 'relatorios', 'known-bugs.json')

let data
let errors = 0
let warnings = 0

// 1. JSON válido e parseable
try {
  const raw = readFileSync(BUGS_FILE, 'utf8')
  data = JSON.parse(raw)
} catch (e) {
  console.error(`❌ FATAL: known-bugs.json não é JSON válido: ${e.message}`)
  console.error('Regra: JSON deve ter UM Único objeto raiz. Múltiplos objetos quebram JSON.parse().')
  process.exit(1)
}

const { bugs } = data

if (!Array.isArray(bugs)) {
  console.error('❌ FATAL: known-bugs.json deve ter campo "bugs" como array')
  process.exit(1)
}

// 2. IDs únicos
const ids = bugs.map(b => b.id)
const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i)
if (duplicates.length > 0) {
  console.error(`❌ IDs DUPLICADOS encontrados: ${[...new Set(duplicates)].join(', ')}`)
  console.error('Regra: Cada bug tem ID único. IDs duplicados indicam corrupção do arquivo.')
  errors++
}

// 3. Validar cada bug
const VALID_STATUSES = ['OPEN', 'FIXED', 'WONTFIX', 'DUPLICATE']
const VALID_PRIORITIES = ['P1', 'P2', 'P3']

for (const bug of bugs) {
  const prefix = `Bug ${bug.id ?? '(sem ID)'}`

  // ID válido
  if (!bug.id || !/^[A-Z]+-P[123]-\d{3}$/.test(bug.id)) {
    console.error(`❌ ${prefix}: ID inválido (esperado: MODULO-P1-001)`)
    errors++
  }

  // Status válido
  if (!VALID_STATUSES.includes(bug.status)) {
    console.error(`❌ ${prefix}: status inválido "${bug.status}" (válidos: ${VALID_STATUSES.join(', ')})`)
    errors++
  }

  // OPEN deve ter affectedFiles não vazios
  if (bug.status === 'OPEN') {
    if (!Array.isArray(bug.affectedFiles) || bug.affectedFiles.length === 0) {
      console.error(`❌ ${prefix}: status=OPEN mas affectedFiles está vazio ou ausente`)
      console.error('  Regra: Bug OPEN deve listar TODOS os arquivos afetados.')
      errors++
    }
  }

  // FIXED deve ter metadata mínima
  if (bug.status === 'FIXED') {
    if (!bug.fixedAt) {
      console.warn(`⚠️ ${prefix}: status=FIXED mas sem fixedAt`)
      warnings++
    }
    if (!bug.fixCommit) {
      console.warn(`⚠️ ${prefix}: status=FIXED mas sem fixCommit`)
      warnings++
    }
    if (!bug.regressionTest) {
      // FIXED sem teste de regressão: WARN agora, ERROR a partir de Q3-2026
      const deadline = new Date('2026-07-01')
      const now = new Date()
      if (now >= deadline) {
        console.error(`❌ ${prefix}: status=FIXED mas sem regressionTest (obrigatório a partir de 2026-07-01)`)
        errors++
      } else {
        console.warn(`⚠️ ${prefix}: status=FIXED sem regressionTest (FRÁGIL — será bloqueante em 2026-07-01)`)
        warnings++
      }
    }
  }

  // Priority válida
  if (!VALID_PRIORITIES.includes(bug.priority)) {
    console.error(`❌ ${prefix}: priority inválida "${bug.priority}" (válidos: ${VALID_PRIORITIES.join(', ')})`)
    errors++
  }
}

// 4. Sumário
const open = bugs.filter(b => b.status === 'OPEN').length
const fixed = bugs.filter(b => b.status === 'FIXED').length
const p1open = bugs.filter(b => b.status === 'OPEN' && b.priority === 'P1').length
const p2open = bugs.filter(b => b.status === 'OPEN' && b.priority === 'P2').length

console.log(`\nknown-bugs.json — ${bugs.length} bugs: ${open} abertos (P1:${p1open} P2:${p2open}), ${fixed} corrigidos`)

if (errors > 0) {
  console.error(`\n❌ ${errors} erro(s) encontrado(s). Corrija antes de continuar.`)
  process.exit(1)
}

if (warnings > 0) {
  console.warn(`⚠️ ${warnings} aviso(s). Não bloqueante agora, mas corrija logo.`)
}

console.log('✅ known-bugs.json válido e consistente.')
