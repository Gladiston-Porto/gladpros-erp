/**
 * Client-safe helper functions for cliente operations
 * These functions don't use server-only crypto operations
 */

export function formatTelefone(telefone: string): string {
  if (!telefone) return '';

  // Remove all non-digits
  const digits = telefone.replace(/\D/g, '');

  // American phone format (XXX)XXX-XXXX
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // Handle +1 prefix
    const phoneDigits = digits.slice(1);
    return `(${phoneDigits.slice(0, 3)})${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`;
  }

  return telefone;
}

export function formatZipcode(zipcode: string): string {
  if (!zipcode) return '';

  // Remove all non-digits
  const digits = zipcode.replace(/\D/g, '');

  // Brazilian CEP format: 99999-999
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  return zipcode;
}

export function maskDocumento(documento: string, tipo: 'PF' | 'PJ'): string {
  if (!documento) return '';

  const digits = documento.replace(/\D/g, '');

  if (tipo === 'PF') {
    // CPF: 999.999.999-99
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }
  } else if (tipo === 'PJ') {
    // CNPJ: 99.999.999/9999-99
    if (digits.length === 14) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    }
  }

  return documento;
}
