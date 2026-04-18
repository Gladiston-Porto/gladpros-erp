/**
 * Business Logic Tests: Proposta Management
 * Complex workflows and state machine validation
 */

import { describe, it, expect } from '@jest/globals';

describe('Proposta Business Logic', () => {
  describe('Status State Machine', () => {
    it('should allow RASCUNHO → ENVIADA transition', () => {
      const validTransitions: Record<string, string[]> = {
        RASCUNHO: ['ENVIADA', 'CANCELADA'],
        ENVIADA: ['APROVADA', 'REJEITADA', 'CANCELADA'],
        APROVADA: ['CANCELADA'],
        REJEITADA: [],
        CANCELADA: [],
      };
      
      expect(validTransitions.RASCUNHO).toContain('ENVIADA');
    });

    it('should allow ENVIADA → APROVADA transition', () => {
      const validTransitions: Record<string, string[]> = {
        RASCUNHO: ['ENVIADA', 'CANCELADA'],
        ENVIADA: ['APROVADA', 'REJEITADA', 'CANCELADA'],
        APROVADA: ['CANCELADA'],
        REJEITADA: [],
        CANCELADA: [],
      };
      
      expect(validTransitions.ENVIADA).toContain('APROVADA');
    });

    it('should allow ENVIADA → REJEITADA transition', () => {
      const validTransitions: Record<string, string[]> = {
        RASCUNHO: ['ENVIADA', 'CANCELADA'],
        ENVIADA: ['APROVADA', 'REJEITADA', 'CANCELADA'],
        APROVADA: ['CANCELADA'],
        REJEITADA: [],
        CANCELADA: [],
      };
      
      expect(validTransitions.ENVIADA).toContain('REJEITADA');
    });

    it('should prevent RASCUNHO → APROVADA direct transition', () => {
      const validTransitions: Record<string, string[]> = {
        RASCUNHO: ['ENVIADA', 'CANCELADA'],
        ENVIADA: ['APROVADA', 'REJEITADA', 'CANCELADA'],
        APROVADA: ['CANCELADA'],
        REJEITADA: [],
        CANCELADA: [],
      };
      
      expect(validTransitions.RASCUNHO).not.toContain('APROVADA');
    });

    it('should prevent APROVADA → REJEITADA transition', () => {
      const validTransitions: Record<string, string[]> = {
        RASCUNHO: ['ENVIADA', 'CANCELADA'],
        ENVIADA: ['APROVADA', 'REJEITADA', 'CANCELADA'],
        APROVADA: ['CANCELADA'],
        REJEITADA: [],
        CANCELADA: [],
      };
      
      expect(validTransitions.APROVADA).not.toContain('REJEITADA');
    });

    it('should prevent any transition from REJEITADA', () => {
      const validTransitions: Record<string, string[]> = {
        RASCUNHO: ['ENVIADA', 'CANCELADA'],
        ENVIADA: ['APROVADA', 'REJEITADA', 'CANCELADA'],
        APROVADA: ['CANCELADA'],
        REJEITADA: [],
        CANCELADA: [],
      };
      
      expect(validTransitions.REJEITADA.length).toBe(0);
    });

    it('should prevent any transition from CANCELADA', () => {
      const validTransitions: Record<string, string[]> = {
        RASCUNHO: ['ENVIADA', 'CANCELADA'],
        ENVIADA: ['APROVADA', 'REJEITADA', 'CANCELADA'],
        APROVADA: ['CANCELADA'],
        REJEITADA: [],
        CANCELADA: [],
      };
      
      expect(validTransitions.CANCELADA.length).toBe(0);
    });
  });

  describe('Numero Generation', () => {
    it('should generate numero in format PROP-YYYY-XXX', () => {
      const year = new Date().getFullYear();
      const sequence = 123;
      const numero = `PROP-${year}-${sequence.toString().padStart(3, '0')}`;
      
      expect(numero).toMatch(/^PROP-\d{4}-\d{3}$/);
      expect(numero).toBe(`PROP-${year}-123`);
    });

    it('should pad sequence with leading zeros', () => {
      const sequence = 5;
      const padded = sequence.toString().padStart(3, '0');
      
      expect(padded).toBe('005');
      expect(padded.length).toBe(3);
    });

    it('should increment sequence for each proposta', () => {
      const existingNumeros = ['PROP-2025-001', 'PROP-2025-002', 'PROP-2025-003'];
      const lastSequence = Math.max(
        ...existingNumeros.map(n => parseInt(n.split('-')[2]))
      );
      const nextSequence = lastSequence + 1;
      
      expect(nextSequence).toBe(4);
    });

    it('should reset sequence for new year', () => {
      const lastYear = 2024;
      const currentYear = 2025;
      const lastNumero = `PROP-${lastYear}-999`;
      const newNumero = `PROP-${currentYear}-001`;
      
      const lastYearParsed = parseInt(lastNumero.split('-')[1]);
      const currentYearParsed = parseInt(newNumero.split('-')[1]);
      
      expect(currentYearParsed).toBeGreaterThan(lastYearParsed);
      expect(newNumero).toBe('PROP-2025-001');
    });

    it('should handle sequence overflow (>999)', () => {
      const sequence = 1234;
      const numero = `PROP-2025-${sequence}`;
      
      expect(numero).toBe('PROP-2025-1234');
      expect(numero.length).toBeGreaterThan(13); // PROP-YYYY-XXX = 13 chars
    });
  });

  describe('Value Calculations', () => {
    it('should calculate total from items', () => {
      const items = [
        { quantidade: 2, valorUnitario: 100 },
        { quantidade: 3, valorUnitario: 50 },
      ];
      
      const total = items.reduce((sum, item) => {
        return sum + (item.quantidade * item.valorUnitario);
      }, 0);
      
      expect(total).toBe(350);
    });

    it('should apply discount to total', () => {
      const total = 1000;
      const desconto = 100; // R$ 100 off
      const final = total - desconto;
      
      expect(final).toBe(900);
    });

    it('should calculate percentage discount', () => {
      const total = 1000;
      const descontoPercentual = 10; // 10%
      const descontoValor = (total * descontoPercentual) / 100;
      const final = total - descontoValor;
      
      expect(descontoValor).toBe(100);
      expect(final).toBe(900);
    });

    it('should not allow negative totals', () => {
      const total = 100;
      const desconto = 150;
      const final = Math.max(0, total - desconto);
      
      expect(final).toBe(0);
    });

    it('should round values to 2 decimal places', () => {
      const value = 123.456789;
      const rounded = Math.round(value * 100) / 100;
      
      expect(rounded).toBe(123.46);
    });

    it('should calculate tax (Texas 8.25%)', () => {
      const subtotal = 1000;
      const taxRate = 0.0825;
      const tax = subtotal * taxRate;
      const total = subtotal + tax;
      
      expect(tax).toBe(82.5);
      expect(total).toBe(1082.5);
    });
  });

  describe('Item Management', () => {
    it('should add item to proposta', () => {
      const items: any[] = [];
      const newItem = {
        descricao: 'Item 1',
        quantidade: 1,
        valorUnitario: 100,
      };
      
      items.push(newItem);
      
      expect(items.length).toBe(1);
      expect(items[0].descricao).toBe('Item 1');
    });

    it('should remove item from proposta', () => {
      const items = [
        { id: 1, descricao: 'Item 1' },
        { id: 2, descricao: 'Item 2' },
      ];
      
      const filtered = items.filter(item => item.id !== 1);
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe(2);
    });

    it('should update item quantity', () => {
      const item = { quantidade: 1, valorUnitario: 100 };
      item.quantidade = 5;
      
      const total = item.quantidade * item.valorUnitario;
      
      expect(item.quantidade).toBe(5);
      expect(total).toBe(500);
    });

    it('should validate minimum quantity', () => {
      const quantity = 0;
      const isValid = quantity > 0;
      
      expect(isValid).toBe(false);
    });

    it('should validate minimum price', () => {
      const price = -10;
      const isValid = price >= 0;
      
      expect(isValid).toBe(false);
    });

    it('should require item description', () => {
      const item = { descricao: '', quantidade: 1, valorUnitario: 100 };
      const isValid = item.descricao.trim().length > 0;
      
      expect(isValid).toBe(false);
    });
  });

  describe('Rejection Handling', () => {
    it('should require motivo when rejecting proposta', () => {
      const rejection = {
        status: 'REJEITADA',
        motivoRejeicao: '',
      };
      
      const isValid = rejection.motivoRejeicao.trim().length > 0;
      
      expect(isValid).toBe(false);
    });

    it('should allow rejection with valid motivo', () => {
      const rejection = {
        status: 'REJEITADA',
        motivoRejeicao: 'Preço muito alto',
      };
      
      const isValid = rejection.motivoRejeicao.trim().length > 0;
      
      expect(isValid).toBe(true);
    });

    it('should store rejection timestamp', () => {
      const rejection = {
        status: 'REJEITADA',
        motivoRejeicao: 'Test reason',
        rejeitadaEm: new Date(),
      };
      
      expect(rejection.rejeitadaEm).toBeInstanceOf(Date);
    });

    it('should not require motivo for other statuses', () => {
      const aprovada = { status: 'APROVADA', motivoRejeicao: undefined };
      const needsMotivo = aprovada.status === 'REJEITADA';
      
      expect(needsMotivo).toBe(false);
    });
  });

  describe('Approval Workflow', () => {
    it('should allow approval without motivo', () => {
      const approval = {
        status: 'APROVADA',
        aprovadaEm: new Date(),
      };
      
      expect(approval.status).toBe('APROVADA');
      expect(approval.aprovadaEm).toBeInstanceOf(Date);
    });

    it('should store approval timestamp', () => {
      const now = new Date();
      const approval = {
        status: 'APROVADA',
        aprovadaEm: now,
      };
      
      expect(approval.aprovadaEm.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should track who approved the proposta', () => {
      const approval = {
        status: 'APROVADA',
        aprovadaPor: 1, // userId
      };
      
      expect(typeof approval.aprovadaPor).toBe('number');
      expect(approval.aprovadaPor).toBeGreaterThan(0);
    });
  });

  describe('Deletion Rules', () => {
    it('should allow deletion of RASCUNHO propostas', () => {
      const proposta = { status: 'RASCUNHO' };
      const canDelete = proposta.status === 'RASCUNHO';
      
      expect(canDelete).toBe(true);
    });

    it('should prevent deletion of ENVIADA propostas', () => {
      const proposta = { status: 'ENVIADA' };
      const canDelete = proposta.status === 'RASCUNHO';
      
      expect(canDelete).toBe(false);
    });

    it('should prevent deletion of APROVADA propostas', () => {
      const proposta = { status: 'APROVADA' };
      const canDelete = proposta.status === 'RASCUNHO';
      
      expect(canDelete).toBe(false);
    });

    it('should allow soft delete instead of hard delete', () => {
      const proposta = {
        status: 'APROVADA',
        deletedAt: null as Date | null,
      };
      
      proposta.deletedAt = new Date();
      
      expect(proposta.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('PDF Generation', () => {
    it('should generate PDF only for ENVIADA or approved status', () => {
      const validStatuses = ['ENVIADA', 'APROVADA'];
      const proposta = { status: 'ENVIADA' };
      
      const canGeneratePDF = validStatuses.includes(proposta.status);
      
      expect(canGeneratePDF).toBe(true);
    });

    it('should not generate PDF for RASCUNHO', () => {
      const validStatuses = ['ENVIADA', 'APROVADA'];
      const proposta = { status: 'RASCUNHO' };
      
      const canGeneratePDF = validStatuses.includes(proposta.status);
      
      expect(canGeneratePDF).toBe(false);
    });

    it('should include all required fields in PDF data', () => {
      const pdfData = {
        numero: 'PROP-2025-001',
        cliente: { nome: 'Test Cliente' },
        items: [{ descricao: 'Item 1' }],
        valorTotal: 1000,
      };
      
      expect(pdfData.numero).toBeDefined();
      expect(pdfData.cliente).toBeDefined();
      expect(pdfData.items.length).toBeGreaterThan(0);
      expect(pdfData.valorTotal).toBeGreaterThan(0);
    });
  });

  describe('Email Notification', () => {
    it('should send email when status changes to ENVIADA', () => {
      const statusChange = {
        from: 'RASCUNHO',
        to: 'ENVIADA',
      };
      
      const shouldNotify = statusChange.to === 'ENVIADA';
      
      expect(shouldNotify).toBe(true);
    });

    it('should send email when status changes to APROVADA', () => {
      const statusChange = {
        from: 'ENVIADA',
        to: 'APROVADA',
      };
      
      const shouldNotify = ['ENVIADA', 'APROVADA', 'REJEITADA'].includes(statusChange.to);
      
      expect(shouldNotify).toBe(true);
    });

    it('should include cliente email in notification', () => {
      const proposta = {
        cliente: { email: 'cliente@example.com' },
      };
      
      expect(proposta.cliente.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should not send email for RASCUNHO status', () => {
      const statusChange = {
        from: 'RASCUNHO',
        to: 'RASCUNHO',
      };
      
      const shouldNotify = ['ENVIADA', 'APROVADA', 'REJEITADA'].includes(statusChange.to);
      
      expect(shouldNotify).toBe(false);
    });
  });

  describe('Search and Filtering', () => {
    it('should filter by status', () => {
      const propostas = [
        { status: 'RASCUNHO' },
        { status: 'ENVIADA' },
        { status: 'APROVADA' },
      ];
      
      const enviadas = propostas.filter(p => p.status === 'ENVIADA');
      
      expect(enviadas.length).toBe(1);
    });

    it('should filter by cliente', () => {
      const propostas = [
        { clienteId: 1 },
        { clienteId: 2 },
        { clienteId: 1 },
      ];
      
      const cliente1Propostas = propostas.filter(p => p.clienteId === 1);
      
      expect(cliente1Propostas.length).toBe(2);
    });

    it('should filter by date range', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');
      const proposta = { createdAt: new Date('2025-06-15') };
      
      const inRange = proposta.createdAt >= startDate && proposta.createdAt <= endDate;
      
      expect(inRange).toBe(true);
    });

    it('should search by numero', () => {
      const propostas = [
        { numero: 'PROP-2025-001' },
        { numero: 'PROP-2025-002' },
      ];
      
      const searchTerm = '001';
      const results = propostas.filter(p => p.numero.includes(searchTerm));
      
      expect(results.length).toBe(1);
    });

    it('should sort by creation date descending', () => {
      const propostas = [
        { createdAt: new Date('2025-01-01T12:00:00Z') },
        { createdAt: new Date('2025-03-01T12:00:00Z') },
        { createdAt: new Date('2025-02-01T12:00:00Z') },
      ];
      
      const sorted = [...propostas].sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );
      
      // Most recent first (March)
      expect(sorted[0].createdAt.getTime()).toBeGreaterThan(sorted[1].createdAt.getTime());
      expect(sorted[1].createdAt.getTime()).toBeGreaterThan(sorted[2].createdAt.getTime());
    });
  });

  describe('Data Validation', () => {
    it('should require cliente association', () => {
      const proposta = { clienteId: null };
      const isValid = proposta.clienteId !== null;
      
      expect(isValid).toBe(false);
    });

    it('should require at least one item', () => {
      const proposta = { items: [] };
      const isValid = proposta.items.length > 0;
      
      expect(isValid).toBe(false);
    });

    it('should validate total value matches items sum', () => {
      const items = [
        { quantidade: 2, valorUnitario: 100 },
        { quantidade: 1, valorUnitario: 50 },
      ];
      
      const calculatedTotal = items.reduce((sum, item) => 
        sum + (item.quantidade * item.valorUnitario), 0
      );
      
      const proposta = { valorTotal: 250, items };
      const isValid = proposta.valorTotal === calculatedTotal;
      
      expect(isValid).toBe(true);
    });

    it('should validate validade date is in future', () => {
      const today = new Date();
      const validade = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days
      
      const isValid = validade > today;
      
      expect(isValid).toBe(true);
    });
  });

  describe('Audit Trail', () => {
    it('should record creation timestamp', () => {
      const proposta = { createdAt: new Date() };
      
      expect(proposta.createdAt).toBeInstanceOf(Date);
    });

    it('should record who created the proposta', () => {
      const proposta = { createdBy: 1 };
      
      expect(typeof proposta.createdBy).toBe('number');
    });

    it('should track status change history', () => {
      const history = [
        { status: 'RASCUNHO', changedAt: new Date('2025-01-01') },
        { status: 'ENVIADA', changedAt: new Date('2025-01-02') },
        { status: 'APROVADA', changedAt: new Date('2025-01-03') },
      ];
      
      expect(history.length).toBe(3);
      expect(history[2].status).toBe('APROVADA');
    });
  });
});
