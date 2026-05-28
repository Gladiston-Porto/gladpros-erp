// @bug:AUTH-P3-001
// @description: E2E deve refletir que mfa/verify exige challenge em LOGIN/PRIMEIRO_ACESSO

import fs from 'fs';
import path from 'path';

describe('REGRESSION AUTH-P3-001', () => {
  it('teste E2E de MFA envia challenge válido antes de validar código inválido', () => {
    const e2e = fs.readFileSync(
      path.join(process.cwd(), 'tests/e2e/auth/auth-regression.spec.ts'),
      'utf8',
    );

    expect(e2e).toContain('@bug:AUTH-P3-001');
    expect(e2e).toContain('setupMfaChallenge(page.request, BASE_URL, QA_ADMIN_ID)');
    expect(e2e).toContain('challenge: mfaChallenge');
    expect(e2e).not.toContain('does not require mfaChallenge token');
  });
});
