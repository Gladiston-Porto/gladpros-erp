"use client";

import type { Dispatch, SetStateAction } from "react";
import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@gladpros/ui/button";
import { SignaturePad } from "@gladpros/ui/signature-pad";
import { Camera, Paperclip, Pen, Receipt, RefreshCw, X } from "lucide-react";

// ─── MaterialQtyPopup ────────────────────────────────────────────────────────
// Small popup shown when linking a material with qty > 1 to a receipt.
// Lets the user confirm how many units are on this receipt and verify the cost.
function MaterialQtyPopup({
    material,
    existing,
    onConfirm,
    onCancel,
    formatCurrency,
}: {
    material: OrderMaterial;
    existing?: { qty: string; cost: string; hasTax: boolean; taxRate: string };
    onConfirm: (qty: number, cost: number, hasTax: boolean, taxRate: number) => void;
    onCancel: () => void;
    formatCurrency: (v: number) => string;
}) {
    const defaultCost = material.unitCostActual ?? material.unitCostEstimated ?? 0;
    const [qty, setQty] = useState(existing?.qty ?? String(material.quantityPlanned));
    const [cost, setCost] = useState(existing?.cost ?? String(defaultCost));
    const [hasTax, setHasTax] = useState(existing?.hasTax ?? (material.hasTax ?? true));
    const [taxRate, setTaxRate] = useState(existing?.taxRate ?? (material.taxRate != null ? String(material.taxRate) : '8.25'));

    const qtyNum = parseFloat(qty) || 0;
    const costNum = parseFloat(cost) || 0;
    const rateNum = parseFloat(taxRate) || 0;
    const taxAmt = hasTax ? qtyNum * costNum * rateNum / 100 : 0;
    const subtotal = qtyNum * costNum;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-xs p-5 space-y-3">
                <div>
                    <h4 className="font-semibold text-sm">{material.name}</h4>
                    <p className="text-xs text-muted-foreground">Planejado: {material.quantityPlanned} {material.unit || 'un'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs text-muted-foreground">Qtd nesta nota</label>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={material.quantityPlanned}
                            value={qty}
                            onChange={e => setQty(e.target.value)}
                            className="w-full mt-0.5 border border-border rounded px-2 py-1.5 text-sm bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            autoFocus
                        />
                        <p className="text-[10px] text-muted-foreground mt-0.5">máx: {material.quantityPlanned}</p>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground">Custo unitário ($)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={cost}
                            onChange={e => setCost(e.target.value)}
                            className="w-full mt-0.5 border border-border rounded px-2 py-1.5 text-sm bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={hasTax} onChange={e => setHasTax(e.target.checked)} className="rounded border-border" />
                        <span className="text-xs text-muted-foreground">Taxa (TX)</span>
                    </label>
                    {hasTax && (
                        <div className="flex items-center gap-1 ml-auto">
                            <input
                                type="number" min="0" max="100" step="0.01"
                                value={taxRate}
                                onChange={e => setTaxRate(e.target.value)}
                                className="w-16 border border-border rounded px-2 py-1 text-xs bg-background focus:outline-none"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                        </div>
                    )}
                </div>
                <div className="bg-muted/50 rounded-lg p-2 text-xs space-y-0.5">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {hasTax && (
                        <div className="flex justify-between text-amber-500">
                            <span>Taxa {taxRate}%:</span>
                            <span>+{formatCurrency(taxAmt)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-semibold border-t border-border/50 pt-0.5 mt-0.5">
                        <span>Total:</span>
                        <span>{formatCurrency(subtotal + taxAmt)}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1 h-8 text-sm" onClick={onCancel}>Cancelar</Button>
                    <Button
                        className="flex-1 h-8 text-sm"
                        disabled={!qtyNum || !costNum}
                        onClick={() => onConfirm(qtyNum, costNum, hasTax, rateNum)}
                    >
                        Confirmar
                    </Button>
                </div>
            </div>
        </div>
    );
}
// ─────────────────────────────────────────────────────────────────────────────

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

type EditWorkEntryForm = {
    startedAt: string;
    endedAt: string;
    notes: string;
    hourlyRate: string;
};

type WorkEntryItem = {
    id: number;
    startedAt: string;
    endedAt: string;
    totalMinutes: number;
    totalCost: number;
    hourlyRate: number;
    notes: string | null;
    Worker: { id: number; name: string };
};

type ExternalMaterialForm = {
    name: string;
    unit: string;
    qty: string;
    cost: string;
    hasTax: boolean;
    taxRate: string;
};

type EditAttachmentForm = {
    caption: string;
    type: AttachmentType;
    vendorName: string;
    receiptTotal: string;
    linkedMaterials: Array<{ materialItemId: number; quantityOnReceipt: string; unitCostOnReceipt: string; hasTax: boolean; taxRate: string }>;
};

export type AttachmentItem = {
    id: number;
    type: AttachmentType;
    filename: string;
    filepath: string;
    mime: string;
    caption: string | null;
    vendorName: string | null;
    receiptTotal: number | null;
    taxAmount?: number | null;
    materialItems: Array<{ materialItemId: number; quantityOnReceipt: number | null; unitCostOnReceipt: number | null; hasTax: boolean | null; taxRate: number | null; materialItem: { id: number; name: string; unit: string | null } }>;
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
    unitCostEstimated: number | null;
    unitCostActual: number | null;
    hasTax: boolean | null;
    taxRate: number | null;
};

type ServiceOrderDetailModalsProps = {
    actionLoading: boolean;
    addMaterialMode: "stock" | "external";
    allOrderMaterials: OrderMaterial[];
    /** Receipts already saved — used to compute which materials are still available for linking */
    orderAttachments: Array<{ id: number; materialItems: Array<{ materialItemId: number }> }>;
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
    writeOffReasonText: string;
    selectedMaterial: StockMaterial | null;
    showAddMaterial: boolean;
    showAddWorkEntry: boolean;
    showCancelModal: boolean;
    showConsumeMaterial: boolean;
    showEditModal: boolean;
    showReopenModal: boolean;
    showWriteOffModal: boolean;
    showSignatureModal: boolean;
    showTechAssign: boolean;
    showUploadModal: boolean;
    signatureFile: File | null;
    signatureData: string | null;
    signatureLoading: boolean;
    stockMaterials: StockMaterial[];
    technicians: Technician[];
    orderTechnicians: Array<{ workerId: number; worker: { id: number; name: string } }>;
    uploadCaption: string;
    uploadFile: File | null;
    uploadLoading: boolean;
    uploadMaterialLinks: Array<{ materialItemId: number; quantityOnReceipt: string; unitCostOnReceipt: string; hasTax: boolean; taxRate: string }>;
    setUploadMaterialLinks: Dispatch<SetStateAction<Array<{ materialItemId: number; quantityOnReceipt: string; unitCostOnReceipt: string; hasTax: boolean; taxRate: string }>>>;
    uploadTotal: string;
    uploadType: AttachmentType;
    uploadVendor: string;
    workEntryForm: WorkEntryForm;
    showEditWorkEntryModal: boolean;
    editingWorkEntry: WorkEntryItem | null;
    editWorkEntryForm: EditWorkEntryForm;
    setShowEditWorkEntryModal: Dispatch<SetStateAction<boolean>>;
    setEditingWorkEntry: Dispatch<SetStateAction<WorkEntryItem | null>>;
    setEditWorkEntryForm: Dispatch<SetStateAction<EditWorkEntryForm>>;
    updateWorkEntry: () => Promise<void>;
    showEditAttachmentModal: boolean;
    editingAttachment: AttachmentItem | null;
    editAttachmentForm: EditAttachmentForm;
    setShowEditAttachmentModal: Dispatch<SetStateAction<boolean>>;
    setEditingAttachment: Dispatch<SetStateAction<AttachmentItem | null>>;
    setEditAttachmentForm: Dispatch<SetStateAction<EditAttachmentForm>>;
    updateAttachment: () => Promise<void>;
    showDeleteAttachmentConfirm: boolean;
    attachmentToDelete: AttachmentItem | null;
    setShowDeleteAttachmentConfirm: Dispatch<SetStateAction<boolean>>;
    setAttachmentToDelete: Dispatch<SetStateAction<AttachmentItem | null>>;
    confirmDeleteAttachment: () => Promise<void>;
    setAddMaterialMode: Dispatch<SetStateAction<"stock" | "external">>;
    setCancelReasonText: Dispatch<SetStateAction<string>>;
    setConsumeItem: Dispatch<SetStateAction<ConsumeItem | null>>;
    setConsumeQty: Dispatch<SetStateAction<string>>;
    setEditForm: Dispatch<SetStateAction<EditForm>>;
    setExternalMaterial: Dispatch<SetStateAction<ExternalMaterialForm>>;
    setMaterialQty: Dispatch<SetStateAction<string>>;
    setMaterialSearch: Dispatch<SetStateAction<string>>;
    setReopenReasonText: Dispatch<SetStateAction<string>>;
    setWriteOffReasonText: Dispatch<SetStateAction<string>>;
    setSelectedMaterial: Dispatch<SetStateAction<StockMaterial | null>>;
    setShowAddMaterial: Dispatch<SetStateAction<boolean>>;
    setShowAddWorkEntry: Dispatch<SetStateAction<boolean>>;
    setShowCancelModal: Dispatch<SetStateAction<boolean>>;
    setShowConsumeMaterial: Dispatch<SetStateAction<boolean>>;
    setShowEditModal: Dispatch<SetStateAction<boolean>>;
    setShowReopenModal: Dispatch<SetStateAction<boolean>>;
    setShowWriteOffModal: Dispatch<SetStateAction<boolean>>;
    setShowSignatureModal: Dispatch<SetStateAction<boolean>>;
    setShowTechAssign: Dispatch<SetStateAction<boolean>>;
    setShowUploadModal: Dispatch<SetStateAction<boolean>>;
    setSignatureFile: Dispatch<SetStateAction<File | null>>;
    setSignatureData: Dispatch<SetStateAction<string | null>>;
    setUploadCaption: Dispatch<SetStateAction<string>>;
    setUploadFile: Dispatch<SetStateAction<File | null>>;
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
    orderAttachments,
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
    writeOffReasonText,
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
    setWriteOffReasonText,
    setSelectedMaterial,
    setShowAddMaterial,
    setShowAddWorkEntry,
    setShowCancelModal,
    setShowConsumeMaterial,
    setShowEditModal,
    setShowReopenModal,
    setShowWriteOffModal,
    setShowSignatureModal,
    setShowTechAssign,
    setShowUploadModal,
    setSignatureFile,
    setSignatureData,
    setUploadCaption,
    setUploadFile,
    setUploadTotal,
    setUploadType,
    setUploadVendor,
    setWorkEntryForm,
    showAddMaterial,
    showAddWorkEntry,
    showEditWorkEntryModal,
    setShowEditWorkEntryModal,
    editingWorkEntry,
    setEditingWorkEntry,
    editWorkEntryForm,
    setEditWorkEntryForm,
    updateWorkEntry,
    showEditAttachmentModal,
    setShowEditAttachmentModal,
    editingAttachment,
    setEditingAttachment,
    editAttachmentForm,
    setEditAttachmentForm,
    updateAttachment,
    showDeleteAttachmentConfirm,
    setShowDeleteAttachmentConfirm,
    attachmentToDelete,
    setAttachmentToDelete,
    confirmDeleteAttachment,
    showCancelModal,
    showConsumeMaterial,
    showEditModal,
    showReopenModal,
    showWriteOffModal,
    showSignatureModal,
    showTechAssign,
    showUploadModal,
    signatureFile,
    signatureData,
    signatureLoading,
    technicians,
    orderTechnicians,
    uploadAttachment,
    uploadCaption,
    uploadFile,
    uploadLoading,
    uploadMaterialLinks,
    setUploadMaterialLinks,
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

    // Popup state for material qty confirmation (upload modal)
    const [pendingUploadMat, setPendingUploadMat] = useState<OrderMaterial | null>(null);
    const [pendingUploadMatExisting, setPendingUploadMatExisting] = useState<{ qty: string; cost: string; hasTax: boolean; taxRate: string } | undefined>(undefined);

    // Popup state for material qty confirmation (edit attachment modal)
    const [pendingEditMat, setPendingEditMat] = useState<OrderMaterial | null>(null);
    const [pendingEditMatExisting, setPendingEditMatExisting] = useState<{ qty: string; cost: string; hasTax: boolean; taxRate: string } | undefined>(undefined);

    // IDs of materials already linked to any saved receipt
    const globalLinkedIds = new Set(
        orderAttachments.flatMap(a => a.materialItems.map(m => m.materialItemId))
    );
    // For new upload modal: only show materials not yet linked to any receipt
    const uploadAvailableMaterials = allOrderMaterials.filter(m => !globalLinkedIds.has(m.id));
    // For edit modal: show materials not linked to OTHER receipts (keep current attachment's materials visible)
    const editLinkedToCurrentIds = new Set(
        editingAttachment?.materialItems?.map(m => m.materialItemId) ?? []
    );
    const editAvailableMaterials = allOrderMaterials.filter(
        m => !globalLinkedIds.has(m.id) || editLinkedToCurrentIds.has(m.id)
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
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={externalMaterial.hasTax}
                                                onChange={(e) => setExternalMaterial((current) => ({ ...current, hasTax: e.target.checked }))}
                                                className="rounded border-border"
                                            />
                                            Tem imposto (TX)
                                        </label>
                                        {externalMaterial.hasTax && (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    value={externalMaterial.taxRate}
                                                    onChange={(e) => setExternalMaterial((current) => ({ ...current, taxRate: e.target.value }))}
                                                    className="w-20 border border-border rounded-lg px-2 py-1.5 bg-background text-foreground text-sm"
                                                />
                                                <span className="text-sm text-muted-foreground">%</span>
                                            </div>
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
                                    {orderTechnicians.length === 0 && (
                                        <p className="text-xs text-yellow-600 mt-1 mb-1">
                                            ⚠️ Nenhum técnico vinculado à OS. Mostrando todos os disponíveis.
                                        </p>
                                    )}
                                    <select
                                        title="Selecione um tecnico"
                                        value={workEntryForm.workerId}
                                        onChange={(e) => setWorkEntryForm({ ...workEntryForm, workerId: Number(e.target.value) })}
                                        className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                                    >
                                        <option value={0}>Selecione um tecnico...</option>
                                        {orderTechnicians.length > 0
                                            ? orderTechnicians.map((t) => (
                                                <option key={t.workerId} value={t.workerId}>
                                                    {t.worker.name}
                                                </option>
                                            ))
                                            : technicians.map((tech) => (
                                                <option key={tech.id} value={tech.id}>
                                                    {tech.name}
                                                </option>
                                            ))
                                        }
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
                                                    <Image src={tech.avatar} alt={tech.name} width={36} height={36} unoptimized className="h-9 w-9 rounded-full object-cover shrink-0" />
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
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
                        <div className="p-6 pb-0 shrink-0">
                            <h3 className="text-lg font-semibold mb-4">Enviar Anexo</h3>
                        </div>

                        <div className="overflow-y-auto px-6 pb-2 flex-1 space-y-4">
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
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase">
                                            {uploadType === "RETURN_RECEIPT" ? "Materiais Devolvidos (opcional)" : "Vincular Materiais (opcional)"}
                                        </label>
                                        {globalLinkedIds.size > 0 && uploadAvailableMaterials.length < allOrderMaterials.length && (
                                            <span className="text-xs text-muted-foreground">
                                                {allOrderMaterials.length - uploadAvailableMaterials.length} já vinculado(s)
                                            </span>
                                        )}
                                    </div>
                                    {uploadAvailableMaterials.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic py-3 text-center border border-border rounded-lg">
                                            Todos os materiais já foram vinculados a outras notas fiscais.
                                        </p>
                                    ) : (
                                    <div className="mt-1 max-h-52 overflow-y-auto border border-border rounded-lg divide-y divide-border/50">
                                        {uploadAvailableMaterials.map((material) => {
                                            const link = uploadMaterialLinks.find(l => l.materialItemId === material.id);
                                            const checked = !!link;
                                            return (
                                                <div key={material.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/40">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        id={`upl-mat-${material.id}`}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                const defaultCost = material.unitCostActual ?? material.unitCostEstimated ?? 0;
                                                                const defaultHasTax = material.hasTax ?? true;
                                                                const defaultTaxRate = material.taxRate != null ? String(material.taxRate) : '8.25';
                                                                if (material.quantityPlanned <= 1) {
                                                                    setUploadMaterialLinks(prev => [...prev, {
                                                                        materialItemId: material.id,
                                                                        quantityOnReceipt: String(material.quantityPlanned),
                                                                        unitCostOnReceipt: String(defaultCost),
                                                                        hasTax: defaultHasTax,
                                                                        taxRate: defaultTaxRate,
                                                                    }]);
                                                                } else {
                                                                    setPendingUploadMat(material);
                                                                    setPendingUploadMatExisting(undefined);
                                                                }
                                                            } else {
                                                                setUploadMaterialLinks(prev => prev.filter(l => l.materialItemId !== material.id));
                                                            }
                                                        }}
                                                        className="rounded border-border shrink-0"
                                                    />
                                                    <label htmlFor={`upl-mat-${material.id}`} className="flex-1 text-sm cursor-pointer">
                                                        {material.name}
                                                        <span className="text-xs text-muted-foreground ml-1">({material.quantityPlanned} {material.unit || 'un'})</span>
                                                    </label>
                                                    {checked && link && (
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <span className="text-xs text-brand-primary">
                                                                {link.quantityOnReceipt}× {formatCurrency(parseFloat(link.unitCostOnReceipt) || 0)}
                                                                {link.hasTax && <span className="text-amber-500"> +{link.taxRate}%</span>}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                title="Editar vinculação"
                                                                onClick={() => { setPendingUploadMat(material); setPendingUploadMatExisting({ qty: link.quantityOnReceipt, cost: link.unitCostOnReceipt, hasTax: link.hasTax, taxRate: link.taxRate }); }}
                                                                className="p-0.5 text-muted-foreground hover:text-foreground"
                                                            ><Pen className="h-3 w-3" /></button>
                                                            <button
                                                                type="button"
                                                                title="Remover vínculo"
                                                                onClick={() => setUploadMaterialLinks(prev => prev.filter(l => l.materialItemId !== material.id))}
                                                                className="p-0.5 text-muted-foreground hover:text-destructive"
                                                            ><X className="h-3 w-3" /></button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    )}
                                    {uploadMaterialLinks.length > 0 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {uploadMaterialLinks.length} material(is) vinculado(s)
                                        </p>
                                    )}
                                </div>
                            )}
                                </>
                            )}
                        </div>

                        <div className="flex gap-3 p-6 pt-4 border-t border-border shrink-0">
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
            )}

            {/* MaterialQtyPopup — upload modal */}
            {pendingUploadMat && (
                <MaterialQtyPopup
                    material={pendingUploadMat}
                    existing={pendingUploadMatExisting}
                    formatCurrency={formatCurrency}
                    onCancel={() => { setPendingUploadMat(null); setPendingUploadMatExisting(undefined); }}
                    onConfirm={(qty, cost, hasTax, taxRate) => {
                        setUploadMaterialLinks(prev => [
                            ...prev.filter(l => l.materialItemId !== pendingUploadMat.id),
                            {
                                materialItemId: pendingUploadMat.id,
                                quantityOnReceipt: String(qty),
                                unitCostOnReceipt: String(cost),
                                hasTax,
                                taxRate: String(taxRate),
                            },
                        ]);
                        setPendingUploadMat(null);
                        setPendingUploadMatExisting(undefined);
                    }}
                />
            )}

            {/* MaterialQtyPopup — edit attachment modal */}
            {pendingEditMat && (
                <MaterialQtyPopup
                    material={pendingEditMat}
                    existing={pendingEditMatExisting}
                    formatCurrency={formatCurrency}
                    onCancel={() => { setPendingEditMat(null); setPendingEditMatExisting(undefined); }}
                    onConfirm={(qty, cost, hasTax, taxRate) => {
                        setEditAttachmentForm(prev => ({
                            ...prev,
                            linkedMaterials: [
                                ...prev.linkedMaterials.filter(l => l.materialItemId !== pendingEditMat.id),
                                {
                                    materialItemId: pendingEditMat.id,
                                    quantityOnReceipt: String(qty),
                                    unitCostOnReceipt: String(cost),
                                    hasTax,
                                    taxRate: String(taxRate),
                                },
                            ],
                        }));
                        setPendingEditMat(null);
                        setPendingEditMatExisting(undefined);
                    }}
                />
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

            {showWriteOffModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4">
                        <div className="p-6 space-y-4">
                            <h3 className="text-lg font-semibold text-destructive">Write-Off da OS</h3>
                            <p className="text-sm text-muted-foreground">
                                A OS será encerrada sem cobrança. Esta ação é irreversível. Se houver fatura gerada, cancele-a antes de prosseguir.
                            </p>
                            <textarea
                                value={writeOffReasonText}
                                onChange={(e) => setWriteOffReasonText(e.target.value)}
                                placeholder="Motivo do write-off..."
                                rows={3}
                                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                            />
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => setShowWriteOffModal(false)} className="flex-1">
                                    Voltar
                                </Button>
                                <Button
                                    variant="destructive"
                                    disabled={!writeOffReasonText.trim() || actionLoading}
                                    onClick={async () => {
                                        await changeStatus("WRITE_OFF", writeOffReasonText);
                                        setShowWriteOffModal(false);
                                    }}
                                    className="flex-1"
                                >
                                    Confirmar Write-Off
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Work Entry Modal */}
            {showEditWorkEntryModal && editingWorkEntry && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4">
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Editar Registro — {editingWorkEntry.Worker.name}</h3>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setShowEditWorkEntryModal(false); setEditingWorkEntry(null); }}>
                                    ✕
                                </Button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-1">Início *</label>
                                    <input
                                        type="datetime-local"
                                        value={editWorkEntryForm.startedAt}
                                        onChange={(e) => setEditWorkEntryForm({ ...editWorkEntryForm, startedAt: e.target.value })}
                                        className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                                        aria-label="Horário de início"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-1">Fim *</label>
                                    <input
                                        type="datetime-local"
                                        value={editWorkEntryForm.endedAt}
                                        onChange={(e) => setEditWorkEntryForm({ ...editWorkEntryForm, endedAt: e.target.value })}
                                        className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                                        aria-label="Horário de fim"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-1">Taxa Horária ($/h)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editWorkEntryForm.hourlyRate}
                                        onChange={(e) => setEditWorkEntryForm({ ...editWorkEntryForm, hourlyRate: e.target.value })}
                                        className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                                        aria-label="Taxa horária"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-1">Observações</label>
                                    <textarea
                                        value={editWorkEntryForm.notes}
                                        onChange={(e) => setEditWorkEntryForm({ ...editWorkEntryForm, notes: e.target.value })}
                                        placeholder="Observações opcionais..."
                                        rows={2}
                                        className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm resize-none"
                                        aria-label="Observações"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => { setShowEditWorkEntryModal(false); setEditingWorkEntry(null); }}
                                    className="flex-1"
                                    disabled={actionLoading}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={updateWorkEntry}
                                    disabled={actionLoading || !editWorkEntryForm.startedAt || !editWorkEntryForm.endedAt}
                                    className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white"
                                >
                                    {actionLoading ? 'Salvando...' : 'Salvar Alterações'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Attachment Modal */}
            {showEditAttachmentModal && editingAttachment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
                        <div className="p-6 pb-0 shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Editar Anexo</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => { setShowEditAttachmentModal(false); setEditingAttachment(null); }}
                                >
                                    ✕
                                </Button>
                            </div>
                        </div>

                        <div className="overflow-y-auto px-6 pb-2 flex-1 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-foreground block mb-1">Tipo</label>
                                <select
                                    value={editAttachmentForm.type}
                                    onChange={(e) => setEditAttachmentForm({ ...editAttachmentForm, type: e.target.value as AttachmentType })}
                                    className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                                    aria-label="Tipo de anexo"
                                >
                                    <option value="BEFORE_PHOTO">Foto — Antes</option>
                                    <option value="AFTER_PHOTO">Foto — Depois</option>
                                    <option value="RECEIPT">Nota Fiscal (NF)</option>
                                    <option value="RETURN_RECEIPT">NF de Devolução</option>
                                    <option value="INVOICE_DOC">Documento de Invoice</option>
                                    <option value="OTHER">Outro</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-foreground block mb-1">Legenda / Descrição</label>
                                <input
                                    type="text"
                                    value={editAttachmentForm.caption}
                                    onChange={(e) => setEditAttachmentForm({ ...editAttachmentForm, caption: e.target.value })}
                                    placeholder="Descrição opcional..."
                                    className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                                    aria-label="Legenda"
                                />
                            </div>

                            {(editAttachmentForm.type === 'RECEIPT' || editAttachmentForm.type === 'RETURN_RECEIPT') && (
                                <>
                                    <div>
                                        <label className="text-sm font-medium text-foreground block mb-1">Fornecedor / Loja</label>
                                        <input
                                            type="text"
                                            value={editAttachmentForm.vendorName}
                                            onChange={(e) => setEditAttachmentForm({ ...editAttachmentForm, vendorName: e.target.value })}
                                            placeholder="Ex: Home Depot, Lowe's..."
                                            className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                                            aria-label="Fornecedor"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-foreground block mb-1">Valor Total ($)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={editAttachmentForm.receiptTotal}
                                            onChange={(e) => setEditAttachmentForm({ ...editAttachmentForm, receiptTotal: e.target.value })}
                                            placeholder="0.00"
                                            className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                                            aria-label="Valor total"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Material Link Management — redesigned with auto-fill + popup */}
                            {allOrderMaterials.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-foreground block">
                                            {editAttachmentForm.type === 'RETURN_RECEIPT'
                                                ? 'Materiais Devolvidos'
                                                : 'Materiais Vinculados'}
                                        </label>
                                        {globalLinkedIds.size > 0 && editAvailableMaterials.length < allOrderMaterials.length && (
                                            <span className="text-xs text-muted-foreground">
                                                {allOrderMaterials.length - editAvailableMaterials.length} vinculado(s) em outras notas
                                            </span>
                                        )}
                                    </div>
                                    {editAvailableMaterials.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic py-3 text-center border border-border rounded-lg">
                                            Todos os materiais estão vinculados a outras notas fiscais.
                                        </p>
                                    ) : (
                                    <div className="max-h-52 overflow-y-auto border border-border rounded-lg divide-y divide-border/50">
                                        {editAvailableMaterials.map((m) => {
                                            const link = editAttachmentForm.linkedMaterials.find(l => l.materialItemId === m.id);
                                            const checked = !!link;
                                            return (
                                                <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/40">
                                                    <input
                                                        type="checkbox"
                                                        id={`edit-mat-${m.id}`}
                                                        checked={checked}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                const defaultCost = m.unitCostActual ?? m.unitCostEstimated ?? 0;
                                                                const defaultHasTax = m.hasTax ?? true;
                                                                const defaultTaxRate = m.taxRate != null ? String(m.taxRate) : '8.25';
                                                                if (m.quantityPlanned <= 1) {
                                                                    setEditAttachmentForm(prev => ({
                                                                        ...prev,
                                                                        linkedMaterials: [...prev.linkedMaterials, {
                                                                            materialItemId: m.id,
                                                                            quantityOnReceipt: String(m.quantityPlanned),
                                                                            unitCostOnReceipt: String(defaultCost),
                                                                            hasTax: defaultHasTax,
                                                                            taxRate: defaultTaxRate,
                                                                        }],
                                                                    }));
                                                                } else {
                                                                    setPendingEditMat(m);
                                                                    setPendingEditMatExisting(undefined);
                                                                }
                                                            } else {
                                                                setEditAttachmentForm(prev => ({
                                                                    ...prev,
                                                                    linkedMaterials: prev.linkedMaterials.filter(l => l.materialItemId !== m.id),
                                                                }));
                                                            }
                                                        }}
                                                        className="rounded border-border shrink-0"
                                                    />
                                                    <label htmlFor={`edit-mat-${m.id}`} className="flex-1 text-sm cursor-pointer">
                                                        {m.name}
                                                        <span className="text-xs text-muted-foreground ml-1">({m.quantityPlanned} {m.unit || 'un'})</span>
                                                    </label>
                                                    {checked && link && (
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <span className="text-xs text-brand-primary">
                                                                {link.quantityOnReceipt}× {formatCurrency(parseFloat(link.unitCostOnReceipt) || 0)}
                                                                {link.hasTax && <span className="text-amber-500"> +{link.taxRate}%</span>}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                title="Editar vinculação"
                                                                onClick={() => { setPendingEditMat(m); setPendingEditMatExisting({ qty: link.quantityOnReceipt, cost: link.unitCostOnReceipt, hasTax: link.hasTax, taxRate: link.taxRate }); }}
                                                                className="p-0.5 text-muted-foreground hover:text-foreground"
                                                            ><Pen className="h-3 w-3" /></button>
                                                            <button
                                                                type="button"
                                                                title="Remover vínculo"
                                                                onClick={() => setEditAttachmentForm(prev => ({ ...prev, linkedMaterials: prev.linkedMaterials.filter(l => l.materialItemId !== m.id) }))}
                                                                className="p-0.5 text-muted-foreground hover:text-destructive"
                                                            ><X className="h-3 w-3" /></button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    )}
                                    {editAttachmentForm.linkedMaterials.length > 0 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {editAttachmentForm.linkedMaterials.length} material(is) vinculado(s)
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 p-6 pt-4 border-t border-border shrink-0">
                            <Button
                                variant="ghost"
                                onClick={() => { setShowEditAttachmentModal(false); setEditingAttachment(null); }}
                                className="flex-1"
                                disabled={actionLoading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={updateAttachment}
                                disabled={actionLoading}
                                className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white"
                            >
                                {actionLoading ? 'Salvando...' : 'Salvar Alterações'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Attachment Confirmation Modal */}
            {showDeleteAttachmentConfirm && attachmentToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4">
                        <div className="p-6 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                                    <span className="text-destructive text-lg">⚠</span>
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold">Remover Anexo?</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        O arquivo{' '}
                                        <span className="font-medium text-foreground">
                                            &quot;{attachmentToDelete.caption || attachmentToDelete.filename}&quot;
                                        </span>{' '}
                                        será removido permanentemente. Esta ação não pode ser desfeita.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <Button
                                    variant="ghost"
                                    className="flex-1"
                                    disabled={actionLoading}
                                    onClick={() => {
                                        setShowDeleteAttachmentConfirm(false);
                                        setAttachmentToDelete(null);
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
                                    disabled={actionLoading}
                                    onClick={confirmDeleteAttachment}
                                >
                                    {actionLoading ? 'Removendo...' : 'Sim, Remover'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
