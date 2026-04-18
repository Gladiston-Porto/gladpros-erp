#!/usr/bin/env node
/**
 * Audit de repositório sem alterações — inventário, duplicidades, imports, órfãos.
 * Saídas: scripts/out/audit-report.json e audit-report.md
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "scripts", "out");
fs.mkdirSync(OUT_DIR, { recursive: true });

const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "coverage", ".turbo", ".cache", ".vscode"
]);
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const STYLE_EXT = new Set([".css", ".scss", ".sass"]);
const MD_EXT = new Set([".md", ".mdx"]);
const ENTRY_HINTS = [
  "src/main.tsx", "src/index.tsx", "src/index.ts", "src/app/page.tsx", "src/app/layout.tsx",
  "app/page.tsx", "app/layout.tsx", "pages/_app.tsx", "pages/index.tsx",
  "prisma/schema.prisma", "middleware.ts"
];

const manifest = []; // { path, size, hash, ext, imports:[], isEntry:boolean }
const byHash = new Map();
const byPath = new Map();
const importGraph = new Map(); // path -> Set(importPath)

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

function hashFile(fp) {
  try {
    const buf = fs.readFileSync(fp);
    return crypto.createHash("sha1").update(buf).digest("hex");
  } catch {
    return null;
  }
}

function readJsonSafe(fp) {
  try { return JSON.parse(fs.readFileSync(fp, "utf8")); } catch { return null; }
}

const tsconfig = ["tsconfig.json", "tsconfig.base.json"]
  .map(f => path.join(ROOT, f))
  .map(readJsonSafe)
  .find(Boolean);

const aliasMap = tsconfig?.compilerOptions?.paths || {};
const aliasKeys = Object.keys(aliasMap);

function resolveAlias(importStr) {
  for (const key of aliasKeys) {
    // key example: "@/*"
    if (key.endsWith("/*")) {
      const base = key.slice(0, -1); // "@/"
      if (importStr.startsWith(base)) return true;
    } else if (importStr === key) return true;
  }
  return false;
}

function extractImports(code) {
  // simples e rápido; cobre 90% dos casos
  const re = /import\s+(?:[^'"]+from\s+)?["']([^"']+)["'];?|require\(["']([^"']+)["']\)/g;
  const out = [];
  let m;
  while ((m = re.exec(code))) {
    const mod = m[1] || m[2];
    if (!mod) continue;
    // ignorar libs externas
    if (!mod.startsWith(".") && !mod.startsWith("/") && !mod.startsWith("@/")) continue;
    out.push(mod);
  }
  return out;
}

console.log("Escaneando repositório...");
let fileCount = 0;

for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const ext = path.extname(file).toLowerCase();
  const size = fs.statSync(file).size;
  const hash = hashFile(file);

  const isEntry = ENTRY_HINTS.some(h => rel.endsWith(h));
  const rec = { path: rel, size, hash, ext, imports: [], isEntry };
  if (CODE_EXT.has(ext)) {
    try {
      const code = fs.readFileSync(file, "utf8");
      rec.imports = extractImports(code);
    } catch {}
  }

  manifest.push(rec);
  byPath.set(rel, rec);
  if (hash) {
    if (!byHash.has(hash)) byHash.set(hash, []);
    byHash.get(hash).push(rel);
  }
  fileCount++;
  if (fileCount % 100 === 0) process.stdout.write(`\rArquivos processados: ${fileCount}`);
}

console.log(`\n✓ Total de ${fileCount} arquivos escaneados.`);
console.log("Construindo grafo de imports...");

// Build import graph (relative only)
for (const rec of manifest) {
  const from = rec.path;
  const set = new Set();
  for (const imp of rec.imports) {
    if (imp.startsWith("@/")) { set.add(imp); continue; }
    if (imp.startsWith(".")) {
      // resolve relative -> absolute rel
      const base = path.posix.dirname(from);
      let cand = path.posix.normalize(path.posix.join(base, imp));
      // try extensions
      const candidates = [cand, cand + ".ts", cand + ".tsx", cand + ".js", cand + ".jsx", cand + "/index.tsx", cand + "/index.ts", cand + "/index.js"];
      const found = candidates.find(c => byPath.has(c));
      if (found) set.add(found);
      else set.add(imp + " (MISSING)");
    }
  }
  importGraph.set(from, set);
}

console.log("Detectando duplicidades...");
// Find duplicates (same hash with >1 paths)
const duplicates = [];
for (const [h, arr] of byHash.entries()) {
  if (arr.length > 1) duplicates.push({ hash: h, files: arr });
}

console.log("Identificando imports ausentes...");
// Find missing imports
const missingImports = [];
for (const [from, set] of importGraph.entries()) {
  for (const t of set) {
    if (t.endsWith("(MISSING)")) {
      missingImports.push({ from, target: t });
    }
  }
}

console.log("Analisando candidatos a órfãos...");
// Candidates to orphans (no incoming edges and not entry and code/style/md)
const incoming = new Map(); // path -> count
for (const key of byPath.keys()) incoming.set(key, 0);
for (const [from, set] of importGraph.entries()) {
  for (const t of set) {
    if (t.includes("(MISSING)")) continue;
    if (incoming.has(t)) incoming.set(t, (incoming.get(t) || 0) + 1);
  }
}
const orphans = [];
for (const rec of manifest) {
  const ext = rec.ext;
  const watchExt = CODE_EXT.has(ext) || STYLE_EXT.has(ext) || MD_EXT.has(ext);
  if (!watchExt) continue;
  if (rec.isEntry) continue;
  const inc = incoming.get(rec.path) || 0;
  if (inc === 0) orphans.push({ path: rec.path, ext: rec.ext, size: rec.size });
}

console.log("Analisando qualidade de imports...");
// Alias quality: imports that should use "@/" but usam caminhos relativos longos
const aliasWarnings = [];
for (const rec of manifest) {
  if (!CODE_EXT.has(rec.ext)) continue;
  for (const imp of rec.imports) {
    if (imp.startsWith("../..")) {
      aliasWarnings.push({ from: rec.path, suggestAlias: true, import: imp });
    }
  }
}

console.log("Verificando configurações Tailwind/PostCSS...");
// Tailwind / PostCSS sanity
const pkgJson = readJsonSafe(path.join(ROOT, "package.json"));
const deps = { ...pkgJson?.dependencies, ...pkgJson?.devDependencies };
const tailwind = deps?.tailwindcss || null;
const hasTailwindPostcss = !!deps?.["@tailwindcss/postcss"];
const hasTailwindConfig = fs.existsSync(path.join(ROOT, "tailwind.config.js")) || fs.existsSync(path.join(ROOT, "tailwind.config.ts"));
const hasPostcssConfig = fs.existsSync(path.join(ROOT, "postcss.config.js")) || fs.existsSync(path.join(ROOT, "postcss.config.cjs")) || fs.existsSync(path.join(ROOT, "postcss.config.ts")) || fs.existsSync(path.join(ROOT, "postcss.config.mjs"));

// Detect modules by folder conventions
console.log("Detectando módulos...");
const modules = new Set();
for (const rec of manifest) {
  const match = rec.path.match(/^src\/(domains|modules|app\/\([\w-]+\))\/(\w+)\//);
  if (match) modules.add(match[2]);
}

const summary = {
  counts: {
    totalFiles: manifest.length,
    code: manifest.filter(r => CODE_EXT.has(r.ext)).length,
    style: manifest.filter(r => STYLE_EXT.has(r.ext)).length,
    markdown: manifest.filter(r => MD_EXT.has(r.ext)).length,
  },
  duplicates: duplicates.length,
  missingImports: missingImports.length,
  orphans: orphans.length,
  aliasWarnings: aliasWarnings.length,
  modules: Array.from(modules).sort(),
  tailwind: { version: tailwind, hasTailwindPostcss, hasTailwindConfig, hasPostcssConfig }
};

const report = {
  summary,
  duplicates,
  missingImports,
  orphans,
  aliasWarnings,
  tsconfigPaths: aliasMap,
  manifest
};

console.log("Gerando relatórios...");
fs.writeFileSync(path.join(OUT_DIR, "audit-report.json"), JSON.stringify(report, null, 2), "utf8");

// Markdown resumido
function mdList(items, max = 50) {
  return items.slice(0, max).map(i => `- ${typeof i === "string" ? i : JSON.stringify(i)}`).join("\n");
}
const md = `# Repo Audit Report
**Data**: ${new Date().toLocaleString("pt-BR")}

## Resumo Geral
- Total de arquivos: **${summary.counts.totalFiles}**
- Arquivos de código: **${summary.counts.code}**
- Estilos: **${summary.counts.style}**
- Markdown: **${summary.counts.markdown}**
- Duplicidades: **${summary.duplicates}**
- Imports ausentes: **${summary.missingImports}**
- Candidatos a órfãos: **${summary.orphans}**
- Avisos de alias: **${summary.aliasWarnings}**

## Módulos Detectados
${summary.modules.length > 0 ? summary.modules.map(m => `- ${m}`).join("\n") : "*Nenhum módulo detectado*"}

## Tailwind/PostCSS
- tailwindcss: ${summary.tailwind.version ?? "não detectado"}
- @tailwindcss/postcss: ${summary.tailwind.hasTailwindPostcss}
- tailwind.config.*: ${summary.tailwind.hasTailwindConfig}
- postcss.config.*: ${summary.tailwind.hasPostcssConfig}

## Exemplos de duplicidades
${duplicates.length > 0 ? mdList(duplicates.map(d => ({ hash: d.hash.substring(0, 8), files: d.files })), 10) : "*Nenhuma duplicidade detectada*"}

## Exemplos de imports ausentes
${missingImports.length > 0 ? mdList(missingImports, 20) : "*Nenhum import ausente*"}

## Candidatos a órfãos (amostra)
${orphans.length > 0 ? mdList(orphans.map(o => o.path), 50) : "*Nenhum arquivo órfão detectado*"}

## Avisos de alias (amostra)
${aliasWarnings.length > 0 ? mdList(aliasWarnings.slice(0, 50)) : "*Nenhum aviso de alias*"}

---
*Relatório completo disponível em: scripts/out/audit-report.json*
`;
fs.writeFileSync(path.join(OUT_DIR, "audit-report.md"), md, "utf8");

console.log("\n✔ Audit concluído. Saídas em scripts/out/audit-report.{json,md}");
console.log(`\nResumo rápido:`);
console.log(`- ${summary.modules.length} módulos detectados: ${summary.modules.join(", ")}`);
console.log(`- ${summary.duplicates} arquivos duplicados`);
console.log(`- ${summary.orphans} possíveis órfãos`);
console.log(`- ${summary.missingImports} imports ausentes`);
