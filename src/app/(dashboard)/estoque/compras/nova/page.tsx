/**
 * Nova Compra
 * Formulário para criar uma nova compra
 */

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from "@gladpros/ui/button"
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { CompraForm } from '@/components/estoque/compras/CompraForm';

export default async function NovaCompraPage() {
    // Buscar todos os dados de referência em paralelo — 1 round-trip ao banco em vez de 7 sequenciais
    const [fornecedores, projetos, materiais, equipamentos, localizacoes, unidades, categorias, solicitacoesCompra] = await Promise.all([
        prisma.fornecedor.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            select: { id: true, nome: true }
        }),
        prisma.projeto.findMany({
            where: { status: { not: 'concluido' } },
            orderBy: { numeroProjeto: 'desc' },
            select: { id: true, numeroProjeto: true, titulo: true },
            take: 100
        }),
        prisma.material.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            select: {
                id: true,
                codigo: true,
                nome: true,
                unidade: { select: { codigo: true } }
            }
        }),
        prisma.equipamento.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            select: { id: true, codigo: true, nome: true }
        }),
        prisma.localizacao.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            select: { id: true, codigo: true, nome: true }
        }),
        prisma.unidade.findMany({
            orderBy: { nome: 'asc' },
            select: { id: true, codigo: true, nome: true }
        }),
        prisma.categoria.findMany({
            where: { tipo: 'MATERIAL' },
            orderBy: { nome: 'asc' },
            select: { id: true, nome: true }
        }),
        prisma.solicitacaoCompra.findMany({
            where: { status: 'APROVADA' },
            orderBy: { criadoEm: 'desc' },
            select: {
                id: true,
                observacoes: true,
                valorAprovado: true,
                valorTotalGasto: true,
            },
            take: 50,
        }),
    ]);

    // Serializar Decimal para string (Next.js não serializa Decimal automaticamente)
    const scsSerialized = solicitacoesCompra.map(sc => ({
        ...sc,
        valorAprovado: sc.valorAprovado?.toString() ?? null,
        valorTotalGasto: sc.valorTotalGasto.toString(),
    }));

    return (
        <div className="space-y-6">
            <ModulePageHeader
                title="Nova Compra"
                description="Registrar uma nova compra de materiais ou equipamentos"
                icon={<ShoppingCart />}
                accentColor="#0098DA"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Estoque', href: '/estoque' },
                    { label: 'Compras', href: '/estoque/compras' },
                    { label: 'Nova Compra' },
                ]}
                actions={
                    <Link href="/estoque/compras">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar
                        </Button>
                    </Link>
                }
            />

            {/* Formulário */}
            <CompraForm
                fornecedores={fornecedores}
                projetos={projetos}
                materiais={materiais}
                equipamentos={equipamentos}
                localizacoes={localizacoes}
                unidades={unidades}
                categorias={categorias}
                solicitacoesCompra={scsSerialized}
            />
        </div>
    );
}
