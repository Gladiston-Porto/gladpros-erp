/**
 * MaterialForm Component — v2
 * Formulário para criar/editar materiais com entrada inicial de estoque
 */

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { Button } from "@gladpros/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@gladpros/ui/form";
import { Input } from "@gladpros/ui/input";
import { Textarea } from "@gladpros/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select";
import { Switch } from "@gladpros/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@gladpros/ui/dialog";
import { useToast } from '@/shared/hooks/use-toast';
import { Loader2, Plus, ImagePlus, X, Package, MapPin, RotateCcw, Barcode, Trash2 } from 'lucide-react';
import { CreateCategoriaModal } from '@/components/estoque/categorias/CreateCategoriaModal';
import { organizeCategoriesForSelect } from '@/lib/estoque/category-utils';
import Image from 'next/image';

// Schema de validação
const materialFormSchema = z.object({
  // ── Informações Básicas ──────────────────────────────────────────────────
  codigo: z.string().optional(),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(150, 'Nome deve ter no máximo 150 caracteres'),
  descricao: z.string().max(1000, 'Descrição muito longa').optional(),
  categoriaId: z.string().min(1, 'Categoria é obrigatória'),
  unidadeId: z.string().min(1, 'Unidade é obrigatória'),
  // ── Detalhes Técnicos ───────────────────────────────────────────────────
  fabricante: z.string().max(100).optional(),
  modelo: z.string().max(80).optional(),
  pesoUnitario: z.string().optional().refine(
    (val) => !val || (!isNaN(Number(val)) && Number(val) > 0),
    { message: 'Peso deve ser um número positivo' }
  ),
  dimensoes: z.string().max(100).optional(),
  // ── Controle de Estoque ─────────────────────────────────────────────────
  estoqueMinimo: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: 'Estoque mínimo deve ser um número não-negativo',
  }),
  pontoReposicao: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: 'Ponto de reposição deve ser um número não-negativo',
  }),
  rastreioLote: z.boolean(),
  possuiValidade: z.boolean(),
  ativo: z.boolean(),
  fotoUrl: z.string().url().optional().or(z.literal('')),
  // ── Entrada Inicial de Estoque (create only) ────────────────────────────
  tipoEntrada: z.enum(['por_unidade', 'em_embalagem']),
  localizacaoId: z.string().optional(),
  // Por unidade
  quantidadeEntrada: z.string().optional(),
  valorUnitario: z.string().optional(),
  // Em embalagem
  packageType: z.string().optional(),
  baseQtyPerUnit: z.string().optional(),
  qtdEmbalagens: z.string().optional(),
  precoCompra: z.string().optional(),
  embBrand: z.string().optional(),
  embUpcEan: z.string().optional(),
  // ── Fornecedor & NF (create only) ──────────────────────────────────────
  fornecedorNome: z.string().max(150).optional(),
  numeroNf: z.string().max(60).optional(),
  dataCompra: z.string().optional(),
}).refine(
  (data) => Number(data.pontoReposicao) >= Number(data.estoqueMinimo),
  { message: 'Ponto de reposição deve ser maior ou igual ao estoque mínimo', path: ['pontoReposicao'] }
);

type MaterialFormValues = z.infer<typeof materialFormSchema>;

// Tipos de embalagem disponíveis
const PURCHASE_PACKAGE_TYPES = [
  { value: 'ROLL', label: 'Rolo (Roll)' },
  { value: 'BOX', label: 'Caixa (Box)' },
  { value: 'BAG', label: 'Saco (Bag)' },
  { value: 'PACK', label: 'Pacote (Pack)' },
  { value: 'BUNDLE', label: 'Fardo (Bundle)' },
  { value: 'PALLET', label: 'Pallet' },
  { value: 'BUCKET', label: 'Balde (Bucket)' },
  { value: 'DRUM', label: 'Tambor (Drum)' },
  { value: 'COIL', label: 'Bobina (Coil)' },
  { value: 'TUBE', label: 'Tubo/Vara (Tube)' },
  { value: 'SHEET', label: 'Chapa/Folha (Sheet)' },
  { value: 'SET', label: 'Conjunto (Set)' },
  { value: 'PR', label: 'Par (Pair)' },
];

