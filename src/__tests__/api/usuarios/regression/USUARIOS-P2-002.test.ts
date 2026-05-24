// @bug:USUARIOS-P2-002
// @description: Model Delegacao deve manter empresaId e indice por empresaId no schema Prisma.

import { readFileSync } from 'fs';
import { join } from 'path';

describe('REGRESSION USUARIOS-P2-002', () => {
  it('model Delegacao possui empresaId e @@index([empresaId])', () => {
    const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
    const schema = readFileSync(schemaPath, 'utf8');

    const modelMatch = schema.match(/model\s+Delegacao\s*\{[\s\S]*?\n\}/);
    expect(modelMatch).toBeTruthy();

    const model = modelMatch?.[0] ?? '';
    expect(model).toMatch(/\n\s*empresaId\s+Int\b/);
    expect(model).toMatch(/@@index\(\[empresaId\]\)/);
  });
});
