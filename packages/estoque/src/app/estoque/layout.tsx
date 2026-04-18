/**
 * Layout do MÃ³dulo Estoque
 * Estrutura base com navegaÃ§Ã£o
 */

import { Metadata } from 'next';
import { EstoqueNavigation } from '@gladpros/estoque/components/shared/Navigation';

export const metadata: Metadata = {
  title: 'Estoque | GladPros',
  description: 'GestÃ£o de estoque, materiais e equipamentos',
};

export default function EstoqueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <EstoqueNavigation />
      <main className="flex-1 overflow-auto bg-muted/30">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

