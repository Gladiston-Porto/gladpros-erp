// Simple development stubs for auth endpoints

export async function delay(ms = 300) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function loginStub(payload: { email: string; senha: string }) {
  await delay(300);
  if (payload.email === "fail@example.com") {
    return { ok: false, status: 400, error: "Credenciais inválidas" };
  }
  return { ok: true, status: 200, data: { token: "stub-jwt-token", user: { email: payload.email } } };
}

export async function forgotPasswordStub(_payload?: { email: string }) {
  await delay(200);
  // no-op use to avoid unused var warning in lint
  if (_payload?.email && process.env.NODE_ENV === 'test') {
    console.log('[stub] forgot password for', _payload.email);
  }
  return { ok: true, status: 200 };
}

export async function resetPasswordStub(payload: { token: string; senha: string }) {
  await delay(200);
  if (!payload.token) return { ok: false, status: 400, error: "Token inválido" };
  return { ok: true, status: 200 };
}
