 
// Mock TextEncoder for tests
global.TextEncoder = require('util').TextEncoder
global.TextDecoder = require('util').TextDecoder

import { sanitizeHtml, sanitizeInput, validateEmail, validatePhone } from '../../../shared/lib/sanitize'

describe('Sanitize Utils', () => {
  describe('sanitizeHtml', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script><p>Hello</p>'
      const result = sanitizeHtml(input)
      expect(result).toBe('Hello')
    })

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('')
    })

    it('should remove all HTML tags and attributes', () => {
      const input = '<div class="test"><span>Content</span></div>'
      const result = sanitizeHtml(input)
      expect(result).toBe('Content')
    })
  })

  describe('sanitizeInput', () => {
    it('should remove control characters', () => {
      const input = 'Hello\x00World\x1FTest'
      const result = sanitizeInput(input)
      expect(result).toBe('HelloWorldTest')
    })

    it('should trim whitespace', () => {
      const input = '  test input  '
      const result = sanitizeInput(input)
      expect(result).toBe('test input')
    })

    it('should limit input length', () => {
      const longInput = 'a'.repeat(15000)
      const result = sanitizeInput(longInput)
      expect(result.length).toBe(10000)
    })

    it('should handle non-string input', () => {
      expect(sanitizeInput(123 as unknown as string)).toBe('')
      expect(sanitizeInput(null as unknown as string)).toBe('')
      expect(sanitizeInput(undefined as unknown as string)).toBe('')
    })
  })

  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true)
    })

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
    })

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      expect(validateEmail(longEmail)).toBe(false)
    })
  })

  describe('validatePhone', () => {
    it('should validate Brazilian phone formats', () => {
      expect(validatePhone('11999999999')).toBe(true)
      expect(validatePhone('+5511999999999')).toBe(true)
      expect(validatePhone('(11)99999-9999')).toBe(true)
    })

    it('should reject invalid phone formats', () => {
      expect(validatePhone('123')).toBe(false)
      expect(validatePhone('abcdefghijk')).toBe(false)
      expect(validatePhone('')).toBe(false)
    })
  })
})
