/**
 * Seed determinístico para testes E2E do módulo Usuários.
 *
 * Cria 7 usuários (1 por role + 1 ADMIN extra para dead-man tests) de forma
 * idempotente.  IDs coincidem com mockUsers do auth.ts (1–5) + 6 (CLIENTE) + 7
 * (ADMIN extra).  Usa $executeRawUnsafe para não depender do Prisma Client
 * model estar em sync.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Read DATABASE_URL from .env.local (valid dev:dev123 credentials) without
// overriding other env vars (JWT_SECRET must stay as set by Playwright config).
function loadDatabaseUrl(): string | undefined {
  for (const name of ['.env.local', '.env']) {
    const p = path.resolve(process.cwd(), name);
    if (fs.existsSync(p)) {
      const parsed = dotenv.parse(fs.readFileSync(p));
      if (parsed.DATABASE_URL) return parsed.DATABASE_URL;
    }
  }
  return undefined;
}

const dbUrl = loadDatabaseUrl();
const prisma = dbUrl
  ? new PrismaClient({ datasources: { db: { url: dbUrl } } })
  : new PrismaClient();

export interface SeedUser {
  id: number;
  email: string;
  nomeCompleto: string;
  nivel: string;
  status: 'ATIVO' | 'INATIVO';
  senha: string;
}

const DEFAULT_PASSWORD = 'TestSenha123!';

export const seedUsers: SeedUser[] = [
  { id: 1, email: 'admin@test.com', nomeCompleto: 'Admin Test', nivel: 'ADMIN', status: 'ATIVO', senha: DEFAULT_PASSWORD },
  { id: 2, email: 'gerente@test.com', nomeCompleto: 'Gerente Test', nivel: 'GERENTE', status: 'ATIVO', senha: DEFAULT_PASSWORD },
  { id: 3, email: 'usuario@test.com', nomeCompleto: 'Usuario Test', nivel: 'USUARIO', status: 'ATIVO', senha: DEFAULT_PASSWORD },
  { id: 4, email: 'estoque@test.com', nomeCompleto: 'Estoque Test', nivel: 'ESTOQUE', status: 'ATIVO', senha: DEFAULT_PASSWORD },
  { id: 5, email: 'financeiro@test.com', nomeCompleto: 'Financeiro Test', nivel: 'FINANCEIRO', status: 'ATIVO', senha: DEFAULT_PASSWORD },
  { id: 6, email: 'cliente@test.com', nomeCompleto: 'Cliente Test', nivel: 'CLIENTE', status: 'ATIVO', senha: DEFAULT_PASSWORD },
  { id: 7, email: 'admin2@test.com', nomeCompleto: 'Admin Extra Test', nivel: 'ADMIN', status: 'ATIVO', senha: DEFAULT_PASSWORD },
];

export async function seedUsuarios(): Promise<void> {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 4);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // Clear conflicting emails first (a different row may own the email)
  const emails = seedUsers.map(u => u.email);
  const ids = seedUsers.map(u => u.id);
  const emailPh = emails.map(() => '?').join(',');
  const idPh = ids.map(() => '?').join(',');
  await prisma.$executeRawUnsafe(
    `DELETE FROM Usuario WHERE email IN (${emailPh}) AND id NOT IN (${idPh})`,
    ...emails, ...ids
  );

  for (const u of seedUsers) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO Usuario (id, email, senha, nivel, status, nomeCompleto, endereco1, endereco2, cidade, criadoEm, atualizadoEm, tokenVersion)
       VALUES (?, ?, ?, ?, ?, ?, '', '', '', ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         email = VALUES(email),
         senha = VALUES(senha),
         nivel = VALUES(nivel),
         status = VALUES(status),
         nomeCompleto = VALUES(nomeCompleto),
         tokenVersion = 1,
         atualizadoEm = VALUES(atualizadoEm)`,
      u.id, u.email, hash, u.nivel, u.status, u.nomeCompleto, now, now
    );
  }
}

export async function cleanupUsuarios(): Promise<void> {
  const ids = seedUsers.map(u => u.id);
  const placeholders = ids.map(() => '?').join(',');

  await prisma.$executeRawUnsafe(`DELETE FROM Auditoria WHERE registroId IN (${placeholders}) AND tabela = 'Usuario'`, ...ids);
  await prisma.$executeRawUnsafe(`DELETE FROM Auditoria WHERE usuarioId IN (${placeholders})`, ...ids);
  await prisma.$executeRawUnsafe(`DELETE FROM SessaoAtiva WHERE usuarioId IN (${placeholders})`, ...ids);

  // Delete users created by tests (emails ending in @e2e-test.com)
  await prisma.$executeRawUnsafe(`DELETE FROM Usuario WHERE email LIKE '%@e2e-test.com'`);

  // Reset seed users to pristine state
  await seedUsuarios();
}

async function cleanDependentRows(ids: number[]): Promise<void> {
  const ph = ids.map(() => '?').join(',');
  const fkTables = [
    'AuditLog',
    'Auditoria',
    'SessaoAtiva',
    'CodigoMFA',
    'HistoricoSenha',
    'PasswordResetToken',
    'TentativaLogin',
    'RefreshToken',
  ];
  for (const table of fkTables) {
    try {
      const col = table === 'AuditLog' ? 'userId' : 'usuarioId';
      await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\` WHERE \`${col}\` IN (${ph})`, ...ids);
    } catch {
      // table might not exist — skip
    }
  }
  // Auditoria by registroId
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM Auditoria WHERE registroId IN (${ph}) AND tabela = 'Usuario'`, ...ids);
  } catch { /* skip */ }
}

export async function teardownUsuarios(): Promise<void> {
  await cleanupUsuarios();
}

export { prisma as seedPrisma };
