// src/lib/db-metadata.ts
import { prisma } from "@/lib/prisma";

// Permanent in-memory cache — the column only changes after a migration + server restart
let hasTokenVersionCache: boolean | null = null;

/**
 * Checks if the Usuario.tokenVersion column exists in the current database.
 * Caches the result permanently per server process — the column only changes
 * after a Prisma migration and a server restart, so re-querying INFORMATION_SCHEMA
 * every 60s is unnecessary overhead.
 */
export async function hasTokenVersionColumn(): Promise<boolean> {
  // Fast path: set TOKEN_VERSION_COLUMN_EXISTS=1 in .env.local once the tokenVersion
  // migration is confirmed deployed — skips INFORMATION_SCHEMA on every cold boot / HMR.
  if (process.env.TOKEN_VERSION_COLUMN_EXISTS === '1') {
    return true;
  }
  // Permanent cache: INFORMATION_SCHEMA queries are slow on shared MySQL hosts.
  // The result only changes after a DB migration + server restart anyway.
  if (hasTokenVersionCache !== null) {
    return hasTokenVersionCache;
  }
  try {
    const rows = await prisma.$queryRaw<Array<{ cnt: number }>>`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Usuario'
        AND COLUMN_NAME = 'tokenVersion'
    `;
    hasTokenVersionCache = (rows?.[0]?.cnt ?? 0) > 0;
    return hasTokenVersionCache;
  } catch {
    // If we cannot determine, assume it doesn't exist to avoid further errors
    hasTokenVersionCache = false;
    return false;
  }
}

/**
 * Allows tests or admin endpoints to refresh the cache after a migration.
 */
export function __resetDbMetadataCache() {
  hasTokenVersionCache = null;
}
