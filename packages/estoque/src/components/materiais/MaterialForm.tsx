/**
 * MaterialForm Component
 * Formulário para criar/editar materiais
 */

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/shared/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { useToast } from '@/shared/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Schema de validação
const materialFormSchema = z.object({
  codigo: z
    .string()
    .min(1, 'Código é obrigatório')
    .max(50, 'Código deve ter no máximo 50 caracteres')
    .regex(/^[A-Z0-9-]+$/, 'Use apenas letras maiúsculas, números e hífen'),
  nome: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(200, 'Nome deve ter no máximo 200 caracteres'),
  descricao: z.string().max(1000, 'Descrição muito longa').optional(),
  categoriaId: z.string().min(1, 'Categoria é obrigatória'),
  unidadeId: z.string().min(1, 'Unidade é obrigatória'),
  fabricante: z.string().max(100).optional(),
  modelo: z.string().max(100).optional(),
  ncm: z
    .string()
    .regex(/^\d{8}$/, 'NCM deve ter 8 dígitos')
    .optional()
    .or(z.literal('')),
  pesoUnitario: z.string().optional(),
  dimensoes: z.string().max(100).optional(),
  estoqueMinimo: z
    .string()
    .min(1, 'Estoque mínimo é obrigatório')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Estoque mínimo deve ser um número positivo',
    }),
  pontoReposicao: z
    .string()
    .min(1, 'Ponto de reposição é obrigatório')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Ponto de reposição deve ser um número positivo',
    }),
  rastreioLote: z.boolean(),
  possuiValidade: z.boolean(),
  ativo: z.boolean(),
}).refine(
  (data) => Number(data.pontoReposicao) >= Number(data.estoqueMinimo),
  {
    message: 'Ponto de reposição deve ser maior ou igual ao estoque mínimo',
    path: ['pontoReposicao'],
  }
);

type MaterialFormValues = z.infer<typeof materialFormSchema>;

type MaterialFormProps = {
  categorias: Array<{ id: number; nome: string }>;
  unidades: Array<{ id: number; nome: string; codigo: string }>;
  initialData?: Partial<MaterialFormValues> & { id?: number };
  mode?: 'create' | 'edit';
};

export function MaterialForm({
  categorias,
  unidades,
  initialData,
  mode = 'create',
}: MaterialFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      codigo: initialData?.codigo || '',
      nome: initialData?.nome || '',
      descricao: initialData?.descricao || '',
      categoriaId: initialData?.categoriaId || '',
      unidadeId: initialData?.unidadeId || '',
      fabricante: initialData?.fabricante || '',
      modelo: initialData?.modelo || '',
      ncm: initialData?.ncm || '',
      pesoUnitario: initialData?.pesoUnitario || '',
      dimensoes: initialData?.dimensoes || '',
      estoqueMinimo: initialData?.estoqueMinimo || '0',
      pontoReposicao: initialData?.pontoReposicao || '0',
      rastreioLote: initialData?.rastreioLote ?? false,
      possuiValidade: initialData?.possuiValidade ?? false,
      ativo: initialData?.ativo ?? true,
    },
  });

  async function onSubmit(data: MaterialFormValues) {
    setIsSubmitting(true);

    try {
      const payload = {
        codigo: data.codigo,
        nome: data.nome,
        descricao: data.descricao || null,
        categoriaId: parseInt(data.categoriaId),
        unidadeId: parseInt(data.unidadeId),
        fabricante: data.fabricante || null,
        modelo: data.modelo || null,
        ncm: data.ncm || null,
        pesoUnitario: data.pesoUnitario ? parseFloat(data.pesoUnitario) : null,
        dimensoes: data.dimensoes || null,
        estoqueMinimo: parseFloat(data.estoqueMinimo),
        pontoReposicao: parseFloat(data.pontoReposicao),
        rastreioLote: data.rastreioLote,
        possuiValidade: data.possuiValidade,
        ativo: data.ativo,
      };

      const url =
        mode === 'create'
          ? '/api/estoque/materiais'
          : `/api/estoque/materiais/${initialData?.id}`;

      const method = mode === 'create' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar material');
      }

      toast({
        title: mode === 'create' ? 'Material criado!' : 'Material atualizado!',
        description:
          mode === 'create'
            ? 'O material foi cadastrado com sucesso.'
            : 'As alterações foram salvas.',
      });

      router.push('/estoque/materiais');
      router.refresh();
    } catch (error) {
      console.error('Erro ao salvar material:', error);
      toast({
        title: 'Erro',
        description:
          error instanceof Error
            ? error.message
            : 'Ocorreu um erro ao salvar o material',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Informações Básicas */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Informações Básicas</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Código */}
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="MAT-001"
                      {...field}
                      disabled={mode === 'edit'}
                    />
                  </FormControl>
                  <FormDescription>
                    Código único (letras maiúsculas, números e hífen)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nome */}
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do material" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categoria */}
            <FormField
              control={form.control}
              name="categoriaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Unidade */}
            <FormField
              control={form.control}
              name="unidadeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidade *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma unidade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {unidades.map((und) => (
                        <SelectItem key={und.id} value={String(und.id)}>
                          {und.nome} ({und.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrição (full width) */}
            <div className="sm:col-span-2">
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição detalhada do material"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* Detalhes Técnicos */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Detalhes Técnicos</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Fabricante */}
            <FormField
              control={form.control}
              name="fabricante"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fabricante</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do fabricante" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Modelo */}
            <FormField
              control={form.control}
              name="modelo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo</FormLabel>
                  <FormControl>
                    <Input placeholder="Modelo/referência" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* NCM */}
            <FormField
              control={form.control}
              name="ncm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NCM</FormLabel>
                  <FormControl>
                    <Input placeholder="12345678" maxLength={8} {...field} />
                  </FormControl>
                  <FormDescription>
                    Nomenclatura Comum do Mercosul (8 dígitos)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Peso Unitário */}
            <FormField
              control={form.control}
              name="pesoUnitario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso Unitário (kg)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dimensões */}
            <div className="sm:col-span-2">
              <FormField
                control={form.control}
                name="dimensoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dimensões</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 100x50x30 cm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* Controle de Estoque */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Controle de Estoque</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Estoque Mínimo */}
            <FormField
              control={form.control}
              name="estoqueMinimo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estoque Mínimo *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Quantidade mínima antes de alertar
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ponto de Reposição */}
            <FormField
              control={form.control}
              name="pontoReposicao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ponto de Reposição *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Quantidade ideal para reposição
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rastreio de Lote */}
            <FormField
              control={form.control}
              name="rastreioLote"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Rastreio de Lote</FormLabel>
                    <FormDescription>
                      Controlar estoque por lotes
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Possui Validade */}
            <FormField
              control={form.control}
              name="possuiValidade"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Possui Validade</FormLabel>
                    <FormDescription>
                      Material tem data de validade
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Status */}
        {mode === 'edit' && (
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Status</h3>
            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Material Ativo</FormLabel>
                    <FormDescription>
                      Material disponível para uso
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Ações */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Criar Material' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
