#!/usr/bin/env node
/**
 * Atualiza seção em arquivo .md (ou cria se não existir).
 * Uso: node update-doc-section.mjs <docfile> <"## Section Name"> <path-to-content.md>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const [,, docPath, sectionHeading, contentPath] = process.argv;

if (!docPath || !sectionHeading || !contentPath) {
  console.error(`Uso: node update-doc-section.mjs <docfile> <"## Section"> <contentfile>`);
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const doc = path.resolve(ROOT, docPath);
const content = path.resolve(ROOT, contentPath);

if (!fs.existsSync(content)) {
  console.error(`Erro: Arquivo de conteúdo não encontrado: ${content}`);
  process.exit(1);
}

const newContent = fs.readFileSync(content, "utf8").trim();
const heading = sectionHeading.trim();

// Cria doc se não existe
if (!fs.existsSync(doc)) {
  fs.mkdirSync(path.dirname(doc), { recursive: true });
  fs.writeFileSync(doc, `${heading}\n\n${newContent}\n`, "utf8");
  console.log(`✔ Arquivo criado: ${path.relative(ROOT, doc)}`);
  process.exit(0);
}

// Lê conteúdo atual
let md = fs.readFileSync(doc, "utf8");
const headingLvl = heading.match(/^#+/)?.[0].length || 2;
const reSection = new RegExp(
  `^${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
  "m"
);

const match = reSection.exec(md);
if (!match) {
  // Seção não existe, adiciona ao final
  md = md.trimEnd() + `\n\n${heading}\n\n${newContent}\n`;
  fs.writeFileSync(doc, md, "utf8");
  console.log(`✔ Seção "${heading}" adicionada ao final de ${path.relative(ROOT, doc)}`);
  process.exit(0);
}

// Seção existe, encontra fim da seção (próximo heading de mesmo nível ou menor)
const start = match.index;
const after = md.slice(start + match[0].length);
const reSameLvl = new RegExp(`^#{1,${headingLvl}}\\s+.+$`, "m");
const endMatch = reSameLvl.exec(after);

const sectionEnd = endMatch ? start + match[0].length + endMatch.index : md.length;
const before = md.slice(0, start + match[0].length);
const afterSec = md.slice(sectionEnd);

const updated = `${before}\n\n${newContent}\n${afterSec}`;
fs.writeFileSync(doc, updated, "utf8");
console.log(`✔ Seção "${heading}" atualizada em ${path.relative(ROOT, doc)}`);
