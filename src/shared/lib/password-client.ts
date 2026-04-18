/**
 * password-client.ts — funções de validação de senha seguras para uso no client-side.
 *
 * Não importa bcrypt nem Node.js crypto — pode ser bundled pelo browser sem quebrar.
 * Para hashing e verificação de senha, use PasswordService de @/shared/lib/password (server-only).
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PasswordStrengthResult {
  score: number;
  label: string;
  color: string;
  criteriaMet: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 9) {
    errors.push("Senha deve ter no mínimo 9 caracteres");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Senha deve conter pelo menos 1 letra maiúscula");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Senha deve conter pelo menos 1 número");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Senha deve conter pelo menos 1 símbolo especial");
  }

  return { valid: errors.length === 0, errors };
}

export function getPasswordStrength(password: string): PasswordStrengthResult {
  let score = 0;
  const criteriaMet: string[] = [];

  if (password.length >= 9) {
    score += 20;
    criteriaMet.push("Mínimo 9 caracteres");
  }

  if (/[A-Z]/.test(password)) {
    score += 20;
    criteriaMet.push("Letra maiúscula");
  }

  if (/[a-z]/.test(password)) {
    score += 10;
    criteriaMet.push("Letra minúscula");
  }

  if (/[0-9]/.test(password)) {
    score += 20;
    criteriaMet.push("Número");
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 20;
    criteriaMet.push("Símbolo especial");
  }

  if (password.length >= 12) {
    score += 10;
    criteriaMet.push("Senha longa (12+ caracteres)");
  }

  let label = "Muito fraca";
  let color = "#ef4444";

  if (score >= 90) {
    label = "Muito forte";
    color = "#22c55e";
  } else if (score >= 70) {
    label = "Forte";
    color = "#84cc16";
  } else if (score >= 50) {
    label = "Moderada";
    color = "#eab308";
  } else if (score >= 30) {
    label = "Fraca";
    color = "#f97316";
  }

  return { score, label, color, criteriaMet };
}
