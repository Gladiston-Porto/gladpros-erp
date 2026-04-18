#!/usr/bin/env node
/**
 * Detecta classes/IDs CSS não usados em arquivos de código.
 * Gera scripts/out/dead-css-report.{json,md}
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "scripts", "out");
fs.mkdirSync(OUT_DIR, { recursive: true });

const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "coverage", ".turbo", ".cache", ".vscode"
]);
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".html", ".vue", ".svelte"]);
const STYLE_EXT = new Set([".css", ".scss", ".sass"]);

function isIgnored(p) {
  const parts = p.split(path.sep);
  return parts.some(seg => IGNORE_DIRS.has(seg));
}

function* walk(dir) {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const it of items) {
      const full = path.join(dir, it.name);
      if (isIgnored(full)) continue;
      if (it.isDirectory()) yield* walk(full);
      else yield full;
    }
  } catch (err) {
    console.warn(`Skipping ${dir}: ${err.message}`);
  }
}

console.log("Coletando classes/IDs de arquivos CSS...");
const cssClasses = new Set();
const cssIds = new Set();
const cssFiles = [];

for (const file of walk(ROOT)) {
  const ext = path.extname(file).toLowerCase();
  if (!STYLE_EXT.has(ext)) continue;
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  cssFiles.push(rel);
  
  try {
    const code = fs.readFileSync(file, "utf8");
    // Classes: .class
    const classRe = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
    let m;
    while ((m = classRe.exec(code))) cssClasses.add(m[1]);
    // IDs: #id
    const idRe = /#([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
    while ((m = idRe.exec(code))) cssIds.add(m[1]);
  } catch {}
}

console.log(`Encontradas ${cssClasses.size} classes e ${cssIds.size} IDs em ${cssFiles.length} arquivos CSS.`);
console.log("Verificando uso em arquivos de código...");

const usedClasses = new Set();
const usedIds = new Set();
const codeFiles = [];

for (const file of walk(ROOT)) {
  const ext = path.extname(file).toLowerCase();
  if (!CODE_EXT.has(ext)) continue;
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  codeFiles.push(rel);
  
  try {
    const code = fs.readFileSync(file, "utf8");
    // Busca por className, class=, id=, classList, getElementById, querySelectorAll, etc.
    for (const cls of cssClasses) {
      if (code.includes(cls)) usedClasses.add(cls);
    }
    for (const id of cssIds) {
      if (code.includes(id)) usedIds.add(id);
    }
  } catch {}
}

console.log(`${usedClasses.size} classes e ${usedIds.size} IDs encontrados em ${codeFiles.length} arquivos de código.`);
console.log("Calculando classes/IDs não usados...");

const unusedClasses = [...cssClasses].filter(c => !usedClasses.has(c)).sort();
const unusedIds = [...cssIds].filter(id => !usedIds.has(id)).sort();

const report = {
  summary: {
    totalClasses: cssClasses.size,
    totalIds: cssIds.size,
    usedClasses: usedClasses.size,
    usedIds: usedIds.size,
    unusedClasses: unusedClasses.length,
    unusedIds: unusedIds.length,
    cssFiles: cssFiles.length,
    codeFiles: codeFiles.length
  },
  unusedClasses,
  unusedIds,
  cssFiles,
  codeFiles
};

fs.writeFileSync(path.join(OUT_DIR, "dead-css-report.json"), JSON.stringify(report, null, 2), "utf8");

const md = `# Dead CSS Report
**Data**: ${new Date().toLocaleString("pt-BR")}

## Resumo
- Total de classes CSS: **${report.summary.totalClasses}**
- Total de IDs CSS: **${report.summary.totalIds}**
- Classes usadas: **${report.summary.usedClasses}**
- IDs usados: **${report.summary.usedIds}**
- **Classes não usadas**: **${report.summary.unusedClasses}**
- **IDs não usados**: **${report.summary.unusedIds}**
- Arquivos CSS analisados: ${report.summary.cssFiles}
- Arquivos de código analisados: ${report.summary.codeFiles}

## Classes não usadas (amostra)
${unusedClasses.length > 0 ? unusedClasses.slice(0, 100).map(c => `- \`.${c}\``).join("\n") : "*Nenhuma classe não usada detectada*"}

## IDs não usados (amostra)
${unusedIds.length > 0 ? unusedIds.slice(0, 50).map(i => `- \`#${i}\``).join("\n") : "*Nenhum ID não usado detectado*"}

---
**Nota**: Este relatório usa busca de string simples. Classes/IDs usados via \`clsx\`, \`cn\`, construções dinâmicas ou Tailwind podem ser sinalizados como não usados.

*Relatório completo em: scripts/out/dead-css-report.json*
`;
fs.writeFileSync(path.join(OUT_DIR, "dead-css-report.md"), md, "utf8");

console.log("\n✔ Análise concluída. Saídas em scripts/out/dead-css-report.{json,md}");
console.log(`\nResumo rápido:`);
console.log(`- ${unusedClasses.length} classes não usadas (de ${cssClasses.size})`);
console.log(`- ${unusedIds.length} IDs não usados (de ${cssIds.size})`);
if (unusedClasses.length + unusedIds.length === 0) {
  console.log("✔ Nenhum CSS morto detectado!");
}
