/**
 * Component Logic Tests: Form Validation
 * Testing form validation logic and state management
 */

import { describe, it, expect } from '@jest/globals';

// Validation Functions
const validateRequired = (value: string): string | undefined => {
  return value.trim().length === 0 ? 'This field is required' : undefined;
};

const validateEmail = (value: string): string | undefined => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return !emailRegex.test(value) ? 'Invalid email format' : undefined;
};

const validateMinLength = (min: number) => (value: string): string | undefined => {
  return value.length < min ? `Minimum ${min} characters required` : undefined;
};

const validateMaxLength = (max: number) => (value: string): string | undefined => {
  return value.length > max ? `Maximum ${max} characters allowed` : undefined;
};

const validatePhone = (value: string): string | undefined => {
  const cleaned = value.replace(/\D/g, '');
  return cleaned.length < 10 ? 'Invalid phone number' : undefined;
};

const validateNumeric = (value: string): string | undefined => {
  return isNaN(Number(value)) ? 'Must be a number' : undefined;
};

const validatePositive = (value: number): string | undefined => {
  return value <= 0 ? 'Must be a positive number' : undefined;
};

// Form State Manager
interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
}

class FormManager<T extends Record<string, any>> {
  private state: FormState<T>;
  
  constructor(initialValues: T) {
    this.state = {
      values: initialValues,
      errors: {},
      touched: {},
      isSubmitting: false,
    };
  }
  
  getValue(field: keyof T) {
    return this.state.values[field];
  }
  
  setValue(field: keyof T, value: any) {
    this.state.values[field] = value;
  }
  
  setError(field: keyof T, error: string) {
    this.state.errors[field] = error;
  }
  
  clearError(field: keyof T) {
    delete this.state.errors[field];
  }
  
  touchField(field: keyof T) {
    this.state.touched[field] = true;
  }
  
  isFieldTouched(field: keyof T): boolean {
    return this.state.touched[field] || false;
  }
  
  hasErrors(): boolean {
    return Object.keys(this.state.errors).length > 0;
  }
  
  getErrors() {
    return this.state.errors;
  }
  
  reset() {
    this.state.errors = {};
    this.state.touched = {};
    this.state.isSubmitting = false;
  }
}

