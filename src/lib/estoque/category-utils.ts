/**
 * Utilitários para manipulação de categorias de estoque
 */

export interface CategoryItem {
    id: number;
    nome: string;
    paiId?: number | null;
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export function organizeCategoriesForSelect(items: CategoryItem[]) {
    const byParent = new Map<number | null, CategoryItem[]>();

    // Agrupar por pai
    items.forEach(item => {
        const pid = item.paiId || null;
        if (!byParent.has(pid)) byParent.set(pid, []);
        byParent.get(pid)!.push(item);
    });

    const result: (CategoryItem & { displayName: string })[] = [];

    // Função recursiva para achatar a árvore mantendo a ordem
    function traverse(parentId: number | null, level: number) {
        const children = byParent.get(parentId) || [];
        // Ordenar alfabeticamente dentro do mesmo nível
        children.sort((a, b) => a.nome.localeCompare(b.nome));

        children.forEach(child => {
            // Criar prefixo visual baseado no nível
            const prefix = level > 0 ? '\u00A0\u00A0'.repeat(level * 2) + '↳ ' : '';

            result.push({
                ...child,
                displayName: prefix + child.nome
            });

            traverse(child.id, level + 1);
        });
    }

    traverse(null, 0);
    return result;
}