type MaterialFormProps = {
  categorias: Array<{ id: number; nome: string; paiId?: number | null; prefixo?: string | null }>;
  unidades: Array<{ id: number; nome: string; codigo: string }>;
  localizacoes: Array<{ id: number; nome: string; tipo: string; codigo: string }>;
  initialData?: Partial<MaterialFormValues> & { id?: number; fotoUrl?: string | null };
  mode?: 'create' | 'edit';
};

export function MaterialForm({
  categorias,
  unidades,
  localizacoes: initialLocalizacoes,
  initialData,
  mode = 'create',
}: MaterialFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [flatCategorias, setFlatCategorias] = useState(() =>
    categorias.map(c => ({ id: c.id, nome: c.nome, paiId: c.paiId ?? null, prefixo: c.prefixo ?? null }))
  );
  const [listaCategorias, setListaCategorias] = useState(() => organizeCategoriesForSelect(categorias));
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.fotoUrl ?? null);
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [localizacoes, setLocalizacoes] = useState(initialLocalizacoes);
  // Inline localização dialog state
  const [showLocalizacaoDialog, setShowLocalizacaoDialog] = useState(false);
  const [locDialogNome, setLocDialogNome] = useState('');
  const [locDialogTipo, setLocDialogTipo] = useState('DEPOSITO');
  const [locDialogCodigo, setLocDialogCodigo] = useState('');
  const [isSavingLoc, setIsSavingLoc] = useState(false);

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
      pesoUnitario: initialData?.pesoUnitario || '',
      dimensoes: initialData?.dimensoes || '',
      estoqueMinimo: initialData?.estoqueMinimo || '0',
      pontoReposicao: initialData?.pontoReposicao || '0',
      rastreioLote: initialData?.rastreioLote ?? true,
      possuiValidade: initialData?.possuiValidade ?? false,
      ativo: initialData?.ativo ?? true,
      fotoUrl: initialData?.fotoUrl || '',
      tipoEntrada: 'por_unidade',
      localizacaoId: '',
      quantidadeEntrada: '',
      valorUnitario: '',
      packageType: '',
      baseQtyPerUnit: '',
      qtdEmbalagens: '1',
      precoCompra: '',
      embBrand: '',
      embUpcEan: '',
      fornecedorNome: '',
      numeroNf: '',
      dataCompra: '',
    },
  });

  const tipoEntrada = form.watch('tipoEntrada');
  const categoriaId = form.watch('categoriaId');
  const unidadeId = form.watch('unidadeId');
  const packageType = form.watch('packageType');
  const baseQtyPerUnit = form.watch('baseQtyPerUnit');
  const qtdEmbalagens = form.watch('qtdEmbalagens');
  const precoCompra = form.watch('precoCompra');
  const quantidadeEntrada = form.watch('quantidadeEntrada');
  const valorUnitario = form.watch('valorUnitario');
  const codigoValue = form.watch('codigo');
  const barcodeValue = codigoValue?.replace('-', '') || '';

  // Auto-generate código when category changes (create mode only)
  useEffect(() => {
    if (mode !== 'create' || !categoriaId) return;
    const cat = flatCategorias.find(c => c.id === Number(categoriaId));
    if (!cat) return;

    let prefixo: string | null = null;
    if (cat.paiId) {
      const parent = flatCategorias.find(c => c.id === cat.paiId);
      prefixo = parent?.prefixo ?? null;
    } else {
      prefixo = cat.prefixo;
    }
    if (!prefixo) return;

    setIsLoadingCode(true);
    fetch(`/api/estoque/materiais/next-codigo?prefixo=${prefixo}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.codigo) {
          form.setValue('codigo', data.data.codigo, { shouldValidate: true });
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingCode(false));
  }, [categoriaId, flatCategorias, mode, form]);

  const handleCategoriaCreated = (novaCategoria: { id: number; nome: string; paiId?: number | null; prefixo?: string | null }) => {
    setFlatCategorias(prev => {
      const updated = [...prev, { id: novaCategoria.id, nome: novaCategoria.nome, paiId: novaCategoria.paiId ?? null, prefixo: novaCategoria.prefixo ?? null }];
      setListaCategorias(organizeCategoriesForSelect(updated));
      return updated;
    });
    form.setValue('categoriaId', String(novaCategoria.id));
  };

  const handleRegenerateCode = async () => {
    if (!categoriaId) return;
    const cat = flatCategorias.find(c => c.id === Number(categoriaId));
    if (!cat) return;

    let prefixo: string | null = null;
    if (cat.paiId) {
      const parent = flatCategorias.find(c => c.id === cat.paiId);
      prefixo = parent?.prefixo ?? null;
    } else {
      prefixo = cat.prefixo;
    }
    if (!prefixo) return;

    setIsLoadingCode(true);
    try {
      const res = await fetch(`/api/estoque/materiais/next-codigo?prefixo=${prefixo}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data?.codigo) {
        form.setValue('codigo', data.data.codigo, { shouldValidate: true });
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingCode(false);
    }
  };

  const handleSaveLocalizacao = async () => {
    if (!locDialogNome.trim()) return;
    setIsSavingLoc(true);
    try {
      const codigoAuto = locDialogNome.toUpperCase().replace(/\s+/g, '-').slice(0, 20);
      const res = await fetch('/api/estoque/localizacoes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: locDialogNome.trim(),
          tipo: locDialogTipo,
          codigo: (locDialogCodigo.trim() || codigoAuto).toUpperCase(),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Erro ao criar localização');
      const nova = result.data;
      setLocalizacoes(prev => [...prev, nova]);
      form.setValue('localizacaoId', String(nova.id));
      setShowLocalizacaoDialog(false);
      setLocDialogNome('');
      setLocDialogTipo('DEPOSITO');
      setLocDialogCodigo('');
      toast({ title: 'Localização criada', description: `"${nova.nome}" adicionada.` });
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro ao criar localização', variant: 'destructive' });
    } finally {
      setIsSavingLoc(false);
    }
  };

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/estoque/materiais/upload', { method: 'POST', credentials: 'include', body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Erro no upload');
      form.setValue('fotoUrl', result.data.url, { shouldValidate: true });
      setPhotoPreview(result.data.url);
      toast({ title: 'Foto enviada', description: 'Imagem salva com sucesso.' });
    } catch (err) {
      setPhotoPreview(initialData?.fotoUrl ?? null);
      form.setValue('fotoUrl', initialData?.fotoUrl || '');
      toast({ title: 'Erro no upload', description: err instanceof Error ? err.message : 'Não foi possível enviar a imagem.', variant: 'destructive' });
    } finally {
      setIsUploadingPhoto(false);
      URL.revokeObjectURL(localUrl);
    }
  }

  function handleRemovePhoto() {
    setPhotoPreview(null);
    form.setValue('fotoUrl', '', { shouldValidate: true });
  }

  // ── Preview calculations ────────────────────────────────────────────────
  const embPreview = (() => {
    if (tipoEntrada !== 'em_embalagem') return null;
    const pkg = PURCHASE_PACKAGE_TYPES.find(p => p.value === packageType);
    const qty = Number(baseQtyPerUnit);
    const pkgs = Number(qtdEmbalagens) || 1;
    const preco = Number(precoCompra);
    const unit = unidades.find(u => u.id === Number(unidadeId));
    if (!pkg || !qty || !unit) return null;
    const totalQty = qty * pkgs;
    const totalPrice = preco * pkgs;
    const pricePerUnit = preco > 0 ? preco / qty : 0;
    return { pkg, qty, pkgs, preco, unit, totalQty, totalPrice, pricePerUnit };
  })();

  const unitPreview = (() => {
    if (tipoEntrada !== 'por_unidade') return null;
    const qty = Number(quantidadeEntrada);
    const valor = Number(valorUnitario);
    const unit = unidades.find(u => u.id === Number(unidadeId));
    if (!qty || !valor || !unit) return null;
    return { qty, valor, unit, total: qty * valor };
  })();

  // ── Submit ──────────────────────────────────────────────────────────────
  async function onSubmit(data: MaterialFormValues) {
    // Extra validation for create-specific required fields
    if (mode === 'create') {
      if (!data.localizacaoId) {
        form.setError('localizacaoId', { message: 'Local de armazenamento é obrigatório' });
        return;
      }
      if (data.tipoEntrada === 'por_unidade') {
        if (!data.quantidadeEntrada || Number(data.quantidadeEntrada) <= 0) {
          form.setError('quantidadeEntrada', { message: 'Quantidade é obrigatória' });
          return;
        }
        if (!data.valorUnitario || Number(data.valorUnitario) <= 0) {
          form.setError('valorUnitario', { message: 'Valor unitário é obrigatório' });
          return;
        }
      } else {
        if (!data.packageType) {
          form.setError('packageType', { message: 'Tipo de embalagem é obrigatório' });
          return;
        }
        if (!data.baseQtyPerUnit || Number(data.baseQtyPerUnit) <= 0) {
          form.setError('baseQtyPerUnit', { message: 'Quantidade por embalagem é obrigatória' });
          return;
        }
        if (!data.qtdEmbalagens || Number(data.qtdEmbalagens) < 1) {
          form.setError('qtdEmbalagens', { message: 'Número de embalagens é obrigatório' });
          return;
        }
        if (!data.precoCompra || Number(data.precoCompra) <= 0) {
          form.setError('precoCompra', { message: 'Valor por embalagem é obrigatório' });
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const selectedUnit = unidades.find(u => u.id === Number(data.unidadeId));

      const payload: Record<string, unknown> = {
        codigo: data.codigo || undefined,
        nome: data.nome,
        descricao: data.descricao || undefined,
        categoriaId: data.categoriaId ? parseInt(data.categoriaId) : undefined,
        unidadeId: parseInt(data.unidadeId),
        fabricante: data.fabricante || undefined,
        modelo: data.modelo || undefined,
        pesoUnitario: data.pesoUnitario ? parseFloat(data.pesoUnitario) : undefined,
        dimensoes: data.dimensoes || undefined,
        estoqueMinimo: parseFloat(data.estoqueMinimo),
        pontoReposicao: parseFloat(data.pontoReposicao),
        rastreioLote: data.rastreioLote,
        possuiValidade: data.possuiValidade,
        ativo: data.ativo,
        fotoUrl: data.fotoUrl || undefined,
      };

      if (mode === 'create') {
        payload.entradaEstoque = {
          localizacaoId: parseInt(data.localizacaoId!),
          tipoEntrada: data.tipoEntrada,
          ...(data.tipoEntrada === 'por_unidade'
            ? {
                quantidadeEntrada: parseFloat(data.quantidadeEntrada!),
                valorUnitario: parseFloat(data.valorUnitario!),
              }
            : {
                packageType: data.packageType,
                baseQtyPerUnit: parseFloat(data.baseQtyPerUnit!),
                qtdEmbalagens: parseInt(data.qtdEmbalagens!),
                precoCompra: parseFloat(data.precoCompra!),
                purchaseUnit: selectedUnit?.codigo || 'EA',
                brand: data.embBrand || undefined,
                upcEan: data.embUpcEan || undefined,
              }),
        };

        if (data.fornecedorNome || data.numeroNf || data.dataCompra) {
          payload.compra = {
            fornecedorNome: data.fornecedorNome || undefined,
            numeroNf: data.numeroNf || undefined,
            dataCompra: data.dataCompra || undefined,
          };
        }
      }

      const url = mode === 'create' ? '/api/estoque/materiais' : `/api/estoque/materiais/${initialData?.id}`;
      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao salvar material');

      toast({
        title: mode === 'create' ? 'Material criado!' : 'Material atualizado!',
        description: mode === 'create' ? 'O material foi cadastrado com sucesso.' : 'As alterações foram salvas.',
      });
      router.push('/estoque/materiais');
      router.refresh();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao salvar o material',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* ─── 1. INFORMAÇÕES BÁSICAS ─────────────────────────────────── */}
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-brand-primary" />
              Informações Básicas
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">

              {/* Código ID — auto-generated */}
              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código ID</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder={mode === 'create' ? 'Selecione a categoria…' : 'EL-00001'}
                          {...field}
                          readOnly
                          className="bg-muted font-mono tracking-widest cursor-not-allowed"
                        />
                      </FormControl>
                      {mode === 'create' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleRegenerateCode}
                          disabled={!categoriaId || isLoadingCode}
                          title="Gerar novo código"
                          aria-label="Gerar novo código"
                        >
                          {isLoadingCode
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <RotateCcw className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                    <FormDescription>
                      {mode === 'create' ? 'Gerado automaticamente ao selecionar a categoria' : 'Código único do material'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Barcode interno — auto-generated */}
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Barcode className="h-4 w-4 text-muted-foreground" />
                  Barcode Interno
                </FormLabel>
                <Input
                  value={barcodeValue}
                  readOnly
                  placeholder="Gerado do Código ID"
                  className="bg-muted font-mono cursor-not-allowed"
                  aria-label="Código de barras interno"
                />
                <FormDescription>Gerado automaticamente a partir do Código ID</FormDescription>
              </FormItem>

              {/* Nome */}
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nome do Material *</FormLabel>
                    <FormControl>
                      <Input data-testid="input-nome" placeholder="Ex: Cabo NM-B 12/2" {...field} />
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
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-categoria">
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
                                  {(cat as { id: number; nome: string; displayName?: string }).displayName || cat.nome}
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-unidade">
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

              {/* Descrição */}
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Informações adicionais sobre o material"
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

          {/* ─── 2. ENTRADA INICIAL DE ESTOQUE (create only) ─────────────── */}
          {mode === 'create' && (
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="mb-1 text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-brand-primary" />
                Entrada Inicial de Estoque
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Informe onde o material será guardado e como ele está sendo adquirido.
              </p>

              {/* Local de armazenamento */}
              <FormField
                control={form.control}
                name="localizacaoId"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Local de Armazenamento *</FormLabel>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-localizacao">
                              <SelectValue placeholder="Selecione o local" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {localizacoes.map((loc) => (
                              <SelectItem key={loc.id} value={String(loc.id)}>
                                {loc.nome}
                                <span className="ml-2 text-xs text-muted-foreground">({loc.tipo})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowLocalizacaoDialog(true)}
                        title="Novo local"
                        aria-label="Novo local de armazenamento"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tipo de entrada — toggle */}
              <div className="mb-4">
                <p className="mb-2 text-sm font-medium text-foreground">Tipo de Entrada *</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => form.setValue('tipoEntrada', 'por_unidade')}
                    className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                      tipoEntrada === 'por_unidade'
                        ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                        : 'border-border bg-muted text-muted-foreground hover:border-brand-primary/50'
                    }`}
                    aria-pressed={tipoEntrada === 'por_unidade'}
                  >
                    Por Unidade
                    <span className="ml-1 text-xs font-normal opacity-70">(ea, ft, lb…)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => form.setValue('tipoEntrada', 'em_embalagem')}
                    className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                      tipoEntrada === 'em_embalagem'
                        ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                        : 'border-border bg-muted text-muted-foreground hover:border-brand-primary/50'
                    }`}
                    aria-pressed={tipoEntrada === 'em_embalagem'}
                  >
                    Em Embalagem
                    <span className="ml-1 text-xs font-normal opacity-70">(caixa, rolo, pack…)</span>
                  </button>
                </div>
              </div>

              {/* Por Unidade */}
              {tipoEntrada === 'por_unidade' && (
                <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-dashed border-brand-primary/30 bg-muted/30 p-4">
                  <FormField
                    control={form.control}
                    name="quantidadeEntrada"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Quantidade *
                          {unidadeId && (
                            <span className="ml-1 font-mono text-xs text-brand-primary">
                              ({unidades.find(u => u.id === Number(unidadeId))?.codigo})
                            </span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.001"
                            min="0.001"
                            placeholder="Ex: 100"
                            data-testid="input-quantidade"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="valorUnitario"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor por Unidade ($) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="Ex: 0.89"
                            data-testid="input-valor-unitario"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {unitPreview && (
                    <div className="sm:col-span-2 rounded-lg bg-brand-primary/5 border border-brand-primary/20 px-4 py-3 text-sm">
                      <span className="font-semibold text-brand-primary">
                        {unitPreview.qty} {unitPreview.unit.codigo}
                      </span>
                      {' '}×{' '}
                      <span className="font-semibold">${unitPreview.valor.toFixed(2)}/{unitPreview.unit.codigo}</span>
                      {' = '}
                      <span className="font-bold text-foreground">${unitPreview.total.toFixed(2)} total</span>
                    </div>
                  )}
                </div>
              )}

              {/* Em Embalagem */}
              {tipoEntrada === 'em_embalagem' && (
                <div className="rounded-xl border border-dashed border-brand-primary/30 bg-muted/30 p-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                    {/* Tipo de embalagem */}
                    <FormField
                      control={form.control}
                      name="packageType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Embalagem *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-package-type">
                                <SelectValue placeholder="Selecione…" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PURCHASE_PACKAGE_TYPES.map(pt => (
                                <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Qtd por embalagem */}
                    <FormField
                      control={form.control}
                      name="baseQtyPerUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Qtd por Embalagem *
                            {unidadeId && (
                              <span className="ml-1 font-mono text-xs text-brand-primary">
                                ({unidades.find(u => u.id === Number(unidadeId))?.codigo})
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.001"
                              min="0.001"
                              placeholder="Ex: 250"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Qtd de embalagens */}
                    <FormField
                      control={form.control}
                      name="qtdEmbalagens"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Qtd de Embalagens *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              min="1"
                              placeholder="Ex: 2"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Valor por embalagem */}
                    <FormField
                      control={form.control}
                      name="precoCompra"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor por Embalagem ($) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder="Ex: 189.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Marca */}
                    <FormField
                      control={form.control}
                      name="embBrand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marca <span className="text-xs text-muted-foreground">(opcional)</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Southwire" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* UPC / EAN */}
                    <FormField
                      control={form.control}
                      name="embUpcEan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>UPC / EAN <span className="text-xs text-muted-foreground">(opcional)</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Código de barras" maxLength={20} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Preview em tempo real */}
                  {embPreview && (
                    <div className="mt-3 rounded-lg bg-brand-primary/5 border border-brand-primary/20 px-4 py-3 text-sm">
                      <span className="font-semibold text-brand-primary">
                        {embPreview.pkgs} × {embPreview.pkg.label}
                      </span>
                      {' — '}
                      <span>{embPreview.qty} {embPreview.unit.codigo}/embalagem</span>
                      <span className="mx-2 text-muted-foreground">=</span>
                      <span className="font-bold text-foreground">{embPreview.totalQty} {embPreview.unit.codigo} total</span>
                      {embPreview.preco > 0 && (
                        <>
                          <span className="mx-2 text-muted-foreground">·</span>
                          <span>${embPreview.preco.toFixed(2)}/embalagem</span>
                          {embPreview.pkgs > 1 && (
                            <>
                              <span className="mx-1 text-muted-foreground">×</span>
                              <span>{embPreview.pkgs} = <strong>${embPreview.totalPrice.toFixed(2)} total</strong></span>
                            </>
                          )}
                          <span className="mx-2 text-brand-primary font-medium">
                            (${embPreview.pricePerUnit.toFixed(4)}/{embPreview.unit.codigo})
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── 3. FORNECEDOR & NOTA FISCAL (create only) ───────────────── */}
          {mode === 'create' && (
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="mb-1 text-lg font-semibold flex items-center gap-2">
                <span className="text-brand-primary text-xl">🧾</span>
                Fornecedor & Nota Fiscal
                <span className="text-sm font-normal text-muted-foreground">(Opcional)</span>
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Registre de onde este material foi comprado para rastreabilidade e controle financeiro.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="fornecedorNome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fornecedor</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Home Depot" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="numeroNf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da NF / Receipt</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 98765" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dataCompra"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data da Compra</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* ─── 4. FOTO DO MATERIAL ─────────────────────────────────────── */}
          <div className="rounded-2xl border bg-card p-6">
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

                    <div className="flex flex-col gap-2">
                      <FormLabel>Imagem do material</FormLabel>
                      <FormDescription>JPEG, PNG ou WebP — máx. 10 MB</FormDescription>
                      <label
                        htmlFor="foto-upload"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
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

          {/* ─── 5. DETALHES TÉCNICOS ────────────────────────────────────── */}
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Detalhes Técnicos</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fabricante"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fabricante <span className="text-xs text-muted-foreground">(quando faz parte da spec)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Southwire" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="modelo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo / Referência</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: NM-B 12/2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pesoUnitario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso Unitário (lb)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" placeholder="0.000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dimensoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dimensões</FormLabel>
                    <FormControl>
                      <Input placeholder='Ex: 4" × 4" × 1/2"' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ─── 6. CONTROLE DE ESTOQUE ──────────────────────────────────── */}
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Controle de Estoque</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="estoqueMinimo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque Mínimo *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" placeholder="0" {...field} />
                    </FormControl>
                    <FormDescription>Quantidade mínima antes de alertar</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pontoReposicao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ponto de Reposição *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" placeholder="0" {...field} />
                    </FormControl>
                    <FormDescription>Quantidade ideal para reposição</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rastreioLote"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Rastreio de Lote</FormLabel>
                      <FormDescription>Recomendado para cabos, tubulações e itens com garantia</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="possuiValidade"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Possui Validade</FormLabel>
                      <FormDescription>Material tem data de vencimento</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ─── Status (edit only) ──────────────────────────────────────── */}
          {mode === 'edit' && (
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold">Status</h3>
              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Material Ativo</FormLabel>
                      <FormDescription>Material disponível para uso</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* ─── Ações ───────────────────────────────────────────────────── */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="btn-salvar"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Cadastrar Material' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </Form>

      {/* ─── Modal de nova categoria ─────────────────────────────────────── */}
      <CreateCategoriaModal
        open={showCategoriaModal}
        onOpenChange={setShowCategoriaModal}
        tipo="MATERIAL"
        onSuccess={handleCategoriaCreated}
        preSelectedPaiId={form.watch('categoriaId') || null}
      />

      {/* ─── Dialog: Nova Localização (inline) ───────────────────────────── */}
      <Dialog open={showLocalizacaoDialog} onOpenChange={setShowLocalizacaoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-primary" />
              Nova Localização
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome *</label>
              <Input
                placeholder="Ex: Warehouse, Van do Gladiston…"
                value={locDialogNome}
                onChange={e => setLocDialogNome(e.target.value)}
                aria-label="Nome da localização"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo *</label>
              <Select value={locDialogTipo} onValueChange={setLocDialogTipo}>
                <SelectTrigger aria-label="Tipo de localização">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEPOSITO">Depósito / Warehouse</SelectItem>
                  <SelectItem value="PRATELEIRA">Prateleira / Shelf</SelectItem>
                  <SelectItem value="BIN">Caixa / Bin</SelectItem>
                  <SelectItem value="ARMARIO">Armário / Cabinet</SelectItem>
                  <SelectItem value="VAN">Van / Veículo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Código <span className="text-xs text-muted-foreground">(opcional)</span></label>
              <Input
                placeholder="Auto-gerado se vazio"
                value={locDialogCodigo}
                onChange={e => setLocDialogCodigo(e.target.value.toUpperCase())}
                maxLength={20}
                className="font-mono"
                aria-label="Código da localização"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLocalizacaoDialog(false)}
              disabled={isSavingLoc}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveLocalizacao}
              disabled={!locDialogNome.trim() || isSavingLoc}
            >
              {isSavingLoc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
