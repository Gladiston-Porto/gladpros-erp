// src/lib/passwords.ts
import crypto from 'crypto';

export function generateTempPassword(length = 12) {
  // 12-16 chars com letras maiúsculas/minúsculas e dígitos
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const maxUnbiased = Math.floor(256 / alphabet.length) * alphabet.length;
  let out = '';
  while (out.length < length) {
    const bytes = crypto.randomBytes(length);
    for (const byte of bytes) {
      if (byte >= maxUnbiased) continue;
      let index = byte;
      while (index >= alphabet.length) index -= alphabet.length;
      out += alphabet[index];
      if (out.length === length) break;
    }
  }
  return out;
}
