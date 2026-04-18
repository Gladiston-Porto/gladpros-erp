import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const BASE = 'http://localhost:3000';
const EMAIL = 'gladiston.porto@gladpros.com';
const PASS = 'Smoke@Test123';

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashCode = (c) => crypto.createHash("sha256").update(c).digest("hex");

async function login() {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS })
  });
  if (!r.ok) throw new Error('Login failed: ' + await r.text());
  const j = await r.json();
  const code = generateCode();
  await prisma.codigoMFA.deleteMany({ where: { usuarioId: Number(j.user.id), tipoAcao: "LOGIN" } });
  await prisma.codigoMFA.create({
    data: { usuarioId: Number(j.user.id), codigo: hashCode(code), tipoAcao: "LOGIN", expiresAt: new Date(Date.now() + 300000), usado: false }
  });
  const v = await fetch(`${BASE}/api/auth/mfa/verify`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: Number(j.user.id), usuarioId: Number(j.user.id), code, codigo: code, tipoAcao: "LOGIN" })
  });
  if (!v.ok) throw new Error('MFA verify failed: ' + await v.text());
  return (await v.json()).token;
}

async function testRoute(token, name, path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, {
    method: opts.method || 'GET',
    headers: { Authorization: 'Bearer ' + token, ...(opts.headers || {}) },
    ...(opts.body ? { body: opts.body } : {}),
  });
  const status = r.status;
  const ok = status >= 200 && status < 400;
  const emoji = ok ? '✅' : '❌';
  let detail = '';
  if (ok && opts.checkBody) {
    const text = await r.text();
    detail = ' — ' + text.substring(0, 120);
  }
  console.log(emoji + ' ' + name + ' [' + status + ']' + detail);
  return ok;
}

async function main() {
  console.log('🔑 Logging in...');
  const token = await login();
  console.log('✅ Got token\n');

  let pass = 0, fail = 0;
  const test = async (n, p, o) => { (await testRoute(token, n, p, o)) ? pass++ : fail++; };

  // Core API routes
  await test('Dashboard Executive',      '/api/dashboard/executive?period=30d', { checkBody: true });
  await test('Clientes list',            '/api/clientes');
  await test('Propostas list',           '/api/propostas');

  // Fase 4 routes
  await test('Webhooks (domain events)', '/api/webhooks');
  await test('Documents',                '/api/documents');
  await test('Documents categories',     '/api/documents/categories');
  await test('Backup stats',             '/api/backup');
  await test('Monitoring metrics',       '/api/monitoring/metrics');
  await test('Notifications WS (depr)',  '/api/notifications/ws');

  // Real notifications
  await test('Notifications',            '/api/notifications');

  // Invoices
  await test('Invoices list',            '/api/invoices');

  console.log('\n' + '='.repeat(40));
  console.log('Result: ' + pass + '/' + (pass + fail) + ' passed');
  if (fail > 0) console.log('⚠️  ' + fail + ' routes failed');
  else console.log('🎉 ALL ROUTES PASSED!');
}

main().catch(e => { console.error('❌ FATAL:', e); process.exit(1); }).finally(() => prisma.$disconnect());
