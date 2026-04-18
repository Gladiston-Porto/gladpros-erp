/**
 * Security Headers - Correção VUL-009
 * Adiciona headers de segurança para proteger contra XSS, clickjacking, etc.
 * Implementa CSP com nonce para eliminar unsafe-inline em scripts (F4.6).
 */

import { NextResponse } from 'next/server';

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: string;
  strictTransportSecurity?: boolean;
  xFrameOptions?: 'DENY' | 'SAMEORIGIN';
  xContentTypeOptions?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: string;
}

/**
 * Gera CSP com nonce para produção.
 * - 'strict-dynamic' permite scripts carregados por scripts com nonce (faz Next.js funcionar)
 * - 'unsafe-inline' é automaticamente ignorado por browsers modernos quando nonce está presente
 *   mas mantido como fallback para browsers antigos
 * - 'unsafe-eval' REMOVIDO em produção
 */
function buildCspWithNonce(nonce: string): string {
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https: https://vercel.live;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https: blob:;
    font-src 'self' data:;
    connect-src 'self' https://vercel.live ws: wss:;
    frame-ancestors 'self';
    base-uri 'self';
    form-action 'self';
  `.replace(/\s{2,}/g, ' ').trim();
}

/**
 * CSP sem nonce (fallback quando nonce não disponível).
 * Menos seguro — mantém unsafe-inline.
 */
function buildCspFallback(): string {
  return `
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://vercel.live;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https: blob:;
    font-src 'self' data:;
    connect-src 'self' https://vercel.live ws: wss:;
    frame-ancestors 'self';
    base-uri 'self';
    form-action 'self';
  `.replace(/\s{2,}/g, ' ').trim();
}

const DEFAULT_CONFIG: Required<SecurityHeadersConfig> = {
  contentSecurityPolicy: buildCspFallback(),
  
  strictTransportSecurity: true,
  xFrameOptions: 'DENY',
  xContentTypeOptions: true,
  
  referrerPolicy: 'strict-origin-when-cross-origin',
  
  permissionsPolicy: 'geolocation=(), microphone=(), camera=()',
};

/**
 * Aplica headers de segurança na response.
 * @param nonce - Nonce criptográfico para CSP (gerado no middleware)
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = {},
  nonce?: string
): NextResponse {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Se nonce fornecido, usar CSP com nonce (sobrescreve o default)
  if (nonce) {
    finalConfig.contentSecurityPolicy = buildCspWithNonce(nonce);
  }

  // Content Security Policy
  if (finalConfig.contentSecurityPolicy) {
    response.headers.set(
      'Content-Security-Policy',
      finalConfig.contentSecurityPolicy
    );
  }

  // HTTP Strict Transport Security
  if (finalConfig.strictTransportSecurity) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  // X-Frame-Options (proteção contra clickjacking)
  if (finalConfig.xFrameOptions) {
    response.headers.set('X-Frame-Options', finalConfig.xFrameOptions);
  }

  // X-Content-Type-Options (previne MIME sniffing)
  if (finalConfig.xContentTypeOptions) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
  }

  // Referrer Policy
  if (finalConfig.referrerPolicy) {
    response.headers.set('Referrer-Policy', finalConfig.referrerPolicy);
  }

  // Permissions Policy
  if (finalConfig.permissionsPolicy) {
    response.headers.set('Permissions-Policy', finalConfig.permissionsPolicy);
  }

  // Additional security headers
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  return response;
}

/**
 * Headers de segurança para desenvolvimento.
 * Mantém 'unsafe-eval' necessário para HMR/hot-reload do Next.js.
 */
export function getDevSecurityHeaders(): SecurityHeadersConfig {
  return {
    ...DEFAULT_CONFIG,
    contentSecurityPolicy: `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https: blob:;
      font-src 'self' data:;
      connect-src 'self' ws: wss: http://localhost:*;
      frame-ancestors 'self';
    `.replace(/\s{2,}/g, ' ').trim(),
    strictTransportSecurity: false, // Desabilitar em dev (não usa HTTPS)
  };
}

/**
 * Headers de segurança para produção.
 * CSP real será construído com nonce no middleware via applySecurityHeaders(response, config, nonce).
 */
export function getProdSecurityHeaders(): SecurityHeadersConfig {
  return DEFAULT_CONFIG;
}
