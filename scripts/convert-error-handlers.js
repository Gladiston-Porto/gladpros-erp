/**
 * Script to convert API route handlers to use withErrorHandler wrapper.
 * 
 * Transforms: export async function METHOD(...) { try { ... } catch { ... } }
 * Into:       export const METHOD = withErrorHandler(async (...) => { ... });
 */

const fs = require('fs');
const path = require('path');

const BASE = process.cwd();
const API_DIR = path.join(BASE, 'src', 'app', 'api');
const SKIP_DIRS = ['financeiro', 'clientes', 'estoque', 'workforce'];
const IMPORT_LINE = "import { withErrorHandler } from '@/lib/api/error-handler';";

let totalHandlers = 0;
const modifiedFiles = [];
const skippedFiles = [];
const errorFiles = [];

// ---- File discovery ----

function findRouteFiles(dir) {
  const results = [];
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        results.push(...findRouteFiles(fullPath));
      } else if (item.name === 'route.ts') {
        results.push(fullPath);
      }
    }
  } catch (e) { /* ignore */ }
  return results;
}

function shouldSkip(filePath) {
  const relative = path.relative(API_DIR, filePath).split(path.sep).join('/');
  return SKIP_DIRS.some(dir => relative.startsWith(dir + '/'));
}

// ---- Brace/paren matching with string/comment/template awareness ----

