// src/shared/lib/prisma.ts
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

// Evita múltiplas instâncias em dev (HMR)
declare global {
  var __prisma: PrismaClient | undefined;
}

const databaseUrl = process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/gladpros_ci';
const adapter = new PrismaMariaDb(databaseUrl);

export const prisma =
  global.__prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;

// Graceful shutdown — desconecta o Prisma ao encerrar o processo
// Evita connection leaks em reinicializações do servidor
if (process.env.NODE_ENV === 'production') {
  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`[Prisma] Received ${signal}. Disconnecting...`);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

export default prisma;
