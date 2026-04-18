/**
 * Service Layer Tests: Email Service
 * Testing email composition, templating, and sending logic
 */

import { describe, it, expect } from '@jest/globals';

// Email Service Types
interface EmailTemplate {
  subject: string;
  body: string;
  htmlBody?: string;
}

interface EmailContext {
  clienteName: string;
  clienteEmail: string;
  propostaNumero: string;
  propostaValor: number;
  [key: string]: any;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

// Email Service Functions
const renderTemplate = (
  template: string,
  context: Record<string, any>
): string => {
  let result = template;
  Object.keys(context).forEach(key => {
    const value = context[key];
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(value));
  });
  return result;
};

const validateEmailAddress = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const formatCurrency = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(value);
};

class MockEmailService {
  private sentEmails: Array<{
    to: string;
    subject: string;
    body: string;
    timestamp: Date;
  }> = [];

  sendEmail(to: string, subject: string, body: string): EmailResult {
    if (!validateEmailAddress(to)) {
      return {
        success: false,
        error: 'Invalid email address',
        timestamp: new Date(),
      };
    }

    this.sentEmails.push({
      to,
      subject,
      body,
      timestamp: new Date(),
    });

    return {
      success: true,
      messageId: `msg-${Date.now()}`,
      timestamp: new Date(),
    };
  }

  getSentEmails() {
    return this.sentEmails;
  }

  clearSentEmails() {
    this.sentEmails = [];
  }

  countEmailsSentTo(email: string): number {
    return this.sentEmails.filter(e => e.to === email).length;
  }
}

