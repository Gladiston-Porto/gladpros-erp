// src/lib/passwords.ts
import crypto from "crypto";

export function generateTempPassword(length = 12) {
  // 12-16 chars com letras maiúsculas/minúsculas e dígitos
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