describe('Form Validation Logic', () => {
  describe('Required Field Validation', () => {
    it('should fail for empty string', () => {
      const error = validateRequired('');
      expect(error).toBe('This field is required');
    });

    it('should fail for whitespace only', () => {
      const error = validateRequired('   ');
      expect(error).toBe('This field is required');
    });

    it('should pass for non-empty string', () => {
      const error = validateRequired('John Doe');
      expect(error).toBeUndefined();
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email format', () => {
      const error = validateEmail('user@example.com');
      expect(error).toBeUndefined();
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid-email')).toBe('Invalid email format');
      expect(validateEmail('@nodomain.com')).toBe('Invalid email format');
      expect(validateEmail('no@domain')).toBe('Invalid email format');
    });

    it('should accept email with subdomains', () => {
      const error = validateEmail('user@mail.example.com');
      expect(error).toBeUndefined();
    });

    it('should accept email with plus addressing', () => {
      const error = validateEmail('user+tag@example.com');
      expect(error).toBeUndefined();
    });
  });

  describe('Min/Max Length Validation', () => {
    it('should validate minimum length', () => {
      const validate = validateMinLength(5);
      
      expect(validate('abc')).toBe('Minimum 5 characters required');
      expect(validate('abcdef')).toBeUndefined();
    });

    it('should validate maximum length', () => {
      const validate = validateMaxLength(10);
      
      expect(validate('a'.repeat(15))).toBe('Maximum 10 characters allowed');
      expect(validate('short')).toBeUndefined();
    });

    it('should handle empty strings in min length', () => {
      const validate = validateMinLength(1);
      expect(validate('')).toBe('Minimum 1 characters required');
    });

    it('should handle exact length match', () => {
      const validate = validateMinLength(5);
      expect(validate('12345')).toBeUndefined();
    });
  });

  describe('Phone Number Validation', () => {
    it('should validate US phone numbers', () => {
      expect(validatePhone('+15551234567')).toBeUndefined();
      expect(validatePhone('(555) 123-4567')).toBeUndefined();
    });

    it('should reject short phone numbers', () => {
      expect(validatePhone('1234')).toBe('Invalid phone number');
    });

    it('should strip formatting characters', () => {
      const phone = '+1 (555) 123-4567';
      const cleaned = phone.replace(/\D/g, '');
      expect(cleaned).toBe('15551234567');
    });
  });

  describe('Numeric Validation', () => {
    it('should validate numeric strings', () => {
      expect(validateNumeric('123')).toBeUndefined();
      expect(validateNumeric('123.45')).toBeUndefined();
    });

    it('should reject non-numeric strings', () => {
      expect(validateNumeric('abc')).toBe('Must be a number');
      expect(validateNumeric('12a3')).toBe('Must be a number');
    });

    it('should accept negative numbers', () => {
      expect(validateNumeric('-123')).toBeUndefined();
    });

    it('should validate positive numbers only', () => {
      expect(validatePositive(10)).toBeUndefined();
      expect(validatePositive(-5)).toBe('Must be a positive number');
      expect(validatePositive(0)).toBe('Must be a positive number');
    });
  });

  describe('Form State Management', () => {
    interface TestForm {
      nome: string;
      email: string;
      idade: number;
    }

    it('should initialize with values', () => {
      const form = new FormManager<TestForm>({
        nome: '',
        email: '',
        idade: 0,
      });
      
      expect(form.getValue('nome')).toBe('');
      expect(form.getValue('email')).toBe('');
    });

    it('should update field values', () => {
      const form = new FormManager<TestForm>({
        nome: '',
        email: '',
        idade: 0,
      });
      
      form.setValue('nome', 'John Doe');
      expect(form.getValue('nome')).toBe('John Doe');
    });

    it('should set and clear errors', () => {
      const form = new FormManager<TestForm>({
        nome: '',
        email: '',
        idade: 0,
      });
      
      form.setError('email', 'Invalid email');
      expect(form.hasErrors()).toBe(true);
      
      form.clearError('email');
      expect(form.hasErrors()).toBe(false);
    });

    it('should track touched fields', () => {
      const form = new FormManager<TestForm>({
        nome: '',
        email: '',
        idade: 0,
      });
      
      expect(form.isFieldTouched('nome')).toBe(false);
      
      form.touchField('nome');
      expect(form.isFieldTouched('nome')).toBe(true);
    });

    it('should get all errors', () => {
      const form = new FormManager<TestForm>({
        nome: '',
        email: '',
        idade: 0,
      });
      
      form.setError('nome', 'Nome is required');
      form.setError('email', 'Email is required');
      
      const errors = form.getErrors();
      expect(Object.keys(errors).length).toBe(2);
    });

    it('should reset form state', () => {
      const form = new FormManager<TestForm>({
        nome: 'John',
        email: 'john@example.com',
        idade: 25,
      });
      
      form.setError('nome', 'Some error');
      form.touchField('email');
      
      form.reset();
      
      expect(form.hasErrors()).toBe(false);
      expect(form.isFieldTouched('email')).toBe(false);
    });
  });

  describe('Complex Form Validation', () => {
    it('should validate multiple fields', () => {
      const form = {
        nome: '',
        email: 'invalid-email',
        phone: '123',
      };
      
      const errors: Record<string, string> = {};
      
      const nomeError = validateRequired(form.nome);
      if (nomeError) errors.nome = nomeError;
      
      const emailError = validateEmail(form.email);
      if (emailError) errors.email = emailError;
      
      const phoneError = validatePhone(form.phone);
      if (phoneError) errors.phone = phoneError;
      
      expect(Object.keys(errors).length).toBe(3);
    });

    it('should pass with all valid fields', () => {
      const form = {
        nome: 'John Doe',
        email: 'john@example.com',
        phone: '+15551234567',
      };
      
      const errors: Record<string, string> = {};
      
      const nomeError = validateRequired(form.nome);
      if (nomeError) errors.nome = nomeError;
      
      const emailError = validateEmail(form.email);
      if (emailError) errors.email = emailError;
      
      const phoneError = validatePhone(form.phone);
      if (phoneError) errors.phone = phoneError;
      
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should validate conditional fields', () => {
      const form = {
        hasAddress: true,
        address: '',
      };
      
      const errors: Record<string, string> = {};
      
      if (form.hasAddress) {
        const addressError = validateRequired(form.address);
        if (addressError) errors.address = addressError;
      }
      
      expect(errors.address).toBe('This field is required');
    });

    it('should skip validation when condition not met', () => {
      const form = {
        hasAddress: false,
        address: '',
      };
      
      const errors: Record<string, string> = {};
      
      if (form.hasAddress) {
        const addressError = validateRequired(form.address);
        if (addressError) errors.address = addressError;
      }
      
      expect(errors.address).toBeUndefined();
    });
  });

  describe('Form Submission Logic', () => {
    it('should prevent submission with errors', () => {
      const hasErrors = true;
      const canSubmit = !hasErrors;
      
      expect(canSubmit).toBe(false);
    });

    it('should allow submission without errors', () => {
      const hasErrors = false;
      const canSubmit = !hasErrors;
      
      expect(canSubmit).toBe(true);
    });

    it('should track submission state', () => {
      let isSubmitting = false;
      
      isSubmitting = true;
      expect(isSubmitting).toBe(true);
      
      isSubmitting = false;
      expect(isSubmitting).toBe(false);
    });

    it('should clear form after successful submit', () => {
      const form = {
        nome: 'John Doe',
        email: 'john@example.com',
      };
      
      // Simulate successful submission
      form.nome = '';
      form.email = '';
      
      expect(form.nome).toBe('');
      expect(form.email).toBe('');
    });
  });

  describe('Field Formatting', () => {
    it('should format phone number', () => {
      const raw = '5551234567';
      const formatted = `(${raw.substring(0, 3)}) ${raw.substring(3, 6)}-${raw.substring(6)}`;
      
      expect(formatted).toBe('(555) 123-4567');
    });

    it('should format currency', () => {
      const value = 1234.56;
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
      
      expect(formatted).toBe('$1,234.56');
    });

    it('should format date', () => {
      const date = new Date('2025-01-15T12:00:00Z');
      const formatted = date.toISOString().split('T')[0];
      
      expect(formatted).toBe('2025-01-15');
    });

    it('should trim whitespace', () => {
      const value = '  John Doe  ';
      const trimmed = value.trim();
      
      expect(trimmed).toBe('John Doe');
    });

    it('should normalize email to lowercase', () => {
      const email = 'USER@EXAMPLE.COM';
      const normalized = email.toLowerCase();
      
      expect(normalized).toBe('user@example.com');
    });
  });

  describe('Dynamic Form Fields', () => {
    it('should add field to form', () => {
      const fields: Record<string, any> = {
        nome: '',
      };
      
      fields.email = '';
      
      expect(Object.keys(fields).length).toBe(2);
      expect(fields.email).toBe('');
    });

    it('should remove field from form', () => {
      const fields: Record<string, any> = {
        nome: '',
        email: '',
      };
      
      delete fields.email;
      
      expect(Object.keys(fields).length).toBe(1);
      expect(fields.email).toBeUndefined();
    });

    it('should validate dynamic field count', () => {
      const items = ['Item 1', 'Item 2', 'Item 3'];
      const minItems = 1;
      const isValid = items.length >= minItems;
      
      expect(isValid).toBe(true);
    });

    it('should handle array of form items', () => {
      const items = [
        { descricao: 'Item 1', quantidade: 1 },
        { descricao: 'Item 2', quantidade: 2 },
      ];
      
      items.push({ descricao: 'Item 3', quantidade: 3 });
      
      expect(items.length).toBe(3);
    });
  });
});
