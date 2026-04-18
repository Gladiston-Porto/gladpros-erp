import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ReceberCompraForm } from '@/components/estoque/compras/ReceberCompraForm';
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { PackageCheck } from 'lucide-react';

type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function ReceberCompraPage({ params }: PageProps) {
    const { id } = await params;
    const compraId = parseInt(id);

    if (isNaN(compraId)) {
        notFound();
    }

    // Busca compra e localizações em paralelo
    const [compra, localizacoes] = await Promise.all([
        prisma.compra.findUnique({
            where: { id: compraId },
            include: {
                fornecedor: { select: { nome: true } },
                itens: {
                    include: {
                        material: {
                            select: { id: true, nome: true, unidade: { select: { codigo: true } } }
                        },
                        equipamento: { select: { id: true, nome: true } }
                    }
                }
            }
        }),
        prisma.localizacao.findMany({
            where: { ativo: true },
            select: { id: true, nome: true, codigo: true },
            orderBy: { nome: 'asc' }
        })
    ]);

    if (!compra) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <ModulePageHeader
                title={`Receber Compra #${compra.numeroNf ?? compra.id}`}
                description={`Fornecedor: ${compra.fornecedor?.nome ?? '—'} | Data Pedido: ${new Date(compra.dataCompra).toLocaleDateString()}`}
                icon={<PackageCheck />}
                accentColor="#0098DA"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Compras', href: '/estoque/compras' },
                    { label: `Compra #${compra.numeroNf ?? compra.id}`, href: `/estoque/compras/${compra.id}` },
                    { label: 'Recebimento' },
                ]}
            />

            <div className="max-w-4xl mx-auto">
                <ReceberCompraForm
                    compra={{
                        ...compra,
                        itens: compra.itens.map(item => ({
                            ...item,
                            quantidade: Number(item.quantidade),
                            custoUnitario: Number(item.custoUnitario),
                        }))
                    }}
                    localizacoes={localizacoes}
                />
            </div>
        </div>
    );
}
