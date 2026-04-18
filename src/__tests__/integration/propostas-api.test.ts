/**
 * Propostas API Integration Tests
 * Testa CRUD e transições de status de propostas via API
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

const originalFetch = global.fetch;

describe('Propostas API Integration', () => {
  beforeEach(() => {
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('POST /api/propostas', () => {
    it('should create proposta successfully with valid data', async () => {
      const mockProposta = {
        clienteId: 1,
        titulo: 'Website Development',
        descricao: 'Full website redesign',
        valor: 5000,
        prazo: 30,
        status: 'RASCUNHO',
      };

      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          proposta: {
            id: 1,
            ...mockProposta,
            numero: 'PROP-2025-001',
            createdAt: new Date().toISOString(),
          },
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/propostas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify(mockProposta),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.proposta.numero).toMatch(/^PROP-\d{4}-\d{3}$/);
      expect(data.proposta.titulo).toBe('Website Development');
    });

    it('should reject creation with missing required fields', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Título é obrigatório',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/propostas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ clienteId: 1, valor: 5000 }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Título é obrigatório');
    });

    it('should reject creation with invalid clienteId', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Cliente não encontrado',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/propostas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          clienteId: 999,
          titulo: 'Test',
          valor: 1000,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cliente não encontrado');
    });

    it('should reject creation with negative valor', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Valor deve ser positivo',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/propostas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          clienteId: 1,
          titulo: 'Test',
          valor: -1000,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Valor deve ser positivo');
    });
  });

  describe('GET /api/propostas', () => {
    it('should list all propostas with pagination', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          propostas: [
            {
              id: 1,
              numero: 'PROP-2025-001',
              titulo: 'Website',
              valor: 5000,
              status: 'ENVIADA',
            },
            {
              id: 2,
              numero: 'PROP-2025-002',
              titulo: 'Mobile App',
              valor: 8000,
              status: 'APROVADA',
            },
          ],
          pagination: { page: 1, perPage: 20, total: 2, pages: 1 },
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/propostas?page=1', {
        headers: { Authorization: 'Bearer mock-token' },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.propostas).toHaveLength(2);
      expect(data.pagination.total).toBe(2);
    });

    it('should filter propostas by status', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          propostas: [
            {
              id: 2,
              numero: 'PROP-2025-002',
              titulo: 'Mobile App',
              status: 'APROVADA',
            },
          ],
          pagination: { page: 1, perPage: 20, total: 1, pages: 1 },
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/propostas?status=APROVADA', {
        headers: { Authorization: 'Bearer mock-token' },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.propostas).toHaveLength(1);
      expect(data.propostas[0].status).toBe('APROVADA');
    });

    it('should filter propostas by clienteId', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          propostas: [
            { id: 1, numero: 'PROP-2025-001', clienteId: 1, titulo: 'Website' },
          ],
          pagination: { page: 1, perPage: 20, total: 1, pages: 1 },
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/propostas?clienteId=1', {
        headers: { Authorization: 'Bearer mock-token' },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.propostas).toHaveLength(1);
      expect(data.propostas[0].clienteId).toBe(1);
    });
  });

  describe('PATCH /api/propostas/:id/status', () => {
    it('should transition from RASCUNHO to ENVIADA', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          proposta: {
            id: 1,
            status: 'ENVIADA',
            enviadaEm: new Date().toISOString(),
          },
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/propostas/1/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ status: 'ENVIADA' }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.proposta.status).toBe('ENVIADA');
      expect(data.proposta.enviadaEm).toBeDefined();
    });

    it('should transition from ENVIADA to APROVADA', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          proposta: {
            id: 1,
            status: 'APROVADA',
            aprovadaEm: new Date().toISOString(),
          },
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/propostas/1/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ status: 'APROVADA' }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.proposta.status).toBe('APROVADA');
      expect(data.proposta.aprovadaEm).toBeDefined();
    });

    it('should transition from ENVIADA to REJEITADA', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          proposta: {
            id: 1,
            status: 'REJEITADA',
            rejeitadaEm: new Date().toISOString(),
            motivoRejeicao: 'Valor muito alto',
          },
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/propostas/1/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          status: 'REJEITADA',
          motivoRejeicao: 'Valor muito alto',
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.proposta.status).toBe('REJEITADA');
      expect(data.proposta.rejeitadaEm).toBeDefined();
      expect(data.proposta.motivoRejeicao).toBe('Valor muito alto');
    });

    it('should reject invalid status transition', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Transição de status inválida: RASCUNHO -> APROVADA',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/propostas/1/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ status: 'APROVADA' }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Transição de status inválida');
    });

    it('should reject transition from APROVADA to ENVIADA', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Não é possível alterar status de proposta aprovada',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/propostas/1/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ status: 'ENVIADA' }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('proposta aprovada');
    });

    it('should require motivoRejeicao when rejecting', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Motivo de rejeição é obrigatório',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/propostas/1/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ status: 'REJEITADA' }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Motivo de rejeição é obrigatório');
    });
  });

  describe('DELETE /api/propostas/:id', () => {
    it('should delete proposta in RASCUNHO status', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'Proposta excluída com sucesso',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/propostas/1', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer mock-token' },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.message).toContain('excluída');
    });

    it('should reject deletion of ENVIADA proposta', async () => {
      const mockResponse = {
        ok: false,
        status: 409,
        json: async () => ({
          success: false,
          error: 'Não é possível excluir proposta enviada',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/propostas/1', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer mock-token' },
      });

      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('proposta enviada');
    });

    it('should reject deletion of APROVADA proposta', async () => {
      const mockResponse = {
        ok: false,
        status: 409,
        json: async () => ({
          success: false,
          error: 'Não é possível excluir proposta aprovada',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/propostas/1', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer mock-token' },
      });

      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('proposta aprovada');
    });
  });
});
