/**
 * Script para migrar todas API routes para usar withErrorHandler
 * v2 — robusto com parsing de parênteses/chaves, strings e comentários
 */
import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import path from 'path';

const ROOT = path.resolve('src/app/api');
const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const DRY_RUN = process.argv.includes('--dry-run');

const SKIP_PATTERNS = ['_debug', 'test-helpers', 'dev/', 'test/', 'monitoring/', 'cron/'];

function shouldSkip(filePath) {
  return SKIP_PATTERNS.some(p => filePath.includes(p));
}

/**
 * Avança o índice pulando strings, template literals e comentários
 * Retorna o novo índice
 */
function skipLiterals(content, i) {
  // String literal (single or double quote)
  if (content[i] === '"' || content[i] === "'") {
    const quote = content[i];
    i++;
    while (i < content.length) {
      if (content[i] === '\\') { i += 2; continue; }
      if (content[i] === quote) return i;
      i++;
    }
    return i;
  }
  // Template literal
  if (content[i] === '`') {
    i++;
    while (i < content.length) {
      if (content[i] === '\\') { i += 2; continue; }
      if (content[i] === '`') return i;
      if (content[i] === '$' && i + 1 < content.length && content[i+1] === '{') {
        i += 2;
        let depth = 1;
        while (i < content.length && depth > 0) {
          if (content[i] === '{') depth++;
          if (content[i] === '}') depth--;
          if (depth > 0) i++;
        }
      }
      i++;
    }
    return i;
  }
  // Line comment
  if (content[i] === '/' && i + 1 < content.length && content[i+1] === '/') {
    while (i < content.length && content[i] !== '\n') i++;
    return i;
  }
  // Block comment
  if (content[i] === '/' && i + 1 < content.length && content[i+1] === '*') {
    i += 2;
    while (i < content.length - 1) {
      if (content[i] === '*' && content[i+1] === '/') return i + 1;
      i++;
    }
    return i;
  }
  return -1; // not a literal
}

function findMatchingChar(content, startIndex, openChar, closeChar) {
  let depth = 0;
  let i = startIndex;
  while (i < content.length) {
    const skipResult = skipLiterals(content, i);
    if (skipResult !== -1) { i = skipResult + 1; continue; }
    
    if (content[i] === openChar) depth++;
    if (content[i] === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

function transformFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  
  if (content.includes('withErrorHandler')) {
    return { skipped: true, reason: 'already has withErrorHandler' };
  }
  
  let modified = false;
  let transformedMethods = [];
  
  for (const method of METHODS) {
    let safety = 10; // prevent infinite loops
    let changed = true;
    while (changed && safety-- > 0) {
      changed = false;
      const pattern = new RegExp(
        `export\\s+async\\s+function\\s+${method}\\s*\\(`
      );
      const match = pattern.exec(content);
      if (!match) break;
      
      const funcStart = match.index;
      const parenOpen = funcStart + match[0].length - 1;
      
      const parenClose = findMatchingChar(content, parenOpen, '(', ')');
      if (parenClose === -1) break;
      
      const params = content.substring(parenOpen + 1, parenClose).trim();
      
      // Find opening { of the function body — skip return type
      let idx = parenClose + 1;
      while (idx < content.length && content[idx] !== '{') {
        const skipResult = skipLiterals(content, idx);
        if (skipResult !== -1) { idx = skipResult + 1; continue; }
        idx++;
      }
      
      const bodyOpen = idx;
      const bodyClose = findMatchingChar(content, bodyOpen, '{', '}');
      if (bodyClose === -1) break;
      
      let fullBody = content.substring(bodyOpen + 1, bodyClose);
      
      // Check if body is a single try/catch — strip external try/catch
      const trimmedBody = fullBody.trim();
      if (trimmedBody.startsWith('try') && /^try\s*\{/.test(trimmedBody)) {
        const tryBraceStart = trimmedBody.indexOf('{');
        const tryBraceEnd = findMatchingChar(trimmedBody, tryBraceStart, '{', '}');
        if (tryBraceEnd !== -1) {
          const afterTry = trimmedBody.substring(tryBraceEnd + 1).trim();
          if (afterTry.startsWith('catch')) {
            // Find catch block
            const catchBraceStart = afterTry.indexOf('{');
            if (catchBraceStart !== -1) {
              const catchBraceEnd = findMatchingChar(afterTry, catchBraceStart, '{', '}');
              if (catchBraceEnd !== -1) {
                const afterCatch = afterTry.substring(catchBraceEnd + 1).trim();
                if (afterCatch === '' || afterCatch.startsWith('finally')) {
                  // Strip try/catch, keep only try body
                  fullBody = trimmedBody.substring(tryBraceStart + 1, tryBraceEnd);
                }
              }
            }
          }
        }
      }
      
      const oldText = content.substring(funcStart, bodyClose + 1);
      const newText = `export const ${method} = withErrorHandler(async (${params}) => {${fullBody}});`;
      
      content = content.substring(0, funcStart) + newText + content.substring(bodyClose + 1);
      modified = true;
      changed = true;
      if (!transformedMethods.includes(method)) {
        transformedMethods.push(method);
      }
    }
  }
  
  if (!modified) {
    return { skipped: true, reason: 'no handlers found' };
  }
  
  // Add import after the last top-level import
  if (!content.includes("from '@/lib/api/error-handler'") && !content.includes('from "@/lib/api/error-handler"')) {
    // Find last import at file scope
    const importRegex = /^import\s.+$/gm;
    let lastMatch;
    let m;
    while ((m = importRegex.exec(content)) !== null) {
      // Only match if this is before the first export
      const firstExport = content.indexOf('export ');
      if (firstExport === -1 || m.index < firstExport) {
        lastMatch = m;
      }
    }
    
    if (lastMatch) {
      const insertPos = lastMatch.index + lastMatch[0].length;
      content = content.substring(0, insertPos) + 
        "\nimport { withErrorHandler } from '@/lib/api/error-handler';" +
        content.substring(insertPos);
    } else {
      content = "import { withErrorHandler } from '@/lib/api/error-handler';\n" + content;
    }
  }
  
  if (!DRY_RUN) {
    writeFileSync(filePath, content, 'utf-8');
  }
  
  return { modified: true, methods: transformedMethods };
}

const files = globSync('**/route.ts', { cwd: ROOT, absolute: true });
console.log(`Found ${files.length} route.ts files\n`);

let modifiedCount = 0, skippedCount = 0, errorCount = 0;

for (const file of files) {
  const relative = path.relative(ROOT, file).replace(/\\/g, '/');
  if (shouldSkip(relative)) { skippedCount++; continue; }
  
  try {
    const result = transformFile(file);
    if (result.modified) {
      modifiedCount++;
      console.log(`✅ ${relative}: ${result.methods.join(', ')}`);
    } else {
      skippedCount++;
    }
  } catch (err) {
    errorCount++;
    console.error(`❌ ${relative}: ${err.message}`);
  }
}

console.log(`\n--- Summary ---`);
console.log(`Modified: ${modifiedCount} | Skipped: ${skippedCount} | Errors: ${errorCount}`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLIED'}`);
