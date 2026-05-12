/**
 * CreateFornecedorModal
 * Modal para criação rápida de fornecedor dentro do formulário de compra
 */

'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@gladpros/ui/dialog';
import { Button } from '@gladpros/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@gladpros/ui/form';
import { Input } from '@gladpros/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@gladpros/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';

// Schema de validação
const fornecedorSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório').max(150),
    tipoDocumento: z.enum(['EIN', '']).optional(),
    documento: z.string().optional(),
    email: z.string().email('Email inválido').max(120).optional().or(z.literal('')),
    telefone: z.string().max(40).optional(),
}).refine((data) => {
    if (data.tipoDocumento === 'EIN') {
        const cleanDoc = (data.documento || '').replace(/\D/g, '');
        return cleanDoc.length === 9;
    }
    return true;
}, {
    message: 'EIN deve ter 9 dígitos',
    path: ['documento'],
});

type FornecedorFormData = z.infer<typeof fornecedorSchema>;

type FornecedorCreated = {
    id: number;
    nome: string;
};

type CreateFornecedorModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (fornecedor: FornecedorCreated) => void;
};

export function CreateFornecedorModal({
    open,
    onOpenChange,
    onSuccess,
}: CreateFornecedorModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const form = useForm<FornecedorFormData>({
         
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(fornecedorSchema) as any,
        defaultValues: {
            nome: '',
            tipoDocumento: '',
            documento: '',
            email: '',
            telefone: '',
        },
    });

    const tipoDocumento = useWatch({
        control: form.control,
        name: 'tipoDocumento',
    });

    const onSubmit = async (data: FornecedorFormData) => {
        setLoading(true);
        try {
            const res = await fetch('/api/estoque/fornecedores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    tipoDocumento: data.tipoDocumento || null,
                }),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Erro ao criar fornecedor');
            }

            toast({
                title: 'Fornecedor criado!',
                description: `${result.nome} foi adicionado com sucesso.`,
            });

            onSuccess(result);
            form.reset();
             
            onOpenChange(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            toast({
                title: 'Erro',
                description: err.message || 'Não foi possível criar o fornecedor.',
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
                    <DialogTitle>Novo Fornecedor</DialogTitle>
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
                                        <Input placeholder="Nome do fornecedor" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <FormField
                                control={form.control}
                                name="tipoDocumento"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo Documento</FormLabel>
                                        <Select
                                            onValueChange={(val) => {
                                                field.onChange(val);
                                                if (!val) {
                                                    form.setValue('documento', '');
                                                }
                                            }}
                                            value={field.value || ''}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="EIN">EIN (Company)</SelectItem>
                                                <SelectItem value="">None / Not provided</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {tipoDocumento === 'EIN' && (
                                <FormField
                                    control={form.control}
                                    name="documento"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>EIN Number</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="XX-XXXXXXX"
                                                    {...field}
                                                    onChange={(e) => {
                                                        // Máscara simples visual
                                                        let v = e.target.value.replace(/\D/g, '');
                                                        if (v.length > 9) v = v.slice(0, 9);
                                                        // Adiciona hífen se maior que 2
                                                        if (v.length > 2) {
                                                            v = `${v.slice(0, 2)}-${v.slice(2)}`;
                                                        }
                                                        field.onChange(v);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="email@exemplo.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="telefone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Telefone</FormLabel>
                                    <FormControl>
                                        <Input placeholder="(00) 00000-0000" {...field} />
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
                                Criar Fornecedor
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
