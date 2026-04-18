/**
 * fix-mock-casts.mjs
 *
 * Fixes TS2339 errors in test files by wrapping prisma mock calls with
 * `(expr as jest.Mock)` casts.
 *
 * Patterns handled:
 *   prisma.model.method.mockResolvedValue(...)
 *     → (prisma.model.method as jest.Mock).mockResolvedValue(...)
 *
 *   mockPrisma.$transaction.mockImplementation(...)
 *     → (mockPrisma.$transaction as jest.Mock).mockImplementation(...)
 *
 *   mockPrisma.model.method.mock.calls[...]
 *     → (mockPrisma.model.method as jest.Mock).mock.calls[...]
 *
 * Already-cast expressions are skipped.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';

function walkDir(dir, pattern) {
  let results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkDir(full, pattern));
    } else if (pattern.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

const ROOT = resolve(process.cwd());

// Directories to scan
const scanDirs = [
  'src/domains/projects/services/__tests__',
  'src/__tests__',
  'src/app/portal',
  'tests/scripts',
];

const filePattern = /\.test\.tsx?$/;

// Collect all test files
let allFiles = [];
for (const dir of scanDirs) {
  const abs = resolve(ROOT, dir);
  try {
    const found = walkDir(abs, filePattern);
    allFiles = allFiles.concat(found);
  } catch {
    // directory may not exist
  }
}

console.log(`Found ${allFiles.length} test file(s) to scan.\n`);

// Mock method names to match
const mockMethods = [
  'mockResolvedValue',
  'mockResolvedValueOnce',
  'mockRejectedValue',
  'mockRejectedValueOnce',
  'mockReturnValue',
  'mockReturnValueOnce',
  'mockImplementation',
  'mockImplementationOnce',
  'mockClear',
  'mockReset',
  'mockRestore',
];

const mockMethodsJoined = mockMethods.join('|');

// ----- Pattern 1 -----
// Match: (mock)?[Pp]risma.MODEL.METHOD.mockXxx(
// e.g.  mockPrisma.projeto.findUnique.mockResolvedValue(
//       prisma.projeto.update.mockRejectedValue(
// But NOT if preceded by "as jest.Mock)." which indicates already cast.
//
// We use a negative lookbehind to avoid re-wrapping already-cast expressions.
// Since JS doesn't support variable-length lookbehind universally, we match
// a broader context and check manually.
//
// Regex captures:
//   $1 = optional leading semicolon + whitespace before the expression
//   $2 = the prisma chain: e.g. "mockPrisma.projeto.findUnique"
//   $3 = the mock method call: e.g. "mockResolvedValue("
const pattern1 = new RegExp(
  // DON'T match if preceded by "as jest.Mock)."
  `(?<!as jest\\.Mock\\)\\.)((?:mock)?[Pp]risma\\.[\\w$]+\\.[\\w]+)\\.(${mockMethodsJoined})\\(`,
  'g'
);

// ----- Pattern 2 -----
// Match: (mock)?[Pp]risma.$transaction.mockXxx(
// e.g.  mockPrisma.$transaction.mockImplementation(
const pattern2 = new RegExp(
  `(?<!as jest\\.Mock\\)\\.)((?:mock)?[Pp]risma\\.\\$transaction)\\.(${mockMethodsJoined})\\(`,
  'g'
);

// ----- Pattern 3 -----
// Match: (mock)?[Pp]risma.MODEL.METHOD.mock.calls  (or .mock.results, .mock.instances)
// e.g.  mockPrisma.projetoMaterial.update.mock.calls[0][0]
// → (mockPrisma.projetoMaterial.update as jest.Mock).mock.calls[0][0]
const pattern3 = new RegExp(
  `(?<!as jest\\.Mock\\)\\.)((?:mock)?[Pp]risma\\.[\\w$]+\\.[\\w]+)\\.mock\\.(calls|results|instances|lastCall)`,
  'g'
);

// ----- Pattern 4 -----
// Match: (mock)?[Pp]risma.$transaction.mock.calls etc
const pattern4 = new RegExp(
  `(?<!as jest\\.Mock\\)\\.)((?:mock)?[Pp]risma\\.\\$transaction)\\.mock\\.(calls|results|instances|lastCall)`,
  'g'
);

let totalFilesModified = 0;
let totalReplacements = 0;
const report = [];

for (const filePath of allFiles) {
  const original = readFileSync(filePath, 'utf8');
  let content = original;
  let fileReplacements = 0;

  // Apply pattern 2 before pattern 1 (more specific first)
  content = content.replace(pattern2, (match, chain, method) => {
    fileReplacements++;
    return `(${chain} as jest.Mock).${method}(`;
  });
  // Reset lastIndex since we may reuse the regex
  pattern2.lastIndex = 0;

  content = content.replace(pattern1, (match, chain, method) => {
    fileReplacements++;
    return `(${chain} as jest.Mock).${method}(`;
  });
  pattern1.lastIndex = 0;

  // Apply .mock.calls patterns
  content = content.replace(pattern4, (match, chain, prop) => {
    fileReplacements++;
    return `(${chain} as jest.Mock).mock.${prop}`;
  });
  pattern4.lastIndex = 0;

  content = content.replace(pattern3, (match, chain, prop) => {
    fileReplacements++;
    return `(${chain} as jest.Mock).mock.${prop}`;
  });
  pattern3.lastIndex = 0;

  if (content !== original) {
    writeFileSync(filePath, content, 'utf8');
    totalFilesModified++;
    totalReplacements += fileReplacements;
    const rel = relative(ROOT, filePath).replace(/\\/g, '/');
    report.push(`  ${rel}: ${fileReplacements} replacement(s)`);
  }
}

console.log(`Files modified: ${totalFilesModified}`);
console.log(`Total replacements: ${totalReplacements}`);
if (report.length) {
  console.log('\nDetails:');
  for (const line of report) {
    console.log(line);
  }
}
