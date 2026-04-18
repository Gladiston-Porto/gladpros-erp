import DOMPurify from 'dompurify';

type DomWindow = Window & typeof globalThis;

function getDomWindow(): DomWindow {
  if (typeof window !== 'undefined' && window?.document) {
    return window as DomWindow;
  }

  // Carrega jsdom apenas em ambientes server-side para evitar parse de ESM durante testes.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { JSDOM } = require('jsdom');
  return new JSDOM('').window as DomWindow;
}

const domWindow = getDomWindow();
const DOMPurifyServer = DOMPurify(domWindow);

export function sanitizeHtml(input: string): string {
  return DOMPurifyServer.sanitize(input, {
    ALLOWED_TAGS: [], // Remover todas as tags HTML
    ALLOWED_ATTR: [],
  });
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  // Remover caracteres de controle e normalizar
  return input
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .trim()
    .slice(0, 10000); // Limitar tamanho
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function validatePhone(phone: string): boolean {
  // Aceitar formatos brasileiros comuns
  const phoneRegex = /^\+?55?\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;
  const cleanPhone = phone.replace(/\s/g, '').replace(/[()-]/g, '');
  return phoneRegex.test(phone.replace(/\s/g, '')) || /^\d{10,11}$/.test(cleanPhone);
}
