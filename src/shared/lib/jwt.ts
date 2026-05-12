import { SignJWT, jwtVerify, JWTPayload } from "jose"

function getSecret() {
  const secretRaw = process.env.JWT_SECRET
  if (!secretRaw) throw new Error("Missing JWT_SECRET")
  if (secretRaw.length < 32) throw new Error("JWT_SECRET must be at least 32 characters")
  if (process.env.DEBUG_AUTH === '1') {
     
    // eslint-disable-next-line no-console
    console.log(`[JWT] Initialized with secret length: ${secretRaw.length}`)
  }
  return new TextEncoder().encode(secretRaw)
}

export type Role = "ADMIN" | "GERENTE" | "USUARIO" | "FINANCEIRO" | "ESTOQUE" | "CLIENTE"
export type AuthClaims = JWTPayload & { sub: string; role: Role; email?: string; status?: "ATIVO" | "INATIVO"; tokenVersion?: number }

export async function signAuthJWT(payload: { sub: string; role: Role; email?: string; status?: "ATIVO" | "INATIVO"; tokenVersion?: number }, exp = "7d") {
  const secret = getSecret()
  // include email in the JWT body if provided so middleware can read it without extra DB lookups
  const body: Record<string, unknown> = { role: payload.role, status: payload.status, tokenVersion: payload.tokenVersion };
  if (payload.email) body.email = payload.email;
  
   
  if (process.env.DEBUG_AUTH === '1' && process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`[JWT] Signing token for sub=${payload.sub}`)
  }

  return await new SignJWT(body)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuer("gladpros")
    .setAudience("gladpros-app")
    .setExpirationTime(exp)
    .sign(secret)
}

export async function verifyAuthJWT(token: string) {
  const secret = getSecret()
  const { payload } = await jwtVerify(token, secret, { issuer: "gladpros", audience: "gladpros-app" })
  return payload as AuthClaims
}