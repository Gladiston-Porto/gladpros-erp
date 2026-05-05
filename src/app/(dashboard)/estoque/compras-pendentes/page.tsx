"use client";
import { useEffect, useState, useCallback } from "react";
import {
    Package, AlertTriangle, Clock, CheckCircle,
    ChevronDown, ChevronUp, DollarSign, Truck,
    RefreshCw, ExternalLink
} from "lucide-react";
import Link from "next/link";
import { Button } from '@gladpros/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";
import { Badge } from "@gladpros/ui/badge";

// Types
type ServiceOrderRef = {
    id: number;
    ticketNumber: string;
    clientName: string;
    materialId: number;
    quantity: number;
    scheduledDate: string | null;
};

type PendingItem = {
    groupKey: string;
    name: string;
    unit: string | null;
    totalQuantity: number;
    estimatedCost: number | null;
    serviceOrderCount: number;
    serviceOrders: ServiceOrderRef[];
    urgency: 'HIGH' | 'MEDIUM' | 'LOW';
};

type Summary = {
    totalItems: number;
    totalQuantity: number;
    totalEstimatedCost: number;
    highUrgencyCount: number;
    affectedServiceOrders: number;
};

// Urgency Badge
function UrgencyBadge({ urgency }: { urgency: 'HIGH' | 'MEDIUM' | 'LOW' }) {
    const styles = {
        HIGH: 'bg-red-100 text-red-800 border-red-200',
        MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        LOW: 'bg-green-100 text-green-800 border-green-200'
    };
    const labels = { HIGH: 'Urgente', MEDIUM: 'Média', LOW: 'Baixa' };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[urgency]}`}>
            {urgency === 'HIGH' && <AlertTriangle className="h-3 w-3 mr-1" />}
            {urgency === 'MEDIUM' && <Clock className="h-3 w-3 mr-1" />}
            {labels[urgency]}
        </span>
    );
}

// Expandable Row Component
function PurchaseItemRow({
    item,
    onReceive
}: {
    item: PendingItem;
    onReceive: (item: PendingItem) => void;
}) {
    const [expanded, setExpanded] = useState(false);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
    };

    return (
        <>
            <tr className="border-b border-border hover:bg-muted/40">
                <td className="px-4 py-3">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-1 hover:bg-muted rounded"
                    >
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                </td>
                <td className="px-4 py-3">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.unit || 'un'}</div>
                </td>
                <td className="px-4 py-3">
                    <UrgencyBadge urgency={item.urgency} />
                </td>
                <td className="px-4 py-3 text-right font-mono">
                    {item.totalQuantity}
                </td>
                <td className="px-4 py-3 text-center">
                    <span className="text-sm text-muted-foreground">{item.serviceOrderCount} OS</span>
                </td>
                <td className="px-4 py-3 text-right">
                    {item.estimatedCost ? formatCurrency(item.estimatedCost) : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                    <Button
                        size="sm"
                        onClick={() => onReceive(item)}
                    >
                        <Truck className="h-4 w-4 mr-1" />
                        Dar Entrada
                    </Button>
                </td>
            </tr>

            {/* Expanded Detail */}
            {expanded && (
                <tr className="bg-muted/30">
                    <td colSpan={7} className="px-8 py-4">
                        <div className="text-sm">
                            <h4 className="font-medium mb-2">Ordens de Serviço Afetadas:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {item.serviceOrders.map((so) => (
                                    <Link
                                        key={so.materialId}
                                        href={`/ordens-servico/${so.id}`}
                                        className="flex items-center justify-between p-2 bg-card rounded-lg border border-border hover:border-primary/40"
                                    >
                                        <div>
                                            <span className="font-mono text-xs">{so.ticketNumber}</span>
                                            <span className="text-muted-foreground text-xs ml-2">{so.clientName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="font-medium">{so.quantity} {item.unit || 'un'}</span>
                                            {so.scheduledDate && (
                                                <span className="text-muted-foreground">{formatDate(so.scheduledDate)}</span>
                                            )}
                                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

// Receive Modal
function ReceiveModal({
    item,
    onClose,
    onConfirm
}: {
    item: PendingItem | null;
    onClose: () => void;
    onConfirm: (data: { unitCost: number; quantity: number; supplier?: string }) => void;
}) {
    const [unitCost, setUnitCost] = useState("");
    const [quantity, setQuantity] = useState("");
    const [supplier, setSupplier] = useState("");

    useEffect(() => {
        if (item) {
            setQuantity(String(item.totalQuantity));
            // Pre-fill estimated cost if available
            if (item.estimatedCost && item.totalQuantity > 0) {
                setUnitCost(String(Math.round(item.estimatedCost / item.totalQuantity * 100) / 100));
            }
        }
    }, [item]);

    if (!item) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm({
            unitCost: parseFloat(unitCost),
            quantity: parseFloat(quantity),
            supplier: supplier || undefined
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-md mx-4">
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Dar Entrada de Compra</h3>

                    <div className="p-3 bg-blue-50 rounded-lg mb-4">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                            Necessário: {item.totalQuantity} {item.unit || 'un'} para {item.serviceOrderCount} OS
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm text-muted-foreground">Quantidade Recebida</label>
                            <input
                                type="number"
                                step="0.01"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="w-full mt-1 border border-border bg-background rounded-lg px-3 py-2"
                                required
                                min={item.totalQuantity}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Mínimo: {item.totalQuantity} para atender todas as OS
                            </p>
                        </div>

                        <div>
                            <label className="text-sm text-muted-foreground">Custo Unitário ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={unitCost}
                                onChange={(e) => setUnitCost(e.target.value)}
                                className="w-full mt-1 border border-border bg-background rounded-lg px-3 py-2"
                                placeholder="0.00"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm text-muted-foreground">Fornecedor (opcional)</label>
                            <input
                                type="text"
                                value={supplier}
                                onChange={(e) => setSupplier(e.target.value)}
                                className="w-full mt-1 border border-border bg-background rounded-lg px-3 py-2"
                                placeholder="Nome do fornecedor"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                                Cancelar
                            </Button>
                            <Button type="submit" className="flex-1">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirmar Entrada
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Main Page
export default function ProcurementHubPage() {
    const [items, setItems] = useState<PendingItem[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
    const [processing, setProcessing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/inventory/pending-purchases');
            if (!res.ok) throw new Error('Failed to load');
            const data = await res.json();
            setItems(data.items || []);
            setSummary(data.summary || null);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleReceive = async (data: { unitCost: number; quantity: number; supplier?: string }) => {
        if (!selectedItem) return;

        setProcessing(true);
        try {
            const res = await fetch('/api/inventory/receive-purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupKey: selectedItem.groupKey,
                    materialIds: selectedItem.serviceOrders.map(so => so.materialId),
                    unitCostActual: data.unitCost,
                    totalQuantityReceived: data.quantity,
                    supplier: data.supplier
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to process');
            }

            setSelectedItem(null);
            loadData(); // Refresh list
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error processing purchase');
        } finally {
            setProcessing(false);
        }
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Carregando compras pendentes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Package className="h-6 w-6" />
                        Central de Compras
                    </h1>
                    <p className="text-muted-foreground">Materiais pendentes de compra para Ordens de Serviço</p>
                </div>
                <Button variant="secondary" onClick={loadData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                </Button>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-2xl font-bold">{summary.totalItems}</div>
                            <p className="text-sm text-muted-foreground">Itens Pendentes</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-red-600">{summary.highUrgencyCount}</div>
                            <p className="text-sm text-muted-foreground">Urgentes</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-2xl font-bold">{summary.affectedServiceOrders}</div>
                            <p className="text-sm text-muted-foreground">OS Afetadas</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-2xl font-bold">{formatCurrency(summary.totalEstimatedCost)}</div>
                            <p className="text-sm text-muted-foreground">Custo Estimado</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Error State */}
            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="py-6 text-center text-red-600">
                        <p>{error}</p>
                        <Button variant="secondary" onClick={loadData} className="mt-4">
                            Tentar novamente
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Main Table */}
            {!error && (
                <Card>
                    <CardContent className="p-0">
                        {items.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Nenhuma compra pendente</p>
                                <p className="text-sm">Todos os materiais das OS estão em estoque ou reservados.</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-muted/30 border-b border-border">
                                    <tr className="text-left text-sm text-muted-foreground">
                                        <th className="px-4 py-3 w-12"></th>
                                        <th className="px-4 py-3">Material</th>
                                        <th className="px-4 py-3">Urgência</th>
                                        <th className="px-4 py-3 text-right">Qtd Total</th>
                                        <th className="px-4 py-3 text-center">Demanda</th>
                                        <th className="px-4 py-3 text-right">Custo Est.</th>
                                        <th className="px-4 py-3 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <PurchaseItemRow
                                            key={item.groupKey}
                                            item={item}
                                            onReceive={setSelectedItem}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Receive Modal */}
            <ReceiveModal
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
                onConfirm={handleReceive}
            />
        </div>
    );
}
