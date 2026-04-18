import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const BASE = 'http://localhost:3000';
const EMAIL = 'gladiston.porto@gladpros.com';
const PASS = 'Smoke@Test123';

async function login() {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS })
  });
  const j = await r.json();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  await prisma.codigoMFA.deleteMany({ where: { usuarioId: Number(j.user.id), tipoAcao: 'LOGIN' } });
  await prisma.codigoMFA.create({
    data: { usuarioId: Number(j.user.id), codigo: hash, tipoAcao: 'LOGIN', expiresAt: new Date(Date.now() + 300000), usado: false }
  });
  const v = await fetch(`${BASE}/api/auth/mfa/verify`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: Number(j.user.id), usuarioId: Number(j.user.id), code, codigo: code, tipoAcao: 'LOGIN' })
  });
  return (await v.json()).token;
}

async function main() {
  const token = await login();
  
  // Test propostas with explicit params
  const res = await fetch(`${BASE}/api/propostas?page=1&pageSize=10`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text.substring(0, 500));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
