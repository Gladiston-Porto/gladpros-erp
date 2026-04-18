import { readFile } from "fs/promises";
import { join, resolve, sep } from "path";

function normalizeStorageKey(storageKey: string): string | null {
  const trimmed = storageKey.trim();
  if (!trimmed) {
    return null;
  }

  const withoutApiPrefix = trimmed.startsWith("/api/uploads/")
    ? trimmed.slice("/api/uploads/".length)
    : trimmed;

  const normalized = withoutApiPrefix.replace(/\\+/g, "/").replace(/^\/+/, "");
  if (!normalized) {
    return null;
  }

  if (normalized.split("/").some((segment) => segment === "..")) {
    return null;
  }

  return normalized;
}

export class PortalInvoicePdfStorageService {
  async getPdfBufferByStorageKey(storageKey: string): Promise<Buffer | null> {
    const normalizedStorageKey = normalizeStorageKey(storageKey);
    if (!normalizedStorageKey) {
      return null;
    }

    const uploadsRoot = resolve(process.cwd(), "uploads");
    const resolvedPath = resolve(uploadsRoot, normalizedStorageKey);
    const uploadsRootWithSep = uploadsRoot.endsWith(sep) ? uploadsRoot : `${uploadsRoot}${sep}`;

    if (resolvedPath !== uploadsRoot && !resolvedPath.startsWith(uploadsRootWithSep)) {
      return null;
    }

    try {
      return await readFile(join(uploadsRoot, normalizedStorageKey));
    } catch {
      return null;
    }
  }
}
