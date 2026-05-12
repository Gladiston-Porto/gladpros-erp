/**
 * CompraForm Component
 * Formulário para criar novas compras com itens
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@gladpros/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@gladpros/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select";
import { Input } from "@gladpros/ui/input";
import { Textarea } from "@gladpros/ui/textarea";
import { Switch } from "@gladpros/ui/switch";
import { Badge } from "@gladpros/ui/badge";
import { useToast } from '@/shared/hooks/use-toast';
import { Loader2, Plus, Trash2, Upload, FileText, ExternalLink, Package } from 'lucide-react';
import { CreateFornecedorModal } from './CreateFornecedorModal';
import { CreateMaterialModal } from './CreateMaterialModal';

// Tipo de embalagem disponível por material
type EmbalagemOpcao = {
    id: number;
    packageType: string;
    baseQtyPerUnit: number;
    purchaseUnit: string;
    brand: string | null;
    precoCompra: number | null;
};

// Schema de validação
const itemSchema = z.object({
    tipoItem: z.enum(['MATERIAL', 'EQUIPAMENTO']),
    materialId: z.number().int().positive().optional(),
    materialEmbalagemId: z.number().int().positive().optional(), // UPC/EAN
    equipamentoId: z.number().int().positive().optional(),
    loteId: z.number().int().positive().optional(),
    quantidade: z.number().positive('Quantidade deve ser maior que 0'),
    custoUnitario: z.number().positive('Custo deve ser maior que 0'),
});

const compraSchema = z.object({
    fornecedorId: z.number().int().positive().optional(),
    numeroNf: z.string().max(60).optional(),
    dataCompra: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
    tipo: z.enum(['MATERIAL', 'EQUIPAMENTO', 'AMBOS']),
    projetoId: z.number().int().positive().optional(),
    solicitacaoCompraId: z.number().int().positive().optional(),
    valorTotal: z.number().positive('Valor total é obrigatório'),
    desconto: z.number().min(0).optional(),
    frete: z.number().min(0).optional(),
    formaPagamento: z.string().max(60).optional(),
    observacoes: z.string().optional(),
    notaFiscalUrl: z.string().url().optional(),
    receberAgora: z.boolean().default(false),
    localizacaoDestinoId: z.number().int().positive().optional(),
    itens: z.array(itemSchema).min(1, 'Adicione pelo menos 1 item'),
}).refine((data) => {
    if (data.receberAgora && data.itens.some(i => i.tipoItem === 'MATERIAL')) {
        return data.localizacaoDestinoId !== undefined;
    }
    return true;
}, {
    message: 'Localização é obrigatória para recebimento imediato de materiais',
    path: ['localizacaoDestinoId'],
}).refine((data) => {
    return data.itens.every(item => {
        // Para MATERIAL: pode ser materialId OU materialEmbalagemId
        if (item.tipoItem === 'MATERIAL') {
            return item.materialId !== undefined || item.materialEmbalagemId !== undefined;
        }
        if (item.tipoItem === 'EQUIPAMENTO') return item.equipamentoId !== undefined;
        return true;
    });
}, {
    message: 'Selecione o material (ou embalagem) ou equipamento para cada item',
    path: ['itens'],
});

type FormData = z.infer<typeof compraSchema>;

type CompraFormProps = {
    fornecedores: Array<{ id: number; nome: string }>;
    projetos: Array<{ id: number; numeroProjeto: string; titulo: string }>;
    materiais: Array<{ id: number; codigo: string; nome: string; unidade?: { codigo?: string } }>;
    equipamentos: Array<{ id: number; codigo: string; nome: string }>;
    localizacoes: Array<{ id: number; codigo: string; nome: string }>;
    unidades: Array<{ id: number; codigo: string; nome: string }>;
    categorias: Array<{ id: number; nome: string }>;
    solicitacoesCompra: Array<{ id: number; observacoes: string | null; valorAprovado: string | number | null; valorTotalGasto: string | number }>;
};

export function CompraForm({
    fornecedores: fornecedoresIniciais,
    projetos,
    materiais: materiaisIniciais,
    equipamentos,
    localizacoes,
    unidades,
    categorias,
    solicitacoesCompra,
}: CompraFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // State para listas dinâmicas (atualizadas via Quick Add)
    const [fornecedoresLista, setFornecedoresLista] = useState(fornecedoresIniciais);
    const [materiaisLista, setMateriaisLista] = useState(materiaisIniciais);

    // State para controle dos modais
    const [showFornecedorModal, setShowFornecedorModal] = useState(false);
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [materialModalItemIndex, setMaterialModalItemIndex] = useState<number | null>(null);

    // Estado para embalagens disponíveis por índice de item
    const [embalagensMap, setEmbalagensMap] = useState<Record<number, EmbalagemOpcao[]>>({});

    // Carrega embalagens de um material para o índice do item
    const loadEmbalagens = useCallback(async (materialId: number, itemIndex: number) => {
        try {
            const res = await fetch(`/api/estoque/materiais/${materialId}/embalagens`);
            if (!res.ok) return;
            const { data } = await res.json();
            setEmbalagensMap(prev => ({ ...prev, [itemIndex]: data ?? [] }));
        } catch {
            // silently ignore — embalagens são opcionais
        }
    }, []);

    // Estado para upload de NF
    const [uploadingNf, setUploadingNf] = useState(false);
    const [nfFileName, setNfFileName] = useState<string | null>(null);
    const nfFileRef = useRef<HTMLInputElement>(null);

    const form = useForm<FormData>({
        resolver: zodResolver(compraSchema) as any,
        defaultValues: {
            dataCompra: new Date().toISOString().split('T')[0],
            tipo: 'MATERIAL',
            valorTotal: 0,
            receberAgora: false,
            itens: [{ tipoItem: 'MATERIAL', quantidade: 1, custoUnitario: 0 }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'itens',
    });

    const receberAgora = form.watch('receberAgora');
    const itens = form.watch('itens');
    const tipoCompra = form.watch('tipo');

    // Recalculate total when items change
    const calcularTotal = () => {
        const subtotal = itens.reduce((acc, item) =>
            acc + (item.quantidade || 0) * (item.custoUnitario || 0), 0
        );
        const desconto = form.getValues('desconto') || 0;
        const frete = form.getValues('frete') || 0;
        return subtotal - desconto + frete;
    };

    // Handler quando fornecedor é criado via modal
    const handleFornecedorCreated = (fornecedor: { id: number; nome: string }) => {
        setFornecedoresLista((prev) => [...prev, fornecedor]);
        form.setValue('fornecedorId', fornecedor.id);
        setShowFornecedorModal(false);
    };

    // Handler quando material é criado via modal
    const handleMaterialCreated = (material: { id: number; codigo: string; nome: string; unidade: { codigo: string } }) => {
        setMateriaisLista((prev) => [...prev, material]);
        // Se temos um índice de item, selecionar o material nessa linha
        if (materialModalItemIndex !== null) {
            form.setValue(`itens.${materialModalItemIndex}.materialId`, material.id);
        }
        setShowMaterialModal(false);
        setMaterialModalItemIndex(null);
    };

    // Determina o tipoItem default baseado no tipo da compra
    const getDefaultTipoItem = (): 'MATERIAL' | 'EQUIPAMENTO' => {
        if (tipoCompra === 'EQUIPAMENTO') return 'EQUIPAMENTO';
        return 'MATERIAL';
    };

    // Verifica se deve mostrar seletor de tipo na linha
    const shouldShowTipoItemSelector = tipoCompra === 'AMBOS';

    // Handler de upload de nota fiscal
    const handleNfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingNf(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/estoque/compras/upload-nf', {
                method: 'POST',
                body: formData,
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Erro no upload');
            form.setValue('notaFiscalUrl', result.data.url);
            setNfFileName(file.name);
            toast({ title: 'NF anexada', description: 'Nota fiscal enviada com sucesso.' });
        } catch (err: any) {
            toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
        } finally {
            setUploadingNf(false);
            if (nfFileRef.current) nfFileRef.current.value = '';
        }
    };

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        try {
            const res = await fetch('/api/estoque/compras', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Erro ao criar compra');
            }

            toast({
                title: 'Compra criada',
                description: receberAgora
                    ? 'Compra criada e materiais recebidos no estoque.'
                    : 'Compra criada com status pendente.',
            });

            router.push('/estoque/compras');
            router.refresh();
        } catch (err: any) {
            toast({
                title: 'Erro',
                description: err.message || 'Não foi possível criar a compra.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const hasMaterialItems = itens.some(i => i.tipoItem === 'MATERIAL');

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Dados Básicos */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Informações da Compra</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <FormField
                                    control={form.control}
                                    name="numeroNf"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Número NF</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ''} placeholder="Ex: 12345" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Upload NF */}
                                <FormField
                                    control={form.control}
                                    name="notaFiscalUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nota Fiscal (PDF ou foto)</FormLabel>
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    ref={nfFileRef}
                                                    type="file"
                                                    accept=".pdf,image/jpeg,image/png,image/webp"
                                                    className="hidden"
                                                    onChange={handleNfFileChange}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={uploadingNf}
                                                    onClick={() => nfFileRef.current?.click()}
                                                    aria-label="Anexar nota fiscal"
                                                >
                                                    {uploadingNf
                                                        ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                        : <Upload className="h-4 w-4 mr-1" />}
                                                    {nfFileName ? 'Trocar' : 'Anexar NF'}
                                                </Button>
                                                {nfFileName && (
                                                    <span className="flex items-center gap-1 text-sm text-muted-foreground max-w-[140px] truncate">
                                                        <FileText className="h-3 w-3 shrink-0" />
                                                        {nfFileName}
                                                    </span>
                                                )}
                                                {field.value && (
                                                    <a
                                                        href={field.value}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-brand-primary hover:underline"
                                                        aria-label="Ver nota fiscal"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                )}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="dataCompra"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Data da Compra *</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

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
                                                    <SelectItem value="MATERIAL">Material</SelectItem>
                                                    <SelectItem value="EQUIPAMENTO">Equipamento</SelectItem>
                                                    <SelectItem value="AMBOS">Material + Equipamento</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex gap-2 items-end">
                                    <FormField
                                        control={form.control}
                                        name="fornecedorId"
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel>Fornecedor</FormLabel>
                                                <Select
                                                    onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                                                    value={field.value?.toString()}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {fornecedoresLista.map((f) => (
                                                            <SelectItem key={f.id} value={f.id.toString()}>
                                                                {f.nome}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setShowFornecedorModal(true)}
                                        title="Criar novo fornecedor"
                                        aria-label="Criar novo fornecedor"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="projetoId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Projeto</FormLabel>
                                            <Select
                                                onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                                                value={field.value?.toString()}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {projetos.map((p) => (
                                                        <SelectItem key={p.id} value={p.id.toString()}>
                                                            {p.numeroProjeto} - {p.titulo}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* SC Vinculada */}
                                {solicitacoesCompra.length > 0 && (
                                    <FormField
                                        control={form.control}
                                        name="solicitacaoCompraId"
                                        render={({ field }) => {
                                            const selectedSc = solicitacoesCompra.find(sc => sc.id === field.value);
                                            const disponivel = selectedSc
                                                ? Number(selectedSc.valorAprovado) - Number(selectedSc.valorTotalGasto)
                                                : null;
                                            return (
                                                <FormItem>
                                                    <FormLabel>Solicitação de Compra (SC)</FormLabel>
                                                    <Select
                                                        onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                                                        value={field.value?.toString()}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Vincular a uma SC aprovada" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {solicitacoesCompra.map((sc) => {
                                                                const disp = Number(sc.valorAprovado) - Number(sc.valorTotalGasto);
                                                                return (
                                                                    <SelectItem key={sc.id} value={sc.id.toString()}>
                                                                        SC #{sc.id} — {sc.observacoes ?? `SC #${sc.id}`} (disponível: ${disp.toFixed(2)})
                                                                    </SelectItem>
                                                                );
                                                            })}
                                                        </SelectContent>
                                                    </Select>
                                                    {selectedSc && disponivel !== null && (
                                                        <FormDescription className="text-xs">
                                                            Budget disponível: <strong className="text-green-600">${disponivel.toFixed(2)}</strong>
                                                            {' '}de ${Number(selectedSc.valorAprovado).toFixed(2)} aprovados
                                                        </FormDescription>
                                                    )}
                                                    <FormMessage />
                                                </FormItem>
                                            );
                                        }}
                                    />
                                )}

                                <FormField
                                    control={form.control}
                                    name="formaPagamento"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Forma de Pagamento</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ''} placeholder="Ex: Boleto 30 dias" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="observacoes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Observações</FormLabel>
                                        <FormControl>
                                            <Textarea rows={2} {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Itens */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Itens da Compra</CardTitle>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => append({ tipoItem: getDefaultTipoItem(), quantidade: 1, custoUnitario: 0 })}
                            >
                                <Plus className="h-4 w-4 mr-1" /> Adicionar
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex gap-3 items-end border-b pb-4">
                                    {shouldShowTipoItemSelector && (
                                        <FormField
                                            control={form.control}
                                            name={`itens.${index}.tipoItem`}
                                            render={({ field }) => (
                                                <FormItem className="w-32">
                                                    <FormLabel>Tipo</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="MATERIAL">Material</SelectItem>
                                                            <SelectItem value="EQUIPAMENTO">Equipamento</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    {itens[index]?.tipoItem === 'MATERIAL' || (tipoCompra === 'MATERIAL') ? (
                                        <div className="flex-1 flex flex-col gap-2">
                                            {/* Linha 1: Material + botão criar */}
                                            <div className="flex gap-2 items-end">
                                                <FormField
                                                    control={form.control}
                                                    name={`itens.${index}.materialId`}
                                                    render={({ field }) => (
                                                        <FormItem className="flex-1">
                                                            <FormLabel>Material</FormLabel>
                                                            <Select
                                                                onValueChange={(v) => {
                                                                    const mid = Number(v);
                                                                    field.onChange(mid);
                                                                    // Reset embalagem quando material muda
                                                                    form.setValue(`itens.${index}.materialEmbalagemId`, undefined);
                                                                    loadEmbalagens(mid, index);
                                                                }}
                                                                value={field.value?.toString()}
                                                            >
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Selecione" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {materiaisLista.map((m) => (
                                                                        <SelectItem key={m.id} value={m.id.toString()}>
                                                                            {m.codigo} - {m.nome} ({m.unidade?.codigo || 'UN'})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => {
                                                        setMaterialModalItemIndex(index);
                                                        setShowMaterialModal(true);
                                                    }}
                                                    title="Criar novo material"
                                                    aria-label="Criar novo material"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {/* Linha 2: Seletor de embalagem (se disponível) */}
                                            {(embalagensMap[index] ?? []).length > 0 && (
                                                <FormField
                                                    control={form.control}
                                                    name={`itens.${index}.materialEmbalagemId`}
                                                    render={({ field }) => {
                                                        const selectedEmb = (embalagensMap[index] ?? []).find(e => e.id === field.value);
                                                        return (
                                                            <FormItem>
                                                                <FormLabel className="flex items-center gap-1">
                                                                    <Package className="h-3 w-3" />
                                                                    Comprar por embalagem (opcional)
                                                                </FormLabel>
                                                                <div className="flex items-center gap-2">
                                                                    <Select
                                                                        onValueChange={(v) => {
                                                                            field.onChange(v === 'none' ? undefined : Number(v));
                                                                        }}
                                                                        value={field.value?.toString() ?? 'none'}
                                                                    >
                                                                        <FormControl>
                                                                            <SelectTrigger className="flex-1">
                                                                                <SelectValue placeholder="Por unidade base" />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent>
                                                                            <SelectItem value="none">Por unidade base</SelectItem>
                                                                            {(embalagensMap[index] ?? []).map((emb) => (
                                                                                <SelectItem key={emb.id} value={emb.id.toString()}>
                                                                                    {emb.packageType}{emb.brand ? ` — ${emb.brand}` : ''} ({emb.baseQtyPerUnit} {materiaisLista.find(m => m.id === itens[index]?.materialId)?.unidade?.codigo ?? 'UN'}/emb)
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    {selectedEmb && (
                                                                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                                                                            1 {selectedEmb.packageType} = {selectedEmb.baseQtyPerUnit} {materiaisLista.find(m => m.id === itens[index]?.materialId)?.unidade?.codigo ?? 'UN'}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </FormItem>
                                                        );
                                                    }}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <FormField
                                            control={form.control}
                                            name={`itens.${index}.equipamentoId`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel>Equipamento</FormLabel>
                                                    <Select
                                                        onValueChange={(v) => field.onChange(Number(v))}
                                                        value={field.value?.toString()}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {equipamentos.map((e) => (
                                                                <SelectItem key={e.id} value={e.id.toString()}>
                                                                    {e.codigo} - {e.nome}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    <FormField
                                        control={form.control}
                                        name={`itens.${index}.quantidade`}
                                        render={({ field }) => {
                                            const hasEmb = !!itens[index]?.materialEmbalagemId;
                                            const emb = hasEmb ? (embalagensMap[index] ?? []).find(e => e.id === itens[index]?.materialEmbalagemId) : null;
                                            return (
                                                <FormItem className="w-28">
                                                    <FormLabel>{hasEmb ? `Qtd (${emb?.packageType ?? 'Emb.'})` : 'Qtd'}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="0.001"
                                                            {...field}
                                                            onChange={(e) => field.onChange(Number(e.target.value))}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            );
                                        }}
                                    />

                                    <FormField
                                        control={form.control}
                                        name={`itens.${index}.custoUnitario`}
                                        render={({ field }) => {
                                            const hasEmb = !!itens[index]?.materialEmbalagemId;
                                            const emb = hasEmb ? (embalagensMap[index] ?? []).find(e => e.id === itens[index]?.materialEmbalagemId) : null;
                                            return (
                                                <FormItem className="w-36">
                                                    <FormLabel>{hasEmb ? `$ / ${emb?.packageType ?? 'Emb.'}` : 'Custo Un. ($)'}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            {...field}
                                                            onChange={(e) => field.onChange(Number(e.target.value))}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            );
                                        }}
                                    />

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive"
                                        aria-label={`Remover item ${index + 1}`}
                                        onClick={() => fields.length > 1 && remove(index)}
                                        disabled={fields.length <= 1}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <FormMessage>{form.formState.errors.itens?.message}</FormMessage>
                        </CardContent>
                    </Card>

                    {/* Valores e Recebimento */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Valores e Recebimento</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-4">
                                <FormField
                                    control={form.control}
                                    name="valorTotal"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valor Total *</FormLabel>
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
                                    name="desconto"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Desconto</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...field}
                                                    value={field.value || ''}
                                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="frete"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Frete</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...field}
                                                    value={field.value || ''}
                                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex items-center justify-center pt-6">
                                    <span className="text-lg font-semibold">
                                        Total: ${calcularTotal().toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="border-t pt-4 space-y-4">
                                <FormField
                                    control={form.control}
                                    name="receberAgora"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-3">
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div>
                                                <FormLabel>Receber Agora</FormLabel>
                                                <FormDescription>
                                                    {field.value
                                                        ? "Status será RECEBIDA. Estoque será atualizado."
                                                        : "Status será PENDENTE. Necessário receber depois."}
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                {receberAgora && hasMaterialItems && (
                                    <FormField
                                        control={form.control}
                                        name="localizacaoDestinoId"
                                        render={({ field }) => (
                                            <FormItem className="max-w-sm">
                                                <FormLabel>Localização de Destino *</FormLabel>
                                                <Select
                                                    onValueChange={(v) => field.onChange(Number(v))}
                                                    value={field.value?.toString()}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione onde armazenar" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {localizacoes.map((l) => (
                                                            <SelectItem key={l.id} value={l.id.toString()}>
                                                                {l.codigo} - {l.nome}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {receberAgora ? 'Criar e Receber' : 'Criar Compra'}
                        </Button>
                    </div>
                </form>
            </Form>

            {/* Modais de Quick Add */}
            <CreateFornecedorModal
                open={showFornecedorModal}
                onOpenChange={setShowFornecedorModal}
                onSuccess={handleFornecedorCreated}
            />

            <CreateMaterialModal
                open={showMaterialModal}
                onOpenChange={setShowMaterialModal}
                onSuccess={handleMaterialCreated}
                unidades={unidades}
                categorias={categorias}
            />
        </>
    );
}
