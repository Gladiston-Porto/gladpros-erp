// @bug:AUTH-P2-004
// @description: TTL do access token deve ser único entre login, MFA e refresh

import fs from 'fs';
import path from 'path';
import {
  AUTH_ACCESS_TOKEN_EXPIRY,
  AUTH_ACCESS_TOKEN_MAX_AGE_SECONDS,
} from '@/shared/lib/auth-constants';
import { ACCESS_TOKEN_EXPIRY, ACCESS_TOKEN_MAX_AGE_SECONDS } from '@/lib/auth/token-service';

describe('REGRESSION AUTH-P2-004', () => {
  it('token-service exporta o mesmo TTL usado pelas rotas Auth', () => {
    expect(ACCESS_TOKEN_EXPIRY).toBe(AUTH_ACCESS_TOKEN_EXPIRY);
    expect(ACCESS_TOKEN_MAX_AGE_SECONDS).toBe(AUTH_ACCESS_TOKEN_MAX_AGE_SECONDS);
  });

  it('rota refresh não reintroduz maxAge divergente de 15 minutos', () => {
    const refreshRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/auth/refresh/route.ts'),
      'utf8',
    );

    expect(refreshRoute).toContain('AUTH_ACCESS_TOKEN_MAX_AGE_SECONDS');
    expect(refreshRoute).not.toContain('maxAge: 15 * 60');
  });
});
