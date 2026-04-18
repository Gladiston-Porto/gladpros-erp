/**
 * Novo Equipamento - PÃ¡gina
 */

import { EquipamentoForm } from '@gladpros/estoque/components/equipamentos/EquipamentoForm';
import { prisma } from '@/lib/prisma';

export default async function NovoEquipamentoPage() {
  // Buscar dados necessÃ¡rios
  const [categorias, fornecedores] = await Promise.all([
    prisma.categoria.findMany({
      where: { tipo: 'EQUIPAMENTO' },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    }),
    prisma.fornecedor.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Novo Equipamento</h1>
        <p className="text-muted-foreground">
          Cadastre um novo equipamento no estoque
        </p>
      </div>

      <EquipamentoForm
        mode="create"
        categorias={categorias}
        fornecedores={fornecedores}
      />
    </div>
  );
}

