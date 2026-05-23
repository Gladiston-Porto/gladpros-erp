/**
 * Compatibility shim — re-exports the canonical Prisma singleton as `db`.
 * Previously had its own ExtendedPrismaClient; now unified to single pool.
 *
 * 11 files import { db } from '@/server/db-temp' — keeping this re-export
 * avoids touching all of them. Migrate callers to @/lib/prisma over time.
 */
import { prisma } from '@/shared/lib/prisma'; // nosemgrep: semgrep.gladpros.gladpros-prisma-import-canonical-path — legacy compat shim

export const db = prisma;

/**
 * Generate a proposal number (PROP-YYYYMMDD-NNN).
 * Standalone — no longer a class method.
 */
export function generatePropostaNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');

  return `PROP-${year}${month}${day}-${random}`;
}
