// @bug:USUARIOS-P3-003
// @description: Rotas de usuarios não podem retornar erro sem success:false.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

function listTsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) return listTsFiles(full);
    return /\.tsx?$/.test(full) && !/(__tests__|\.test\.|\.spec\.)/.test(full) ? [full] : [];
  });
}

describe('REGRESSION USUARIOS-P3-003', () => {
  it('mantem success:false em respostas de erro do modulo usuarios', () => {
    const apiRoot = resolve(process.cwd(), 'src/app/api/usuarios');
    const violations: string[] = [];

    for (const file of listTsFiles(apiRoot)) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (!/NextResponse\.json\s*\(/.test(line)) return;
        const context = lines.slice(index, Math.min(lines.length, index + 25)).join('\n');
        if (!/success\s*:/.test(context)) {
          violations.push(`${file}:${index + 1}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
