/**
 * CreateMaterialModal
 * Modal para criação rápida de material dentro do formulário de compra
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@gladpros/ui/dialog';
import { Button } from '@gladpros/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@gladpros/ui/form';
import { Input } from '@gladpros/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@gladpros/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';

// Schema de validação (flexível para permitir códigos como ROMEX-12/2)
const materialQuickSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório').max(200),
    codigo: z.string()
        .min(1, 'Código é obrigatório')
        .max(50)
        .regex(/^[A-Za-z0-9\-_./\s]+$/, 'Apenas letras, números, hífen, sublinhado, ponto, barra e espaço'),
    unidadeId: z.string().min(1, 'Unidade é obrigatória'),
    categoriaId: z.string().optional(),
});

type MaterialFormData = z.infer<typeof materialQuickSchema>;

type UnidadeOption = {
    id: number;
    codigo: string;
    nome: string;
};

type CategoriaOption = {
    id: number;
    nome: string;
};

type MaterialCreated = {
    id: number;
    codigo: string;
    nome: string;
    unidade: { codigo: string };
};

type CreateMaterialModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (material: MaterialCreated) => void;
    unidades: UnidadeOption[];
    categorias: CategoriaOption[];
};

export function CreateMaterialModal({
    open,
    onOpenChange,
    onSuccess,
    unidades,
    categorias,
}: CreateMaterialModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const form = useForm<MaterialFormData>({
        resolver: zodResolver(materialQuickSchema) as any,
        defaultValues: {
            nome: '',
            codigo: '',
            unidadeId: '',
            categoriaId: '',
        },
    });

    const onSubmit = async (data: MaterialFormData) => {
        setLoading(true);
        try {
            // Prepara payload com defaults do schema API
            const payload = {
                nome: data.nome,
                codigo: data.codigo.toUpperCase(),
                unidadeId: parseInt(data.unidadeId),
                categoriaId: data.categoriaId ? parseInt(data.categoriaId) : undefined,
                estoqueMinimo: 0,
                pontoReposicao: 0,
                rastreioLote: false,
                possuiValidade: false,
            };

            const res = await fetch('/api/estoque/materiais', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Erro ao criar material');
            }

            // Encontra a unidade selecionada para passar ao callback
            const unidadeSelecionada = unidades.find(u => u.id === parseInt(data.unidadeId));

            const materialCreated: MaterialCreated = {
                id: result.data?.id || result.id,
                codigo: payload.codigo,
                nome: data.nome,
                unidade: { codigo: unidadeSelecionada?.codigo || 'UN' },
            };

            toast({
                title: 'Material criado!',
                description: `${materialCreated.nome} foi adicionado com sucesso.`,
            });

            onSuccess(materialCreated);
            form.reset();
            onOpenChange(false);
        } catch (err: any) {
            toast({
                title: 'Erro',
                description: err.message || 'Não foi possível criar o material.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Novo Material</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                        <FormField
                            control={form.control}
                            name="codigo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Código (SKU) *</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Ex: ROMEX-12/2"
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="unidadeId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Unidade *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione a unidade" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {unidades.map((u) => (
                                                <SelectItem key={u.id} value={u.id.toString()}>
                                                    {u.nome} ({u.codigo})
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
                            name="categoriaId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Categoria</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione (opcional)" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {categorias.map((c) => (
                                                <SelectItem key={c.id} value={c.id.toString()}>
                                                    {c.nome}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={loading}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Criar Material
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
