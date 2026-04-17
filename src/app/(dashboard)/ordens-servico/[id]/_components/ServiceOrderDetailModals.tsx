"use client";

import type { Dispatch, SetStateAction } from "react";
import { useRef, useState } from "react";
import { Button } from "@gladpros/ui/button";
import { SignaturePad } from "@gladpros/ui/signature-pad";
import { Camera, Paperclip, Pen, Receipt, RefreshCw } from "lucide-react";

type ServiceOrderStatus =
    | "DRAFT"
    | "SCHEDULED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "AWAITING_PAYMENT"
    | "CLOSED"
    | "WRITE_OFF"
    | "CANCELED";

type AttachmentType =
    | "BEFORE_PHOTO"
    | "AFTER_PHOTO"
    | "RECEIPT"
    | "RETURN_RECEIPT"
    | "INVOICE_DOC"
    | "OTHER";

type StockMaterial = {
    id: number;
    nome: string;
    unidade: string;
    quantidadeEstoque: number;
    precoUnitario: number;
};

type Technician = {
    id: number;
    name: string;
    initials: string;
    cargo: string;
    role: string;
    avatar: string | null;
};

type WorkEntryForm = {
    workerId: number;
    startedAt: string;
    endedAt: string;
    notes: string;
};

type ExternalMaterialForm = {
    name: string;
    unit: string;
    qty: string;
    cost: string;
};

type EditForm = {
    title: string;
    description: string;
    priority: string;
    techNotes: string;
    clientNotes: string;
};

type ConsumeItem = {
    id: number;
    name: string;
    reserved: number;
    unit: string;
};

type ExternalOrderMaterial = {
    id: number;
    name: string;
    quantityPlanned: number;
    unit: string | null;
};

type OrderMaterial = {
    id: number;
    name: string;
    quantityPlanned: number;
    unit: string | null;
};

type ServiceOrderDetailModalsProps = {
    actionLoading: boolean;
    addMaterialMode: "stock" | "external";
    allOrderMaterials: OrderMaterial[];
    cancelReasonText: string;
    consumeItem: ConsumeItem | null;
    consumeQty: string;
    editForm: EditForm;
    externalMaterial: ExternalMaterialForm;
    externalOrderMaterials: ExternalOrderMaterial[];
    filteredStockMaterials: StockMaterial[];
    formatCurrency: (value: number) => string;
    hasStockMaterialMatches: boolean;
    materialQty: string;
    materialSearch: string;
    reopenReasonText: string;
    selectedMaterial: StockMaterial | null;
    showAddMaterial: boolean;
    showAddWorkEntry: boolean;
    showCancelModal: boolean;
    showConsumeMaterial: boolean;
    showEditModal: boolean;
    showReopenModal: boolean;
    showSignatureModal: boolean;
    showTechAssign: boolean;
    showUploadModal: boolean;
    signatureFile: File | null;
    signatureData: string | null;
    signatureLoading: boolean;
    stockMaterials: StockMaterial[];
    technicians: Technician[];
    uploadCaption: string;
    uploadFile: File | null;
    uploadLoading: boolean;
    uploadMaterialIds: number[];
    uploadTotal: string;
    uploadType: AttachmentType;
    uploadVendor: string;
    workEntryForm: WorkEntryForm;
    setAddMaterialMode: Dispatch<SetStateAction<"stock" | "external">>;
    setCancelReasonText: Dispatch<SetStateAction<string>>;
    setConsumeItem: Dispatch<SetStateAction<ConsumeItem | null>>;
    setConsumeQty: Dispatch<SetStateAction<string>>;
    setEditForm: Dispatch<SetStateAction<EditForm>>;
    setExternalMaterial: Dispatch<SetStateAction<ExternalMaterialForm>>;
    setMaterialQty: Dispatch<SetStateAction<string>>;
    setMaterialSearch: Dispatch<SetStateAction<string>>;
    setReopenReasonText: Dispatch<SetStateAction<string>>;
    setSelectedMaterial: Dispatch<SetStateAction<StockMaterial | null>>;
    setShowAddMaterial: Dispatch<SetStateAction<boolean>>;
    setShowAddWorkEntry: Dispatch<SetStateAction<boolean>>;
    setShowCancelModal: Dispatch<SetStateAction<boolean>>;
    setShowConsumeMaterial: Dispatch<SetStateAction<boolean>>;
    setShowEditModal: Dispatch<SetStateAction<boolean>>;
    setShowReopenModal: Dispatch<SetStateAction<boolean>>;
    setShowSignatureModal: Dispatch<SetStateAction<boolean>>;
    setShowTechAssign: Dispatch<SetStateAction<boolean>>;
    setShowUploadModal: Dispatch<SetStateAction<boolean>>;
    setSignatureFile: Dispatch<SetStateAction<File | null>>;
    setSignatureData: Dispatch<SetStateAction<string | null>>;
    setUploadCaption: Dispatch<SetStateAction<string>>;
    setUploadFile: Dispatch<SetStateAction<File | null>>;
    setUploadMaterialIds: Dispatch<SetStateAction<number[]>>;
    setUploadTotal: Dispatch<SetStateAction<string>>;
    setUploadType: Dispatch<SetStateAction<AttachmentType>>;
    setUploadVendor: Dispatch<SetStateAction<string>>;
    setWorkEntryForm: Dispatch<SetStateAction<WorkEntryForm>>;
    addExternalMaterial: () => Promise<void>;
    addMaterial: () => Promise<void>;
    addWorkEntry: () => Promise<void>;
    assignTech: (techId: number) => Promise<void>;
    changeStatus: (newStatus: ServiceOrderStatus, reason?: string) => Promise<void>;
    consumeMaterial: () => Promise<void>;
    saveEdit: () => Promise<void>;
    uploadAttachment: () => Promise<void>;
    uploadSignature: (signatureDataOverride?: string) => Promise<void>;
};

