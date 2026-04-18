const { spawnSync } = require('child_process')
const fs = require('fs')

const res = spawnSync('npx', ['eslint', 'src/**/*.{ts,tsx}', '--format', 'json', '--max-warnings=10000'], { encoding: 'utf8', shell: true })

const out = (res.stdout && res.stdout.trim()) ? res.stdout : ''
const errOut = (res.stderr && res.stderr.trim()) ? res.stderr : ''

if (out) {
  fs.writeFileSync('eslint-report.json', out)
  console.log('WROTE eslint-report.json (stdout)')
} else if (errOut) {
  // Sometimes ESLint prints JSON to stderr when exiting non-zero
  fs.writeFileSync('eslint-report.json', errOut)
  console.log('WROTE eslint-report.json (stderr)')
} else {
  fs.writeFileSync('eslint-report.json', JSON.stringify({ error: 'No output from ESLint' }))
  console.log('WROTE eslint-report.json (empty)')
}
