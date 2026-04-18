/**
 * Utilities and Edge Cases Tests
 * Helper functions, boundary testing, edge cases
 */

import { describe, it, expect } from '@jest/globals';

// Utility Functions
class UtilityFunctions {
  static formatCurrency(value: number, currency = 'BRL'): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(value);
  }

  static parsePhoneNumber(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  static isValidCPF(cpf: string): boolean {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;

    // Reject all same digits
    if (/^(\d)\1{10}$/.test(digits)) return false;

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(digits.substring(i - 1, i)) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(digits.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(digits.substring(i - 1, i)) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(digits.substring(10, 11))) return false;

    return true;
  }

  static calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  static truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }

  static capitalizeWords(str: string): string {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  static generateUUID(): string {
    return `${Math.random().toString(36).substr(2, 9)}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  static arrayChunk(arr: unknown[], size: number): unknown[][] {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  static mergeObjects<T extends Record<string, unknown>>(
    obj1: T,
    obj2: T
  ): T {
    return { ...obj1, ...obj2 };
  }

  static filterUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const result: Partial<T> = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        result[key] = obj[key];
      }
    }
    return result;
  }

  static delayAsync(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 100
  ): Promise<T> {
    return fn().catch(err => {
      if (maxAttempts <= 1) throw err;
      return new Promise(resolve =>
        setTimeout(
          () => resolve(this.retry(fn, maxAttempts - 1, delayMs)),
          delayMs
        )
      );
    });
  }
}

describe('Utilities and Edge Cases', () => {
  describe('Currency Formatting', () => {
    it('should format currency correctly', () => {
      const formatted = UtilityFunctions.formatCurrency(1000);
      expect(formatted).toContain('R$');
    });

    it('should handle decimal values', () => {
      const formatted = UtilityFunctions.formatCurrency(99.99);
      expect(formatted).toBeDefined();
    });

    it('should handle zero value', () => {
      const formatted = UtilityFunctions.formatCurrency(0);
      expect(formatted).toContain('R$');
    });

    it('should handle large values', () => {
      const formatted = UtilityFunctions.formatCurrency(999999999.99);
      expect(formatted).toBeDefined();
    });

    it('should handle negative values', () => {
      const formatted = UtilityFunctions.formatCurrency(-100);
      expect(formatted).toContain('-');
    });
  });

  describe('Phone Number Formatting', () => {
    it('should parse phone number', () => {
      const parsed = UtilityFunctions.parsePhoneNumber('(11) 98765-4321');
      expect(parsed).toBe('11987654321');
    });

    it('should handle various formats', () => {
      const formats = ['11987654321', '11 98765-4321', '(11) 9876-5432'];
      formats.forEach(format => {
        const parsed = UtilityFunctions.parsePhoneNumber(format);
        expect(parsed).toMatch(/^\d+$/);
      });
    });

    it('should strip special characters', () => {
      const parsed = UtilityFunctions.parsePhoneNumber('+55-11-98765-4321');
      expect(parsed).not.toContain('-');
      expect(parsed).not.toContain('+');
    });
  });

  describe('CPF Validation', () => {
    it('should validate correct CPF', () => {
      // Note: Using a valid CPF structure
      const isValid = UtilityFunctions.isValidCPF('11144477735');
      expect(isValid).toBe(true);
    });

    it('should reject CPF with wrong length', () => {
      const isValid = UtilityFunctions.isValidCPF('111444777');
      expect(isValid).toBe(false);
    });

    it('should reject all same digits', () => {
      const isValid = UtilityFunctions.isValidCPF('11111111111');
      expect(isValid).toBe(false);
    });

    it('should validate CPF with formatting', () => {
      const isValid = UtilityFunctions.isValidCPF('111.444.777-35');
      expect(isValid).toBe(true);
    });
  });

  describe('Age Calculation', () => {
    it('should calculate age correctly', () => {
      const birthDate = new Date('2000-01-01');
      const age = UtilityFunctions.calculateAge(birthDate);
      expect(age).toBeGreaterThan(0);
      expect(age).toBeLessThan(100);
    });

    it('should handle birthday today', () => {
      const today = new Date();
      const birthDate = new Date(
        today.getFullYear() - 25,
        today.getMonth(),
        today.getDate()
      );
      const age = UtilityFunctions.calculateAge(birthDate);
      expect(age).toBe(25);
    });

    it('should handle recent birthdays', () => {
      const today = new Date();
      const birthDate = new Date(
        today.getFullYear() - 30,
        today.getMonth() - 1,
        today.getDate()
      );
      const age = UtilityFunctions.calculateAge(birthDate);
      expect(age).toBe(30);
    });
  });

  describe('String Utilities', () => {
    it('should truncate long strings', () => {
      const truncated = UtilityFunctions.truncateString(
        'This is a very long string',
        10
      );
      expect(truncated.length).toBeLessThanOrEqual(10);
      expect(truncated).toContain('...');
    });

    it('should not truncate short strings', () => {
      const result = UtilityFunctions.truncateString('Short', 10);
      expect(result).toBe('Short');
    });

    it('should capitalize words', () => {
      const capitalized = UtilityFunctions.capitalizeWords(
        'hello world'
      );
      expect(capitalized).toBe('Hello World');
    });

    it('should handle mixed case', () => {
      const capitalized = UtilityFunctions.capitalizeWords('hELLO wORLD');
      expect(capitalized).toBe('Hello World');
    });
  });

  describe('UUID Generation', () => {
    it('should generate UUID', () => {
      const uuid = UtilityFunctions.generateUUID();
      expect(uuid).toBeDefined();
      expect(uuid.length).toBeGreaterThan(0);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = UtilityFunctions.generateUUID();
      const uuid2 = UtilityFunctions.generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should maintain UUID format', () => {
      const uuid = UtilityFunctions.generateUUID();
      expect(uuid).toContain('-');
    });
  });

  describe('Array Operations', () => {
    it('should chunk array', () => {
      const arr = [1, 2, 3, 4, 5, 6];
      const chunks = UtilityFunctions.arrayChunk(arr, 2);
      expect(chunks.length).toBe(3);
      expect((chunks[0] as number[]).length).toBe(2);
    });

    it('should handle uneven chunks', () => {
      const arr = [1, 2, 3, 4, 5];
      const chunks = UtilityFunctions.arrayChunk(arr, 2);
      expect(chunks.length).toBe(3);
      expect((chunks[2] as number[]).length).toBe(1);
    });

    it('should handle empty array', () => {
      const chunks = UtilityFunctions.arrayChunk([], 2);
      expect(chunks.length).toBe(0);
    });
  });

  describe('Object Operations', () => {
    it('should deep clone object', () => {
      const original = { name: 'Test', nested: { value: 123 } };
      const cloned = UtilityFunctions.deepClone(original);

      cloned.nested.value = 456;
      expect(original.nested.value).toBe(123);
    });

    it('should merge objects', () => {
      const obj1: Record<string, unknown> = { a: 1, b: 2 };
      const obj2: Record<string, unknown> = { b: 3, c: 4 };
      const merged = UtilityFunctions.mergeObjects(
        obj1 as Record<string, unknown>,
        obj2 as Record<string, unknown>
      ) as Record<string, unknown>;

      expect(merged.a).toBe(1);
      expect(merged.b).toBe(3);
      expect(merged.c).toBe(4);
    });

    it('should filter undefined values', () => {
      const obj = { a: 1, b: undefined, c: 'test' };
      const filtered = UtilityFunctions.filterUndefined(obj);

      expect(filtered.a).toBe(1);
      expect(filtered.b).toBeUndefined();
      expect(filtered.c).toBe('test');
    });
  });

  describe('Async Operations', () => {
    it('should delay execution', (done) => {
      const start = Date.now();

      UtilityFunctions.delayAsync(100).then(() => {
        const duration = Date.now() - start;
        // Allow 10ms margin for CI timing variance
        expect(duration).toBeGreaterThanOrEqual(90);
        done();
      });
    }, 500); // Increased timeout for slow CI environments

    it('should retry failed operations', (done) => {
      let attempts = 0;

      const fn = () =>
        new Promise<void>((resolve, reject) => {
          attempts++;
          if (attempts < 3) {
            reject(new Error('Failed'));
          } else {
            resolve();
          }
        });

      UtilityFunctions.retry(fn, 3, 10).then(() => {
        expect(attempts).toBe(3);
        done();
      });
    }, 500);
  });

  describe('Boundary Value Testing', () => {
    it('should handle minimum integer', () => {
      const min = Number.MIN_SAFE_INTEGER;
      const formatted = UtilityFunctions.formatCurrency(min);
      expect(formatted).toBeDefined();
    });

    it('should handle maximum integer', () => {
      const max = Number.MAX_SAFE_INTEGER;
      const formatted = UtilityFunctions.formatCurrency(max);
      expect(formatted).toBeDefined();
    });

    it('should handle very small decimals', () => {
      const small = 0.01;
      const formatted = UtilityFunctions.formatCurrency(small);
      expect(formatted).toContain('0,01');
    });

    it('should handle empty string operations', () => {
      const truncated = UtilityFunctions.truncateString('', 10);
      expect(truncated).toBe('');
    });

    it('should handle null-like values gracefully', () => {
      const chunks = UtilityFunctions.arrayChunk([], 0);
      // Should handle edge case without crashing
      expect(chunks).toBeDefined();
    });
  });

  describe('Performance Edge Cases', () => {
    it('should chunk large arrays efficiently', () => {
      const largeArr = Array(10000).fill(0);
      const start = performance.now();

      const chunks = UtilityFunctions.arrayChunk(largeArr, 100);

      const duration = performance.now() - start;
      expect(chunks.length).toBe(100);
      expect(duration).toBeLessThan(100);
    });

    it('should deep clone large objects', () => {
      const largeObj = {
        data: Array(1000)
          .fill(0)
          .map((_, i) => ({ id: i, value: `item-${i}` })),
      };

      const start = performance.now();
      const cloned = UtilityFunctions.deepClone(largeObj);
      const duration = performance.now() - start;

      expect(cloned.data.length).toBe(1000);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Type Safety Edge Cases', () => {
    it('should handle mixed type arrays', () => {
      const mixed: unknown[] = [1, 'string', true, null, undefined];
      const chunks = UtilityFunctions.arrayChunk(mixed, 2);

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should preserve types during merge', () => {
      const obj1: Record<string, unknown> = { count: 5, active: true };
      const obj2: Record<string, unknown> = { count: 10, name: 'Test' };

      const merged = UtilityFunctions.mergeObjects(
        obj1 as Record<string, unknown>,
        obj2 as Record<string, unknown>
      ) as Record<string, unknown>;

      expect(typeof merged.count).toBe('number');
      expect(typeof merged.active).toBe('boolean');
      expect(typeof merged.name).toBe('string');
    });
  });
});
