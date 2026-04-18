/**
 * Fix targeted TS errors: 
 * 1. nome: true → nomeCompleto: true in Usuario selects
 * 2. nome: true → titulo: true in Projeto selects  
 * 3. nome: true → nomeCompleto: true in Cliente selects (where Usuario not applicable)
 */
import fs from 'fs';
import path from 'path';

// Map of file → line numbers where 'nome' is on a Usuario select (from tsc output)
const USUARIO_NOME_FIXES = {
  'src/app/api/financeiro/despesas/[id]/aprovar/route.ts': [116, 136, 145, 174, 194, 203],
  'src/app/api/financeiro/despesas/[id]/pagar/route.ts': [97, 106],
  'src/app/api/financeiro/despesas/[id]/rejeitar/route.ts': [108, 128, 137],
  'src/app/api/financeiro/despesas/[id]/route.ts': [57, 66, 73, 168, 177],
  'src/app/api/financeiro/despesas/route.ts': [162, 171, 249, 273, 280],
  'src/app/api/invoices/[id]/payments/route.ts': [137],
};

let totalFixes = 0;

function fixNomeInFile(filePath, lineNumbers, replacement) {
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${filePath} not found`);
    return;
  }
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  let fixes = 0;
  for (const lineNum of lineNumbers) {
    const idx = lineNum - 1;
    if (idx >= 0 && idx < lines.length) {
      const line = lines[idx];
      // Only replace 'nome: true' with replacement
      if (line.includes('nome: true') || line.includes('nome:true')) {
        lines[idx] = line.replace(/nome:\s*true/, `${replacement}: true`);
        fixes++;
      }
    }
  }
  if (fixes > 0) {
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`FIXED ${fixes} in ${filePath}`);
    totalFixes += fixes;
  }
}

// Fix Usuario selects: nome → nomeCompleto
for (const [file, lines] of Object.entries(USUARIO_NOME_FIXES)) {
  fixNomeInFile(file, lines, 'nomeCompleto');
}

// Fix Invoice routes: Cliente.nome → nomeCompleto, Projeto.nome → titulo
// These need context-aware fixes
const invoiceFiles = [
  'src/app/api/invoices/route.ts',
  'src/app/api/invoices/[id]/route.ts',
  'src/app/api/invoices/[id]/payments/route.ts',
  'src/app/api/invoices/[id]/pdf/route.ts',
  'src/app/api/invoices/[id]/send/route.ts',
];

for (const filePath of invoiceFiles) {
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf-8');
  let count = 0;
  
  // cliente: { select: { nome: true → nomeCompleto: true
  const clientePattern = /cliente:\s*\{\s*select:\s*\{([^}]*)\bnome:\s*true\b/g;
  content = content.replace(clientePattern, (match) => {
    count++;
    return match.replace(/\bnome:\s*true\b/, 'nomeCompleto: true');
  });
  
  // projeto: { select: { nome: true → titulo: true  
  const projetoPattern = /projeto:\s*\{\s*select:\s*\{([^}]*)\bnome:\s*true\b/g;
  content = content.replace(projetoPattern, (match) => {
    count++;
    return match.replace(/\bnome:\s*true\b/, 'titulo: true');
  });

  // select: { id: true, nome: true, email: true } — in context of cliente/usuario
  // These are on Usuario relations (through include)
  // Pattern: aprovador/usuario select with nome
  const usuarioSelectPattern = /(aprovador|usuario|criadoPor|atualizadoPor)\s*:\s*\{\s*select:\s*\{[^}]*\bnome:\s*true\b/g;
  content = content.replace(usuarioSelectPattern, (match) => {
    if (!match.includes('nomeCompleto')) {
      count++;
      return match.replace(/\bnome:\s*true\b/, 'nomeCompleto: true');
    }
    return match;
  });

  if (count > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`FIXED ${count} in ${filePath}`);
    totalFixes += count;
  }
}

// Fix Estoque alerts: 'sigla' doesn't exist on UnidadeSelect
// Need to understand what field should be used instead

console.log(`\nTotal fixes: ${totalFixes}`);
