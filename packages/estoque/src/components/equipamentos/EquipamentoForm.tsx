/**
 * EquipamentoForm Component
 * FormulÃ¡rio completo para criar/editar equipamentos
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/use-toast';
import { equipamentoSchema } from '../../lib/utils/validators';
import type { z } from 'zod';
import type { Equipamento, Categoria } from '../../lib/types';

type EquipamentoFormData = z.infer<typeof equipamentoSchema>;

// Tipo ajustado para aceitar os tipos do Prisma tambÃ©m
type EquipamentoInitialData = Partial<Equipamento> & {
  dataAquisicao?: Date | string;
  ultimaCalibracao?: Date | string | null;
  ultimaManutencao?: Date | string | null;
};

type EquipamentoFormProps = {
  mode: 'create' | 'edit';
  categorias: Pick<Categoria, 'id' | 'nome'>[];
  fornecedores: Array<{ id: number; nome: string }>;
  initialData?: Partial<Equipamento>;
};

const TIPOS = [
  { value: 'FERRAMENTA_MANUAL', label: 'Ferramenta Manual' },
  { value: 'FERRAMENTA_ELETRICA', label: 'Ferramenta ElÃ©trica' },
  { value: 'EQUIPAMENTO_MEDICAO', label: 'Equipamento de MediÃ§Ã£o' },
  { value: 'EQUIPAMENTO_SEGURANCA', label: 'Equipamento de SeguranÃ§a' },
  { value: 'ANDAIME', label: 'Andaime' },
  { value: 'ESCADA', label: 'Escada' },
  { value: 'VEICULO', label: 'VeÃ­culo' },
  { value: 'OUTRO', label: 'Outro' },
];

const STATUS = [
  { value: 'DISPONIVEL', label: 'DisponÃ­vel' },
  { value: 'EM_USO', label: 'Em Uso' },
  { value: 'EM_MANUTENCAO', label: 'Em ManutenÃ§Ã£o' },
  { value: 'CALIBRACAO', label: 'CalibraÃ§Ã£o' },
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
    },
  });

  const requerCalibracao = form.watch('requerCalibracao');
  const requerManutencao = form.watch('requerManutencaoPeriodica');

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
            : 'As alteraÃ§Ãµes foram salvas.',
      });

      router.push('/estoque/equipamentos');
      router.refresh();
    } catch (error: any) {
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* SEÃ‡ÃƒO 1: IdentificaÃ§Ã£o */}
        <Card>
          <CardHeader>
            <CardTitle>IdentificaÃ§Ã£o</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField<EquipamentoFormData>
              control={form.control as any}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CÃ³digo *</FormLabel>
                  <FormControl>
                    <Input
                      {...field} value={field.value?.toString() ?? ''}
                      placeholder="EQ-001"
                      disabled={mode === 'edit'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField<EquipamentoFormData>
              control={form.control as any}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value?.toString() ?? ''} placeholder="Furadeira Profissional" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField<EquipamentoFormData>
              control={form.control as any}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
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

            <FormField<EquipamentoFormData>
              control={form.control as any}
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

        {/* SEÃ‡ÃƒO 2: EspecificaÃ§Ãµes */}
        <Card>
          <CardHeader>
            <CardTitle>EspecificaÃ§Ãµes TÃ©cnicas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField<EquipamentoFormData>
              control={form.control as any}
              name="marca"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value?.toString() ?? ''} placeholder="Bosch" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField<EquipamentoFormData>
              control={form.control as any}
              name="modelo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value?.toString() ?? ''} placeholder="GSB 13 RE" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField<EquipamentoFormData>
              control={form.control as any}
              name="numeroSerie"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NÃºmero de SÃ©rie</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value?.toString() ?? ''} placeholder="123456789" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField<EquipamentoFormData>
              control={form.control as any}
              name="anoFabricacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ano de FabricaÃ§Ã£o</FormLabel>
                  <FormControl>
                    <Input
                      {...field} value={field.value?.toString() ?? ''}
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

        {/* SEÃ‡ÃƒO 3: AquisiÃ§Ã£o */}
        <Card>
          <CardHeader>
            <CardTitle>Dados de AquisiÃ§Ã£o</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField<EquipamentoFormData>
              control={form.control as any}
              name="dataAquisicao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de AquisiÃ§Ã£o *</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value?.toString() ?? ''} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField<EquipamentoFormData>
              control={form.control as any}
              name="valorAquisicao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor de AquisiÃ§Ã£o (R$) *</FormLabel>
                  <FormControl>
                    <Input
                      {...field} value={field.value?.toString() ?? ''}
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

            <FormField<EquipamentoFormData>
              control={form.control as any}
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

            <FormField<EquipamentoFormData>
              control={form.control as any}
              name="notaFiscal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota Fiscal</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value?.toString() ?? ''} placeholder="NF-12345" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* SEÃ‡ÃƒO 4: Status e LocalizaÃ§Ã£o */}
        <Card>
          <CardHeader>
            <CardTitle>Status e LocalizaÃ§Ã£o</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField<EquipamentoFormData>
              control={form.control as any}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
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

            <FormField<EquipamentoFormData>
              control={form.control as any}
              name="localizacaoAtual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LocalizaÃ§Ã£o Atual</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value?.toString() ?? ''} placeholder="Almoxarifado - Prateleira A1" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* SEÃ‡ÃƒO 5: CalibraÃ§Ã£o */}
        <Card>
          <CardHeader>
            <CardTitle>CalibraÃ§Ã£o</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField<EquipamentoFormData>
              control={form.control as any}
              name="requerCalibracao"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Requer CalibraÃ§Ã£o</FormLabel>
                    <FormDescription>
                      Este equipamento precisa de calibraÃ§Ã£o periÃ³dica?
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {requerCalibracao && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField<EquipamentoFormData>
                  control={form.control as any}
                  name="periodicidadeCalibracaoDias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Periodicidade (dias)</FormLabel>
                      <FormControl>
                        <Input
                          {...field} value={field.value?.toString() ?? ''}
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

                <FormField<EquipamentoFormData>
                  control={form.control as any}
                  name="ultimaCalibracao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ãšltima CalibraÃ§Ã£o</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value?.toString() ?? ''} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEÃ‡ÃƒO 6: ManutenÃ§Ã£o */}
        <Card>
          <CardHeader>
            <CardTitle>ManutenÃ§Ã£o PeriÃ³dica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField<EquipamentoFormData>
              control={form.control as any}
              name="requerManutencaoPeriodica"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Requer ManutenÃ§Ã£o PeriÃ³dica</FormLabel>
                    <FormDescription>
                      Este equipamento precisa de manutenÃ§Ã£o regular?
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {requerManutencao && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField<EquipamentoFormData>
                  control={form.control as any}
                  name="periodicidadeManutencaoDias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Periodicidade (dias)</FormLabel>
                      <FormControl>
                        <Input
                          {...field} value={field.value?.toString() ?? ''}
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

                <FormField<EquipamentoFormData>
                  control={form.control as any}
                  name="ultimaManutencao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ãšltima ManutenÃ§Ã£o</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value?.toString() ?? ''} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEÃ‡ÃƒO 7: ObservaÃ§Ãµes */}
        <Card>
          <CardHeader>
            <CardTitle>ObservaÃ§Ãµes Adicionais</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField<EquipamentoFormData>
              control={form.control as any}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field} value={field.value?.toString() ?? ''}
                      placeholder="InformaÃ§Ãµes adicionais sobre o equipamento..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* SEÃ‡ÃƒO 8: Ativo */}
        <Card>
          <CardContent className="pt-6">
            <FormField<EquipamentoFormData>
              control={form.control as any}
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
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* BotÃµes */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Salvando...'
              : mode === 'create'
              ? 'Criar Equipamento'
              : 'Salvar AlteraÃ§Ãµes'}
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

