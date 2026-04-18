// File: packages/clients/src/services/usersApi.ts
import type { Usuario } from "../types/user";

const API = "/api/usuarios";

export type CreateUserInput = Partial<Usuario>;
export type UpdateUserInput = Partial<Usuario> & { id: number };

// Validações client-side para o serviço
const sanitizeInput = (input: string): string => {
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatePhone = (phone: string): boolean => {
  return /^\(\d{3}\)\d{3}-\d{4}$/.test(phone);
};

/** Constrói querystring ignorando valores vazios/undefined/null */
function buildQuery(params?: Record<string, string | number | boolean | null | undefined>) {
  const q = new URLSearchParams();
  if (!params) return "";

  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, String(v));
  });

  return q.toString();
}

/** Tenta parsear JSON; se falhar, retorna null */
async function safeJson(res: Response): Promise<unknown | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function createUser(input: CreateUserInput) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(error.error || `Erro ${res.status}`);
  }

  return res.json();
}

export async function updateUser(input: UpdateUserInput) {
  const { id, ...data } = input;
  const res = await fetch(`${API}/${id}`, {
    method: "PATCH", // Corrigido para PATCH
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(error.error || `Erro ${res.status}`);
  }

  return res.json();
}

export async function deleteUser(id: number) {
  const res = await fetch(`${API}/${id}`, {
    method: "DELETE"
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(error.error || `Erro ${res.status}`);
  }

  return res.json();
}

export async function getUser(id: number) {
  const res = await fetch(`${API}/${id}`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(error.error || `Erro ${res.status}`);
  }

  return res.json();
}

export interface ListUsersParams {
  q?: string;
  role?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sortKey?: "nome" | "email" | "role" | "ativo" | "criadoEm";
  sortDir?: "asc" | "desc";
}

export async function listUsers(params?: ListUsersParams) {
  const query = buildQuery(params as Record<string, string | number | boolean | null | undefined>);
  const url = query ? `${API}?${query}` : API;

  const res = await fetch(url);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(error.error || `Erro ${res.status}`);
  }

  return res.json();
}

/* =========================================================
   EXPORT/IMPORT SERVICES
========================================================= */

export interface ExportConfig {
  format: "csv" | "pdf" | "excel";
  filename?: string;
  users: Usuario[];
}

export async function exportUsers(config: ExportConfig) {
  const { format, ...payload } = config;
  const endpoint = format === "pdf" ? `${API}/export/pdf` : `${API}/export/${format}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await safeJson(res) as { error?: string } | null;
    throw new Error(error?.error || `Erro ${res.status}: ${res.statusText}`);
  }

  return res;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: Array<{ line: number; error: string }>;
}

export async function importUsers(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API}/import`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await safeJson(res) as { error?: string } | null;
    throw new Error(error?.error || `Erro ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

/* =========================================================
   BATCH OPERATIONS
========================================================= */

export interface BatchUpdateInput {
  ids: number[];
  data: Partial<Usuario>;
}

export interface BatchResult {
  success: boolean;
  updated: number;
  errors: Array<{ id: number; error: string }>;
}

export async function batchUpdateUsers(input: BatchUpdateInput): Promise<BatchResult> {
  const res = await fetch(`${API}/batch`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await safeJson(res) as { error?: string } | null;
    throw new Error(error?.error || `Erro ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export async function batchDeleteUsers(ids: number[]): Promise<BatchResult> {
  const res = await fetch(`${API}/batch`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });

  if (!res.ok) {
    const error = await safeJson(res) as { error?: string } | null;
    throw new Error(error?.error || `Erro ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

/* =========================================================
   VALIDATION FUNCTIONS
========================================================= */

export interface ValidationError {
  field: string;
  message: string;
}

export function validateUserInput(input: Partial<Usuario>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (input.email && !validateEmail(input.email)) {
    errors.push({ field: "email", message: "Email inválido" });
  }

  if (input.telefone && !validatePhone(input.telefone)) {
    errors.push({ field: "telefone", message: "Telefone deve estar no formato (XXX)XXX-XXXX" });
  }

  if (input.nomeCompleto && input.nomeCompleto.trim().length < 2) {
    errors.push({ field: "nomeCompleto", message: "Nome deve ter pelo menos 2 caracteres" });
  }

  return errors;
}

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

export const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
};