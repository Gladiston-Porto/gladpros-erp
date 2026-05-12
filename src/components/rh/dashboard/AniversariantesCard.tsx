/**
 * Aniversariantes Card - Mostra aniversariantes do mês
 */

import { Cake } from 'lucide-react';

export async function AniversariantesCard({ empresaId }: { empresaId: number }) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/rh/dashboard?empresaId=${empresaId}`, {
    cache: 'no-store',
  });

  const { data } = await response.json();
  const aniversariantes = data.aniversariantes || [];

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Cake className="h-5 w-5 text-pink-600" />
        <h3 className="text-lg font-semibold">Aniversariantes do Mês</h3>
      </div>

      {aniversariantes.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum aniversariante este mês</p>
      ) : (
        <div className="space-y-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {aniversariantes.map((pessoa: any) => (
            <div key={pessoa.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium">{pessoa.nomeCompleto}</p>
                <p className="text-sm text-gray-500">{pessoa.cargo}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {new Date(pessoa.dataNascimento).getDate()}/{new Date(pessoa.dataNascimento).getMonth() + 1}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
