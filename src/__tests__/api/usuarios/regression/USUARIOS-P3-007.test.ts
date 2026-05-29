// @bug:USUARIOS-P3-007
// @description: Auditoria de usuarios deve rodar health-check estrito e sem regex grep cego.

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('REGRESSION USUARIOS-P3-007', () => {
  it('mantem run-audit usando health-check estrito', () => {
    const runAudit = readFileSync(resolve(process.cwd(), 'scripts/run-audit.mjs'), 'utf8');

    expect(runAudit).toContain(
      'node scripts/check-module-health.mjs --module=${moduleName} --strict',
    );
  });

  it('mantem detector de contrato de API fora de grep -E com lookahead invalido', () => {
    const health = readFileSync(resolve(process.cwd(), 'scripts/check-module-health.mjs'), 'utf8');

    expect(health).toContain('function checkApiResponseContractViolations()');
    expect(health).not.toContain('NextResponse\\\\.json\\\\(\\\\s*\\\\{(?!');
  });
});
