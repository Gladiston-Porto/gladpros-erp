// @bug:USUARIOS-P3-006
// @description: Acoes do UserViewDrawer precisam de aria-label explicito.

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('REGRESSION USUARIOS-P3-006', () => {
  it('mantem aria-label nos botoes de editar e fechar do drawer', () => {
    const drawer = readFileSync(
      resolve(process.cwd(), 'src/app/(dashboard)/usuarios/_components/UserViewDrawer.tsx'),
      'utf8',
    );

    expect(drawer).toMatch(/onClick=\{handleEdit\}[\s\S]{0,160}aria-label="Editar usuário"/);
    expect(drawer).toMatch(
      /onClick=\{onClose\}[\s\S]{0,160}aria-label="Fechar detalhes do usuário"/,
    );
  });
});
