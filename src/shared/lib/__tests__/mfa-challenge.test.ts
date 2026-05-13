import { createMfaChallenge, verifyMfaChallenge } from '@/shared/lib/mfa-challenge';

describe('mfa-challenge', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef';
  });

  it('verifies a challenge for the same user and action', () => {
    const challenge = createMfaChallenge({ userId: 1, tipoAcao: 'LOGIN' });

    expect(verifyMfaChallenge(challenge, { userId: 1, tipoAcao: 'LOGIN' })).toBe(true);
  });

  it('rejects a challenge for a different user or action', () => {
    const challenge = createMfaChallenge({ userId: 1, tipoAcao: 'LOGIN' });

    expect(verifyMfaChallenge(challenge, { userId: 2, tipoAcao: 'LOGIN' })).toBe(false);
    expect(verifyMfaChallenge(challenge, { userId: 1, tipoAcao: 'PRIMEIRO_ACESSO' })).toBe(false);
  });

  it('rejects expired challenges', () => {
    const challenge = createMfaChallenge({ userId: 1, tipoAcao: 'LOGIN', ttlSeconds: -1 });

    expect(verifyMfaChallenge(challenge, { userId: 1, tipoAcao: 'LOGIN' })).toBe(false);
  });
});
