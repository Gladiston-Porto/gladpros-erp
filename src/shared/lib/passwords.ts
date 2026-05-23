// src/lib/passwords.ts
import crypto from "crypto";

function generateUnbiasedRandomString(length: number, alphabet: string) {
  const maxUnbiased = 256 - (256 % alphabet.length);
  let out = "";

  while (out.length < length) {
    const bytes = crypto.randomBytes(length);
    for (const byte of bytes) {
      if (byte >= maxUnbiased) continue;
      out += alphabet[byte % alphabet.length];
      if (out.length === length) break;
    }
  }

  return out;
}

export function generateTempPassword(length = 12) {
  // 12-16 chars com letras maiúsculas/minúsculas e dígitos
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return generateUnbiasedRandomString(length, alphabet);
}
