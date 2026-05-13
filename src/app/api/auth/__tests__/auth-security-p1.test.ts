jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    passwordResetToken: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/shared/lib/email', () => ({
  EmailService: {
    prewarm: jest.fn(),
    sendPasswordReset: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock('@/lib/auth/token-service', () => ({
  refreshAccessToken: jest.fn(),
}));

import { prisma } from '@/lib/prisma';
import { EmailService } from '@/shared/lib/email';

const { Request, Response, Headers } = require('node-fetch');
Object.assign(global, { Request, Response, Headers });
if (typeof Response.json !== 'function') {
  Response.json = (data: unknown, init?: ResponseInit) => new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

const { POST: forgotPasswordPOST } = require('../forgot-password/route');
const { POST: userStatusPOST } = require('../user-status/route');
const { POST: mfaResendPOST } = require('../mfa/resend/route');
const { POST: refreshPOST } = require('../refresh/route');

function jsonRequest(path: string, body: unknown, headers?: HeadersInit) {
  const request = new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  Object.defineProperty(request, 'cookies', {
    value: { get: jest.fn().mockReturnValue(undefined) },
  });
  return request;
}

describe('Auth P1 security regressions', () => {
  const queryRawMock = prisma.$queryRaw as jest.Mock;
  const createResetTokenMock = prisma.passwordResetToken.create as jest.Mock;
  const sendPasswordResetMock = EmailService.sendPasswordReset as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef';
    process.env.APP_URL = 'https://erp.gladpros.com';
  });

  it('generates password reset links from APP_URL, not attacker-controlled Host headers', async () => {
    queryRawMock.mockResolvedValue([{ id: 1, email: 'admin@gladpros.com' }]);
    createResetTokenMock.mockResolvedValue({});

    const response = await forgotPasswordPOST(jsonRequest(
      '/api/auth/forgot-password',
      { email: 'admin@gladpros.com' },
      {
        host: 'attacker.test',
        'x-forwarded-host': 'attacker.test',
        'x-forwarded-proto': 'https',
      }
    ));

    expect(response.status).toBe(200);
    expect(sendPasswordResetMock).toHaveBeenCalledWith(expect.objectContaining({
      resetLink: expect.stringMatching(/^https:\/\/erp\.gladpros\.com\/reset-senha\//),
    }));
    expect(sendPasswordResetMock.mock.calls[0][0].resetLink).not.toContain('attacker.test');
  });

  it('does not leak blocked user identity or security question from user-status', async () => {
    queryRawMock.mockResolvedValue([{
      id: 99,
      email: 'admin@gladpros.com',
      nomeCompleto: 'Admin User',
      bloqueado: true,
      pinSeguranca: 'hashed-pin',
      perguntaSecreta: 'First pet?',
    }]);

    const response = await userStatusPOST(jsonRequest('/api/auth/user-status', {
      email: 'admin@gladpros.com',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      blocked: true,
      success: true,
      recovery: {
        requiresPinUnlock: true,
        requiresSecurityQuestion: true,
      },
    });
    expect(JSON.stringify(body)).not.toContain('admin@gladpros.com');
    expect(JSON.stringify(body)).not.toContain('First pet?');
  });

  it('rejects MFA resend without a signed challenge before querying user data', async () => {
    const response = await mfaResendPOST(jsonRequest('/api/auth/mfa/resend', {
      userId: 1,
      tipoAcao: 'LOGIN',
      challenge: 'invalid',
    }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it('does not accept refresh tokens from the JSON body fallback', async () => {
    const response = await refreshPOST(jsonRequest('/api/auth/refresh', {
      refreshToken: 'body-token',
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      error: 'REFRESH_TOKEN_REQUIRED',
      success: false,
    });
  });
});
