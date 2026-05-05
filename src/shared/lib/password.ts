import bcrypt from "bcryptjs";
import crypto from "crypto";

export class PasswordService {
  // Critérios: mínimo 9 chars, 1 maiúscula, 1 número, 1 símbolo
  static validatePassword(password: string): { valid: boolean; errors: string[] } {
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
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
  
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  static generateProvisionalPassword(): string {
    // Gera senha provisória que atende aos critérios (criptograficamente segura)
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnpqrstuvwxyz";
    const digits = "23456789";
    const symbols = "!@#$%&*";
    const chars = upper + lower + digits;
    
    let password = "";
    
    // Garantir pelo menos 1 maiúscula
    password += upper[crypto.randomInt(upper.length)];
    
    // Garantir pelo menos 1 minúscula
    password += lower[crypto.randomInt(lower.length)];
    
    // Garantir pelo menos 1 número
    password += digits[crypto.randomInt(digits.length)];
    
    // Garantir pelo menos 1 símbolo
    password += symbols[crypto.randomInt(symbols.length)];
    
    // Completar com mais 5 caracteres aleatórios (total = 9, mínimo do PasswordService)
    for (let i = 0; i < 5; i++) {
      password += chars[crypto.randomInt(chars.length)];
    }
    
    // Embaralhar usando Fisher-Yates com crypto
    const arr = password.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
  }
  
  static getPasswordStrength(password: string): { 
    score: number; 
    label: string; 
    color: string;
    criteriaMet: string[];
  } {
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
    
    // Determinar label e cor
    let label = "Muito fraca";
    let color = "#ef4444"; // red-500
    
    if (score >= 90) {
      label = "Muito forte";
      color = "#22c55e"; // green-500
    } else if (score >= 70) {
      label = "Forte";
      color = "#84cc16"; // lime-500
    } else if (score >= 50) {
      label = "Moderada";
      color = "#eab308"; // yellow-500
    } else if (score >= 30) {
      label = "Fraca";
      color = "#f97316"; // orange-500
    }
    
    return { score, label, color, criteriaMet };
  }
}
