#!/usr/bin/env node
// generate-weekly-report.mjs — Gera relatório semanal de qualidade
// Lido por: weekly-audit.yml

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BUGS_FILE = join(ROOT, 'relatorios', 'known-bugs.json')

const week = new Date().toISOString().slice(0, 10)
const healthStatus = process.env.HEALTH_STATUS || 'unknown'
const semgrepStatus = process.env.SEMGREP_STATUS || 'unknown'
const governanceStatus = process.env.GOVERNANCE_STATUS || 'unknown'

const lines = []
lines.push(`## Relatório Semanal GladPros ERP — ${week}`)
lines.push('')
lines.push('### Status dos Checks')
lines.push('')
lines.push('| Check | Status |')
lines.push('|-------|--------|')
lines.push(`| Health check (regex anti-patterns) | ${healthStatus === 'success' ? '✅ passou' : '❌ falhou'} |`)
lines.push(`| Semgrep (AST semântico) | ${semgrepStatus === 'success' ? '✅ passou' : '❌ falhou'} |`)
lines.push(`| Governança por módulo | ${governanceStatus === 'success' ? '✅ passou' : '❌ falhou'} |`)
lines.push('')

// Bugs abertos
try {
  const { bugs } = JSON.parse(readFileSync(BUGS_FILE, 'utf8'))
  const abertos = bugs.filter(b => b.status === 'OPEN')
  const p1 = abertos.filter(b => b.priority === 'P1')
  const p2 = abertos.filter(b => b.priority === 'P2')

  lines.push('### Bugs Conhecidos Abertos')
  lines.push('')
  lines.push(`- **Total**: ${abertos.length} (P1: ${p1.length}, P2: ${p2.length})`)
  lines.push('')

  if (abertos.length > 0) {
    lines.push('| ID | Módulo | Prioridade | Título |')
    lines.push('|----|--------|------------|--------|')
    for (const bug of abertos) {
      lines.push(`| ${bug.id} | ${bug.module} | **${bug.priority}** | ${bug.title} |`)
    }
    lines.push('')
  }
} catch {
  lines.push('> ⚠️ Não foi possível ler known-bugs.json')
  lines.push('')
}

lines.push('### Ações Recomendadas')
lines.push('')
lines.push('1. Corrigir bugs P1/P2 abertos antes da próxima auditoria')
lines.push('2. Verificar módulos com certificação próxima do vencimento')
lines.push('3. Atualizar governance.json após cada correção')

const reportContent = lines.join('\n')
const outPath = join(ROOT, 'relatorios', 'weekly-report-latest.md')
writeFileSync(outPath, reportContent)
console.log(reportContent)
console.log(`\n✅ Relatório salvo em ${outPath}`)
