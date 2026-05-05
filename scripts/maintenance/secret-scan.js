#!/usr/bin/env node
/**
 * secret-scan.js — GladPros ERP
 *
 * Scans source files for accidentally committed secrets:
 * API keys, passwords, tokens, and other sensitive patterns.
 *
 * Usage: node scripts/maintenance/secret-scan.js
 * Exit code 0 = clean, 1 = secrets found
 */

const fs = require('fs')
const path = require('path')

// ─── Configuration ────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '../../')

const SCAN_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.env', '.env.local', '.env.example']

const SKIP_DIRS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '.turbo',
  'coverage',
]

const SKIP_FILES = [
  'package-lock.json',
  'secret-scan.js', // this file itself
  '.env.example',   // intentionally shows format with placeholder values
]

/** Directories where passwords in code are expected (test fixtures / seeds) */
const TEST_PATH_PATTERNS = [
  '__tests__',
  '/tests/',
  '/test/',
  'fixtures/',
  '.spec.',
  '.test.',
  'playwright.config',
  'scripts/test-',
]

/** Patterns that indicate a secret hardcoded in source code */
const SECRET_PATTERNS = [
  // Generic password/secret assignments
  {
    pattern: /(?:password|passwd|pwd)\s*=\s*["'][^"'\s]{6,}["']/i,
    label: 'Hardcoded password',
    severity: 'CRITICAL',
    skipInTestFiles: true, // test fixtures always have passwords
  },
  {
    pattern: /(?:secret|SECRET)\s*=\s*["'][^"'\s]{8,}["']/,
    label: 'Hardcoded secret',
    severity: 'CRITICAL',
    skipInTestFiles: true,
  },
  // API keys
  {
    pattern: /api[_-]?key\s*=\s*["'][A-Za-z0-9\-_]{20,}["']/i,
    label: 'Hardcoded API key',
    severity: 'CRITICAL',
  },
  // JWT / tokens with actual values (not env vars)
  {
    pattern: /jwt[_-]?secret\s*=\s*["'][^"'\s]{10,}["']/i,
    label: 'Hardcoded JWT secret',
    severity: 'CRITICAL',
    skipInTestFiles: true,
  },
  // OpenAI / Anthropic keys
  {
    pattern: /sk-[A-Za-z0-9]{20,}/,
    label: 'OpenAI API key',
    severity: 'CRITICAL',
  },
  {
    pattern: /sk-ant-[A-Za-z0-9\-]{20,}/,
    label: 'Anthropic API key',
    severity: 'CRITICAL',
  },
  // Stripe keys
  {
    pattern: /(?:sk|pk)_live_[A-Za-z0-9]{20,}/,
    label: 'Stripe live key',
    severity: 'CRITICAL',
  },
  {
    pattern: /(?:sk|pk)_test_[A-Za-z0-9]{20,}/,
    label: 'Stripe test key',
    severity: 'HIGH',
  },
  // AWS
  {
    pattern: /AKIA[A-Z0-9]{16}/,
    label: 'AWS Access Key ID',
    severity: 'CRITICAL',
  },
  {
    pattern: /aws[_-]?secret[_-]?access[_-]?key\s*=\s*["'][A-Za-z0-9\/+]{30,}["']/i,
    label: 'AWS Secret Access Key',
    severity: 'CRITICAL',
  },
  // Private keys
  {
    pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
    label: 'Private key block',
    severity: 'CRITICAL',
  },
  // Database URLs with credentials (only non-localhost, non-test)
  {
    pattern: /(?:mysql|postgres|mongodb):\/\/[^:]+:[^@\s]{3,}@/i,
    label: 'Database URL with credentials',
    severity: 'CRITICAL',
    skipPatterns: [
      /process\.env/,
      /\$\{[^}]+\}/,
      /localhost/i,
      /127\.0\.0\.1/,
      /user:password@host/i,    // format string placeholder
      /user:pass@/i,            // format string placeholder
      /info\(/,                 // help/info message
      /console\./,              // log message
    ],
  },
  // WhatsApp / Meta tokens
  {
    pattern: /whatsapp[_-]?(?:access[_-]?)?token\s*=\s*["'][A-Za-z0-9\-_|]{20,}["']/i,
    label: 'WhatsApp access token',
    severity: 'CRITICAL',
  },
  // Sentry auth tokens
  {
    pattern: /sentry[_-]?auth[_-]?token\s*=\s*["'][A-Za-z0-9]{30,}["']/i,
    label: 'Sentry auth token',
    severity: 'HIGH',
  },
  // Long base64-looking strings assigned to suspicious vars (possible encryption keys)
  {
    pattern: /(?:encryption[_-]?key|aes[_-]?key|crypto[_-]?key)\s*=\s*["'][A-Za-z0-9+/]{30,}={0,2}["']/i,
    label: 'Possible encryption key hardcoded',
    severity: 'CRITICAL',
  },
  // Generic token assignments with long values
  {
    pattern: /(?:access[_-]?token|auth[_-]?token|bearer[_-]?token)\s*=\s*["'][A-Za-z0-9\-_.]{30,}["']/i,
    label: 'Hardcoded access token',
    severity: 'HIGH',
    skipPatterns: [
      /Bearer \$\{/,
      /process\.env/,
    ],
  },
]

/** Patterns that are SAFE and should not be flagged */
const SAFE_PATTERNS = [
  /process\.env\.[A-Z_]+/,       // Environment variable references
  /\$\{process\.env\./,          // Template literal env vars
  /getenv\(/,                    // Server-side env access
  /\/\/ .*secret/i,              // Comments about secrets (not actual secrets)
  /describe\(["']/,              // Test descriptions
  /test\(["']/,                  // Test cases
  /it\(["']/,                    // Test cases
  /example/i,                    // Example values
  /placeholder/i,                // Placeholder values
  /your[_-]?/i,                  // "your-api-key" placeholders
  /REPLACE_ME/i,                 // Explicit placeholder
  /TODO/,                        // Todos (not actual secrets)
]

// ─── Scanner ──────────────────────────────────────────────────────────────────

let findings = []
let scannedFiles = 0
let scannedLines = 0

function shouldSkipDir(dirName) {
  return SKIP_DIRS.includes(dirName)
}

function shouldSkipFile(filePath) {
  const base = path.basename(filePath)
  if (SKIP_FILES.includes(base)) return true
  const ext = path.extname(filePath)
  if (!SCAN_EXTENSIONS.some(e => filePath.endsWith(e) || ext === e)) return true
  // Skip .env.local — it's gitignored and should not be scanned
  if (base === '.env.local') return true
  // Skip generated/minified files
  if (filePath.includes('.next/')) return true
  return false
}

function isSafeLine(line) {
  return SAFE_PATTERNS.some(p => p.test(line))
}

function scanFile(filePath) {
  let content
  try {
    content = fs.readFileSync(filePath, 'utf8')
  } catch {
    return
  }

  const lines = content.split('\n')
  const relativePath = path.relative(ROOT, filePath)
  const isTestFile = TEST_PATH_PATTERNS.some(p => relativePath.includes(p))
  scannedFiles++
  scannedLines += lines.length

  lines.forEach((line, index) => {
    // Skip comment-only lines and import lines
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('#')) return
    if (trimmed.startsWith('import ') && !trimmed.includes('=')) return
    // Allow explicit override
    if (trimmed.includes('// secret-scan-ignore')) return

    // Check if line is safe
    if (isSafeLine(line)) return

    for (const rule of SECRET_PATTERNS) {
      // Skip test-file-only patterns
      if (rule.skipInTestFiles && isTestFile) continue

      if (!rule.pattern.test(line)) continue

      // Check rule-specific skip patterns
      if (rule.skipPatterns && rule.skipPatterns.some(sp => sp.test(line))) continue

      findings.push({
        file: relativePath,
        line: index + 1,
        content: line.trim().substring(0, 120),
        label: rule.label,
        severity: rule.severity,
      })
    }
  })
}

function walkDir(dirPath) {
  let entries
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!shouldSkipDir(entry.name)) {
        walkDir(path.join(dirPath, entry.name))
      }
    } else if (entry.isFile()) {
      const filePath = path.join(dirPath, entry.name)
      if (!shouldSkipFile(filePath)) {
        scanFile(filePath)
      }
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('🔍 GladPros Secret Scanner')
console.log('─'.repeat(50))
console.log(`Scanning: ${ROOT}`)
console.log('')

walkDir(ROOT)

console.log(`✓ Scanned ${scannedFiles} files (${scannedLines.toLocaleString()} lines)`)
console.log('')

if (findings.length === 0) {
  console.log('✅ No secrets detected. Safe to deploy.')
  process.exit(0)
} else {
  const criticals = findings.filter(f => f.severity === 'CRITICAL')
  const highs = findings.filter(f => f.severity === 'HIGH')

  console.error(`🚨 ${findings.length} potential secret(s) found!\n`)

  for (const f of findings) {
    const icon = f.severity === 'CRITICAL' ? '🔴' : '🟡'
    console.error(`${icon} [${f.severity}] ${f.label}`)
    console.error(`   File: ${f.file}:${f.line}`)
    console.error(`   Line: ${f.content}`)
    console.error('')
  }

  console.error('─'.repeat(50))
  console.error(`Summary: ${criticals.length} critical, ${highs.length} high`)
  console.error('')
  console.error('Action required: Remove secrets from source code.')
  console.error('Use environment variables (process.env.VAR_NAME) instead.')
  console.error('')
  console.error('If this is a false positive, review the pattern and either:')
  console.error('  1. Add the specific safe pattern to SAFE_PATTERNS in secret-scan.js')
  console.error('  2. Add a comment "// secret-scan-ignore" on the line')
  console.error('')

  process.exit(1)
}
