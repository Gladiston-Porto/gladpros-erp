/**
 * US Business Validations
 * Testing US-specific validation rules (SSN, EIN, ZIP, Phone, State)
 * Sistema operando no Texas, EUA
 */

import { describe, it, expect } from '@jest/globals';

// US Validation Functions
function validateSSN(ssn: string): boolean {
  // Format: XXX-XX-XXXX
  const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
  if (!ssnRegex.test(ssn)) return false;

  // Invalid SSN patterns
  const [area, group, serial] = ssn.split('-');
  
  // Area number cannot be 000, 666, or 900-999
  const areaNum = parseInt(area);
  if (areaNum === 0 || areaNum === 666 || areaNum >= 900) return false;
  
  // Group number cannot be 00
  if (group === '00') return false;
  
  // Serial number cannot be 0000
  if (serial === '0000') return false;

  return true;
}

function validateEIN(ein: string): boolean {
  // Format: XX-XXXXXXX
  const einRegex = /^\d{2}-\d{7}$/;
  if (!einRegex.test(ein)) return false;

  const [prefix] = ein.split('-');
  const prefixNum = parseInt(prefix);
  
  // Valid EIN prefixes (IRS designated)
  const validPrefixes = [
    1, 2, 3, 4, 5, 6, 10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 24, 25, 26,
    27, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46,
    47, 48, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65,
    66, 67, 68, 71, 72, 73, 74, 75, 76, 77, 80, 81, 82, 83, 84, 85, 86, 87,
    88, 90, 91, 92, 93, 94, 95, 98, 99,
  ];

  return validPrefixes.includes(prefixNum);
}

function validateZIPCode(zip: string): boolean {
  // Format: XXXXX or XXXXX-XXXX (ZIP+4)
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zip);
}

function validateUSPhone(phone: string): boolean {
  // Format: (XXX) XXX-XXXX or XXX-XXX-XXXX or XXXXXXXXXX
  const phoneRegex = /^(\(\d{3}\)\s?|\d{3}-?)\d{3}-?\d{4}$/;
  if (!phoneRegex.test(phone)) return false;

  // Extract digits
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) return false;

  // Area code cannot start with 0 or 1
  const areaCode = digits.substring(0, 3);
  if (areaCode[0] === '0' || areaCode[0] === '1') return false;

  return true;
}

function validateUSState(state: string): boolean {
  const validStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', 'PR', 'VI', 'GU', 'AS', 'MP',
  ];

  return validStates.includes(state.toUpperCase());
}

function formatSSN(ssn: string): string {
  const digits = ssn.replace(/\D/g, '');
  if (digits.length !== 9) return ssn;
  return `${digits.substring(0, 3)}-${digits.substring(3, 5)}-${digits.substring(5)}`;
}

function formatEIN(ein: string): string {
  const digits = ein.replace(/\D/g, '');
  if (digits.length !== 9) return ein;
  return `${digits.substring(0, 2)}-${digits.substring(2)}`;
}

function formatUSPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) return phone;
  return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
}

