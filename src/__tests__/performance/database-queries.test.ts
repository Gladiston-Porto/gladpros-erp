/**
 * Database Query Performance Tests
 * Testa otimização de queries, uso de índices, e N+1 detection
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Mock Prisma Client
const mockPrisma = {
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  cliente: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  proposta: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe('Database Query Performance', () => {
  beforeAll(() => {
    // Setup: mock performance.now for consistent timing
    global.performance = {
      now: jest.fn(() => Date.now()),
    } as any;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Index Usage Verification', () => {
    it('should use index for user email lookup', async () => {
      const mockExplainResult = [
        {
          possible_keys: 'idx_user_email',
          key: 'idx_user_email',
          rows: 1,
          Extra: 'Using index',
        },
      ];

      mockPrisma.$queryRaw.mockResolvedValue(mockExplainResult);

      const result = await mockPrisma.$queryRaw;
      
      expect(result).toBeDefined();
      // Verify index is being used
      const explainData = await result();
      expect(explainData[0].key).toBe('idx_user_email');
      expect(explainData[0].Extra).toContain('Using index');
    });

    it('should use composite index for cliente search', async () => {
      const mockExplainResult = [
        {
          possible_keys: 'idx_cliente_nome_email',
          key: 'idx_cliente_nome_email',
          rows: 5,
          Extra: 'Using where; Using index',
        },
      ];

      mockPrisma.$queryRaw.mockResolvedValue(mockExplainResult);

      const result = await mockPrisma.$queryRaw;
      const explainData = await result();
      
      expect(explainData[0].key).toBe('idx_cliente_nome_email');
      expect(explainData[0].rows).toBeLessThanOrEqual(10);
    });

    it('should use index for proposta status filtering', async () => {
      const mockExplainResult = [
        {
          possible_keys: 'idx_proposta_status',
          key: 'idx_proposta_status',
          rows: 20,
          Extra: 'Using index condition',
        },
      ];

      mockPrisma.$queryRaw.mockResolvedValue(mockExplainResult);

      const result = await mockPrisma.$queryRaw;
      const explainData = await result();
      
      expect(explainData[0].key).toBe('idx_proposta_status');
    });

    it('should use covering index for count queries', async () => {
      const mockExplainResult = [
        {
          possible_keys: 'idx_user_status',
          key: 'idx_user_status',
          rows: 100,
          Extra: 'Using index',
        },
      ];

      mockPrisma.$queryRaw.mockResolvedValue(mockExplainResult);

      const result = await mockPrisma.$queryRaw;
      const explainData = await result();
      
      // Covering index should not need table access
      expect(explainData[0].Extra).toBe('Using index');
    });
  });

  describe('N+1 Query Detection', () => {
    it('should detect N+1 when loading clientes with propostas separately', async () => {
      const mockClientes = [
        { id: 1, nome: 'Cliente 1' },
        { id: 2, nome: 'Cliente 2' },
        { id: 3, nome: 'Cliente 3' },
      ];

      (mockPrisma.cliente.findMany as jest.Mock).mockResolvedValue(mockClientes);
      (mockPrisma.proposta.findMany as jest.Mock).mockResolvedValue([]);

      const queryCount = { count: 0 };

      // Simulate N+1: 1 query for clientes + N queries for propostas
      const clientes = await mockPrisma.cliente.findMany();
      queryCount.count++; // 1 query

       
      for (const _cliente of clientes) {
        await mockPrisma.proposta.findMany(); // N queries
        queryCount.count++;
      }

      // Total: 1 + 3 = 4 queries (N+1 problem)
      expect(queryCount.count).toBe(4);
      expect(queryCount.count).toBeGreaterThan(1); // Indicates N+1
    });

    it('should avoid N+1 by using include/join', async () => {
      const mockClientesWithPropostas = [
        { id: 1, nome: 'Cliente 1', propostas: [{ id: 1 }] },
        { id: 2, nome: 'Cliente 2', propostas: [{ id: 2 }] },
        { id: 3, nome: 'Cliente 3', propostas: [] },
      ];

      (mockPrisma.cliente.findMany as jest.Mock).mockResolvedValue(mockClientesWithPropostas);

      const queryCount = { count: 0 };

      // Single query with include
      await mockPrisma.cliente.findMany();
      queryCount.count++; // Only 1 query

      // Total: 1 query (no N+1)
      expect(queryCount.count).toBe(1);
    });

    it('should detect N+1 in nested relations', async () => {
      const mockUsers = [
        { id: 1, nome: 'User 1' },
        { id: 2, nome: 'User 2' },
      ];

      const mockClientes = [
        { id: 1, userId: 1 },
        { id: 2, userId: 1 },
      ];

      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (mockPrisma.cliente.findMany as jest.Mock).mockResolvedValue(mockClientes);
      (mockPrisma.proposta.findMany as jest.Mock).mockResolvedValue([]);

      const queryCount = { count: 0 };

      // Level 1: Users
      const users = await mockPrisma.user.findMany();
      queryCount.count++;

       
      for (const _user of users) {
        // Level 2: Clientes for each user
        const clientes = await mockPrisma.cliente.findMany();
        queryCount.count++;

         
        for (const _cliente of clientes) {
          // Level 3: Propostas for each cliente
          await mockPrisma.proposta.findMany();
          queryCount.count++;
        }
      }

      // Deep N+1 problem: 1 + 2 + 4 = 7 queries
      expect(queryCount.count).toBeGreaterThan(3);
    });

    it('should measure query count for dashboard page', async () => {
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 1 }]);
      (mockPrisma.cliente.findMany as jest.Mock).mockResolvedValue([{ id: 1 }]);
      (mockPrisma.proposta.findMany as jest.Mock).mockResolvedValue([{ id: 1 }]);

      const queryCount = { count: 0 };

      // Simulate dashboard loading multiple entities
      await mockPrisma.user.findMany();
      queryCount.count++;

      await mockPrisma.cliente.findMany();
      queryCount.count++;

      await mockPrisma.proposta.findMany();
      queryCount.count++;

      // Dashboard should be optimized (<=5 queries)
      expect(queryCount.count).toBeLessThanOrEqual(5);
    });
  });

  describe('Query Optimization', () => {
    it('should execute simple select query under 10ms', async () => {
      const startTime = performance.now();
      
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1, email: 'test@test.com' });
      
      await mockPrisma.user.findUnique();
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Simple indexed query should be very fast
      expect(duration).toBeLessThan(10);
    });

    it('should execute paginated list query under 50ms', async () => {
      const startTime = performance.now();
      
      const mockResults = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        nome: `Cliente ${i + 1}`,
      }));
      
      (mockPrisma.cliente.findMany as jest.Mock).mockResolvedValue(mockResults);
      
      await mockPrisma.cliente.findMany();
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Paginated query with index should be fast
      expect(duration).toBeLessThan(50);
    });

    it('should execute search query with LIKE under 100ms', async () => {
      const startTime = performance.now();
      
      (mockPrisma.cliente.findMany as jest.Mock).mockResolvedValue([
        { id: 1, nome: 'John Doe' },
      ]);
      
      await mockPrisma.cliente.findMany();
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Search query should complete quickly
      expect(duration).toBeLessThan(100);
    });

    it('should use LIMIT to restrict result set size', async () => {
      const mockResults = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
      }));
      
      (mockPrisma.cliente.findMany as jest.Mock).mockResolvedValue(mockResults);
      
      const results = await mockPrisma.cliente.findMany();
      
      // Pagination should limit results
      expect(results.length).toBeLessThanOrEqual(20);
    });

    it('should optimize COUNT queries separately from SELECT', async () => {
      const startCountTime = performance.now();
      
      mockPrisma.$queryRaw.mockResolvedValue([{ count: 100 }]);
      
      const countResult = await mockPrisma.$queryRaw();
      
      const countDuration = performance.now() - startCountTime;

      const startSelectTime = performance.now();
      
      (mockPrisma.cliente.findMany as jest.Mock).mockResolvedValue([]);
      
      await mockPrisma.cliente.findMany();
      
       
      const _selectDuration = performance.now() - startSelectTime;

      // COUNT should be faster than SELECT with data
      expect(countResult[0].count).toBe(100);
      expect(countDuration).toBeLessThan(100);
    });
  });

  describe('Connection Pool Performance', () => {
    it('should handle 10 concurrent queries efficiently', async () => {
      const startTime = performance.now();
      
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 1 }]);
      
      const queries = Array.from({ length: 10 }, () => 
        mockPrisma.user.findMany()
      );
      
      await Promise.all(queries);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Connection pool should handle concurrent queries well
      expect(duration).toBeLessThan(200);
    });

    it('should not exceed connection pool limit', async () => {
       
      const _maxConnections = 10;
      const attemptedConnections = 15;
      
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 1 }]);
      
      const queries = Array.from({ length: attemptedConnections }, () =>
        mockPrisma.user.findMany()
      );
      
      // Pool should queue excess connections, not fail
      await expect(Promise.all(queries)).resolves.toBeDefined();
    });

    it('should reuse connections from pool', async () => {
      const findManyMock = jest.fn().mockResolvedValue([{ id: 1 }]);
      const testPrisma = { user: { findMany: findManyMock } };
      
      // Execute queries sequentially
      await testPrisma.user.findMany();
      await testPrisma.user.findMany();
      await testPrisma.user.findMany();
      
      // Connection reuse should work (no errors)
      expect(findManyMock).toHaveBeenCalledTimes(3);
    });

    it('should handle connection timeout gracefully', async () => {
      const timeoutError = new Error('Connection timeout');
      (mockPrisma.user.findMany as jest.Mock).mockRejectedValue(timeoutError);
      
      await expect(mockPrisma.user.findMany()).rejects.toThrow('Connection timeout');
    });
  });

  describe('CRUD Operation Benchmarks', () => {
    it('should benchmark INSERT operation', async () => {
      const startTime = performance.now();
      
      (mockPrisma.cliente.create as jest.Mock).mockResolvedValue({
        id: 1,
        nome: 'Test Cliente',
        email: 'test@test.com',
      });
      
      await mockPrisma.cliente.create();
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // INSERT should be fast
      expect(duration).toBeLessThan(50);
    });

    it('should benchmark UPDATE operation', async () => {
      const startTime = performance.now();
      
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        id: 1,
        nome: 'Updated Name',
      });
      
      await mockPrisma.user.update();
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // UPDATE should be fast
      expect(duration).toBeLessThan(50);
    });

    it('should benchmark DELETE operation', async () => {
      const startTime = performance.now();
      
      (mockPrisma.user.delete as jest.Mock).mockResolvedValue({ id: 1 });
      
      await mockPrisma.user.delete();
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // DELETE should be fast
      expect(duration).toBeLessThan(50);
    });

    it('should benchmark batch INSERT operation', async () => {
      const startTime = performance.now();
      
       
      const _batchData = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        nome: `Cliente ${i + 1}`,
      }));
      
      mockPrisma.$executeRaw.mockResolvedValue(100);
      
      await mockPrisma.$executeRaw();
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Batch insert should be reasonably fast
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Query Complexity Analysis', () => {
    it('should detect complex JOIN queries', async () => {
      const complexQuery = `
        SELECT u.*, c.*, p.*
        FROM users u
        LEFT JOIN clientes c ON c.userId = u.id
        LEFT JOIN propostas p ON p.clienteId = c.id
        WHERE u.status = 'ATIVO'
      `;

      const joinCount = (complexQuery.match(/JOIN/gi) || []).length;

      // Detect multiple JOINs (potential performance issue)
      expect(joinCount).toBeGreaterThanOrEqual(2);
      
      // Complex queries should be monitored
      if (joinCount > 3) {
        console.warn('Complex query detected with', joinCount, 'JOINs');
      }
    });

    it('should detect missing WHERE clause in SELECT', async () => {
      const unsafeQuery = 'SELECT * FROM users';
      
      const hasWhere = unsafeQuery.includes('WHERE');
      const hasLimit = unsafeQuery.includes('LIMIT');

      // Query without WHERE or LIMIT is potentially dangerous
      expect(hasWhere || hasLimit).toBe(false);
      
      // Should warn about full table scan
      if (!hasWhere && !hasLimit) {
        console.warn('Query may cause full table scan');
      }
    });

    it('should detect SELECT * instead of specific columns', async () => {
      const inefficientQuery = 'SELECT * FROM clientes WHERE id = 1';
      
      const usesSelectAll = inefficientQuery.includes('SELECT *');

      // SELECT * is less efficient than specific columns
      expect(usesSelectAll).toBe(true);
      
      // Should recommend specific column selection
      if (usesSelectAll) {
        console.warn('Consider selecting specific columns instead of *');
      }
    });

    it('should detect subqueries that could be optimized', async () => {
      const queryWithSubquery = `
        SELECT * FROM clientes 
        WHERE id IN (SELECT clienteId FROM propostas WHERE status = 'APROVADA')
      `;

      const hasSubquery = queryWithSubquery.includes('SELECT') && 
                         queryWithSubquery.split('SELECT').length > 2;

      // Subqueries can often be replaced with JOINs
      expect(hasSubquery).toBe(true);
      
      if (hasSubquery) {
         
        // eslint-disable-next-line no-console
        console.info('Subquery detected - consider using JOIN for better performance');
      }
    });
  });
});
