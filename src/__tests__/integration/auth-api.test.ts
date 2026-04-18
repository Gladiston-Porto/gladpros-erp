/**
 * Auth API Integration Tests
 * Testa fluxo completo de autenticação via API
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock do fetch global para testes de API
const originalFetch = global.fetch;

describe('Auth API Integration', () => {
  beforeEach(() => {
    // Reset fetch mock antes de cada teste
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          token: 'mock-jwt-token',
          user: { id: 1, email: 'test@test.com', nome: 'Test User' },
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', senha: 'Password123!' }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.user.email).toBe('test@test.com');
    });

    it('should reject login with invalid credentials', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Credenciais inválidas',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', senha: 'wrong' }),
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Credenciais inválidas');
    });

    it('should reject login with missing email', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Email é obrigatório',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha: 'Password123!' }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email é obrigatório');
    });

    it('should reject login with missing password', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Senha é obrigatória',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com' }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Senha é obrigatória');
    });

    it('should reject login with invalid email format', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Email inválido',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email', senha: 'Password123!' }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email inválido');
    });

    it('should handle rate limiting after 5 failed attempts', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        json: async () => ({
          success: false,
          error: 'Muitas tentativas. Tente novamente em 15 minutos.',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', senha: 'wrong' }),
      });

      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Muitas tentativas');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'Logout realizado com sucesso',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-jwt-token',
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Logout realizado com sucesso');
    });

    it('should reject logout without token', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Token não fornecido',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Token não fornecido');
    });

    it('should reject logout with invalid token', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Token inválido',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-token',
        },
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Token inválido');
    });
  });

  describe('GET /api/auth/session', () => {
    it('should return session data with valid token', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          session: {
            user: { id: 1, email: 'test@test.com', nome: 'Test User' },
            expiresAt: new Date(Date.now() + 1800000).toISOString(), // 30min
          },
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: { Authorization: 'Bearer mock-jwt-token' },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.session.user.email).toBe('test@test.com');
      expect(data.session.expiresAt).toBeDefined();
    });

    it('should reject session check without token', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Não autenticado',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/auth/session', {
        method: 'GET',
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Não autenticado');
    });

    it('should detect IP change and invalidate session', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Sessão inválida: IP alterado',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer mock-jwt-token',
          'X-Forwarded-For': '192.168.1.100', // IP diferente
        },
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('IP alterado');
    });

    it('should detect User-Agent change and invalidate session', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Sessão inválida: navegador alterado',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer mock-jwt-token',
          'User-Agent': 'Different Browser/1.0',
        },
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('navegador alterado');
    });

    it('should reject expired session', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Sessão expirada',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: { Authorization: 'Bearer expired-token' },
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Sessão expirada');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          token: 'new-jwt-token',
          expiresAt: new Date(Date.now() + 1800000).toISOString(),
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { Authorization: 'Bearer mock-jwt-token' },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.token).toBe('new-jwt-token');
      expect(data.expiresAt).toBeDefined();
    });

    it('should reject refresh without token', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Token não fornecido',
        }),
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as Response
      );

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Token não fornecido');
    });
  });
});
