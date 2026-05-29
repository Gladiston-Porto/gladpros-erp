// @bug:USUARIOS-P3-004
// @description: Link de sidebar para usuarios deve ser visivel apenas para ADMIN.

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('REGRESSION USUARIOS-P3-004', () => {
  it('mantem requiredRoles ADMIN no item /usuarios da sidebar', () => {
    const sidebar = readFileSync(
      resolve(process.cwd(), 'src/shared/components/GladPros/index.tsx'),
      'utf8',
    );

    expect(sidebar).toMatch(
      /href:\s*["']\/usuarios["'][\s\S]*?requiredRoles:\s*\[\s*["']ADMIN["']\s*\]/,
    );
  });
});
