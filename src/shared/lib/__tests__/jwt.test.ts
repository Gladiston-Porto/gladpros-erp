/**
 * Tests for JWT service (shared/lib/jwt.ts) using jose
 *
 * Note: jose is ESM and not transformable by jest in jsdom.
 * We mock the jose module with a simple HS256 implementation
 * to test our signAuthJWT/verifyAuthJWT wrappers.
 */

// Mock jose since it's ESM and jest can't transform it in jsdom
jest.mock('jose', () => {
  const crypto = require('crypto');

  function base64url(obj: unknown): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64url');
  }

  function sign(payload: Record<string, unknown>, secret: Uint8Array): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = base64url(header);
    const payloadB64 = base64url(payload);
    const signature = crypto
      .createHmac('sha256', Buffer.from(secret))
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');
    return `${headerB64}.${payloadB64}.${signature}`;
  }

  return {
    SignJWT: class {
      private payload: Record<string, unknown>;
      private sub = '';
      private iss = '';
      private aud = '';
      private exp = '';

      constructor(payload: Record<string, unknown>) {
        this.payload = { ...payload };
      }
      setProtectedHeader() { return this; }
      setSubject(sub: string) { this.sub = sub; return this; }
      setIssuer(iss: string) { this.iss = iss; return this; }
      setAudience(aud: string) { this.aud = aud; return this; }
      setExpirationTime(exp: string) { this.exp = exp; return this; }

      async sign(secret: Uint8Array): Promise<string> {
        const now = Math.floor(Date.now() / 1000);
        const full = {
          ...this.payload,
          sub: this.sub,
          iss: this.iss,
          aud: this.aud,
          iat: now,
          exp: this.exp === '0s' ? now - 1 : now + 86400,
        };
        return sign(full, secret);
      }
    },

    jwtVerify: async (token: string, secret: Uint8Array, opts?: { issuer?: string; audience?: string }) => {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid token format');

      const headerB64 = parts[0];
      const payloadB64 = parts[1];
      const expectedSig = crypto
        .createHmac('sha256', Buffer.from(secret))
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

      if (expectedSig !== parts[2]) throw new Error('signature verification failed');

      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

      if (opts?.issuer && payload.iss !== opts.issuer) throw new Error('unexpected "iss"');
      if (opts?.audience && payload.aud !== opts.audience) throw new Error('unexpected "aud"');
      if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) throw new Error('token expired');

      return { payload };
    },

    JWTPayload: {},
  };
});

process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long!!';

import { signAuthJWT, verifyAuthJWT } from '@/shared/lib/jwt';

describe('JWT Service', () => {
  describe('signAuthJWT', () => {
    it('should sign a JWT with required claims', async () => {
      const token = await signAuthJWT({
        sub: '123',
        role: 'ADMIN',
        email: 'test@gladpros.com',
        status: 'ATIVO',
      });

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include role and email in payload', async () => {
      const token = await signAuthJWT({
        sub: '42',
        role: 'GERENTE',
        email: 'gerente@gladpros.com',
        status: 'ATIVO',
        tokenVersion: 5,
      });

      const payload = await verifyAuthJWT(token);
      expect(payload.sub).toBe('42');
      expect(payload.role).toBe('GERENTE');
      expect(payload.email).toBe('gerente@gladpros.com');
      expect(payload.tokenVersion).toBe(5);
    });
  });

  describe('verifyAuthJWT', () => {
    it('should verify a valid token', async () => {
      const token = await signAuthJWT({
        sub: '1',
        role: 'ADMIN',
        status: 'ATIVO',
      });

      const payload = await verifyAuthJWT(token);
      expect(payload.sub).toBe('1');
      expect(payload.role).toBe('ADMIN');
    });

    it('should reject an invalid token', async () => {
      await expect(verifyAuthJWT('invalid.token.here')).rejects.toThrow();
    });

    it('should reject a tampered token', async () => {
      const token = await signAuthJWT({ sub: '1', role: 'ADMIN' });
      const parts = token.split('.');
      parts[1] = Buffer.from('{"sub":"hacked","role":"ADMIN"}').toString('base64url');
      await expect(verifyAuthJWT(parts.join('.'))).rejects.toThrow();
    });

    it('should include issuer and audience', async () => {
      const token = await signAuthJWT({ sub: '1', role: 'USUARIO' });
      const payload = await verifyAuthJWT(token);
      expect(payload.iss).toBe('gladpros');
      expect(payload.aud).toBe('gladpros-app');
    });

    it('should reject expired tokens', async () => {
      const token = await signAuthJWT({ sub: '1', role: 'ADMIN' }, '0s');
      await new Promise(resolve => setTimeout(resolve, 100));
      await expect(verifyAuthJWT(token)).rejects.toThrow('token expired');
    });
  });

  describe('secret validation', () => {
    it('should throw for short JWT_SECRET', async () => {
      const original = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'short';
      await expect(signAuthJWT({ sub: '1', role: 'ADMIN' })).rejects.toThrow('JWT_SECRET must be at least 32 characters');
      process.env.JWT_SECRET = original;
    });
  });
});
