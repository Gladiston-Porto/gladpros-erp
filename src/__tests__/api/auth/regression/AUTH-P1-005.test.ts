// @bug:AUTH-P1-005
// @description: bearer secrets de sessão, refresh e deviceTrust não podem ser persistidos em claro

import fs from 'fs';
import path from 'path';
import { hashAuthToken } from '@/shared/lib/auth-token-hash';

const root = process.cwd();

describe('REGRESSION AUTH-P1-005', () => {
  it('usa hash determinístico de 64 caracteres e não retorna o segredo bruto', () => {
    const raw = 'raw-cookie-token-value';
    const hashed = hashAuthToken(raw);

    expect(hashed).toMatch(/^[a-f0-9]{64}$/);
    expect(hashed).not.toBe(raw);
    expect(hashAuthToken(raw)).toBe(hashed);
  });

  it('schema e rotas Auth gravam/consultam colunas hash para segredos bearer', () => {
    const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
    const security = fs.readFileSync(path.join(root, 'src/shared/lib/security.ts'), 'utf8');
    const tokenService = fs.readFileSync(path.join(root, 'src/lib/auth/token-service.ts'), 'utf8');
    const login = fs.readFileSync(path.join(root, 'src/app/api/auth/login/route.ts'), 'utf8');
    const mfaVerify = fs.readFileSync(
      path.join(root, 'src/app/api/auth/mfa/verify/route.ts'),
      'utf8',
    );

    expect(schema).toContain('tokenHash       String');
    expect(schema).toContain('deviceTokenHash String');
    expect(tokenService).toContain('tokenHash: refreshTokenHash');
    expect(tokenService).not.toContain('token: refreshToken,');
    expect(security).toContain('VALUES (${usuarioId}, ${tokenHash}, ${tokenHash}');
    expect(login).toContain('deviceTokenHash = ${deviceTrustHash}');
    expect(mfaVerify).toContain('deviceToken, deviceTokenHash');
    expect(mfaVerify).toContain(
      'VALUES (${user.empresaId}, ${user.id}, ${deviceTokenHash}, ${deviceTokenHash}',
    );
  });
});
