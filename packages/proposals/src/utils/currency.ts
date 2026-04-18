/**
 * Format currency value with proper locale
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(value)
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and formatting
  const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    BRL: 'R$',
    USD: '$',
    EUR: '€',
    GBP: '£'
  }

  return symbols[currency] || currency
}