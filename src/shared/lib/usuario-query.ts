import { prisma } from "@/lib/prisma";

const COLUMN_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedColumns: Set<string> | null = null;
let cachedAt = 0;

async function loadUsuarioColumns() {
  const now = Date.now();
  if (cachedColumns && now - cachedAt < COLUMN_CACHE_TTL_MS) {
    return cachedColumns;
  }

  const rows = await prisma.$queryRaw<Array<{ COLUMN_NAME: string }>>`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Usuario'
  `;

  cachedColumns = new Set(rows.map((row) => String(row.COLUMN_NAME)));
  cachedAt = now;
  return cachedColumns;
}

/** Returns the cached set of column names available in the Usuario table. */
export async function getUsuarioColumns(): Promise<Set<string>> {
  return loadUsuarioColumns();
}

export async function buildUsuarioSelect(columns: string[]) {
  const availableColumns = await loadUsuarioColumns();
  const select = columns
    .filter((column) => availableColumns.has(column))
    .map((column) => `\`${column}\``)
    .join(", ");

  return select || "`id`";
}
