'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@gladpros/ui/dialog';
import { Button } from '@gladpros/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@gladpros/ui/form';
import { Input } from '@gladpros/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@gladpros/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import { organizeCategoriesForSelect } from '@/lib/estoque/category-utils';

const categoriaSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório').max(100),
    descricao: z.string().optional(),
    paiId: z.string().optional(), // Select value is string
});

type CategoriaFormData = z.infer<typeof categoriaSchema>;



type CreateCategoriaModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tipo: 'MATERIAL' | 'EQUIPAMENTO';
    onSuccess: (categoria: { id: number; nome: string; paiId?: number | null }) => void;
    preSelectedPaiId?: string | null;
};

export function CreateCategoriaModal({
    open,
    onOpenChange,
    tipo,
    onSuccess,
    preSelectedPaiId,
}: CreateCategoriaModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [categoriasPai, setCategoriasPai] = useState<any[]>([]);
    const [loadingPais, setLoadingPais] = useState(false);

    const form = useForm<CategoriaFormData>({
        resolver: zodResolver(categoriaSchema),
        defaultValues: {
            nome: '',
            descricao: '',
            paiId: preSelectedPaiId ?? undefined,
        },
    });

    // Atualizar paiId pré-selecionado se a prop mudar (ex: modal reaberto com outro pai)
    useEffect(() => {
        if (open) {
            form.setValue('paiId', preSelectedPaiId ?? undefined);
        }
    }, [open, preSelectedPaiId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Carregar categorias possíveis para serem pais (do mesmo tipo)
    useEffect(() => {
        if (open) {
            loadCategoriasPai();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, tipo]);

    const loadCategoriasPai = async () => {
        try {
            setLoadingPais(true);
            const res = await fetch(`/api/estoque/categorias?tipo=${tipo}`);
            if (res.ok) {
                const data = await res.json();
                // Organizar hierarquicamente antes de salvar no estado
                const organized = organizeCategoriesForSelect(data.data);
                setCategoriasPai(organized);
            }
        } catch (error) {
            console.error('Erro ao carregar categorias pai:', error);
        } finally {
            setLoadingPais(false);
        }
    };

    const onSubmit = async (data: CategoriaFormData) => {
        setLoading(true);
        try {
            const payload = {
                nome: data.nome,
                descricao: data.descricao,
                tipo: tipo,
                paiId: data.paiId && data.paiId !== 'none' ? parseInt(data.paiId) : null,
            };

            const res = await fetch('/api/estoque/categorias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            let result;
            try {
                 
                result = await res.json();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (e) {
                throw new Error(`Erro de resposta do servidor (${res.status}). Tente novamente.`);
            }

            if (res.status === 401) {
                throw new Error('Sua sessão expirou. Salve seu trabalho se possível e faça login novamente.');
            }

            if (!res.ok) {
                throw new Error(result.error || 'Erro ao criar categoria');
            }



            toast({
                title: 'Categoria criada!',
                description: `${result.data.nome} foi adicionada com sucesso ao tipo ${tipo}.`,
            });

            onSuccess({ id: result.data.id, nome: result.data.nome, paiId: result.data.paiId ?? null });
             
            form.reset();
            onOpenChange(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            toast({
                title: 'Erro',
                description: err.message || 'Não foi possível criar a categoria.',
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
                    <DialogTitle>Nova Categoria</DialogTitle>
                    <DialogDescription>
                        Adicionando categoria para {tipo === 'MATERIAL' ? 'Materiais' : 'Equipamentos'}
                    </DialogDescription>
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
                                        <Input placeholder="Ex: Elétricos, Consumíveis..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="paiId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Categoria Pai (Opcional)</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value || undefined}
                                        disabled={loadingPais}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={loadingPais ? "Carregando..." : "Selecione ou deixe vazio"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">-- Nenhuma (Raiz) --</SelectItem>
                                            {categoriasPai.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                                    {cat.displayName || cat.nome}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Selecione se esta for uma subcategoria.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="descricao"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Breve descrição" {...field} />
                                    </FormControl>
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
                                Criar Categoria
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
