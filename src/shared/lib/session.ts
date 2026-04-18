import { cookies } from "next/headers";
import { signAuthJWT, type Role } from "./jwt";
import { generateToken } from "./tokens";
import { prisma } from "@/lib/prisma";

type PendingPayload = { userId: number; email: string; stage: string; mustReset?: boolean };
type ResetPayload = { userId: number };
type SessionType = "PENDING" | "RESET";
type SessionEntry = { payload: PendingPayload | ResetPayload; expiresAt: number; type: SessionType };

const globalForSession = global as unknown as { __sessionStore?: Map<string, SessionEntry> };
if (!globalForSession.__sessionStore) globalForSession.__sessionStore = new Map();
const store = globalForSession.__sessionStore;

const COOKIE_OPTS = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: process.env.NODE_ENV === "production" };

function cleanupExpired() {
  const now = Date.now();
  for (const [k, v] of store.entries()) if (v.expiresAt < now) store.delete(k);
}

export async function setPendingSessionCookie(data: PendingPayload) {
  cleanupExpired();
  const token = generateToken(12);
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 min
  store.set(token, { payload: data, expiresAt, type: "PENDING" });
  const ck = await cookies();
  ck.set("pending_session", token, { ...COOKIE_OPTS, maxAge: 15 * 60 });
}

export async function getPendingSession() {
  cleanupExpired();
  const ck = await cookies();
  const c = ck.get("pending_session");
  if (!c) return null;
  const token = c.value;
  const entry = store.get(token);
  if (!entry || entry.type !== "PENDING") return null;
  return entry.payload as PendingPayload;
}

export async function clearPendingSessionCookie() {
  const ck = await cookies();
  const c = ck.get("pending_session");
  if (c) store.delete(c.value);
  ck.set("pending_session", "", { maxAge: 0, path: "/" });
}

export async function setResetSessionCookie(data: ResetPayload) {
  cleanupExpired();
  const token = generateToken(16);
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
  store.set(token, { payload: data, expiresAt, type: "RESET" });
  const ck = await cookies();
  ck.set("reset_session", token, { ...COOKIE_OPTS, maxAge: 60 * 60 });
}

export async function getResetSession() {
  cleanupExpired();
  const ck = await cookies();
  const c = ck.get("reset_session");
  if (!c) return null;
  const token = c.value;
  const entry = store.get(token);
  if (!entry || entry.type !== "RESET") return null;
  return entry.payload as ResetPayload;
}

export async function clearResetSessionCookie() {
  const ck = await cookies();
  const c = ck.get("reset_session");
  if (c) store.delete(c.value);
  ck.set("reset_session", "", { maxAge: 0, path: "/" });
}

export async function setFullSessionCookie(opts: { userId: number }) {
  // Buscar somente os campos necessários via SQL bruto para evitar schema desatualizado
  const rows: Array<{ nivel: string | null; status: string | null; email: string | null }> = await prisma.$queryRaw`
    SELECT nivel, status, email FROM Usuario WHERE id = ${opts.userId} LIMIT 1
  `;
  const user = rows[0];
  const role = ((user?.nivel ?? "USUARIO").toUpperCase() as Role);
  const status = ((user?.status ?? "ATIVO") as "ATIVO" | "INATIVO");
  const jwt = await signAuthJWT({ sub: String(opts.userId), role, email: user?.email ?? undefined, status }, "7d");
  // Note: include email if available would be ideal, but session.ts reads only nivel/status via SQL.
  const ck = await cookies();
  ck.set("session", jwt, { ...COOKIE_OPTS, maxAge: 60 * 60 * 24 * 7 });
}

export const sessionApi = {};
export default sessionApi;
