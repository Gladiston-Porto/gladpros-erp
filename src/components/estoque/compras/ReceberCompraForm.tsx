'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@gladpros/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@gladpros/ui/card';
import { useToast } from '@gladpros/ui/toast';
import { Package, Save, AlertTriangle } from 'lucide-react';
import {} from '@/lib/estoque/utils/formatters';

// Schema para validação
const receberCompraSchema = z.object({
  dataRecebimento: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Data inválida',
  }),
  itens: z
    .array(
      z.object({
        itemId: z.number(),
        materialId: z.number().nullable().optional(),
        equipamentoId: z.number().nullable().optional(),
        nome: z.string(),
        quantidadePedida: z.number(),
        quantidadeRecebida: z.coerce.number().min(0, 'Quantidade deve ser positiva'),
        localizacaoId: z.coerce.number().min(1, 'Selecione uma localização'),
        lote: z.string().optional(),
        unidade: z.string().optional(),
      }),
    )
    .refine((items) => items.some((item) => item.quantidadeRecebida > 0), {
      message: 'Ao menos um item deve ser recebido',
      path: ['root'], // This might need to be handled carefully in UI
    }),
});

type ReceberCompraFormData = z.infer<typeof receberCompraSchema>;

type ReceberCompraFormProps = {
  compra: {
    id: number;
    numeroNf: string | null;
    fornecedor: { nome: string } | null;
    itens: Array<{
      id: number;
      material?: { id: number; nome: string; unidade: { codigo: string } } | null;
      equipamento?: { id: number; nome: string } | null;
      quantidade: number;
      custoUnitario: number;
      quantidadeEntregue?: number; // Já entregue anteriormente
    }>;
  };
  localizacoes: Array<{ id: number; nome: string; codigo: string }>;
};

export function ReceberCompraForm({ compra, localizacoes }: ReceberCompraFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializa o form com os itens pendentes
  const defaultValues: ReceberCompraFormData = {
    dataRecebimento: new Date().toISOString().split('T')[0],
    itens: compra.itens.map((item) => ({
      itemId: item.id,
      materialId: item.material?.id,
      equipamentoId: item.equipamento?.id,
      nome: item.material?.nome || item.equipamento?.nome || 'Item desconhecido',
      unidade: item.material?.unidade.codigo || 'UN',
      quantidadePedida: Number(item.quantidade),
      // Default: O que falta receber (Total - Entregue)
      quantidadeRecebida: Math.max(
        0,
        Number(item.quantidade) - Number(item.quantidadeEntregue ?? 0),
      ),
      localizacaoId: 0, // Usuário deve selecionar
      lote: '',
    })),
  };

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReceberCompraFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(receberCompraSchema) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValues: defaultValues as any, // Casting to avoid complex type mismatch inference issues between Zod and RHF types
  });

  const { fields } = useFieldArray({
    control,
    name: 'itens',
  });

  const onSubmit = async (data: ReceberCompraFormData) => {
    // Filtrar apenas itens com quantidade > 0 para enviar
    const itensParaReceber = data.itens
      .filter((item) => item.quantidadeRecebida > 0)
      .map((item) => ({
        itemId: item.itemId,
        quantidadeRecebida: item.quantidadeRecebida,
        localizacaoId: item.localizacaoId,
        lote: item.lote || undefined,
      }));

    if (itensParaReceber.length === 0) {
      toast.error('Informe a quantidade recebida para pelo menos um item.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/estoque/compras/${compra.id}/receber`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataRecebimento: new Date(data.dataRecebimento).toISOString(),
          itensRecebidos: itensParaReceber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar recebimento');
      }

      toast.success('Recebimento registrado com sucesso!');
      router.push(`/estoque/compras/${compra.id}`);
      router.refresh(); // Atualiza dados da página de detalhes
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Dados do Recebimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Recebimento
              </label>
              <input
                type="date"
                {...register('dataRecebimento')}
                aria-label="Data de recebimento"
                className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.dataRecebimento && (
                <p className="text-xs text-red-500 mt-1">{errors.dataRecebimento.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
              <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-700">
                {compra.fornecedor?.nome ?? '—'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Itens da Compra</CardTitle>
          <p className="text-sm text-muted-foreground">
            Confirme as quantidades e informe a localização de entrada.
          </p>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="text-center py-4 text-gray-500">Nenhum item pendente para receber.</p>
          ) : (
            <div className="space-y-6">
              {fields.map((field, index) => {
                const qtdPedida = defaultValues.itens?.[index]?.quantidadePedida || 0;
                const qtdEntregue = compra.itens[index]?.quantidadeEntregue ?? 0;
                const saldoPendente = qtdPedida - qtdEntregue;

                return (
                  <div key={field.id} className="p-4 border rounded-lg bg-gray-50/50">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div>
                        <h4 className="font-medium text-base">{field.nome}</h4>
                        <div className="flex gap-4 text-sm text-gray-600 mt-1">
                          <span>
                            Pedido:{' '}
                            <span className="font-semibold">
                              {qtdPedida} {field.unidade}
                            </span>
                          </span>
                          <span>
                            Já Entregue:{' '}
                            <span className="font-semibold">
                              {qtdEntregue} {field.unidade}
                            </span>
                          </span>
                          <span
                            className={
                              saldoPendente > 0
                                ? 'text-orange-600 font-medium'
                                : 'text-green-600 font-medium'
                            }
                          >
                            Pendente: {saldoPendente} {field.unidade}
                          </span>
                        </div>
                      </div>

                      {/* Checkbox para "Receber Tudo" (optional UX improvement, keeping simple for now) */}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      {/* Quantidade a Receber */}
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Qtd. Recebida ({field.unidade})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          {...register(`itens.${index}.quantidadeRecebida`)}
                          aria-label={`Quantidade recebida de ${field.nome} (${field.unidade})`}
                          className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        {errors.itens?.[index]?.quantidadeRecebida && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.itens[index]?.quantidadeRecebida?.message}
                          </p>
                        )}
                      </div>

                      {/* Localização */}
                      <div className="md:col-span-5">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Localização de Entrada <span className="text-red-500">*</span>
                        </label>
                        <select
                          {...register(`itens.${index}.localizacaoId`)}
                          aria-label={`Localização de entrada para ${field.nome}`}
                          className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white"
                        >
                          <option value="0">Selecione...</option>
                          {localizacoes.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.codigo} - {loc.nome}
                            </option>
                          ))}
                        </select>
                        {errors.itens?.[index]?.localizacaoId && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.itens[index]?.localizacaoId?.message}
                          </p>
                        )}
                      </div>

                      {/* Lote */}
                      <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Lote / Nº Série (Opcional)
                        </label>
                        <input
                          type="text"
                          {...register(`itens.${index}.lote`)}
                          placeholder="Ex: LOTE-123"
                          aria-label={`Lote ou número de série para ${field.nome}`}
                          className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {errors.root && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {errors.root.message}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
              Processando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Confirmar Recebimento
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
