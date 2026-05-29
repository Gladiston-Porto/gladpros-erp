// @bug:USUARIOS-P3-005
// @description: Data exibida em usuarios nao deve usar getters UTC que causam off-by-one em Chicago.

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('REGRESSION USUARIOS-P3-005', () => {
  it('usa America/Chicago e nao getUTC* no helper de data do editor', () => {
    const editor = readFileSync(
      resolve(process.cwd(), 'src/app/(dashboard)/usuarios/[id]/UserEditClient.tsx'),
      'utf8',
    );

    expect(editor).toContain("timeZone: 'America/Chicago'");
    expect(editor).not.toMatch(/getUTC(Month|Date|FullYear|Hours|Minutes|Seconds)\s*\(/);
  });
});