export function ServiceOrderDetailModals({
    actionLoading,
    addExternalMaterial,
    addMaterial,
    addMaterialMode,
    addWorkEntry,
    allOrderMaterials,
    assignTech,
    cancelReasonText,
    changeStatus,
    consumeItem,
    consumeMaterial,
    consumeQty,
    editForm,
    externalMaterial,
    externalOrderMaterials,
    filteredStockMaterials,
    formatCurrency,
    hasStockMaterialMatches,
    materialQty,
    materialSearch,
    reopenReasonText,
    saveEdit,
    selectedMaterial,
    setAddMaterialMode,
    setCancelReasonText,
    setConsumeItem,
    setConsumeQty,
    setEditForm,
    setExternalMaterial,
    setMaterialQty,
    setMaterialSearch,
    setReopenReasonText,
    setSelectedMaterial,
    setShowAddMaterial,
    setShowAddWorkEntry,
    setShowCancelModal,
    setShowConsumeMaterial,
    setShowEditModal,
    setShowReopenModal,
    setShowSignatureModal,
    setShowTechAssign,
    setShowUploadModal,
    setSignatureFile,
    setSignatureData,
    setUploadCaption,
    setUploadFile,
    setUploadMaterialIds,
    setUploadTotal,
    setUploadType,
    setUploadVendor,
    setWorkEntryForm,
    showAddMaterial,
    showAddWorkEntry,
    showCancelModal,
    showConsumeMaterial,
    showEditModal,
    showReopenModal,
    showSignatureModal,
    showTechAssign,
    showUploadModal,
    signatureFile,
    signatureData,
    signatureLoading,
    technicians,
    uploadAttachment,
    uploadCaption,
    uploadFile,
    uploadLoading,
    uploadMaterialIds,
    uploadSignature,
    uploadTotal,
    uploadType,
    uploadVendor,
    workEntryForm,
}: ServiceOrderDetailModalsProps) {
    const [techSearch, setTechSearch] = useState('');
    const filteredTechs = technicians.filter(t =>
        t.name.toLowerCase().includes(techSearch.toLowerCase()) ||
        t.cargo.toLowerCase().includes(techSearch.toLowerCase())
    );

    // Estado do modal de assinatura
    const [signatureTab, setSignatureTab] = useState<'desenhar' | 'iniciais' | 'foto'>('desenhar');
    const [initialsText, setInitialsText] = useState('');
    const initialsCanvasRef = useRef<HTMLCanvasElement>(null);

    const renderInitialsCanvas = (text: string) => {
        if (!initialsCanvasRef.current) return;
        const canvas = initialsCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!text.trim()) return;
        ctx.font = 'italic 2.5rem Georgia, serif';
        ctx.fillStyle = '#1e3a8a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    };

    return (
        <>
            {showAddMaterial && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Adicionar Material</h3>

                            <div className="flex gap-1 p-1 bg-muted rounded-lg mb-5">
                                {(["stock", "external"] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setAddMaterialMode(mode)}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${addMaterialMode === mode
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"}`}
                                    >
                                        {mode === "stock" ? "Do Estoque" : "Compra em Campo"}
                                    </button>
                                ))}
                            </div>

                            {addMaterialMode === "stock" ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-muted-foreground">Buscar Material</label>
                                        <input
                                            type="text"
                                            value={materialSearch}
                                            onChange={(e) => setMaterialSearch(e.target.value)}
                                            placeholder="Digite o nome do material..."
                                            className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                                        />
                                    </div>

                                    {materialSearch && !selectedMaterial && (
                                        <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                                            {filteredStockMaterials.map((mat) => (
                                                <button
                                                    key={mat.id}
                                                    type="button"
                                                    onClick={() => setSelectedMaterial(mat)}
                                                    className="w-full text-left px-4 py-2 hover:bg-accent border-b border-border last:border-b-0"
                                                >
                                                    <div className="flex justify-between">
                                                        <span>{mat.nome}</span>
                                                        <span className="text-sm text-muted-foreground">
                                                            Estoque: {mat.quantidadeEstoque} {mat.unidade}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                            {!hasStockMaterialMatches && (
                                                <p className="p-4 text-center text-muted-foreground">Nenhum material encontrado no estoque</p>
                                            )}
                                        </div>
                                    )}

                                    {selectedMaterial && (
                                        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium">{selectedMaterial.nome}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedMaterial(null)}
                                                    className="text-sm text-destructive"
                                                >
                                                    Remover
                                                </button>
                                            </div>
                                            <p className={`text-sm font-medium ${selectedMaterial.quantidadeEstoque > 0 ? "text-green-600" : "text-destructive"}`}>
                                                Estoque: {selectedMaterial.quantidadeEstoque} {selectedMaterial.unidade}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Custo unitário: {formatCurrency(Number(selectedMaterial.precoUnitario))}
                                            </p>
                                        </div>
                                    )}

                                    {selectedMaterial && (
                                        <div>
                                            <label className="text-sm text-muted-foreground">Quantidade Planejada</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    title="Quantidade planejada"
                                                    value={materialQty}
                                                    onChange={(e) => setMaterialQty(e.target.value)}
                                                    className="flex-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                                                />
                                                {selectedMaterial.unidade && (
                                                    <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-2 rounded-lg border border-border whitespace-nowrap">
                                                        {selectedMaterial.unidade}
                                                    </span>
                                                )}
                                            </div>
                                            {parseFloat(materialQty) > selectedMaterial.quantidadeEstoque && (
                                                <p className="text-sm text-orange-600 mt-1">
                                                    Estoque insuficiente - sera marcado para compra
                                                </p>
                                            )}
                                            {parseFloat(materialQty) > 0 && Number(selectedMaterial.precoUnitario) > 0 && (
                                                <p className="text-sm text-muted-foreground mt-1.5">
                                                    {parseFloat(materialQty)} {selectedMaterial.unidade} × {formatCurrency(Number(selectedMaterial.precoUnitario))} = <span className="font-semibold text-foreground">{formatCurrency(parseFloat(materialQty) * Number(selectedMaterial.precoUnitario))}</span>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex gap-3 mt-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => {
                                                setShowAddMaterial(false);
                                                setAddMaterialMode("stock");
                                            }}
                                            className="flex-1"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            onClick={addMaterial}
                                            disabled={!selectedMaterial || actionLoading}
                                            className="flex-1"
                                        >
                                            {actionLoading ? "Adicionando..." : "Adicionar"}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        Use quando o tecnico precisar comprar o material em loja (Home Depot, etc.). O item ficara como <strong>Aguardando Compra</strong> ate ser marcado como comprado.
                                    </p>
                                    <div>
                                        <label className="text-sm text-muted-foreground">Nome do Material *</label>
                                        <input
                                            type="text"
                                            value={externalMaterial.name}
                                            onChange={(e) => setExternalMaterial((current) => ({ ...current, name: e.target.value }))}
                                            placeholder="Ex: PVC pipe 1/2 inch"
                                            className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-sm text-muted-foreground">Unidade</label>
                                            <input
                                                type="text"
                                                value={externalMaterial.unit}
                                                onChange={(e) => setExternalMaterial((current) => ({ ...current, unit: e.target.value }))}
                                                placeholder="un, ft, lb..."
                                                className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm text-muted-foreground">Quantidade</label>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                title="Quantidade"
                                                value={externalMaterial.qty}
                                                onChange={(e) => setExternalMaterial((current) => ({ ...current, qty: e.target.value }))}
                                                className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted-foreground">Custo Estimado (opcional)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={externalMaterial.cost}
                                            onChange={(e) => setExternalMaterial((current) => ({ ...current, cost: e.target.value }))}
                                            placeholder="0.00"
                                            className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                                        />
                                        {parseFloat(externalMaterial.qty) > 0 && parseFloat(externalMaterial.cost) > 0 && (
                                            <p className="text-sm text-muted-foreground mt-1.5">
                                                {parseFloat(externalMaterial.qty)} {externalMaterial.unit || 'un'} × {formatCurrency(parseFloat(externalMaterial.cost))} = <span className="font-semibold text-foreground">{formatCurrency(parseFloat(externalMaterial.qty) * parseFloat(externalMaterial.cost))}</span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-3 mt-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => {
                                                setShowAddMaterial(false);
                                                setAddMaterialMode("stock");
                                            }}
                                            className="flex-1"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            onClick={addExternalMaterial}
                                            disabled={!externalMaterial.name.trim() || actionLoading}
                                            className="flex-1"
                                        >
                                            {actionLoading ? "Adicionando..." : "Adicionar"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showAddWorkEntry && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Registrar Trabalho</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-muted-foreground">Tecnico *</label>
                                    <select
                                        title="Selecione um tecnico"
                                        value={workEntryForm.workerId}
                                        onChange={(e) => setWorkEntryForm({ ...workEntryForm, workerId: Number(e.target.value) })}
                                        className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                                    >
                                        <option value={0}>Selecione um tecnico...</option>
                                        {technicians.map((tech) => (
                                            <option key={tech.id} value={tech.id}>
                                                {tech.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground">Inicio *</label>
                                    <input
                                        type="datetime-local"
                                        title="Data/hora de inicio"
                                        value={workEntryForm.startedAt}
                                        onChange={(e) => setWorkEntryForm({ ...workEntryForm, startedAt: e.target.value })}
                                        className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground">Fim *</label>
                                    <input
                                        type="datetime-local"
                                        title="Data/hora de termino"
                                        value={workEntryForm.endedAt}
                                        onChange={(e) => setWorkEntryForm({ ...workEntryForm, endedAt: e.target.value })}
                                        className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground">Observacoes</label>
                                    <textarea
                                        title="Observacoes do trabalho"
                                        value={workEntryForm.notes}
                                        onChange={(e) => setWorkEntryForm({ ...workEntryForm, notes: e.target.value })}
                                        className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <Button variant="ghost" onClick={() => setShowAddWorkEntry(false)} className="flex-1">
                                    Cancelar
                                </Button>
                                <Button onClick={addWorkEntry} disabled={actionLoading} className="flex-1">
                                    {actionLoading ? "Salvando..." : "Salvar"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showConsumeMaterial && consumeItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Consumir Material</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Confirmar consumo de <strong>{consumeItem.name}</strong>?
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Quantidade Utilizada</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <input
                                            type="number"
                                            title="Quantidade utilizada"
                                            value={consumeQty}
                                            onChange={(e) => setConsumeQty(e.target.value)}
                                            min="0"
                                            max={consumeItem.reserved}
                                            step="0.01"
                                            className="block w-full rounded-md border border-border bg-background text-foreground shadow-sm focus:border-primary sm:text-sm p-2"
                                        />
                                        <span className="text-sm text-muted-foreground">{consumeItem.unit}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Reservado: {consumeItem.reserved} {consumeItem.unit}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setShowConsumeMaterial(false);
                                        setConsumeItem(null);
                                    }}
                                    className="flex-1"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={consumeMaterial}
                                    disabled={actionLoading || !consumeQty || parseFloat(consumeQty) <= 0 || parseFloat(consumeQty) > consumeItem.reserved}
                                    className="flex-1"
                                >
                                    {actionLoading ? "Confirmando..." : "Confirmar"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showTechAssign && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-1">Atribuir Técnico</h3>
                            <p className="text-sm text-muted-foreground mb-4">Selecione quem vai atender esta OS</p>

                            {technicians.length > 4 && (
                                <input
                                    type="text"
                                    value={techSearch}
                                    onChange={(e) => setTechSearch(e.target.value)}
                                    placeholder="Buscar por nome ou cargo..."
                                    className="w-full mb-3 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            )}

                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {filteredTechs.length === 0 ? (
                                    <p className="text-center text-sm text-muted-foreground py-6">
                                        {technicians.length === 0 ? 'Nenhum técnico cadastrado' : 'Nenhum resultado para a busca'}
                                    </p>
                                ) : (
                                    filteredTechs.map((tech) => (
                                        <button
                                            key={tech.id}
                                            type="button"
                                            onClick={() => assignTech(tech.id)}
                                            disabled={actionLoading}
                                            className="w-full text-left px-3 py-3 border border-border rounded-lg hover:bg-accent transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                {tech.avatar ? (
                                                    <img src={tech.avatar} alt={tech.name} className="h-9 w-9 rounded-full object-cover shrink-0" />
                                                ) : (
                                                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                        <span className="text-xs font-bold text-primary">{tech.initials}</span>
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">{tech.name}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{tech.cargo} · {tech.role}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>

                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => { setShowTechAssign(false); setTechSearch(''); }}
                                className="w-full mt-4"
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showUploadModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-6 space-y-4">
                            <h3 className="text-lg font-semibold">Enviar Anexo</h3>

                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Tipo de Anexo</label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {([
                                        { value: "BEFORE_PHOTO", label: "Foto Antes", icon: Camera },
                                        { value: "AFTER_PHOTO", label: "Foto Depois", icon: Camera },
                                        { value: "RECEIPT", label: "Nota Fiscal", icon: Receipt },
                                        { value: "RETURN_RECEIPT", label: "Recibo Devolucao", icon: RefreshCw },
                                        { value: "OTHER", label: "Outro", icon: Paperclip },
                                    ] as const).map(({ value, label, icon: Icon }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setUploadType(value)}
                                            className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-colors ${uploadType === value
                                                ? "border-primary bg-primary/10 text-primary font-medium"
                                                : "border-border hover:border-primary/50"}`}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Arquivo *</label>
                                <input
                                    type="file"
                                    title="Selecionar arquivo"
                                    accept="image/*,.pdf"
                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                    className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary file:text-primary-foreground"
                                />
                                {uploadFile && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {uploadFile.name} - {(uploadFile.size / 1024).toFixed(0)}KB
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Descricao (opcional)</label>
                                <input
                                    type="text"
                                    title="Descricao do anexo"
                                    value={uploadCaption}
                                    onChange={(e) => setUploadCaption(e.target.value)}
                                    placeholder={
                                        uploadType === "BEFORE_PHOTO" ? "Ex: Vazamento sob a pia" :
                                        uploadType === "AFTER_PHOTO" ? "Ex: Reparo concluido" :
                                        uploadType === "RECEIPT" ? "Ex: PVC pipe 1/2 inch" : ""
                                    }
                                    className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                                />
                            </div>

                            {(uploadType === "RECEIPT" || uploadType === "RETURN_RECEIPT") && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground uppercase">Loja / Fornecedor</label>
                                            <input
                                                type="text"
                                                title="Nome da loja"
                                                value={uploadVendor}
                                                onChange={(e) => setUploadVendor(e.target.value)}
                                                placeholder="Home Depot, Lowe's..."
                                                className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground uppercase">
                                                {uploadType === "RETURN_RECEIPT" ? "Valor Reembolsado ($)" : "Total da NF ($)"}
                                            </label>
                                            <input
                                                type="number"
                                                title={uploadType === "RETURN_RECEIPT" ? "Valor reembolsado" : "Valor total da nota fiscal"}
                                                min="0"
                                                step="0.01"
                                                value={uploadTotal}
                                                onChange={(e) => setUploadTotal(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                                            />
                                        </div>
                                    </div>
                                    {allOrderMaterials.length > 0 && (
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground uppercase">
                                                Vincular Materiais (opcional)
                                            </label>
                                            <div className="mt-1 max-h-40 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                                                {allOrderMaterials.map((material) => (
                                                    <label key={material.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={uploadMaterialIds.includes(material.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setUploadMaterialIds(prev => [...prev, material.id]);
                                                                } else {
                                                                    setUploadMaterialIds(prev => prev.filter(id => id !== material.id));
                                                                }
                                                            }}
                                                            className="rounded border-border"
                                                        />
                                                        <span className="text-sm">{material.name} ({material.quantityPlanned} {material.unit || "un"})</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {uploadMaterialIds.length > 0 && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {uploadMaterialIds.length} material(is) selecionado(s)
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowUploadModal(false)}
                                    className="flex-1"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={uploadAttachment}
                                    disabled={!uploadFile || uploadLoading}
                                    className="flex-1"
                                >
                                    {uploadLoading ? "Enviando..." : "Enviar"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg">
                        <div className="p-6 space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Pen className="h-5 w-5 text-blue-500" />
                                Editar Ordem de Servico
                            </h3>

                            <div className="space-y-1">
                                <label className="text-sm font-medium" htmlFor="edit-title">Titulo *</label>
                                <input
                                    id="edit-title"
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm((current) => ({ ...current, title: e.target.value }))}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label="Titulo da OS"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium" htmlFor="edit-desc">Descricao do problema</label>
                                <textarea
                                    id="edit-desc"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm((current) => ({ ...current, description: e.target.value }))}
                                    rows={3}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label="Descricao da OS"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium" htmlFor="edit-priority">Prioridade</label>
                                <select
                                    id="edit-priority"
                                    value={editForm.priority}
                                    onChange={(e) => setEditForm((current) => ({ ...current, priority: e.target.value }))}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label="Prioridade da OS"
                                >
                                    <option value="LOW">Baixa</option>
                                    <option value="MEDIUM">Normal</option>
                                    <option value="HIGH">Alta (SLA 24h)</option>
                                    <option value="EMERGENCY">Emergência (SLA 4h)</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium" htmlFor="edit-tech-notes">Notas Tecnicas (internas)</label>
                                <textarea
                                    id="edit-tech-notes"
                                    value={editForm.techNotes}
                                    onChange={(e) => setEditForm((current) => ({ ...current, techNotes: e.target.value }))}
                                    rows={2}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label="Notas tecnicas"
                                    placeholder="Visivel apenas para a equipe..."
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium" htmlFor="edit-client-notes">Observacoes para o cliente</label>
                                <textarea
                                    id="edit-client-notes"
                                    value={editForm.clientNotes}
                                    onChange={(e) => setEditForm((current) => ({ ...current, clientNotes: e.target.value }))}
                                    rows={2}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label="Notas para o cliente"
                                    placeholder="Visivel no portal do cliente..."
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="ghost"
                                    className="flex-1"
                                    onClick={() => setShowEditModal(false)}
                                    disabled={actionLoading}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={saveEdit}
                                    disabled={!editForm.title.trim() || actionLoading}
                                >
                                    {actionLoading ? "Salvando..." : "Salvar Alteracoes"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showSignatureModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4">
                        <div className="p-6 space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Pen className="h-5 w-5 text-blue-500" />
                                Assinatura de Conclusão
                            </h3>

                            {/* Abas */}
                            <div className="flex gap-1 p-1 bg-muted rounded-lg">
                                {(['desenhar', 'iniciais', 'foto'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => {
                                            setSignatureTab(tab);
                                            setSignatureData(null);
                                            setSignatureFile(null);
                                            setInitialsText('');
                                        }}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${signatureTab === tab
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {tab === 'desenhar' ? 'Desenhar' : tab === 'iniciais' ? 'Iniciais' : 'Foto'}
                                    </button>
                                ))}
                            </div>

                            {/* Aba: Desenhar */}
                            {signatureTab === 'desenhar' && (
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">
                                        Use o mouse ou dedos para assinar no campo abaixo.
                                    </p>
                                    <SignaturePad
                                        onSignature={(data) => setSignatureData(data || null)}
                                        width={460}
                                        height={180}
                                        className="rounded-lg border border-border"
                                    />
                                </div>
                            )}

                            {/* Aba: Iniciais */}
                            {signatureTab === 'iniciais' && (
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Digite seu nome ou iniciais. A pré-visualização será usada como assinatura.
                                    </p>
                                    <input
                                        type="text"
                                        value={initialsText}
                                        onChange={(e) => {
                                            setInitialsText(e.target.value);
                                            renderInitialsCanvas(e.target.value);
                                        }}
                                        placeholder="Ex: João S."
                                        maxLength={50}
                                        className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                                    />
                                    <div className="border border-border rounded-lg bg-card overflow-hidden flex items-center justify-center" style={{ height: 100 }}>
                                        <canvas
                                            ref={initialsCanvasRef}
                                            width={460}
                                            height={100}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Aba: Foto */}
                            {signatureTab === 'foto' && (
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">
                                        Envie uma foto da assinatura do cliente (PNG ou JPEG, máx. 5MB).
                                    </p>
                                    <input
                                        id="sig-file"
                                        type="file"
                                        accept="image/png,image/jpeg"
                                        aria-label="Selecionar arquivo de assinatura"
                                        onChange={(e) => setSignatureFile(e.target.files?.[0] ?? null)}
                                        className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                    />
                                    {signatureFile && (
                                        <p className="text-xs text-green-600">{signatureFile.name} ({(signatureFile.size / 1024).toFixed(0)} KB)</p>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="ghost"
                                    className="flex-1"
                                    onClick={() => {
                                        setShowSignatureModal(false);
                                        setSignatureFile(null);
                                        setSignatureData(null);
                                        setSignatureTab('desenhar');
                                        setInitialsText('');
                                    }}
                                    disabled={signatureLoading}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={() => {
                                        if (signatureTab === 'iniciais' && initialsCanvasRef.current && initialsText.trim()) {
                                            uploadSignature(initialsCanvasRef.current.toDataURL('image/png'));
                                        } else {
                                            uploadSignature();
                                        }
                                    }}
                                    disabled={
                                        signatureLoading ||
                                        (signatureTab === 'foto' && !signatureFile) ||
                                        (signatureTab === 'desenhar' && !signatureData) ||
                                        (signatureTab === 'iniciais' && !initialsText.trim())
                                    }
                                >
                                    {signatureLoading ? 'Salvando...' : 'Confirmar Assinatura'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCancelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4">
                        <div className="p-6 space-y-4">
                            <h3 className="text-lg font-semibold">Cancelar Ordem de Servico</h3>
                            <p className="text-sm text-muted-foreground">Informe o motivo do cancelamento para o historico da OS.</p>
                            <textarea
                                value={cancelReasonText}
                                onChange={(e) => setCancelReasonText(e.target.value)}
                                placeholder="Motivo do cancelamento..."
                                rows={3}
                                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                            />
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => setShowCancelModal(false)} className="flex-1">
                                    Voltar
                                </Button>
                                <Button
                                    variant="destructive"
                                    disabled={!cancelReasonText.trim() || actionLoading}
                                    onClick={async () => {
                                        await changeStatus("CANCELED", cancelReasonText);
                                        setShowCancelModal(false);
                                    }}
                                    className="flex-1"
                                >
                                    Confirmar Cancelamento
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showReopenModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4">
                        <div className="p-6 space-y-4">
                            <h3 className="text-lg font-semibold">Reabrir Ordem de Servico</h3>
                            <p className="text-sm text-muted-foreground">Informe o motivo da reabertura.</p>
                            <textarea
                                value={reopenReasonText}
                                onChange={(e) => setReopenReasonText(e.target.value)}
                                placeholder="Motivo da reabertura..."
                                rows={3}
                                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                            />
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => setShowReopenModal(false)} className="flex-1">
                                    Voltar
                                </Button>
                                <Button
                                    disabled={!reopenReasonText.trim() || actionLoading}
                                    onClick={async () => {
                                        await changeStatus("DRAFT", reopenReasonText);
                                        setShowReopenModal(false);
                                    }}
                                    className="flex-1"
                                >
                                    Confirmar Reabertura
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
