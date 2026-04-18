import { readFile } from "fs/promises";
import { join, resolve, sep } from "path";

function normalizeDocumentUrl(documentUrl: string): string | null {
  const trimmed = documentUrl.trim();
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

export class PortalCloseoutStorageService {
  async getFileBuffer(documentUrl: string): Promise<Buffer | null> {
    const normalizedPath = normalizeDocumentUrl(documentUrl);
    if (!normalizedPath) {
      return null;
    }

    const uploadsRoot = resolve(process.cwd(), "uploads");
    const resolvedPath = resolve(uploadsRoot, normalizedPath);
    const uploadsRootWithSep = uploadsRoot.endsWith(sep) ? uploadsRoot : `${uploadsRoot}${sep}`;

    if (resolvedPath !== uploadsRoot && !resolvedPath.startsWith(uploadsRootWithSep)) {
      return null;
    }

    try {
      return await readFile(join(uploadsRoot, normalizedPath));
    } catch {
      return null;
    }
  }
}
