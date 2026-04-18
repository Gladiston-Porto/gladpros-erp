/**
 * Password Policy Validator
 * 
 * Requisitos de Segurança (NIST 800-63B):
 * - Mínimo 8 caracteres
 * - Pelo menos 1 letra maiúscula
 * - Pelo menos 1 letra minúscula
 * - Pelo menos 1 número
 * - Pelo menos 1 caractere especial
 * - Não pode conter espaços
 * - Não pode ser senha comum (top 10k)
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'WEAK' | 'MEDIUM' | 'STRONG' | 'VERY_STRONG';
  score: number; // 0-100
}

const COMMON_PASSWORDS = [
  'password',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'monkey',
  '1234567',
  'letmein',
  'trustno1',
  'dragon',
  'baseball',
  '111111',
  'iloveyou',
  'master',
  'sunshine',
  'ashley',
  'bailey',
  'passw0rd',
  'shadow',
  '123123',
  '654321',
  'superman',
  'qazwsx',
  'michael',
  'football',
];

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // 1. Comprimento mínimo (8 caracteres)
  if (!password || password.length < 8) {
    errors.push('A senha deve ter no mínimo 8 caracteres');
  } else {
    score += 20;
    // Bônus por comprimento extra
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
  }

  // 2. Letra maiúscula
  if (!/[A-Z]/.test(password)) {
    errors.push('A senha deve conter pelo menos uma letra maiúscula');
  } else {
    score += 15;
  }

  // 3. Letra minúscula
  if (!/[a-z]/.test(password)) {
    errors.push('A senha deve conter pelo menos uma letra minúscula');
  } else {
    score += 15;
  }

  // 4. Número
  if (!/\d/.test(password)) {
    errors.push('A senha deve conter pelo menos um número');
  } else {
    score += 15;
  }

  // 5. Caractere especial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('A senha deve conter pelo menos um caractere especial (!@#$%^&*...)');
  } else {
    score += 15;
  }

  // 6. Sem espaços
  if (/\s/.test(password)) {
    errors.push('A senha não pode conter espaços');
    score -= 10;
  }

  // 7. Não pode ser senha comum
  const isCommon = COMMON_PASSWORDS.includes(password.toLowerCase());
  if (isCommon) {
    errors.push('Esta senha é muito comum e insegura');
    score = 0; // Senha comum = score zero
  }

  // 8. Bônus por diversidade de caracteres (só se não for comum)
  if (!isCommon) {
    const uniqueChars = new Set(password).size;
    if (uniqueChars > password.length * 0.6) {
      score += 10; // Muitos caracteres únicos
    }
  }

  // Normalizar score (máximo 100, mínimo 0)
  score = Math.min(100, Math.max(0, score));

  // Determinar força da senha
  let strength: PasswordValidationResult['strength'];
  if (score < 40) {
    strength = 'WEAK';
  } else if (score < 60) {
    strength = 'MEDIUM';
  } else if (score < 80) {
    strength = 'STRONG';
  } else {
    strength = 'VERY_STRONG';
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
    score,
  };
}

export function generateStrongPassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}';

  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  
  // Garantir pelo menos um de cada tipo
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Preencher o resto
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Embaralhar
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

export function checkPasswordSimilarity(
  newPassword: string,
  oldPassword: string
): boolean {
  // Senhas não podem ser muito similares (> 70% de similaridade)
  if (!newPassword || !oldPassword) return false;

  const longer = newPassword.length > oldPassword.length ? newPassword : oldPassword;
  const shorter = newPassword.length > oldPassword.length ? oldPassword : newPassword;

  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (shorter[i] === longer[i]) {
      matches++;
    }
  }

  const similarity = matches / longer.length;
  return similarity > 0.7; // Retorna true se muito similar (não permitir)
}
