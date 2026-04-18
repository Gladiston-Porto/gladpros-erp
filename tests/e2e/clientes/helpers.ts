import { PrismaClient } from '@prisma/client';
import type { Page } from '@playwright/test';

const prisma = new PrismaClient();

type JsonRecord = Record<string, unknown>;

export function uniqueSuffix(prefix = 'clientes-e2e') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildPfPayload(suffix: string) {
  return {
    tipo: 'PF',
    nomeCompleto: `Cliente PF ${suffix}`,
    email: `${suffix}@e2e-test.com`,
    telefone: '4695550101',
    tipoDocumentoPF: 'SSN',
    ssn: '123-45-6789',
    addressStreet: '100 Test Lane',
    addressUnit: 'Apt 1',
    addressCity: 'Dallas',
    addressState: 'TX',
    addressZip: '75201',
    addressCounty: 'Dallas County',
    observacoes: 'Criado automaticamente pelo E2E de clientes',
  } as const;
}

export function buildPjPayload(suffix: string) {
  return {
    tipo: 'PJ',
    nomeFantasia: `Cliente PJ ${suffix}`,
    razaoSocial: `Cliente PJ ${suffix} LLC`,
    email: `${suffix}@e2e-test.com`,
    telefone: '2145550110',
    ein: '12-3456789',
    addressStreet: '200 Business Ave',
    addressUnit: 'Suite 20',
    addressCity: 'Irving',
    addressState: 'TX',
    addressZip: '75039',
    addressCounty: 'Dallas County',
    observacoes: 'Pessoa jurídica criada automaticamente pelo E2E de clientes',
  } as const;
}

export async function apiCreateCliente(page: Page, token: string, payload: JsonRecord) {
  const response = await page.request.post('/api/clientes', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: payload,
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok()) {
    throw new Error((json as { message?: string; error?: string }).message || (json as { error?: string }).error || 'Falha ao criar cliente via API');
  }

  return json as { data: { id: number } };
}

export async function apiDeleteCliente(page: Page, token: string, clienteId: number) {
  await page.request.delete(`/api/clientes/${clienteId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function findClienteIdByEmail(email: string) {
  const cliente = await prisma.cliente.findFirst({
    where: { email },
    select: { id: true },
    orderBy: { id: 'desc' },
  });

  return cliente?.id ?? null;
}

export async function createProjetoDependency(clienteId: number, userId: number) {
  const suffix = uniqueSuffix('proj');
  const projeto = await prisma.projeto.create({
    data: {
      clienteId,
      numeroProjeto: `E2E-${suffix}`.slice(0, 30),
      titulo: `Projeto bloqueador ${suffix}`,
      criadoPor: userId,
    },
    select: { id: true },
  });

  return projeto.id;
}

export async function cleanupProjeto(projectId: number | null | undefined) {
  if (!projectId) return;
  await prisma.projeto.deleteMany({ where: { id: projectId } });
}

export async function cleanupClienteByEmail(email: string) {
  const clientes = await prisma.cliente.findMany({
    where: { email },
    select: { id: true },
  });

  for (const cliente of clientes) {
    await prisma.projeto.deleteMany({ where: { clienteId: cliente.id, numeroProjeto: { startsWith: 'E2E-' } } });
    await prisma.invoicePayment.deleteMany({
      where: {
        invoice: {
          clienteId: cliente.id,
        },
      },
    });
    await prisma.invoice.deleteMany({ where: { clienteId: cliente.id, numeroInvoice: { startsWith: 'E2E-' } } });
    await prisma.revenue.deleteMany({ where: { clienteId: cliente.id, descricao: { contains: 'E2E' } } });
    await prisma.cliente.deleteMany({ where: { id: cliente.id } });
  }
}
