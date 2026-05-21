#!/usr/bin/env node
// check-governance.mjs — Verifica governança de todos os módulos
// Lido por: weekly-audit.yml, monthly-deep-audit.yml
// Uso: node scripts/check-governance.mjs [--strict]

import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MODULOS_DIR = join(ROOT, 'relatorios', 'modulos')

const strict = process.argv.includes('--strict')
const hoje = new Date()
const AVISO_DIAS = 14

let hasErrors = false
let hasWarnings = false
const report = []

report.push(`# Relatório de Governança — ${hoje.toISOString().slice(0,10)}`)
report.push('')

try {
  const modulos = readdirSync(MODULOS_DIR).filter(d => !d.includes('.'))
  
  for (const modulo of modulos) {
    const govFile = join(MODULOS_DIR, modulo, 'governance.json')
    if (!existsSync(govFile)) continue

    const gov = JSON.parse(readFileSync(govFile, 'utf8'))
    const vencimento = new Date(gov.proximaAuditoriaObrigatoria)
    const diasRestantes = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24))
    const vencido = diasRestantes < 0
    const perto = diasRestantes >= 0 && diasRestantes <= AVISO_DIAS
    const bugsAbertos = gov.bugs?.abertos?.length ?? 0
    const p1p2Abertos = (gov.ultimaAuditoria?.achados?.P1 ?? 0) + (gov.ultimaAuditoria?.achados?.P2 ?? 0)

    let status = '✅'
    if (vencido || (strict && p1p2Abertos > 0)) {
      status = '❌'
      hasErrors = true
    } else if (perto || bugsAbertos > 0) {
      status = '⚠️'
      hasWarnings = true
    }

    report.push(`## ${status} ${gov.displayName} (\`${modulo}\`)`)
    report.push(`- Status: **${gov.statusAtual}**`)
    report.push(`- Próxima auditoria: ${gov.proximaAuditoriaObrigatoria} (${diasRestantes >= 0 ? diasRestantes + ' dias' : Math.abs(diasRestantes) + ' dias VENCIDO'})`)
    if (bugsAbertos > 0) {
      report.push(`- ⚠️ Bugs abertos: ${bugsAbertos} (${gov.bugs.abertos.join(', ')})`)
    }
    report.push('')
  }

  // Escrever relatório
  const reportPath = join(ROOT, 'relatorios', 'governance-report-latest.md')
  const { writeFileSync } = await import('fs')
  writeFileSync(reportPath, report.join('\n'))
  console.log(report.join('\n'))

} catch (err) {
  console.error('Erro ao verificar governança:', err.message)
  process.exit(2)
}

if (hasErrors) {
  console.error('\n❌ Problemas críticos de governança encontrados.')
  process.exit(1)
}
if (hasWarnings) {
  console.warn('\n⚠️ Avisos de governança encontrados. Veja o relatório acima.')
  // não falha em aviso (só --strict falha)
}
console.log('\n✅ Governança verificada.')
