jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    serviceOrder: {
      findUnique: jest.fn(),
    },
    serviceOrderAttachment: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
  can: jest.fn(),
}));

import { writeFile } from 'fs/promises';
import { prisma } from '@/lib/prisma';
import { can, requireUser } from '@/shared/lib/rbac';

const { Request, Response, Headers } = require('node-fetch');
Object.assign(global, { Request, Response, Headers });
if (typeof Response.json !== 'function') {
  Response.json = (data: unknown, init?: ResponseInit) => new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

const { POST } = require('../[id]/attachments/route');

function multipartRequest(file: {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}) {
  const request = new Request('http://localhost/api/service-orders/123/attachments', {
    method: 'POST',
    headers: { 'content-type': 'multipart/form-data; boundary=test' },
  });
  Object.defineProperty(request, 'formData', {
    value: jest.fn().mockResolvedValue({
      get: (key: string) => {
        if (key === 'file') return file;
        if (key === 'type') return 'BEFORE_PHOTO';
        return null;
      },
    }),
  });
  return request;
}

describe('Service Order upload hardening', () => {
  const requireUserMock = requireUser as jest.Mock;
  const canMock = can as jest.Mock;
  const serviceOrderFindUniqueMock = prisma.serviceOrder.findUnique as jest.Mock;
  const attachmentCreateMock = prisma.serviceOrderAttachment.create as jest.Mock;
  const writeFileMock = writeFile as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: '1', role: 'ADMIN', empresaId: 1 });
    canMock.mockReturnValue(true);
    serviceOrderFindUniqueMock.mockResolvedValue({ id: 123 });
    attachmentCreateMock.mockResolvedValue({ id: 1, filepath: 'service-orders/123/before-photo/file.png' });
  });

  it('derives stored attachment extension from validated MIME type, not attacker filename', async () => {
    const response = await POST(
      multipartRequest({
        name: 'invoice.php',
        type: 'image/png',
        size: 1024,
        arrayBuffer: jest.fn().mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer),
      }),
      { params: Promise.resolve({ id: '123' }) }
    );
    const createArgs = attachmentCreateMock.mock.calls[0][0];
    const savedPath = createArgs.data.filepath as string;
    const writePath = String(writeFileMock.mock.calls[0][0]);

    expect(response.status).toBe(201);
    expect(savedPath).toMatch(/\.png$/);
    expect(savedPath).not.toContain('.php');
    expect(writePath).toMatch(/\.png$/);
    expect(writePath).not.toContain('.php');
  });

  it('rejects files whose magic bytes do not match the declared MIME type', async () => {
    const response = await POST(
      multipartRequest({
        name: 'fake.png',
        type: 'image/png',
        size: 1024,
        arrayBuffer: jest.fn().mockResolvedValue(new TextEncoder().encode('<?php echo "x";').buffer),
      }),
      { params: Promise.resolve({ id: '123' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(writeFileMock).not.toHaveBeenCalled();
    expect(attachmentCreateMock).not.toHaveBeenCalled();
  });
});
