'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@gladpros/ui/table';
import { Button } from '@gladpros/ui/button';
import { Loader2, Trash2, ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import { CreateCategoriaModal } from './CreateCategoriaModal';
import { cn } from '@/shared/lib/utils';

type Categoria = {
    id: number;
    nome: string;
    descricao?: string;
    paiId?: number;
    pai?: {
        id: number;
        nome: string;
    };
    _count?: {
        materiais: number;
        equipamentos: number;
        filhos: number;
    };
    children?: Categoria[]; // Adicionado para estrutura de árvore
};

type CategoriaListProps = {
    tipo: 'MATERIAL' | 'EQUIPAMENTO';
};

// Função auxiliar para construir a árvore
function buildTree(items: Categoria[]): Categoria[] {
    const map = new Map<number, Categoria>();
    const roots: Categoria[] = [];

    // Primeiro mapeia todos os itens e inicializa children
    items.forEach(item => {
        map.set(item.id, { ...item, children: [] });
    });

    // Depois monta a hierarquia
    items.forEach(item => {
        const node = map.get(item.id)!;
        if (item.paiId && map.has(item.paiId)) {
            const parent = map.get(item.paiId)!;
            parent.children!.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

export function CategoriaList({ tipo }: CategoriaListProps) {
    const { toast } = useToast();
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Estado para controle de expansão (ID -> boolean)
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});

    const loadCategorias = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/estoque/categorias?tipo=${tipo}`);
            if (!res.ok) throw new Error('Falha ao carregar');
            const data = await res.json();
            setCategorias(data.data);

            // Auto-expandir raízes que têm filhos
            // (Opcional, mas ajuda a ver a estrutura logo de cara)
        } catch (error) {
            console.error(error);
            toast({
                title: 'Erro',
                description: 'Não foi possível carregar as categorias.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategorias();
        setExpanded({}); // Resetar expansão ao mudar de aba
    }, [tipo]);

    const toggleExpand = (id: number) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleDelete = async (id: number, count: number) => {
        if (count > 0) {
            toast({
                title: 'Não é possível excluir',
                description: 'Categoria possui itens ou subcategorias vinculadas.',
                variant: 'destructive'
            });
            return;
        }

        if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

        try {
            const res = await fetch(`/api/estoque/categorias/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast({ title: 'Sucesso', description: 'Categoria excluída.' });
                loadCategorias();
            } else {
                throw new Error('Erro ao excluir');
            }
        } catch (error) {
            toast({ title: 'Erro', description: 'Erro ao excluir categoria.', variant: 'destructive' });
        }
    };

    // Computar a árvore apenas quando a lista mudar
    const treeData = useMemo(() => buildTree(categorias), [categorias]);

    // Função recursiva para renderizar linhas
    const renderRows = (nodes: Categoria[], level = 0): React.ReactNode => {
        return nodes.map(node => {
            const hasChildren = node.children && node.children.length > 0;
            const isExpanded = expanded[node.id];

            // Total de itens vinculados a esta categoria ESPECÍFICA (não soma filhos recursivamente aqui para display, mas na lógica de delete usamos o count backend)
            // Backend retorna _count.filhos, _count.materiais/equipamentos
            const totalItemsDirect = (node._count?.materiais || 0) + (node._count?.equipamentos || 0);

            return (
                <>
                    <TableRow key={node.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                            <div
                                className="flex items-center gap-2"
                                style={{ paddingLeft: `${level * 24}px` }}
                            >
                                {hasChildren ? (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 p-0 shrink-0"
                                        aria-label={isExpanded ? `Recolher categoria ${node.nome}` : `Expandir categoria ${node.nome}`}
                                        onClick={() => toggleExpand(node.id)}
                                    >
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                    </Button>
                                ) : (
                                    <div className="w-6 shrink-0" />
                                )}

                                {hasChildren ? (
                                    isExpanded ?
                                        <FolderOpen className="h-4 w-4 text-blue-500 shrink-0" /> :
                                        <Folder className="h-4 w-4 text-blue-500 shrink-0" />
                                ) : (
                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-300 ml-1.5 shrink-0" />
                                )}

                                <span className={cn(level === 0 && "font-semibold text-base")}>
                                    {node.nome}
                                </span>
                            </div>
                        </TableCell>
                        <TableCell>
                            {level === 0 ? (
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                    Raiz
                                </span>
                            ) : (
                                <span className="text-muted-foreground text-xs">
                                    Nível {level + 1}
                                </span>
                            )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{node.descricao || '-'}</TableCell>
                        <TableCell>
                            {totalItemsDirect > 0 ? (
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                    {totalItemsDirect} itens
                                </span>
                            ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                            )}
                        </TableCell>
                        <TableCell>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Excluir categoria ${node.nome}`}
                                onClick={() => {
                                    const totalLinked = totalItemsDirect + (node._count?.filhos || 0);
                                    handleDelete(node.id, totalLinked);
                                }}
                                className="text-destructive hover:text-destructive h-8 w-8"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </TableRow>

                    {/* Renderizar filhos recursivamente se expandido */}
                    {hasChildren && isExpanded && renderRows(node.children!, level + 1)}
                </>
            );
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    {categorias.length} categorias cadastradas
                </div>
                <Button onClick={() => setShowModal(true)}>
                    + Nova Categoria
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[400px]">Nome da Categoria</TableHead>
                            <TableHead>Nível</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Itens Vinculados</TableHead>
                            <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <div className="flex justify-center items-center">
                                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                        Carregando...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : categorias.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    Nenhuma categoria encontrada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            renderRows(treeData)
                        )}
                    </TableBody>
                </Table>
            </div>

            <CreateCategoriaModal
                open={showModal}
                onOpenChange={setShowModal}
                tipo={tipo}
                onSuccess={loadCategorias}
            />
        </div>
    );
}
