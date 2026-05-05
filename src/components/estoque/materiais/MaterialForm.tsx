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
import { Button } from "@gladpros/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@gladpros/ui/form";
import { Input } from "@gladpros/ui/input";
import { Textarea } from "@gladpros/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select";
import { Switch } from "@gladpros/ui/switch";
import { useToast } from '@/shared/hooks/use-toast';
import { Loader2, Plus, ImagePlus, X } from 'lucide-react';
import { CreateCategoriaModal } from '@/components/estoque/categorias/CreateCategoriaModal';
import { organizeCategoriesForSelect } from '@/lib/estoque/category-utils';
import Image from 'next/image';

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
    .max(150, 'Nome deve ter no máximo 150 caracteres'),
  descricao: z.string().max(1000, 'Descrição muito longa').optional(),
  categoriaId: z.string().min(1, 'Categoria é obrigatória'),
  unidadeId: z.string().min(1, 'Unidade é obrigatória'),
  fabricante: z.string().max(100).optional(),
  modelo: z.string().max(80).optional(),
  ncm: z
    .string()
    .regex(/^\d{8}$/, 'NCM deve ter 8 dígitos')
    .optional()
    .or(z.literal('')),
  pesoUnitario: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) > 0),
      { message: 'Peso deve ser um número positivo' }
    ),
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
  // Novos campos: UPC/Barcode
  barcodeInternal: z.string().max(60, 'Barcode interno deve ter no máximo 60 caracteres').optional(),
  fotoUrl: z.string().url().optional().or(z.literal('')),
}).refine(
  (data) => Number(data.pontoReposicao) >= Number(data.estoqueMinimo),
  {
    message: 'Ponto de reposição deve ser maior ou igual ao estoque mínimo',
    path: ['pontoReposicao'],
  }
);

type MaterialFormValues = z.infer<typeof materialFormSchema>;