describe('US Validations', () => {
  describe('SSN (Social Security Number) Validation', () => {
    it('should validate correct SSN format', () => {
      expect(validateSSN('123-45-6789')).toBe(true);
      expect(validateSSN('567-65-4321')).toBe(true); // Valid area (not 900-999)
      expect(validateSSN('555-12-3456')).toBe(true);
    });

    it('should reject invalid SSN format', () => {
      expect(validateSSN('12345678')).toBe(false);
      expect(validateSSN('123456789')).toBe(false);
      expect(validateSSN('123-456-789')).toBe(false);
      expect(validateSSN('12-345-6789')).toBe(false);
    });

    it('should reject SSN with area 000', () => {
      expect(validateSSN('000-12-3456')).toBe(false);
    });

    it('should reject SSN with area 666', () => {
      expect(validateSSN('666-12-3456')).toBe(false);
    });

    it('should reject SSN with area 900-999', () => {
      expect(validateSSN('900-12-3456')).toBe(false);
      expect(validateSSN('999-12-3456')).toBe(false);
    });

    it('should reject SSN with group 00', () => {
      expect(validateSSN('123-00-4567')).toBe(false);
    });

    it('should reject SSN with serial 0000', () => {
      expect(validateSSN('123-45-0000')).toBe(false);
    });

    it('should format SSN correctly', () => {
      expect(formatSSN('123456789')).toBe('123-45-6789');
      expect(formatSSN('987654321')).toBe('987-65-4321');
    });

    it('should handle already formatted SSN', () => {
      expect(formatSSN('123-45-6789')).toBe('123-45-6789');
    });
  });

  describe('EIN (Employer Identification Number) Validation', () => {
    it('should validate correct EIN format', () => {
      expect(validateEIN('12-3456789')).toBe(true);
      expect(validateEIN('98-7654321')).toBe(true);
    });

    it('should reject invalid EIN format', () => {
      expect(validateEIN('123456789')).toBe(false);
      expect(validateEIN('123-456789')).toBe(false);
      expect(validateEIN('1-23456789')).toBe(false);
    });

    it('should validate EIN with valid prefix', () => {
      expect(validateEIN('10-1234567')).toBe(true);
      expect(validateEIN('20-1234567')).toBe(true);
      expect(validateEIN('75-1234567')).toBe(true); // Texas
    });

    it('should reject EIN with invalid prefix', () => {
      expect(validateEIN('00-1234567')).toBe(false);
      expect(validateEIN('07-1234567')).toBe(false);
      expect(validateEIN('17-1234567')).toBe(false);
    });

    it('should format EIN correctly', () => {
      expect(formatEIN('123456789')).toBe('12-3456789');
      expect(formatEIN('987654321')).toBe('98-7654321');
    });
  });

  describe('ZIP Code Validation', () => {
    it('should validate 5-digit ZIP code', () => {
      expect(validateZIPCode('78701')).toBe(true); // Austin, TX
      expect(validateZIPCode('75001')).toBe(true); // Dallas, TX
      expect(validateZIPCode('90210')).toBe(true); // Beverly Hills, CA
    });

    it('should validate ZIP+4 format', () => {
      expect(validateZIPCode('78701-1234')).toBe(true);
      expect(validateZIPCode('75001-5678')).toBe(true);
    });

    it('should reject invalid ZIP code format', () => {
      expect(validateZIPCode('1234')).toBe(false);
      expect(validateZIPCode('123456')).toBe(false);
      expect(validateZIPCode('12345-123')).toBe(false);
      expect(validateZIPCode('ABCDE')).toBe(false);
    });

    it('should validate Texas ZIP codes', () => {
      expect(validateZIPCode('78701')).toBe(true); // Austin
      expect(validateZIPCode('77001')).toBe(true); // Houston
      expect(validateZIPCode('75201')).toBe(true); // Dallas
      expect(validateZIPCode('78205')).toBe(true); // San Antonio
    });
  });

  describe('US Phone Number Validation', () => {
    it('should validate phone with parentheses format', () => {
      expect(validateUSPhone('(512) 555-1234')).toBe(true);
      expect(validateUSPhone('(214) 555-5678')).toBe(true);
    });

    it('should validate phone with dashes format', () => {
      expect(validateUSPhone('512-555-1234')).toBe(true);
      expect(validateUSPhone('214-555-5678')).toBe(true);
    });

    it('should validate phone without formatting', () => {
      expect(validateUSPhone('5125551234')).toBe(true);
      expect(validateUSPhone('2145555678')).toBe(true);
    });

    it('should reject phone starting with 0 or 1', () => {
      expect(validateUSPhone('012-555-1234')).toBe(false);
      expect(validateUSPhone('112-555-1234')).toBe(false);
    });

    it('should reject invalid phone format', () => {
      expect(validateUSPhone('123-45-6789')).toBe(false); // SSN format
      expect(validateUSPhone('12345')).toBe(false);
      expect(validateUSPhone('123-456-78901')).toBe(false);
    });

    it('should format phone correctly', () => {
      expect(formatUSPhone('5125551234')).toBe('(512) 555-1234');
      expect(formatUSPhone('2145555678')).toBe('(214) 555-5678');
    });

    it('should validate Texas area codes', () => {
      expect(validateUSPhone('(512) 555-1234')).toBe(true); // Austin
      expect(validateUSPhone('(214) 555-1234')).toBe(true); // Dallas
      expect(validateUSPhone('(713) 555-1234')).toBe(true); // Houston
      expect(validateUSPhone('(210) 555-1234')).toBe(true); // San Antonio
    });
  });

  describe('US State Validation', () => {
    it('should validate Texas', () => {
      expect(validateUSState('TX')).toBe(true);
      expect(validateUSState('tx')).toBe(true);
    });

    it('should validate all US states', () => {
      expect(validateUSState('CA')).toBe(true);
      expect(validateUSState('NY')).toBe(true);
      expect(validateUSState('FL')).toBe(true);
    });

    it('should validate DC and territories', () => {
      expect(validateUSState('DC')).toBe(true); // District of Columbia
      expect(validateUSState('PR')).toBe(true); // Puerto Rico
      expect(validateUSState('VI')).toBe(true); // Virgin Islands
    });

    it('should reject invalid state codes', () => {
      expect(validateUSState('ZZ')).toBe(false);
      expect(validateUSState('XX')).toBe(false);
      expect(validateUSState('AA')).toBe(false);
    });

    it('should handle case insensitive', () => {
      expect(validateUSState('tx')).toBe(true);
      expect(validateUSState('Tx')).toBe(true);
      expect(validateUSState('TX')).toBe(true);
    });
  });

  describe('Combined US Validations', () => {
    it('should validate complete Texas business', () => {
      const business = {
        ein: '75-1234567',
        phone: '(512) 555-1234',
        zipCode: '78701',
        state: 'TX',
      };

      expect(validateEIN(business.ein)).toBe(true);
      expect(validateUSPhone(business.phone)).toBe(true);
      expect(validateZIPCode(business.zipCode)).toBe(true);
      expect(validateUSState(business.state)).toBe(true);
    });

    it('should validate complete Texas individual', () => {
      const individual = {
        ssn: '123-45-6789',
        phone: '(214) 555-5678',
        zipCode: '75001-1234',
        state: 'TX',
      };

      expect(validateSSN(individual.ssn)).toBe(true);
      expect(validateUSPhone(individual.phone)).toBe(true);
      expect(validateZIPCode(individual.zipCode)).toBe(true);
      expect(validateUSState(individual.state)).toBe(true);
    });

    it('should format all US identifiers', () => {
      const unformatted = {
        ssn: '123456789',
        ein: '751234567',
        phone: '5125551234',
      };

      expect(formatSSN(unformatted.ssn)).toBe('123-45-6789');
      expect(formatEIN(unformatted.ein)).toBe('75-1234567');
      expect(formatUSPhone(unformatted.phone)).toBe('(512) 555-1234');
    });

    it('should reject mixed invalid data', () => {
      const invalid = {
        ssn: '000-00-0000',
        ein: '00-0000000',
        phone: '000-000-0000',
        zipCode: '00000',
        state: 'ZZ',
      };

      expect(validateSSN(invalid.ssn)).toBe(false);
      expect(validateEIN(invalid.ein)).toBe(false);
      expect(validateUSPhone(invalid.phone)).toBe(false);
      expect(validateUSState(invalid.state)).toBe(false);
    });
  });

  describe('Texas-Specific Validations', () => {
    it('should recognize Texas EIN prefix range', () => {
      // Texas uses prefixes 74-76
      expect(validateEIN('74-1234567')).toBe(true);
      expect(validateEIN('75-1234567')).toBe(true);
      expect(validateEIN('76-1234567')).toBe(true);
    });

    it('should validate major Texas city ZIP codes', () => {
      const texasCities = [
        '78701', // Austin
        '77001', // Houston
        '75201', // Dallas
        '78205', // San Antonio
        '79901', // El Paso
        '76101', // Fort Worth
      ];

      texasCities.forEach(zip => {
        expect(validateZIPCode(zip)).toBe(true);
      });
    });

    it('should validate Texas area codes', () => {
      const texasAreaCodes = ['512', '214', '713', '210', '817', '915'];

      texasAreaCodes.forEach(areaCode => {
        expect(validateUSPhone(`(${areaCode}) 555-1234`)).toBe(true);
      });
    });
  });
});
