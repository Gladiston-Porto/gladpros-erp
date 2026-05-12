/**
 * Input Sanitization - Correção VUL-006
 * Protege contra XSS sanitizando inputs do usuário
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Lista de campos sensíveis que nunca devem ser logados
 */
export const SENSITIVE_FIELDS = [
  'senha',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'cpf',
  'documento',
  'cartaoCredito',
  'cvv',
  'mfaCode',
  'codigoVerificacao',
];

/**
 * Sanitiza string removendo HTML/scripts maliciosos
 */
export function sanitizeHtml(input: string, allowedTags: string[] = []): string {
  if (typeof input !== 'string') return '';

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitiza string removendo TODOS os HTML tags
 */
export function sanitizeText(input: string): string {
  return sanitizeHtml(input, []);
}

/**
 * Sanitiza objeto recursivamente
 */
 
 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sanitized: any = {};

  for (const key in obj) {
    const value = obj[key];

    if (typeof value === 'string') {
       
      sanitized[key] = sanitizeText(value);
    } else if (Array.isArray(value)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sanitized[key] = value.map((item: any) =>
        typeof item === 'object' ? sanitizeObject(item) : sanitizeText(String(item))
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Escapa HTML para exibição segura
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'\/]/g, (char) => map[char]);
}

 
 
/**
 * Redacta dados sensíveis de objetos (para logs)
 */
 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function redactSensitiveData(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

 

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const redacted: any = {};

  for (const key in obj) {
    const lowerKey = key.toLowerCase();
    
    // Verificar se é campo sensível
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      redacted[key] = '***REDACTED***';
    } else if (typeof obj[key] === 'object') {
      redacted[key] = redactSensitiveData(obj[key]);
    } else {
      redacted[key] = obj[key];
    }
  }

  return redacted;
}

/**
 * Valida se string contém apenas caracteres seguros
 */
export function isSafeString(input: string, pattern: RegExp = /^[a-zA-Z0-9\s\-_.,!?@#$%&*()+='":;\/\[\]{}]+$/): boolean {
  return pattern.test(input);
}

/**
 * Remove caracteres perigosos de nomes de arquivo
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

/**
 * Sanitiza URL removendo javascript: e data:
 */
export function sanitizeUrl(url: string): string {
  const cleaned = url.trim().toLowerCase();
  
  // Bloquear protocolos perigosos
  if (
    cleaned.startsWith('javascript:') ||
    cleaned.startsWith('data:') ||
    cleaned.startsWith('vbscript:')
  ) {
    return '';
  }

  return url;
}

/**
 * Sanitiza SQL (proteção adicional, use Prisma!)
 */
export function sanitizeSql(input: string): string {
  // Remove caracteres perigosos para SQL injection
  return input
    .replace(/['";\\]/g, '')
    .replace(/(--)|(\/\*)|(\*\/)/g, '');
}

/**
 * Valida e sanitiza email
 */
export function sanitizeEmail(email: string): string {
  const sanitized = email.trim().toLowerCase();
  
  // Validação básica de email
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(sanitized)) {
    throw new Error('Email inválido');
  }

  return sanitized;
}

/**
 * Sanitiza número de telefone
 */
export function sanitizePhone(phone: string): string {
  // Remove tudo exceto números
  return phone.replace(/\D/g, '');
}

/**
 * Sanitiza CPF/CNPJ
 */
export function sanitizeDocumento(documento: string): string {
  // Remove tudo exceto números
   
  return documento.replace(/\D/g, '');
}

/**
 * Middleware de sanitização para APIs
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeRequestBody<T extends Record<string, any>>(body: T): T {
  return sanitizeObject(body);
}
