/**
 * Tests for src/lib/projetos/formatting.ts
 * Validates all locale-sensitive functions use en-US / America/Chicago
 */

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercentage,
  formatHours,
  formatFileSize,
  formatTags,
  getInitials,
  truncate,
  daysBetween,
} from '@/lib/projetos/formatting'

describe('formatCurrency', () => {
  it('formats USD with en-US locale', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })
  it('returns $0.00 for null', () => {
    expect(formatCurrency(null)).toBe('$0.00')
  })
  it('returns $0.00 for undefined', () => {
    expect(formatCurrency(undefined)).toBe('$0.00')
  })
  it('does NOT use comma as decimal separator (pt-BR would)', () => {
    const result = formatCurrency(1234.5)
    expect(result).not.toMatch(/\$1\.234,/)
    expect(result).toMatch(/\$1,234\./)
  })
})

describe('formatNumber', () => {
  it('uses comma as thousands separator (en-US)', () => {
    expect(formatNumber(1000)).toBe('1,000')
  })
  it('formats large number correctly', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
  })
  it('does NOT use period as thousands separator (pt-BR would produce 1.000)', () => {
    const result = formatNumber(1000)
    expect(result).not.toBe('1.000')
  })
  it('returns 0 for null', () => {
    expect(formatNumber(null)).toBe('0')
  })
})

describe('formatDate', () => {
  it('formats date in MM/DD/YYYY format (en-US)', () => {
    // 2026-01-15 in America/Chicago = January 15, 2026
    const result = formatDate('2026-01-15T12:00:00.000Z')
    expect(result).toMatch(/01\/15\/2026/)
  })
  it('returns - for null', () => {
    expect(formatDate(null)).toBe('-')
  })
  it('returns - for undefined', () => {
    expect(formatDate(undefined)).toBe('-')
  })
  it('does NOT use DD/MM/YYYY format (pt-BR would)', () => {
    // 2026-03-05 — if pt-BR: "05/03/2026", if en-US: "03/05/2026"
    const result = formatDate('2026-03-05T12:00:00.000Z')
    // en-US puts month first
    expect(result).toMatch(/^03\/05\/2026/)
  })
})

describe('formatDateTime', () => {
  it('formats date+time in en-US format', () => {
    const result = formatDateTime('2026-01-15T18:00:00.000Z')
    // Should contain month/day/year pattern (en-US MM/DD/YYYY)
    expect(result).toMatch(/01\/15\/2026/)
  })
  it('returns - for null', () => {
    expect(formatDateTime(null)).toBe('-')
  })
  it('applies America/Chicago timezone', () => {
    // 2026-01-16T04:00:00Z = 2026-01-15T22:00:00 Chicago (UTC-6 in winter)
    const result = formatDateTime('2026-01-16T04:00:00.000Z')
    // Should be Jan 15 in Chicago, not Jan 16
    expect(result).toMatch(/01\/15\/2026/)
  })
})

describe('formatPercentage', () => {
  it('formats with 2 decimal places by default', () => {
    expect(formatPercentage(75.5)).toBe('75.50%')
  })
  it('formats with custom decimals', () => {
    expect(formatPercentage(33.333, 0)).toBe('33%')
  })
  it('returns 0% for null', () => {
    expect(formatPercentage(null)).toBe('0%')
  })
})

describe('formatHours', () => {
  it('formats >= 1 hour with 1 decimal', () => {
    expect(formatHours(2.5)).toBe('2.5h')
  })
  it('formats < 1 hour as minutes', () => {
    expect(formatHours(0.5)).toBe('30min')
  })
  it('returns - for null', () => {
    expect(formatHours(null)).toBe('-')
  })
})

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
  })
  it('formats KB', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
  })
  it('formats MB', () => {
    expect(formatFileSize(1048576)).toBe('1 MB')
  })
})

describe('formatTags', () => {
  it('joins tags with comma', () => {
    expect(formatTags(['React', 'TypeScript'])).toBe('React, TypeScript')
  })
  it('returns - for empty array', () => {
    expect(formatTags([])).toBe('-')
  })
})

describe('getInitials', () => {
  it('returns first and last initial for full name', () => {
    expect(getInitials('John Smith')).toBe('JS')
  })
  it('returns first two chars for single name', () => {
    expect(getInitials('John')).toBe('JO')
  })
  it('returns ? for empty string', () => {
    expect(getInitials('')).toBe('?')
  })
})

describe('truncate', () => {
  it('returns original if within limit', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })
  it('truncates and appends ...', () => {
    expect(truncate('hello world', 5)).toBe('hello...')
  })
})

describe('daysBetween', () => {
  it('calculates positive difference', () => {
    expect(daysBetween('2026-01-01', '2026-01-11')).toBe(10)
  })
  it('returns negative for reversed dates', () => {
    expect(daysBetween('2026-01-11', '2026-01-01')).toBe(-10)
  })
})
