/**
 * SolicitacaoCompraForm
 * Formulário para criar ou editar uma Solicitação de Compra
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@gladpros/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@gladpros/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@gladpros/ui/form';
import { Input } from '@gladpros/ui/input';
import { Textarea } from '@gladpros/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@gladpros/ui/select';
import { useToast } from '@/shared/hooks/use-toast';
import { Loader2, Plus, Trash2, Package } from 'lucide-react';

const itemSchema = z.object({
  materialId: z.number().int().positive().optional(),
  descricao: z.string().min(2, 'Mínimo 2 caracteres').max(200),
  unidade: z.string().max(20).optional(),
  quantidadeSolicitada: z.number().positive('Quantidade deve ser maior que 0'),
  custoEstimado: z.number().min(0).optional(),
  observacoes: z.string().max(300).optional(),
});

const formSchema = z.object({
  origemTipo: z.enum(['MANUAL', 'PROJETO', 'OS', 'ALERTA_ESTOQUE']).default('MANUAL'),
  observacoes: z.string().optional(),
  itens: z.array(itemSchema).min(1, 'Adicione pelo menos 1 item'),
});

type FormData = z.infer<typeof formSchema>;

type Props = {
  materiais: Array<{ id: number; codigo: string; nome: string; unidade?: { codigo?: string } | null }>;
};

const UNIDADES = ['UN', 'FT', 'LF', 'SQ FT', 'MTR', 'KG', 'LB', 'GL', 'EA', 'BX', 'BAG', 'ROLL', 'SHEET', 'PCS'];

export function SolicitacaoCompraForm({ materiais }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      origemTipo: 'MANUAL',
      observacoes: '',
      itens: [{ descricao: '', quantidadeSolicitada: 1, unidade: 'UN' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'itens' });

  // Calculate estimated total
  const itens = form.watch('itens');
  const totalEstimado = itens.reduce((acc, item) => {
    return acc + (item.custoEstimado ?? 0) * (item.quantidadeSolicitada ?? 0);
  }, 0);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/estoque/solicitacoes-compra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Erro ao criar solicitação');
      toast({ title: 'Solicitação criada com sucesso' });
      router.push(`/estoque/solicitacoes-compra/${json.data.solicitacaoCompra.id}`);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header info */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="origemTipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Solicitação</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                      <SelectItem value="PROJETO">Projeto</SelectItem>
                      <SelectItem value="OS">Ordem de Serviço</SelectItem>
                      <SelectItem value="ALERTA_ESTOQUE">Alerta de Estoque</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Motivo, urgência, contexto..."
                      className="resize-none h-[76px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Itens */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground">
              Materiais Solicitados
            </CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => append({ descricao: '', quantidadeSolicitada: 1, unidade: 'UN' })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="border border-border rounded-2xl p-4 space-y-3 bg-muted/20"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Material (optional FK) */}
                  <FormField
                    control={form.control}
                    name={`itens.${index}.materialId`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Material (opcional)</FormLabel>
                        <Select
                          onValueChange={(v) => f.onChange(v === '_none' ? undefined : Number(v))}
                          value={f.value ? String(f.value) : '_none'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar do catálogo..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_none">— Sem vínculo no catálogo —</SelectItem>
                            {materiais.map((m) => (
                              <SelectItem key={m.id} value={String(m.id)}>
                                {m.codigo} — {m.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          Se o material já existe no sistema, vincule aqui.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Descrição */}
                  <FormField
                    control={form.control}
                    name={`itens.${index}.descricao`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Descrição *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Cabo NM-B 12/2, 250ft" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <FormField
                    control={form.control}
                    name={`itens.${index}.quantidadeSolicitada`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Quantidade *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0.01}
                            step={0.01}
                            {...f}
                            onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`itens.${index}.unidade`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Unidade</FormLabel>
                        <Select onValueChange={f.onChange} value={f.value ?? 'UN'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {UNIDADES.map((u) => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`itens.${index}.custoEstimado`}
                    render={({ field: f }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Custo Estimado por Unidade ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            value={f.value ?? ''}
                            onChange={(e) => f.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name={`itens.${index}.observacoes`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Observações do Item</FormLabel>
                      <FormControl>
                        <Input placeholder="Marca preferida, especificações, etc." {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Footer: total + submit */}
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-card border border-border p-4">
          <div>
            <p className="text-sm text-muted-foreground">Valor Total Estimado</p>
            <p className="text-xl font-bold text-foreground">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalEstimado)}
            </p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="h-4 w-4 mr-2" />}
              Criar Solicitação
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
