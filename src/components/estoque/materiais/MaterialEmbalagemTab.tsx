/**
 * MaterialEmbalagemTab Component
 * Aba para gerenciar embalagens UPC/EAN de um material
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@gladpros/ui/button";
import { Input } from "@gladpros/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@gladpros/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@gladpros/ui/dialog";
import { Label } from "@gladpros/ui/label";
import { useToast } from '@/shared/hooks/use-toast';
import { Plus, Trash2, Edit2, Loader2, Package } from 'lucide-react';

// Tipos
interface MaterialEmbalagem {
    id: number;
    upcEan: string | null;
    brand: string | null;
    model: string | null;
    packageType: string;
    baseQtyPerUnit: number;
    purchaseUnit: string;
    precoCompra: number | null;
    ativo: boolean;
}

interface MaterialEmbalagemTabProps {
    materialId: number;
    materialNome: string;
    unidadeBase: string; // Ex: "FT", "UN", "KG"
}

interface FormData {
    upcEan: string;
    brand: string;
    model: string;
    packageType: string;
    baseQtyPerUnit: string;
    purchaseUnit: string;
    precoCompra: string;
}

const defaultFormData: FormData = {
    upcEan: '',
    brand: '',
    model: '',
    packageType: '',
    baseQtyPerUnit: '',
    purchaseUnit: 'EA',
    precoCompra: '',
};

export function MaterialEmbalagemTab({
    materialId,
    materialNome,
    unidadeBase
}: MaterialEmbalagemTabProps) {
    const { toast } = useToast();
    const [embalagens, setEmbalagens] = useState<MaterialEmbalagem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<FormData>(defaultFormData);

    // Carrega embalagens do material
    const loadEmbalagens = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/estoque/materiais/${materialId}/embalagens`, {
                credentials: 'include',
            });

            if (response.status === 401) {
                setError('Sessão expirada. Faça login novamente.');
                return;
            }

            if (!response.ok) {
                throw new Error('Erro ao carregar embalagens');
            }

            const data = await response.json();
            setEmbalagens(data.data?.embalagens || []);
        } catch (err) {
            console.error('Erro ao carregar embalagens:', err);
            setError('Não foi possível carregar as embalagens');
        } finally {
            setLoading(false);
        }
    }, [materialId]);

    useEffect(() => {
        loadEmbalagens();
    }, [loadEmbalagens]);

    // Abre dialog para nova embalagem
    const handleNew = () => {
        setEditingId(null);
        setFormData(defaultFormData);
        setDialogOpen(true);
    };

    // Abre dialog para editar embalagem
    const handleEdit = (emb: MaterialEmbalagem) => {
        setEditingId(emb.id);
        setFormData({
            upcEan: emb.upcEan || '',
            brand: emb.brand || '',
            model: emb.model || '',
            packageType: emb.packageType,
            baseQtyPerUnit: String(emb.baseQtyPerUnit),
            purchaseUnit: emb.purchaseUnit,
            precoCompra: emb.precoCompra != null ? String(emb.precoCompra) : '',
        });
        setDialogOpen(true);
    };

    // Salva embalagem (create ou update)
    const handleSave = async () => {
        // Validação básica
        if (!formData.packageType.trim()) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Tipo de embalagem é obrigatório' });
            return;
        }
        if (!formData.baseQtyPerUnit || Number(formData.baseQtyPerUnit) <= 0) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Quantidade base deve ser maior que 0' });
            return;
        }

        try {
            setSaving(true);

            const payload = {
                upcEan: formData.upcEan.trim() || undefined,
                brand: formData.brand.trim() || undefined,
                model: formData.model.trim() || undefined,
                packageType: formData.packageType.trim(),
                baseQtyPerUnit: Number(formData.baseQtyPerUnit),
                purchaseUnit: formData.purchaseUnit.trim() || 'EA',
                precoCompra: formData.precoCompra ? Number(formData.precoCompra) : undefined,
            };

            const url = editingId
                ? `/api/estoque/materiais/${materialId}/embalagens/${editingId}`
                : `/api/estoque/materiais/${materialId}/embalagens`;

            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao salvar embalagem');
            }

            toast({
                title: editingId ? 'Embalagem atualizada!' : 'Embalagem criada!',
                description: `${formData.packageType}${formData.upcEan ? ` (${formData.upcEan})` : ''}`,
            });

            setDialogOpen(false);
            loadEmbalagens();
        } catch (error) {
            console.error('Erro ao salvar embalagem:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error instanceof Error ? error.message : 'Erro ao salvar embalagem',
            });
        } finally {
            setSaving(false);
        }
    };

    // Remove embalagem
    const handleDelete = async (emb: MaterialEmbalagem) => {
        if (!confirm(`Remover embalagem ${emb.packageType} (${emb.upcEan})?`)) {
            return;
        }

        try {
            const response = await fetch(
                `/api/estoque/materiais/${materialId}/embalagens/${emb.id}`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                throw new Error('Erro ao remover embalagem');
            }

            toast({
                title: 'Embalagem removida',
                description: `${emb.packageType}${emb.upcEan ? ` (${emb.upcEan})` : ''}`,
            });

            loadEmbalagens();
        } catch (error) {
            console.error('Erro ao remover embalagem:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível remover a embalagem',
            });
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Carregando embalagens...</span>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-10 w-10 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">{error}</p>
                <Button onClick={loadEmbalagens} variant="outline" size="sm" className="mt-4">
                    Tentar novamente
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Embalagens (UPC/EAN)</h3>
                    <p className="text-sm text-muted-foreground">
                        Configure as embalagens de compra para {materialNome}
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleNew} size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Embalagem
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>
                                {editingId ? 'Editar Embalagem' : 'Nova Embalagem'}
                            </DialogTitle>
                            <DialogDescription>
                                Configure os dados da embalagem UPC/EAN para compras
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            {/* Tipo de Embalagem */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="packageType" className="text-right">
                                    Tipo *
                                </Label>
                                <Input
                                    id="packageType"
                                    value={formData.packageType}
                                    onChange={(e) => setFormData({ ...formData, packageType: e.target.value })}
                                    placeholder="ROLL, BOX, BAG, PACK..."
                                    className="col-span-3"
                                />
                            </div>

                            {/* Quantidade Base + Unidade de Compra */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="baseQtyPerUnit" className="text-right">
                                    Qtd. Base *
                                </Label>
                                <div className="col-span-3 flex items-center gap-2">
                                    <Input
                                        id="baseQtyPerUnit"
                                        type="number"
                                        min="0.001"
                                        step="0.001"
                                        value={formData.baseQtyPerUnit}
                                        onChange={(e) => setFormData({ ...formData, baseQtyPerUnit: e.target.value })}
                                        placeholder="250"
                                        className="flex-1"
                                    />
                                    <span className="text-sm text-muted-foreground w-12">{unidadeBase}</span>
                                </div>
                            </div>

                            {/* Unidade de Compra */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="purchaseUnit" className="text-right">
                                    Un. Compra
                                </Label>
                                <Input
                                    id="purchaseUnit"
                                    value={formData.purchaseUnit}
                                    onChange={(e) => setFormData({ ...formData, purchaseUnit: e.target.value.toUpperCase() })}
                                    placeholder="EA, ROLL, BAG..."
                                    maxLength={20}
                                    className="col-span-3"
                                />
                            </div>

                            {/* Preço por embalagem */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="precoCompra" className="text-right">
                                    Preço ($)
                                </Label>
                                <Input
                                    id="precoCompra"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={formData.precoCompra}
                                    onChange={(e) => setFormData({ ...formData, precoCompra: e.target.value })}
                                    placeholder="45.00"
                                    className="col-span-3"
                                />
                            </div>

                            {/* Marca (opcional) */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="brand" className="text-right">
                                    Marca
                                </Label>
                                <Input
                                    id="brand"
                                    value={formData.brand}
                                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                    placeholder="Southwire, 3M, etc."
                                    className="col-span-3"
                                />
                            </div>

                            {/* UPC/EAN (opcional) */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="upcEan" className="text-right">
                                    UPC/EAN
                                </Label>
                                <Input
                                    id="upcEan"
                                    value={formData.upcEan}
                                    onChange={(e) => setFormData({ ...formData, upcEan: e.target.value })}
                                    placeholder="Código de barras (opcional)"
                                    maxLength={20}
                                    className="col-span-3"
                                />
                            </div>

                            {/* Modelo (opcional) */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="model" className="text-right">
                                    Modelo
                                </Label>
                                <Input
                                    id="model"
                                    value={formData.model}
                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                    placeholder="Modelo específico"
                                    className="col-span-3"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingId ? 'Salvar' : 'Criar'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Tabela de Embalagens */}
            {embalagens.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                    <Package className="h-10 w-10 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Nenhuma embalagem cadastrada</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground">
                        Adicione embalagens UPC/EAN para facilitar compras e conversão de quantidades.
                    </p>
                    <Button onClick={handleNew} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Embalagem
                    </Button>
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Qtd. Base</TableHead>
                                <TableHead className="text-right">Preço / Emb.</TableHead>
                                <TableHead className="text-right">Custo / {unidadeBase}</TableHead>
                                <TableHead>Marca</TableHead>
                                <TableHead>UPC/EAN</TableHead>
                                <TableHead className="w-[100px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {embalagens.map((emb) => {
                                const costPerUnit = emb.precoCompra && emb.baseQtyPerUnit
                                    ? (Number(emb.precoCompra) / Number(emb.baseQtyPerUnit)).toFixed(4)
                                    : null;
                                return (
                                <TableRow key={emb.id}>
                                    <TableCell className="font-medium">{emb.packageType}</TableCell>
                                    <TableCell className="text-right">
                                        {emb.baseQtyPerUnit} {unidadeBase}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {emb.precoCompra != null ? `$${Number(emb.precoCompra).toFixed(2)}` : '-'}
                                    </TableCell>
                                    <TableCell className="text-right text-brand-primary font-mono text-xs">
                                        {costPerUnit ? `$${costPerUnit}` : '-'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {emb.brand || '-'}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm text-muted-foreground">
                                        {emb.upcEan || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(emb)}
                                                title="Editar"
                                                aria-label={`Editar embalagem ${emb.packageType}`}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(emb)}
                                                title="Remover"
                                                aria-label={`Remover embalagem ${emb.packageType}`}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Info Box */}
            <div className="rounded-lg bg-muted/50 p-4 text-sm">
                <p className="font-medium">Como funciona a conversão:</p>
                <p className="mt-1 text-muted-foreground">
                    Ao comprar {embalagens[0]?.packageType || 'uma embalagem'}, o sistema automaticamente
                    converte para {embalagens[0]?.baseQtyPerUnit || 'X'} {unidadeBase} no estoque.
                    <br />
                    Exemplo: Comprar 2× &quot;Rolo 50ft&quot; = 100 {unidadeBase} no estoque.
                </p>
            </div>
        </div>
    );
}
