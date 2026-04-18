/**
 * Formatadores - Módulo Estoque
 * Funções para formatação de valores
 */

// ============================================================================
// FORMATAÇÃO DE MOEDA
// ============================================================================

/**
 * Formata valor para moeda brasileira (R$)
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata valor sem símbolo de moeda
 */
export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '0';

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// ============================================================================
// FORMATAÇÃO DE DATAS
// ============================================================================

/**
 * Formata data para formato brasileiro (DD/MM/YYYY)
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR').format(dateObj);
}

/**
 * Formata data com hora (DD/MM/YYYY HH:mm)
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(dateObj);
}

/**
 * Formata data para input date (YYYY-MM-DD)
 */
export function formatDateInput(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toISOString().split('T')[0];
}

/**
 * Formata período entre datas
 */
export function formatDateRange(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined
): string {
  const startFormatted = formatDate(start);
  const endFormatted = formatDate(end);

  if (startFormatted === '-' && endFormatted === '-') return '-';
  if (startFormatted === '-') return `até ${endFormatted}`;
  if (endFormatted === '-') return `desde ${startFormatted}`;

  return `${startFormatted} - ${endFormatted}`;
}

// ============================================================================
// FORMATAÇÃO DE QUANTIDADES
// ============================================================================

/**
 * Formata quantidade com unidade
 */
export function formatQuantity(
  value: number | null | undefined,
  unit: string | null | undefined
): string {
  if (value === null || value === undefined) return '0';

  const formattedValue = formatNumber(value, 2);
  const unitStr = unit || '';

  return unitStr ? `${formattedValue} ${unitStr}` : formattedValue;
}

/**
 * Formata percentual
 */
export function formatPercentage(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '0%';

  return `${formatNumber(value, decimals)}%`;
}

// ============================================================================
// FORMATAÇÃO DE TEXTO
// ============================================================================

/**
 * Trunca texto longo
 */
export function truncate(text: string | null | undefined, maxLength = 50): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;

  return `${text.substring(0, maxLength)}...`;
}

/**
 * Capitaliza primeira letra
 */
export function capitalize(text: string | null | undefined): string {
  if (!text) return '';

  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Formata CNPJ (00.000.000/0000-00)
 */
export function formatCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return '-';

  const cleaned = cnpj.replace(/\D/g, '');

  if (cleaned.length !== 14) return cnpj;

  return cleaned.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Formata CPF (000.000.000-00)
 */
export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return '-';

  const cleaned = cpf.replace(/\D/g, '');

  if (cleaned.length !== 11) return cpf;

  return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

/**
 * Formata telefone brasileiro
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';

  const cleaned = phone.replace(/\D/g, '');

  // Celular: (00) 00000-0000
  if (cleaned.length === 11) {
    return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }

  // Fixo: (00) 0000-0000
  if (cleaned.length === 10) {
    return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }

  return phone;
}

// ============================================================================
// FORMATAÇÃO DE STATUS/ENUMS
// ============================================================================

/**
 * Formata enum para texto legível
 */
export function formatEnum(value: string | null | undefined): string {
  if (!value) return '-';

  return value
    .split('_')
    .map((word) => capitalize(word))
    .join(' ');
}

// ============================================================================
// FORMATAÇÃO DE TEMPO
// ============================================================================

/**
 * Calcula diferença de dias entre datas
 */
export function daysBetween(
  start: Date | string,
  end: Date | string = new Date()
): number {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Formata tempo relativo (há X dias)
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '-';

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `Há ${Math.floor(diffDays / 30)} meses`;

  return `Há ${Math.floor(diffDays / 365)} anos`;
}

// ============================================================================
// FORMATAÇÃO DE ARQUIVOS
// ============================================================================

/**
 * Formata tamanho de arquivo
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ============================================================================
// FORMATAÇÃO DE CÓDIGOS
// ============================================================================

/**
 * Gera código padronizado (ex: MAT-0001, EQP-0001)
 */
export function generateCode(prefix: string, number: number, digits = 4): string {
  return `${prefix}-${String(number).padStart(digits, '0')}`;
}

/**
 * Extrai número do código (MAT-0001 -> 1)
 */
export function extractCodeNumber(code: string): number | null {
  const match = code.match(/\d+$/);
  return match ? parseInt(match[0], 10) : null;
}
