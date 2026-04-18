/**
 * Gateway Factory — Ponto central de injeção de dependência para gateways
 * F1.1: Providencia gateways reais (Prisma) ou mock baseado em environment
 * 
 * Regras:
 * - Em produção (process.env.USE_MOCK_GATEWAYS !== 'true'): retorna gateways Prisma
 * - Em testes (process.env.USE_MOCK_GATEWAYS === 'true' ou NODE_ENV === 'test'): retorna mocks
 * - jest.setup.js seta USE_MOCK_GATEWAYS=true automaticamente
 * 
 * @usage
 * ```ts
 * import { getFinanceGateway, getInventoryGateway, getTriageGateway } from '../gateways';
 * const gateway = getFinanceGateway();
 * ```
 */

import type { IFinanceGateway } from '../interfaces/finance-gateway.interface';
import type { IInventoryGateway } from '../interfaces/inventory-gateway.interface';
import type { ITriageGateway } from '../interfaces/triage-gateway.interface';

// ─── Lazy imports (evita carregar Prisma em contexto de teste) ───────

function createMockFinance(): IFinanceGateway {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MockFinanceGateway } = require('./mock-finance.gateway');
  return new MockFinanceGateway();
}

function createMockInventory(): IInventoryGateway {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MockInventoryGateway } = require('./mock-inventory.gateway');
  return new MockInventoryGateway({ simulateLatency: false });
}

function createMockTriage(): ITriageGateway {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MockTriageGateway } = require('./mock-triage.gateway');
  return new MockTriageGateway();
}

function createPrismaFinance(): IFinanceGateway {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaFinanceGateway } = require('./prisma-finance.gateway');
  return new PrismaFinanceGateway();
}

function createPrismaInventory(): IInventoryGateway {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaInventoryGateway } = require('./prisma-inventory.gateway');
  return new PrismaInventoryGateway();
}

function createPrismaTriage(): ITriageGateway {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaTriageGateway } = require('./prisma-triage.gateway');
  return new PrismaTriageGateway();
}

// ─── Environment check ──────────────────────────────────────────────

function shouldUseMock(): boolean {
  return (
    process.env.USE_MOCK_GATEWAYS === 'true' ||
    process.env.NODE_ENV === 'test'
  );
}

// ─── Singletons ─────────────────────────────────────────────────────

let financeGateway: IFinanceGateway | null = null;
let inventoryGateway: IInventoryGateway | null = null;
let triageGateway: ITriageGateway | null = null;

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Retorna o gateway financeiro (singleton).
 * Mock em testes, Prisma em produção.
 */
export function getFinanceGateway(): IFinanceGateway {
  if (!financeGateway) {
    financeGateway = shouldUseMock() ? createMockFinance() : createPrismaFinance();
  }
  return financeGateway;
}

/**
 * Retorna o gateway de estoque (singleton).
 * Mock em testes, Prisma em produção.
 */
export function getInventoryGateway(): IInventoryGateway {
  if (!inventoryGateway) {
    inventoryGateway = shouldUseMock() ? createMockInventory() : createPrismaInventory();
  }
  return inventoryGateway;
}

/**
 * Retorna o gateway de triagem (singleton).
 * Mock em testes, Prisma em produção.
 */
export function getTriageGateway(): ITriageGateway {
  if (!triageGateway) {
    triageGateway = shouldUseMock() ? createMockTriage() : createPrismaTriage();
  }
  return triageGateway;
}

// ─── Factory helpers (para criar instância limpa) ───────────────────

/**
 * Cria instância nova do gateway financeiro (não singleton)
 */
export function createFinanceGateway(): IFinanceGateway {
  return shouldUseMock() ? createMockFinance() : createPrismaFinance();
}

/**
 * Cria instância nova do gateway de estoque (não singleton)
 */
export function createInventoryGateway(): IInventoryGateway {
  return shouldUseMock() ? createMockInventory() : createPrismaInventory();
}

/**
 * Cria instância nova do gateway de triagem (não singleton)
 */
export function createTriageGateway(): ITriageGateway {
  return shouldUseMock() ? createMockTriage() : createPrismaTriage();
}

// ─── Reset (para testes) ────────────────────────────────────────────

/**
 * Reseta todos os singletons. Útil em setUp/tearDown de testes.
 */
export function resetAllGateways(): void {
  financeGateway = null;
  inventoryGateway = null;
  triageGateway = null;
}

export function resetFinanceGateway(): void {
  financeGateway = null;
}

export function resetInventoryGateway(): void {
  inventoryGateway = null;
}

export function resetTriageGateway(): void {
  triageGateway = null;
}
