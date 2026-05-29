import { SignJWT, jwtVerify, JWTPayload } from 'jose';

function getSecret() {
  const secretRaw = process.env.JWT_SECRET;
  if (!secretRaw) throw new Error('Missing JWT_SECRET');
  if (secretRaw.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  return new TextEncoder().encode(secretRaw);
}

export type Role = 'ADMIN' | 'GERENTE' | 'USUARIO' | 'FINANCEIRO' | 'ESTOQUE' | 'CLIENTE';
export type AuthClaims = JWTPayload & {
  sub: string;
  role: Role;
  email?: string;
  status?: 'ATIVO' | 'INATIVO';
  tokenVersion?: number;
  sessionId?: number;
};

export async function signAuthJWT(
  payload: {
    sub: string;
    role: Role;
    email?: string;
    status?: 'ATIVO' | 'INATIVO';
    tokenVersion?: number;
    sessionId?: number;
  },
  exp = '7d',
) {
  const secret = getSecret();
  // include email in the JWT body if provided so middleware can read it without extra DB lookups
  const body: Record<string, unknown> = {
    role: payload.role,
    status: payload.status,
    tokenVersion: payload.tokenVersion,
  };
  if (payload.email) body.email = payload.email;
  if (typeof payload.sessionId === 'number') body.sessionId = payload.sessionId;

  return await new SignJWT(body)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuer('gladpros')
    .setAudience('gladpros-app')
    .setExpirationTime(exp)
    .sign(secret);
}

export async function verifyAuthJWT(token: string) {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret, {
    issuer: 'gladpros',
    audience: 'gladpros-app',
  });
  return payload as AuthClaims;
}

// ── First-access magic link ──────────────────────────────────────────────────

export async function signFirstAccessJWT(userId: number, email: string) {
  const secret = getSecret();
  return await new SignJWT({ email, purpose: 'first-access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuer('gladpros')
    .setAudience('gladpros-first-access')
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(secret);
}

export async function verifyFirstAccessJWT(
  token: string,
): Promise<{ userId: number; email: string }> {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret, {
    issuer: 'gladpros',
    audience: 'gladpros-first-access',
  });
  if (payload.purpose !== 'first-access') throw new Error('Token inválido: purpose incorreto');
  return { userId: Number(payload.sub), email: payload.email as string };
}
