/**
 * EquipamentoForm Component
 * Formulário completo para criar/editar equipamentos
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from "@gladpros/ui/button";
import { Input } from "@gladpros/ui/input";
import { Textarea } from "@gladpros/ui/textarea";
import { Switch } from "@gladpros/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@gladpros/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";
import { useToast } from '@/shared/hooks/use-toast';
import { equipamentoSchema } from '@/lib/estoque/utils/validators';
import type { z } from 'zod';
import type { Equipamento, Categoria } from '@/lib/estoque/types';

type EquipamentoFormData = z.infer<typeof equipamentoSchema>;

type EquipamentoFormProps = {
  mode: 'create' | 'edit';
  categorias: Pick<Categoria, 'id' | 'nome'>[];
  fornecedores: Array<{ id: number; nome: string }>;
  initialData?: Partial<Equipamento>;
};

const TIPOS = [
  { value: 'FERRAMENTA_MANUAL', label: 'Ferramenta Manual' },
  { value: 'FERRAMENTA_ELETRICA', label: 'Ferramenta Elétrica' },
  { value: 'EQUIPAMENTO_MEDICAO', label: 'Equipamento de Medição' },
  { value: 'EQUIPAMENTO_SEGURANCA', label: 'Equipamento de Segurança' },
  { value: 'ANDAIME', label: 'Andaime' },
  { value: 'ESCADA', label: 'Escada' },
  { value: 'VEICULO', label: 'Veículo' },
  { value: 'OUTRO', label: 'Outro' },
];

const STATUS = [
  { value: 'DISPONIVEL', label: 'Disponível' },
  { value: 'EM_USO', label: 'Em Uso' },
  { value: 'EM_MANUTENCAO', label: 'Em Manutenção' },
  { value: 'CALIBRACAO', label: 'Calibração' },
  { value: 'DANIFICADO', label: 'Danificado' },
  { value: 'PERDIDO', label: 'Perdido' },
  { value: 'DESCARTADO', label: 'Descartado' },
];

export function EquipamentoForm({
  mode,
  categorias,
  fornecedores,
  initialData,
}: EquipamentoFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EquipamentoFormData>({
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(equipamentoSchema) as any,
    defaultValues: {
      codigo: initialData?.codigo || '',
      nome: initialData?.nome || '',
      tipo: initialData?.tipo || 'FERRAMENTA_MANUAL',
      categoriaId: initialData?.categoriaId || undefined,
      marca: initialData?.marca || '',
      modelo: initialData?.modelo || '',
      numeroSerie: initialData?.numeroSerie || '',
      anoFabricacao: initialData?.anoFabricacao || undefined,
      dataAquisicao: initialData?.dataAquisicao
        ? new Date(initialData.dataAquisicao).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      valorAquisicao: initialData?.valorAquisicao
        ? Number(initialData.valorAquisicao)
        : 0,
      fornecedorId: initialData?.fornecedorId || undefined,
      notaFiscal: initialData?.notaFiscal || '',
      status: initialData?.status || 'DISPONIVEL',
      localizacaoAtual: initialData?.localizacaoAtual || '',
      requerCalibracao: initialData?.requerCalibracao || false,
      periodicidadeCalibracaoDias: initialData?.periodicidadeCalibracaoDias || undefined,
      ultimaCalibracao: initialData?.ultimaCalibracao
        ? new Date(initialData.ultimaCalibracao).toISOString().split('T')[0]
        : '',
      requerManutencaoPeriodica: initialData?.requerManutencaoPeriodica || false,
      periodicidadeManutencaoDias: initialData?.periodicidadeManutencaoDias || undefined,
      ultimaManutencao: initialData?.ultimaManutencao
        ? new Date(initialData.ultimaManutencao).toISOString().split('T')[0]
        : '',
      observacoes: initialData?.observacoes || '',
      ativo: initialData?.ativo ?? true,
      barcodeInternal: initialData?.barcodeInternal || '',
    },
  });

  const requerCalibracao = form.watch('requerCalibracao');
  const requerManutencao = form.watch('requerManutencaoPeriodica');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const control = form.control as any;

  const onSubmit = async (data: EquipamentoFormData) => {
    setIsSubmitting(true);

    try {
      const url =
        mode === 'create'
          ? '/api/estoque/equipamentos'
          : `/api/estoque/equipamentos/${initialData?.id}`;

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar equipamento');
      }

      toast({
        title: mode === 'create' ? 'Equipamento criado!' : 'Equipamento atualizado!',
        description:
          mode === 'create'
            ? 'O equipamento foi cadastrado com sucesso.'
            : 'As alterações foram salvas.',
      });

      router.push('/estoque/equipamentos');
      router.refresh();
    } catch (err) {
      const error = err as Error;
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
     
    <Form {...form}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
        {/* SEÇÃO 1: Identificação */}
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="EQ-001"
                      disabled={mode === 'edit'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Furadeira Profissional" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
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
                      {TIPOS.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="categoriaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* SEÇÃO 2: Especificações */}
        <Card>
          <CardHeader>
            <CardTitle>Especificações Técnicas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="marca"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Bosch" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="modelo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="GSB 13 RE" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="numeroSerie"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Série</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="123456789" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="anoFabricacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ano de Fabricação</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      placeholder="2024"
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* SEÇÃO 3: Aquisição */}
        <Card>
          <CardHeader>
            <CardTitle>Dados de Aquisição</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="dataAquisicao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Aquisição *</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="valorAquisicao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor de Aquisição ($) *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="fornecedorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fornecedores.map((forn) => (
                        <SelectItem key={forn.id} value={forn.id.toString()}>
                          {forn.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="notaFiscal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota Fiscal</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="NF-12345" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* SEÇÃO 4: Status e Localização */}
        <Card>
          <CardHeader>
            <CardTitle>Status e Localização</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATUS.map((st) => (
                        <SelectItem key={st.value} value={st.value}>
                          {st.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="localizacaoAtual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Localização Atual</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Almoxarifado - Prateleira A1" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* SEÇÃO 5: Calibração */}
        <Card>
          <CardHeader>
            <CardTitle>Calibração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={control}
              name="requerCalibracao"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Requer Calibração</FormLabel>
                    <FormDescription>
                      Este equipamento precisa de calibração periódica?
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {requerCalibracao && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={control}
                  name="periodicidadeCalibracaoDias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Periodicidade (dias)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="365"
                          onChange={(e) =>
                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="ultimaCalibracao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Última Calibração</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEÇÃO 6: Manutenção */}
        <Card>
          <CardHeader>
            <CardTitle>Manutenção Periódica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={control}
              name="requerManutencaoPeriodica"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Requer Manutenção Periódica</FormLabel>
                    <FormDescription>
                      Este equipamento precisa de manutenção regular?
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {requerManutencao && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={control}
                  name="periodicidadeManutencaoDias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Periodicidade (dias)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="180"
                          onChange={(e) =>
                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="ultimaManutencao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Última Manutenção</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEÇÃO 7: Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Observações Adicionais</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Informações adicionais sobre o equipamento..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* SEÇÃO 8: Ativo */}
        <Card>
          <CardContent className="pt-6">
            <FormField
              control={control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Equipamento Ativo</FormLabel>
                    <FormDescription>
                      Desmarque para desativar este equipamento
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Botões */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Salvando...'
              : mode === 'create'
                ? 'Criar Equipamento'
                : 'Salvar Alterações'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}