type MaterialFormProps = {
  categorias: Array<{ id: number; nome: string; paiId?: number | null }>;
  unidades: Array<{ id: number; nome: string; codigo: string }>;
  initialData?: Partial<MaterialFormValues> & { id?: number; fotoUrl?: string | null };
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
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [listaCategorias, setListaCategorias] = useState(() => organizeCategoriesForSelect(categorias));
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.fotoUrl ?? null);

  // Manipular criação de categoria
  const handleCategoriaCreated = (novaCategoria: { id: number; nome: string; paiId?: number | null }) => {
    // Nova lógica: readicionar à lista base plana (flat) e reorganizar tudo
    // Como a listaCategorias já está "processada" com displayNames, o ideal seria manter a lista original limpa separada,
    // mas para MVP vamos "reprocessar" tudo assumindo que a lista plana é reconstruível ou apenas reinicializar.
    // Melhor: Adicionar à lista plana original (se tivessemos guardado) e reprocessar.
    // Como simplificação, vamos assumir que organizeCategoriesForSelect lida bem se receber flatten itens novamente 
    // ou vamos pegar o state anterior, remover displayNames e reprocessar? 
    // A função espera {nome, paiId}. Se o objeto já tiver displayName não tem problema.
    // O problema é a ORDEM. A função reordena tudo.

    // Vamos fazer assim: Adiciona o novo e reprocessa a lista inteira.
    setListaCategorias(prev => {
      const flatList = [...prev, novaCategoria];
      return organizeCategoriesForSelect(flatList);
    });
    form.setValue('categoriaId', String(novaCategoria.id));
  };

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
      rastreioLote: initialData?.rastreioLote ?? true,
      possuiValidade: initialData?.possuiValidade ?? false,
      ativo: initialData?.ativo ?? true,
      barcodeInternal: initialData?.barcodeInternal || '',
      fotoUrl: initialData?.fotoUrl || '',
    },
  });

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local imediato
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    setIsUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/estoque/materiais/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Erro no upload');

      form.setValue('fotoUrl', result.data.url, { shouldValidate: true });
      setPhotoPreview(result.data.url);

      toast({ title: 'Foto enviada', description: 'Imagem salva com sucesso.' });
    } catch (err) {
      setPhotoPreview(initialData?.fotoUrl ?? null);
      form.setValue('fotoUrl', initialData?.fotoUrl || '');
      toast({
        title: 'Erro no upload',
        description: err instanceof Error ? err.message : 'Não foi possível enviar a imagem.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingPhoto(false);
      URL.revokeObjectURL(localUrl);
    }
  }

  function handleRemovePhoto() {
    setPhotoPreview(null);
    form.setValue('fotoUrl', '', { shouldValidate: true });
  }

  async function onSubmit(data: MaterialFormValues) {
    setIsSubmitting(true);

    try {
      const payload = {
        codigo: data.codigo,
        nome: data.nome,
        descricao: data.descricao || undefined,
        categoriaId: data.categoriaId ? parseInt(data.categoriaId) : undefined,
        unidadeId: parseInt(data.unidadeId),
        fabricante: data.fabricante || undefined,
        modelo: data.modelo || undefined,
        ncm: data.ncm || undefined,
        pesoUnitario: data.pesoUnitario ? parseFloat(data.pesoUnitario) : undefined,
        dimensoes: data.dimensoes || undefined,
        estoqueMinimo: parseFloat(data.estoqueMinimo),
        pontoReposicao: parseFloat(data.pontoReposicao),
        rastreioLote: data.rastreioLote,
        possuiValidade: data.possuiValidade,
        ativo: data.ativo,
        barcodeInternal: data.barcodeInternal || undefined,
        fotoUrl: data.fotoUrl || undefined,
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

            {/* Barcode Interno (Asset Tag) */}
            <FormField
              control={form.control}
              name="barcodeInternal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode Interno</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Código de barras interno"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Código para etiqueta interna (opcional)
                  </FormDescription>
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
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select
                        onValueChange={field.onChange}
                        value={field.value} // Mudado de defaultValue para value controlado
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {listaCategorias.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              Nenhuma categoria cadastrada.
                            </div>
                          ) : (
                            listaCategorias.map((cat) => (
                              <SelectItem key={cat.id} value={String(cat.id)}>
                                {(cat as any).displayName || cat.nome}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowCategoriaModal(true)}
                      title="Nova Categoria"
                      aria-label="Nova Categoria"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {listaCategorias.length === 0 && (
                    <FormDescription>
                      Cadastre uma categoria para prosseguir.
                    </FormDescription>
                  )}
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
                    value={field.value}
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

        {/* Foto do Material */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Foto do Material</h3>
          <FormField
            control={form.control}
            name="fotoUrl"
            render={() => (
              <FormItem>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {/* Preview */}
                  <div className="relative flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted">
                    {photoPreview ? (
                      <>
                        <Image
                          src={photoPreview}
                          alt="Foto do material"
                          fill
                          className="object-cover"
                          sizes="160px"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          aria-label="Remover foto"
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow hover:bg-destructive/80"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <ImagePlus className="h-8 w-8" />
                        <span className="text-xs">Sem foto</span>
                      </div>
                    )}
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/70">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex flex-col gap-2">
                    <FormLabel>Imagem do material</FormLabel>
                    <FormDescription>
                      JPEG, PNG ou WebP — máx. 10 MB
                    </FormDescription>
                    <label
                      htmlFor="foto-upload"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed"
                    >
                      <ImagePlus className="h-4 w-4" />
                      {photoPreview ? 'Trocar foto' : 'Escolher foto'}
                      <input
                        id="foto-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        disabled={isUploadingPhoto}
                        onChange={handlePhotoUpload}
                      />
                    </label>
                    <FormMessage />
                  </div>
                </div>
              </FormItem>
            )}
          />
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

      <CreateCategoriaModal
        open={showCategoriaModal}
        onOpenChange={setShowCategoriaModal}
        tipo="MATERIAL"
        onSuccess={handleCategoriaCreated}
      />
    </Form>
  );
}