function findMatchingDelim(str, pos, open, close) {
  let depth = 1;
  let i = pos + 1;
  while (i < str.length && depth > 0) {
    const ch = str[i];
    
    // Skip single-line comments
    if (ch === '/' && str[i + 1] === '/') {
      i += 2;
      while (i < str.length && str[i] !== '\n') i++;
      continue;
    }
    // Skip multi-line comments
    if (ch === '/' && str[i + 1] === '*') {
      i += 2;
      while (i < str.length - 1 && !(str[i] === '*' && str[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    // Skip string literals
    if (ch === '"' || ch === "'") {
      const q = ch;
      i++;
      while (i < str.length && str[i] !== q) {
        if (str[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    // Skip template literals
    if (ch === '`') {
      i++;
      while (i < str.length && str[i] !== '`') {
        if (str[i] === '\\') { i += 2; continue; }
        if (str[i] === '$' && i + 1 < str.length && str[i + 1] === '{') {
          i += 2;
          let exprDepth = 1;
          while (i < str.length && exprDepth > 0) {
            if (str[i] === '{') exprDepth++;
            else if (str[i] === '}') { exprDepth--; if (exprDepth === 0) break; }
            else if (str[i] === '`') {
              // nested template literal inside ${}
              i++;
              while (i < str.length && str[i] !== '`') {
                if (str[i] === '\\') i++;
                i++;
              }
            } else if (str[i] === '"' || str[i] === "'") {
              const q2 = str[i];
              i++;
              while (i < str.length && str[i] !== q2) {
                if (str[i] === '\\') i++;
                i++;
              }
            }
            i++;
          }
          continue;
        }
        i++;
      }
      i++;
      continue;
    }
    
    if (ch === open) depth++;
    if (ch === close) depth--;
    if (depth === 0) return i;
    i++;
  }
  return -1;
}

// ---- Try/catch stripping ----

function stripOuterTryCatch(body) {
  const trimmed = body.trimStart();
  
  // Must start with 'try' followed by whitespace or '{'
  if (!/^try\s*\{/.test(trimmed)) return body;
  
  // Find the start of 'try' keyword in the original body (preserving leading whitespace)
  const tryKeywordIndex = body.indexOf('try');
  const beforeTry = body.substring(0, tryKeywordIndex);
  
  // Find opening brace of try
  const tryBraceOpen = body.indexOf('{', tryKeywordIndex + 3);
  if (tryBraceOpen === -1) return body;
  const tryBraceClose = findMatchingDelim(body, tryBraceOpen, '{', '}');
  if (tryBraceClose === -1) return body;
  
  const tryBody = body.substring(tryBraceOpen + 1, tryBraceClose);
  
  // After try's closing brace, look for catch
  const afterTryBrace = body.substring(tryBraceClose + 1);
  const catchMatch = afterTryBrace.match(/^\s*catch\b/);
  
  if (!catchMatch) return body;
  
  // Find absolute position of 'catch' keyword in body
  const catchKeywordOffset = afterTryBrace.indexOf('catch');
  const catchAbsPos = tryBraceClose + 1 + catchKeywordOffset;
  
  // Find the catch block body (may have params like `catch (error)` or just `catch`)
  let catchBodyStart;
  const afterCatchKw = body.substring(catchAbsPos + 5); // skip 'catch' (5 chars)
  const trimmedAfterCatch = afterCatchKw.trimStart();
  
  if (trimmedAfterCatch.startsWith('(')) {
    // catch (error) { ... }
    const parenOpen = body.indexOf('(', catchAbsPos + 5);
    const parenClose = findMatchingDelim(body, parenOpen, '(', ')');
    if (parenClose === -1) return body;
    catchBodyStart = body.indexOf('{', parenClose + 1);
  } else if (trimmedAfterCatch.startsWith('{')) {
    // catch { ... }
    catchBodyStart = body.indexOf('{', catchAbsPos + 5);
  } else {
    return body;
  }
  
  if (catchBodyStart === -1) return body;
  const catchBodyEnd = findMatchingDelim(body, catchBodyStart, '{', '}');
  if (catchBodyEnd === -1) return body;
  
  // Check for finally
  let endPos = catchBodyEnd + 1;
  const afterCatch = body.substring(endPos);
  const finallyMatch = afterCatch.match(/^\s*finally\b/);
  if (finallyMatch) {
    const finallyBraceOpen = body.indexOf('{', endPos);
    if (finallyBraceOpen !== -1) {
      const finallyBraceClose = findMatchingDelim(body, finallyBraceOpen, '{', '}');
      if (finallyBraceClose !== -1) {
        endPos = finallyBraceClose + 1;
      }
    }
  }
  
  const remaining = body.substring(endPos);
  
  return beforeTry + tryBody + remaining;
}

// ---- Main conversion ----

function convertFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  if (shouldSkip(filePath)) {
    skippedFiles.push(path.relative(BASE, filePath).split(path.sep).join('/'));
    return null;
  }
  if (content.includes('withErrorHandler')) {
    skippedFiles.push(path.relative(BASE, filePath).split(path.sep).join('/') + ' (already converted)');
    return null;
  }
  
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  let hasMatch = false;
  for (const method of methods) {
    if (new RegExp(`export\\s+async\\s+function\\s+${method}\\b`).test(content)) {
      hasMatch = true;
      break;
    }
  }
  if (!hasMatch) return null;
  
  // Add import after the last import statement
  if (!content.includes("withErrorHandler")) {
    const importMatches = [...content.matchAll(/^import\s+[\s\S]*?(?:from\s+['"][^'"]+['"]|['"][^'"]+['"])\s*;?\s*$/gm)];
    
    if (importMatches.length > 0) {
      const lastImport = importMatches[importMatches.length - 1];
      const insertPos = lastImport.index + lastImport[0].length;
      content = content.slice(0, insertPos) + '\n' + IMPORT_LINE + content.slice(insertPos);
    } else {
      // Check for 'export const runtime' or a comment at top
      const lines = content.split('\n');
      let insertLine = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('//') || lines[i].startsWith('export const runtime') || lines[i].trim() === '') {
          insertLine = i + 1;
        } else {
          break;
        }
      }
      lines.splice(insertLine, 0, IMPORT_LINE);
      content = lines.join('\n');
    }
  }
  
  // Convert each method
  let handlerCount = 0;
  
  for (const method of methods) {
    // Need to re-search each time because content changes after each conversion
    let safety = 0;
    while (safety++ < 5) {
      const pattern = new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`);
      const match = pattern.exec(content);
      if (!match) break;
      
      const funcStart = match.index;
      
      // Find opening paren
      const parenOpen = content.indexOf('(', funcStart + match[0].length - 1);
      if (parenOpen === -1) break;
      const parenClose = findMatchingDelim(content, parenOpen, '(', ')');
      if (parenClose === -1) break;
      
      const params = content.substring(parenOpen + 1, parenClose).trim();
      
      // Find the opening brace of the function body
      // There might be a return type annotation between ) and {
      const afterParen = content.substring(parenClose + 1);
      const braceMatch = afterParen.match(/^[^{]*\{/);
      if (!braceMatch) break;
      const braceOpen = parenClose + 1 + braceMatch[0].length - 1;
      
      const braceClose = findMatchingDelim(content, braceOpen, '{', '}');
      if (braceClose === -1) break;
      
      // Extract body
      let body = content.substring(braceOpen + 1, braceClose);
      
      // Strip outer try/catch
      body = stripOuterTryCatch(body);
      
      // Build replacement
      const replacement = `export const ${method} = withErrorHandler(async (${params}) => {${body}});`;
      
      content = content.substring(0, funcStart) + replacement + content.substring(braceClose + 1);
      handlerCount++;
    }
  }
  
  if (handlerCount === 0) return null;
  
  totalHandlers += handlerCount;
  modifiedFiles.push({
    file: path.relative(BASE, filePath).split(path.sep).join('/'),
    handlers: handlerCount
  });
  
  return content;
}

// ---- Run ----

const allFiles = findRouteFiles(API_DIR);
console.log(`Found ${allFiles.length} route.ts files in ${API_DIR}\n`);

let successCount = 0;
let errorCount = 0;

for (const file of allFiles) {
  try {
    const result = convertFile(file);
    if (result !== null) {
      fs.writeFileSync(file, result, 'utf-8');
      successCount++;
    }
  } catch (e) {
    errorCount++;
    errorFiles.push({ file: path.relative(BASE, file).split(path.sep).join('/'), error: e.message });
    console.error(`ERROR: ${path.relative(BASE, file)}: ${e.message}`);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`  CONVERSION COMPLETE`);
console.log(`${'='.repeat(60)}`);
console.log(`  Files modified:     ${successCount}`);
console.log(`  Handlers converted: ${totalHandlers}`);
console.log(`  Errors:             ${errorCount}`);
console.log(`${'='.repeat(60)}\n`);

if (modifiedFiles.length > 0) {
  console.log(`| ${'File'.padEnd(70)} | Handlers |`);
  console.log(`|${'-'.repeat(72)}|----------|`);
  for (const entry of modifiedFiles) {
    console.log(`| ${entry.file.padEnd(70)} | ${String(entry.handlers).padStart(8)} |`);
  }
  console.log('');
}

if (errorFiles.length > 0) {
  console.log('ERRORS:');
  for (const entry of errorFiles) {
    console.log(`  ${entry.file}: ${entry.error}`);
  }
}
