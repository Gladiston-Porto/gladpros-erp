// @bug:AUTH-P3-004
// @description: generateTokenPair é dead code com TTL bug (accessTokenExpiresAt=15min vs JWT 8h)
// Regressão: garantir que generateTokenPair não seja usada em nenhuma rota de produção

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

describe('REGRESSION AUTH-P3-004 — generateTokenPair dead code', () => {
  it('generateTokenPair não deve ser importada em nenhum arquivo fora de token-service.ts', () => {
    const srcDir = path.join(process.cwd(), 'src');
    const files = glob.sync('**/*.ts', { cwd: srcDir, absolute: true });

    const tokenServicePath = path.join(srcDir, 'lib/auth/token-service.ts');

    const violations: string[] = [];

    for (const file of files) {
      if (file === tokenServicePath) continue; // definição — permitida
      if (file.includes('__tests__')) continue; // arquivos de teste — permitidos
      const content = fs.readFileSync(file, 'utf-8');
      if (/generateTokenPair/.test(content)) {
        violations.push(file.replace(srcDir + '/', 'src/'));
      }
    }

    expect(violations).toHaveLength(0);
  });

  it('generateTokenPair deve estar marcada como @deprecated em token-service.ts', () => {
    const tokenServicePath = path.join(process.cwd(), 'src/lib/auth/token-service.ts');
    const content = fs.readFileSync(tokenServicePath, 'utf-8');
    expect(content).toMatch(/@deprecated/);
    expect(content).toMatch(/@internal/);
  });
});