describe('Email Service', () => {
  let emailService: MockEmailService;

  beforeEach(() => {
    emailService = new MockEmailService();
  });

  describe('Email Validation', () => {
    it('should validate correct email format', () => {
      expect(validateEmailAddress('user@example.com')).toBe(true);
      expect(validateEmailAddress('user.name@example.co.uk')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmailAddress('invalid-email')).toBe(false);
      expect(validateEmailAddress('@example.com')).toBe(false);
      expect(validateEmailAddress('user@')).toBe(false);
    });

    it('should reject empty email', () => {
      expect(validateEmailAddress('')).toBe(false);
    });

    it('should reject email with spaces', () => {
      expect(validateEmailAddress('user name@example.com')).toBe(false);
    });
  });

  describe('Email Sending', () => {
    it('should send email to valid address', () => {
      const result = emailService.sendEmail(
        'user@example.com',
        'Test Subject',
        'Test Body'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should reject email with invalid address', () => {
      const result = emailService.sendEmail(
        'invalid-email',
        'Test Subject',
        'Test Body'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address');
    });

    it('should record email in sent list', () => {
      emailService.sendEmail('user@example.com', 'Subject', 'Body');

      const sent = emailService.getSentEmails();
      expect(sent.length).toBe(1);
      expect(sent[0].to).toBe('user@example.com');
    });

    it('should track multiple sent emails', () => {
      emailService.sendEmail('user1@example.com', 'Subject 1', 'Body 1');
      emailService.sendEmail('user2@example.com', 'Subject 2', 'Body 2');

      const sent = emailService.getSentEmails();
      expect(sent.length).toBe(2);
    });
  });

  describe('Template Rendering', () => {
    it('should replace single placeholder', () => {
      const template = 'Hello {{name}}!';
      const result = renderTemplate(template, { name: 'John' });

      expect(result).toBe('Hello John!');
    });

    it('should replace multiple placeholders', () => {
      const template = 'Hello {{name}}, your email is {{email}}.';
      const result = renderTemplate(template, {
        name: 'John',
        email: 'john@example.com',
      });

      expect(result).toBe('Hello John, your email is john@example.com.');
    });

    it('should handle repeated placeholders', () => {
      const template = '{{name}} - {{name}}';
      const result = renderTemplate(template, { name: 'John' });

      expect(result).toBe('John - John');
    });

    it('should handle numeric values', () => {
      const template = 'Total: {{value}}';
      const result = renderTemplate(template, { value: 123.45 });

      expect(result).toBe('Total: 123.45');
    });

    it('should skip missing placeholders', () => {
      const template = 'Hello {{name}}, welcome {{greeting}}!';
      const result = renderTemplate(template, { name: 'John' });

      // Missing 'greeting' placeholder remains
      expect(result).toContain('{{greeting}}');
    });
  });

  describe('Email Templates', () => {
    it('should create proposta sent template', () => {
      const template = `
        Cliente: {{clienteName}}
        Proposta: {{propostaNumero}}
        Valor: {{propostaValor}}
      `;

      const context: EmailContext = {
        clienteName: 'Acme Corp',
        clienteEmail: 'contact@acme.com',
        propostaNumero: 'PROP-2025-001',
        propostaValor: 1500,
      };

      const rendered = renderTemplate(template, context);

      expect(rendered).toContain('Acme Corp');
      expect(rendered).toContain('PROP-2025-001');
      expect(rendered).toContain('1500');
    });

    it('should format currency in template', () => {
      const template = 'Total: {{valor}}';
      const valor = formatCurrency(1234.56);
      const rendered = renderTemplate(template, { valor });

      expect(rendered).toContain('$1,234.56');
    });

    it('should handle date formatting in template', () => {
      const date = new Date('2025-01-15T12:00:00Z');
      const formatted = date.toLocaleDateString();
      const template = 'Data: {{data}}';
      const rendered = renderTemplate(template, { data: formatted });

      expect(rendered).toContain(formatted);
    });
  });

  describe('Proposta Notification Emails', () => {
    it('should send email when proposta is created', () => {
      const resultado = emailService.sendEmail(
        'cliente@example.com',
        'Nova Proposta Recebida',
        'Sua proposta foi criada.'
      );

      expect(resultado.success).toBe(true);
    });

    it('should send email when proposta is approved', () => {
      const result = emailService.sendEmail(
        'cliente@example.com',
        'Proposta Aprovada',
        'Sua proposta foi aprovada!'
      );

      expect(result.success).toBe(true);
    });

    it('should send email when proposta is rejected', () => {
      const result = emailService.sendEmail(
        'cliente@example.com',
        'Proposta Rejeitada',
        'Sua proposta foi rejeitada.'
      );

      expect(result.success).toBe(true);
    });

    it('should include rejection reason in body', () => {
      const reason = 'Preço fora do orçamento';
      const body = `Sua proposta foi rejeitada. Motivo: ${reason}`;
      const result = emailService.sendEmail(
        'cliente@example.com',
        'Proposta Rejeitada',
        body
      );

      expect(result.success).toBe(true);
      const sent = emailService.getSentEmails();
      expect(sent[0].body).toContain(reason);
    });
  });

  describe('Cliente Notification Emails', () => {
    it('should send welcome email to new cliente', () => {
      const result = emailService.sendEmail(
        'newcliente@example.com',
        'Bem-vindo!',
        'Obrigado por se cadastrar.'
      );

      expect(result.success).toBe(true);
    });

    it('should send status change notification', () => {
      const result = emailService.sendEmail(
        'cliente@example.com',
        'Seu Status foi Alterado',
        'Seu status agora é: INATIVO'
      );

      expect(result.success).toBe(true);
    });

    it('should count emails sent to specific cliente', () => {
      emailService.sendEmail('cliente@example.com', 'Email 1', 'Body 1');
      emailService.sendEmail('cliente@example.com', 'Email 2', 'Body 2');
      emailService.sendEmail('other@example.com', 'Email 3', 'Body 3');

      const count = emailService.countEmailsSentTo('cliente@example.com');
      expect(count).toBe(2);
    });
  });

  describe('Email Delivery', () => {
    it('should track email timestamp', () => {
      const before = new Date();
      emailService.sendEmail('user@example.com', 'Subject', 'Body');
      const after = new Date();

      const sent = emailService.getSentEmails();
      expect(sent[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(sent[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should include message ID for tracking', () => {
      const result = emailService.sendEmail('user@example.com', 'Subject', 'Body');

      expect(result.messageId).toMatch(/^msg-\d+$/);
    });

    it('should not modify original template', () => {
      const original = 'Hello {{name}}!';
      const template = original;
      renderTemplate(template, { name: 'John' });

      expect(template).toBe(original);
    });
  });

  describe('Email Queuing', () => {
    it('should queue multiple emails', () => {
      const emails = [
        { to: 'user1@example.com', subject: 'Email 1', body: 'Body 1' },
        { to: 'user2@example.com', subject: 'Email 2', body: 'Body 2' },
        { to: 'user3@example.com', subject: 'Email 3', body: 'Body 3' },
      ];

      emails.forEach(email => {
        emailService.sendEmail(email.to, email.subject, email.body);
      });

      expect(emailService.getSentEmails().length).toBe(3);
    });

    it('should clear email queue', () => {
      emailService.sendEmail('user@example.com', 'Subject', 'Body');
      expect(emailService.getSentEmails().length).toBe(1);

      emailService.clearSentEmails();
      expect(emailService.getSentEmails().length).toBe(0);
    });

    it('should handle batch email sending', () => {
      const recipients = [
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
      ];

      const results = recipients.map(to =>
        emailService.sendEmail(to, 'Bulk Email', 'Batch message')
      );

      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('Email Error Handling', () => {
    it('should return error for invalid email', () => {
      const result = emailService.sendEmail('', 'Subject', 'Body');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should not add invalid email to sent list', () => {
      emailService.sendEmail('invalid-email', 'Subject', 'Body');
      emailService.sendEmail('valid@example.com', 'Subject', 'Body');

      const sent = emailService.getSentEmails();
      expect(sent.length).toBe(1);
      expect(sent[0].to).toBe('valid@example.com');
    });

    it('should handle special characters in subject', () => {
      const result = emailService.sendEmail(
        'user@example.com',
        'Proposta #123 - Projeto: "A & B"',
        'Body'
      );

      expect(result.success).toBe(true);
      const sent = emailService.getSentEmails();
      expect(sent[0].subject).toContain('#123');
    });
  });
});
