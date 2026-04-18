#!/usr/bin/env node
/**
 * Auto login + MFA verification test script
 * - uses the local dev server at http://localhost:3000
 * - measures timings for login, fetch MFA, verify MFA
 */
import fetch from 'node-fetch';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const email = process.env.TEST_EMAIL || 'gladiston.porto@gladpros.com';
const password = process.env.TEST_PASS || 'Smoke@Test123';

function now() { return Date.now(); }

async function main() {
  console.log('Starting auto-login MFA test against', BASE);

  const t0 = now();
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const t1 = now();
  const loginText = await loginRes.text();
  let loginJson;
  try { loginJson = JSON.parse(loginText); } catch(e){ loginJson = { raw: loginText }; }
  console.log('Login status:', loginRes.status, 'time_ms=', t1-t0);
  console.log('Login response:', loginJson);

  if (!loginRes.ok) {
    console.error('Login failed, aborting');
    process.exit(1);
  }

  if (!loginJson.mfaRequired) {
    console.log('MFA not required; test finished.');
    process.exit(0);
  }

  // wait briefly for helper to receive email
  await new Promise(r => setTimeout(r, 800));

  const t2 = now();
  const helper = await fetch(`${BASE}/api/test-helpers/get-last-mfa`);
  const t3 = now();
  const helperJson = await helper.json().catch(()=>({ ok: false }));
  console.log('Get-last-mfa status:', helper.status, 'time_ms=', t3-t2);
  console.log('MFA helper payload:', helperJson);

  const code = helperJson?.mfa?.code;
  if (!code) {
    console.error('No MFA code found from test helper');
    process.exit(1);
  }

  // verify MFA
  const t4 = now();
  const verify = await fetch(`${BASE}/api/auth/mfa/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId: loginJson.userId || loginJson.user?.id, code, tipoAcao: 'LOGIN' })
  });
  const t5 = now();
  const verifyJson = await verify.json().catch(()=>({ raw: 'non-json' }));
  console.log('Verify status:', verify.status, 'time_ms=', t5-t4);
  console.log('Verify response:', verifyJson);

  console.log('\nTimings (ms): login=', t1-t0, 'get-mfa=', t3-t2, 'verify=', t5-t4);
  if (!verify.ok) process.exit(1);
}

main().catch(e=>{ console.error(e); process.exit(1); });
