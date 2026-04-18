/**
 * MovimentacaoForm Component
 * Formulário simplificado para registrar movimentações
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  tipo: z.enum([
    'ENTRADA',
    'SAIDA',
    'TRANSFERENCIA',
    'AJUSTE_POSITIVO',
    'AJUSTE_NEGATIVO',
    'RESERVA',
    'CANCELAMENTO_RESERVA',
    'DEVOLUCAO',
    'PERDA',
  ]),
  materialId: z.string().optional(),
  equipamentoId: z.string().optional(),
  quantidade: z.number().positive(),
  projetoId: z.string().optional(),
  observacao: z.string().max(500).optional(),
  dataMovimentacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((data) => data.materialId || data.equipamentoId, {
  message: 'Selecione um Material ou Equipamento',
  path: ['materialId'],
});

type FormData = z.infer<typeof formSchema>;

type MovimentacaoFormProps = {
  materiais: Array<{ id: string; nome: string }>;
  equipamentos: Array<{ id: string; nome: string }>;
  projetos: Array<{ id: string; nome: string }>;
};

export function MovimentacaoForm({ materiais, equipamentos, projetos }: MovimentacaoFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo: 'ENTRADA',
      dataMovimentacao: new Date().toISOString().split('T')[0],
      quantidade: 1,
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/estoque/movimentacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Erro ao registrar movimentação');

      toast({
        title: 'Movimentação registrada',
        description: 'A movimentação foi registrada com sucesso.',
      });

      router.push('/estoque/movimentacoes');
      router.refresh();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar a movimentação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados da Movimentação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ENTRADA">Entrada</SelectItem>
                        <SelectItem value="SAIDA">Saída</SelectItem>
                        <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                        <SelectItem value="AJUSTE_POSITIVO">Ajuste Positivo</SelectItem>
                        <SelectItem value="AJUSTE_NEGATIVO">Ajuste Negativo</SelectItem>
                        <SelectItem value="RESERVA">Reserva</SelectItem>
                        <SelectItem value="CANCELAMENTO_RESERVA">Cancel. Reserva</SelectItem>
                        <SelectItem value="DEVOLUCAO">Devolução</SelectItem>
                        <SelectItem value="PERDA">Perda</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataMovimentacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="materialId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {materiais.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="equipamentoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipamento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {equipamentos.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projetoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projeto</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projetos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação</FormLabel>
                  <FormControl>
                    <Textarea rows={3} maxLength={500} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar Movimentação
          </Button>
        </div>
      </form>
    </Form>
  );
}
