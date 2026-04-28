"use client";
import dynamic from "next/dynamic";
import type { AttachmentItem } from "./_components/ServiceOrderDetailModals";
import { useParams, useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useState, useCallback } from "react";
import { useToast } from "@gladpros/ui/toast";
import {
    User, MapPin, Calendar, Clock, Package,
    FileText, Plus, Trash2, Play, CheckCircle, XCircle,
    AlertCircle, RefreshCw, ListChecks, Check, Square,
    ExternalLink, Star, ShieldCheck, HandCoins, Pen, TimerIcon, Copy,
    Paperclip, Upload, Camera, Receipt, ClipboardList, X
} from "lucide-react";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Badge } from "@gladpros/ui/badge";
import { Button } from '@gladpros/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";

const ServiceOrderDetailModals = dynamic(
    () => import("./_components/ServiceOrderDetailModals").then((mod) => mod.ServiceOrderDetailModals),
    { ssr: false }
);
const ServiceOrderSidebar = dynamic(
    () => import("./_components/ServiceOrderSidebar").then((mod) => mod.ServiceOrderSidebar),
    { ssr: false }
);

// Types
type ServiceOrderStatus = "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "AWAITING_PAYMENT" | "CLOSED" | "WRITE_OFF" | "CANCELED";
type MaterialStatus = "PENDING" | "NEEDS_PURCHASE" | "RESERVED" | "CONSUMED" | "RETURNED";
type ScopeItemStatus = "PENDING" | "DONE" | "BLOCKED";
type AttachmentType = "BEFORE_PHOTO" | "AFTER_PHOTO" | "RECEIPT" | "RETURN_RECEIPT" | "INVOICE_DOC" | "OTHER";

type ServiceOrderAttachment = {
    id: number;
    type: AttachmentType;
    filename: string;
    filepath: string;
    mime: string;
    sizeBytes: number | null;
    caption: string | null;
    vendorName: string | null;
    receiptTotal: number | null;
    taxAmount: number | null;
    materialItemId: number | null;
    materialItems: Array<{ materialItemId: number; quantityOnReceipt: number | null; unitCostOnReceipt: number | null; hasTax: boolean | null; taxRate: number | null; materialItem: { id: number; name: string; unit: string | null } }>;
    createdAt: string;
    approvalStatus: string; // PENDING | APPROVED | REJECTED | NA
    approvedAt: string | null;
    approvalNote: string | null;
    ApprovedBy: { id: number; nomeCompleto: string } | null;
    UploadedBy: { id: number; nomeCompleto: string };
};

type ScopeItem = {
    id: number;
    sortOrder: number;
    description: string;
    status: ScopeItemStatus;
};

type HistoryEvent = {
    id: number;
    eventType: string;
    fromStatus: ServiceOrderStatus | null;
    toStatus: ServiceOrderStatus | null;
    reason: string | null;
    createdAt: string;
    CreatedBy: { id: number; nomeCompleto: string } | null;
};

type ServiceOrder = {
    id: number;
    ticketNumber: string;
    title: string;
    description: string | null;
    status: ServiceOrderStatus;
    scheduleType: string;
    scheduledDate: string | null;
    scheduleDateStart: string | null;
    scheduleDateEnd: string | null;
    estimatedHours: number | null;
    hourlyRate: number | null;
    sameClientAddress: boolean;
    serviceAddressLine1: string | null;
    serviceCity: string | null;
    serviceState: string | null;
    serviceZip: string | null;
    servicePhone: string | null;
    serviceContactName: string | null;
    endClientName: string | null;
    endClientPhone: string | null;
    endClientEmail: string | null;
    endClientNotes: string | null;
    materialSupply: string;
    priority: string | null; // LOW | MEDIUM | HIGH | EMERGENCY
    slaDeadline: string | null;
    clientSignatureUrl: string | null;
    npsScore: number | null;
    npsComment: string | null;
    npsRespondedAt: string | null;
    isTemplate: boolean;
    templateId: number | null;
    total: number;
    laborTotal: number;
    materialTotal: number;
    agreedClientPrice: number | null;
    materialEstimate: number | null;
    laborEstimate: number | null;
    marginStatus: string;
    techNotes: string | null;
    clientNotes: string | null;
    createdAt: string;
    Cliente: {
        id: number;
        nomeFantasia: string | null;
        nomeCompleto: string | null;
        email: string;
        telefone: string;
        addressStreet: string | null;
        addressCity: string | null;
        addressState: string | null;
        addressZip: string | null;
    };
    AssignedWorker: { id: number; name: string; classification: string } | null;
    Invoice: { id: number; numeroInvoice: string; status: string; valorTotal: number } | null;
    materials: Array<{
        id: number;
        name: string;
        unit: string | null;
        quantityPlanned: number;
        quantityUsed: number;
        quantityReturned: number;
        status: MaterialStatus;
        unitCostEstimated: number | null;
        unitCostActual: number | null;
        materialId: number | null;
        returnDestination: string | null;
        refundAmount: number | null;
        returnedAt: string | null;
        Material: { id: number; nome: string } | null;
        fieldExpense: { id: number; status: string } | null;
    }>;
    workEntries: Array<{
        id: number;
        startedAt: string;
        endedAt: string;
        totalMinutes: number;
        totalCost: number;
        hourlyRate: number;
        notes: string | null;
        Worker: { id: number; name: string };
    }>;
    attachments: ServiceOrderAttachment[];
    scopeItems?: ScopeItem[];
    history?: HistoryEvent[];
    technicians: Array<{
        workerId: number;
        addedAt: string;
        worker: { id: number; name: string; classification: string; usuario: { avatarUrl: string | null } | null };
    }>;
};

// Status helpers
function getStatusLabel(status: ServiceOrderStatus): string {
    const labels: Record<ServiceOrderStatus, string> = {
        DRAFT: 'Rascunho',
        SCHEDULED: 'Agendado',
        IN_PROGRESS: 'Em Execução',
        COMPLETED: 'Concluído',
        AWAITING_PAYMENT: 'Ag. Pagamento',
        CLOSED: 'Fechado',
        WRITE_OFF: 'Write-Off',
        CANCELED: 'Cancelado',
    };
    return labels[status] || status;
}

function getStatusVariant(status: ServiceOrderStatus): 'secondary' | 'default' | 'destructive' | 'outline' {
    const variants: Record<ServiceOrderStatus, 'secondary' | 'default' | 'destructive' | 'outline'> = {
        DRAFT: 'secondary',
        SCHEDULED: 'default',
        IN_PROGRESS: 'outline',
        COMPLETED: 'default',
        AWAITING_PAYMENT: 'outline',
        CLOSED: 'default',
        WRITE_OFF: 'destructive',
        CANCELED: 'destructive',
    };
    return variants[status] || 'secondary';
}

function getMaterialStatusLabel(status: MaterialStatus): string {
    const labels: Record<MaterialStatus, string> = {
        PENDING: 'Pendente',
        NEEDS_PURCHASE: 'Comprar',
        RESERVED: 'Reservado',
        CONSUMED: 'Consumido',
        RETURNED: 'Devolvido',
    };
    return labels[status] || status;
}

// Next allowed status transitions
function getNextStatus(current: ServiceOrderStatus): ServiceOrderStatus | null {
    const flow: Partial<Record<ServiceOrderStatus, ServiceOrderStatus>> = {
        DRAFT: 'SCHEDULED',
        SCHEDULED: 'IN_PROGRESS',
        IN_PROGRESS: 'COMPLETED',
        COMPLETED: 'AWAITING_PAYMENT',
        AWAITING_PAYMENT: 'CLOSED',
    };
    return flow[current] || null;
}

export default function ServiceOrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const toast = useToast();
    const [order, setOrder] = useState<ServiceOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showAddMaterial, setShowAddMaterial] = useState(false);
    const [showAddWorkEntry, setShowAddWorkEntry] = useState(false);
    const [showEditWorkEntryModal, setShowEditWorkEntryModal] = useState(false);
    const [showTechAssign, setShowTechAssign] = useState(false);

    // Add Material form
    const [stockMaterials, setStockMaterials] = useState<Array<{ id: number; nome: string; unidade: string; quantidadeEstoque: number; precoUnitario: number }>>([]);
    const [materialSearch, setMaterialSearch] = useState("");
    const [selectedMaterial, setSelectedMaterial] = useState<{ id: number; nome: string; unidade: string; quantidadeEstoque: number; precoUnitario: number } | null>(null);
    const [materialQty, setMaterialQty] = useState("1");

    // Add Work Entry form
    const [technicians, setTechnicians] = useState<Array<{ id: number; name: string; initials: string; cargo: string; role: string; avatar: string | null }>>([]);
    const [techniciansLoading, setTechniciansLoading] = useState(false);
    const [workEntryForm, setWorkEntryForm] = useState({
        workerId: 0,
        startedAt: "",
        endedAt: "",
        notes: ""
    });

    // Edit Work Entry
    type WorkEntryItem = ServiceOrder['workEntries'][0];
    const [editingWorkEntry, setEditingWorkEntry] = useState<WorkEntryItem | null>(null);
    const [editWorkEntryForm, setEditWorkEntryForm] = useState({
        startedAt: "",
        endedAt: "",
        notes: "",
        hourlyRate: ""
    });

    // Scope Items state
    const [scopeItems, setScopeItems] = useState<ScopeItem[]>([]);
    const [newScopeItem, setNewScopeItem] = useState("");
    const [editingScopeId, setEditingScopeId] = useState<number | null>(null);
    const [editingScopeText, setEditingScopeText] = useState("");

    // History state
    const [history, setHistory] = useState<HistoryEvent[]>([]);

    // Consume Material state
    const [showConsumeMaterial, setShowConsumeMaterial] = useState(false);
    const [consumeItem, setConsumeItem] = useState<{ id: number; name: string; reserved: number; unit: string } | null>(null);
    const [consumeQty, setConsumeQty] = useState("");

    // Schedule editing (DRAFT)
    const [editingSchedule, setEditingSchedule] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({
        scheduleType: 'FIXED' as 'FIXED' | 'FLEXIBLE',
        scheduledDate: '',
        scheduleDateStart: '',
        scheduleDateEnd: '',
    });

    // Add Material mode: stock search vs. external (field purchase)
    const [addMaterialMode, setAddMaterialMode] = useState<'stock' | 'external'>('stock');
    const [externalMaterial, setExternalMaterial] = useState({ name: '', unit: 'un', qty: '1', cost: '', hasTax: true, taxRate: '8.25' });

    // Cancel / Reopen / WriteOff reason modals (replace window.prompt())
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReasonText, setCancelReasonText] = useState('');
    const [showReopenModal, setShowReopenModal] = useState(false);
    const [reopenReasonText, setReopenReasonText] = useState('');
    const [showWriteOffModal, setShowWriteOffModal] = useState(false);
    const [writeOffReasonText, setWriteOffReasonText] = useState('');

    // Change Order (agreedClientPrice update with audit)
    const [showChangeOrderModal, setShowChangeOrderModal] = useState(false);
    const [changeOrderNewPrice, setChangeOrderNewPrice] = useState('');
    const [changeOrderReason, setChangeOrderReason] = useState('');
    const [changeOrderLoading, setChangeOrderLoading] = useState(false);

    // Attachments (fotos antes/depois + notas fiscais)
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadType, setUploadType] = useState<AttachmentType>('BEFORE_PHOTO');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadCaption, setUploadCaption] = useState('');
    const [uploadVendor, setUploadVendor] = useState('');
    const [uploadTotal, setUploadTotal] = useState('');
    const [uploadMaterialLinks, setUploadMaterialLinks] = useState<Array<{ materialItemId: number; quantityOnReceipt: string; unitCostOnReceipt: string; hasTax: boolean; taxRate: string }>>([]);
    const [uploadLoading, setUploadLoading] = useState(false);

    // Return modal
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnItem, setReturnItem] = useState<{
        id: number; name: string; maxQty: number; unit: string; isExternal: boolean;
    } | null>(null);
    const [returnQty, setReturnQty] = useState('');
    const [returnDest, setReturnDest] = useState<'STORE' | 'COMPANY_STOCK'>('COMPANY_STOCK');
    const [returnRefund, setReturnRefund] = useState('');

    // Team modal
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [teamSearch, setTeamSearch] = useState('');
    const [teamLoading, setTeamLoading] = useState<number | null>(null);

    // Bulk material purchase confirmation
    const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<number>>(new Set());
    const [bulkConfirmLoading, setBulkConfirmLoading] = useState(false);

    // Cost correction for CONSUMED field materials (ADMIN/FINANCEIRO only)
    const [showCorrectCost, setShowCorrectCost] = useState(false);
    const [correctingMaterial, setCorrectingMaterial] = useState<{ id: number; name: string; unitCostActual: number | null } | null>(null);
    const [correctCostValue, setCorrectCostValue] = useState('');
    const [correctCostReason, setCorrectCostReason] = useState('');
    const [correctCostLoading, setCorrectCostLoading] = useState(false);

    const orderId = params?.id as string;

    const loadOrder = useCallback(async (signal?: AbortSignal) => {
        if (!orderId) return;
        try {
            setLoading(true);
            const res = await fetch(`/api/service-orders/${orderId}`, { signal });
            if (signal?.aborted) return;
            if (!res.ok) throw new Error('Ordem não encontrada');
            const data = await res.json();
            if (signal?.aborted) return;
            const payload = data.data ?? data;
            setOrder(payload);
            setScopeItems(Array.isArray(payload.scopeItems) ? payload.scopeItems : []);
            setHistory(Array.isArray(payload.history) ? payload.history : []);
            setError(null);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return;
            setError(err instanceof Error ? err.message : 'Erro ao carregar');
            setScopeItems([]);
            setHistory([]);
        } finally {
            // Only clear loading if the request was not aborted (prevents StrictMode flash)
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, [orderId]);

    // Pre-fetch technicians in parallel with the OS so the modal opens instantly
    const loadTechnicians = useCallback(async (signal?: AbortSignal) => {
        if (!orderId) return;
        setTechniciansLoading(true);
        try {
            const res = await fetch('/api/technicians', { signal });
            if (signal?.aborted) return;
            if (!res.ok) return;
            const json = await res.json();
            if (!signal?.aborted) setTechnicians(json.data || []);
        } catch {
            // non-critical — modal will show empty list + retry button
        } finally {
            if (!signal?.aborted) setTechniciansLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        const controller = new AbortController();
        // Fire both in parallel — technicians load in background while OS data loads
        loadOrder(controller.signal);
        loadTechnicians(controller.signal);
        return () => controller.abort();
    }, [loadOrder, loadTechnicians]);

    // Add scope item
    const addScopeItem = async () => {
        if (!orderId || !newScopeItem.trim()) return;
        try {
            const res = await fetch(`/api/service-orders/${orderId}/scope-items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: newScopeItem.trim() })
            });
            if (res.ok) {
                const response = await res.json();
                const item = response.data ?? response;
                setScopeItems(prev => [...prev, item]);
                setNewScopeItem("");
            }
        } catch { /* ignore */ }
    };

    // Toggle scope item status
    const toggleScopeItem = async (item: ScopeItem) => {
        const newStatus = item.status === 'DONE' ? 'PENDING' : 'DONE';
        try {
            const res = await fetch(`/api/service-orders/${orderId}/scope-items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                setScopeItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
            }
        } catch { /* ignore */ }
    };

    // Load stock materials when modal opens
    useEffect(() => {
        if (!showAddMaterial) return;
        const controller = new AbortController();
        fetch('/api/estoque/materiais?limit=100', { signal: controller.signal })
            .then(res => res.json())
            .then(data => {
                if (!controller.signal.aborted) setStockMaterials(data.data || []);
            })
            .catch(err => {
                if (err instanceof Error && err.name === 'AbortError') return;
                console.error('[StockMaterials] Erro ao carregar:', err);
                if (!controller.signal.aborted) setStockMaterials([]);
            });
        return () => controller.abort();
    }, [showAddMaterial]);

    // Load current user role once for approve/reject gates
    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                const d = data?.data ?? data;
                if (d?.role) setCurrentUserRole(d.role);
            })
            .catch(() => { });
    }, []);

    // Add Material handler
    const addMaterial = async () => {
        if (!order || !selectedMaterial) return;
        const alreadyAdded = order.materials?.some((m: any) => m.materialId === selectedMaterial.id);
        if (alreadyAdded) { toast.error('Material já está na lista'); return; }
        const qty = parseFloat(materialQty);
        if (!Number.isFinite(qty) || qty <= 0) { toast.error('Quantidade inválida'); return; }
        setActionLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/materials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    materialId: selectedMaterial.id,
                    name: selectedMaterial.nome,
                    unit: selectedMaterial.unidade,
                    quantityPlanned: qty,
                    unitCostEstimated: selectedMaterial.precoUnitario
                })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao adicionar');
            }
            toast.success('Material adicionado');
            setShowAddMaterial(false);
            setSelectedMaterial(null);
            setMaterialSearch("");
            setMaterialQty("1");
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setActionLoading(false);
        }
    };

    // Add Work Entry handler
    const addWorkEntry = async () => {
        if (!order) return;
        if (!workEntryForm.workerId || !workEntryForm.startedAt || !workEntryForm.endedAt) {
            toast.error('Preencha todos os campos obrigatórios');
            return;
        }
        setActionLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/work-entries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workerId: workEntryForm.workerId,
                    startedAt: workEntryForm.startedAt,
                    endedAt: workEntryForm.endedAt,
                    notes: workEntryForm.notes || undefined
                })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao registrar');
            }
            toast.success('Registro adicionado');
            setShowAddWorkEntry(false);
            setWorkEntryForm({ workerId: 0, startedAt: "", endedAt: "", notes: "" });
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setActionLoading(false);
        }
    };

    // Open edit modal pre-populated with existing entry values
    const openEditWorkEntry = (entry: WorkEntryItem) => {
        const toLocalInput = (iso: string) => {
            const d = new Date(iso);
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        setEditingWorkEntry(entry);
        setEditWorkEntryForm({
            startedAt:  toLocalInput(entry.startedAt),
            endedAt:    toLocalInput(entry.endedAt),
            notes:      entry.notes ?? "",
            hourlyRate: String(entry.hourlyRate),
        });
        setShowEditWorkEntryModal(true);
    };

    // Save edited work entry
    const updateWorkEntry = async () => {
        if (!order || !editingWorkEntry) return;
        if (!editWorkEntryForm.startedAt || !editWorkEntryForm.endedAt) {
            toast.error('Horário de início e fim são obrigatórios');
            return;
        }
        setActionLoading(true);
        try {
            const payload: Record<string, unknown> = {
                startedAt: editWorkEntryForm.startedAt,
                endedAt:   editWorkEntryForm.endedAt,
                notes:     editWorkEntryForm.notes || null,
            };
            const rate = parseFloat(editWorkEntryForm.hourlyRate);
            if (!isNaN(rate)) payload.hourlyRate = rate;

            const res = await fetch(`/api/service-orders/${order.id}/work-entries/${editingWorkEntry.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || data.error || 'Erro ao salvar');
            }
            toast.success('Registro atualizado');
            setShowEditWorkEntryModal(false);
            setEditingWorkEntry(null);
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setActionLoading(false);
        }
    };

    // Assign Tech handler
    const assignTech = async (techId: number) => {
        if (!order) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignedWorkerId: techId })
            });
            if (!res.ok) throw new Error('Erro ao atribuir técnico');
            toast.success('Técnico atribuído');
            setShowTechAssign(false);
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setActionLoading(false);
        }
    };

    // Actions
    const changeStatus = async (newStatus: ServiceOrderStatus, reason?: string) => {
        if (!order) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newStatus, reason })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || data.error || 'Erro ao mudar status');
            }
            toast.success(`Status alterado para ${getStatusLabel(newStatus)}`);
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setActionLoading(false);
        }
    };

    const handleChangeOrder = async () => {
        if (!order) return;
        const newPrice = parseFloat(changeOrderNewPrice);
        if (!Number.isFinite(newPrice) || newPrice <= 0) { toast.error('Valor inválido'); return; }
        if (changeOrderReason.trim().length < 10) { toast.error('Descreva o motivo (mín. 10 caracteres)'); return; }
        setChangeOrderLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/change-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newAgreedClientPrice: newPrice, reason: changeOrderReason.trim() }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || data.error || 'Erro ao salvar change order');
            }
            toast.success('Change order registrado. Margem recalculada.');
            setShowChangeOrderModal(false);
            setChangeOrderNewPrice('');
            setChangeOrderReason('');
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setChangeOrderLoading(false);
        }
    };

    const reserveMaterials = async () => {
        if (!order) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/materials/reserve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error('Erro ao reservar materiais');
            const response = await res.json();
            const data = response.data ?? response;
            toast.success(`${data.summary.reservedCount} material(is) reservado(s)`);
            loadOrder();
        } catch (err) {
            toast.error('Erro ao reservar');
        } finally {
            setActionLoading(false);
        }
    };

    const consumeMaterial = async () => {
        if (!order || !consumeItem) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/materials/consume`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: [{
                        serviceOrderMaterialId: consumeItem.id,
                        quantityUsed: parseFloat(consumeQty)
                    }]
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao consumir material');
            }

            toast.success('Material consumido');
            setShowConsumeMaterial(false);
            setConsumeItem(null);
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao consumir');
        } finally {
            setActionLoading(false);
        }
    };

    const openReturnModal = (mat: ServiceOrder['materials'][0]) => {
        const quantityUsed = Number(mat.quantityUsed || 0);
        const quantityPlanned = Number(mat.quantityPlanned);
        const maxQty = quantityPlanned - quantityUsed;
        const isExternal = !mat.Material;
        setReturnItem({
            id: mat.id,
            name: mat.name,
            maxQty,
            unit: mat.unit || 'un',
            isExternal,
        });
        setReturnQty(String(maxQty));
        setReturnDest(isExternal ? 'STORE' : 'COMPANY_STOCK');
        setReturnRefund('');
        setShowReturnModal(true);
    };

    const submitReturn = async () => {
        if (!order || !returnItem) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/materials/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: [{
                        serviceOrderMaterialId: returnItem.id,
                        quantityToReturn: parseFloat(returnQty) || returnItem.maxQty,
                        destination: returnDest,
                        ...(returnDest === 'STORE' && returnRefund ? { refundAmount: parseFloat(returnRefund) } : {}),
                    }]
                })
            });

            if (!res.ok) throw new Error('Erro ao devolver material');

            toast.success('Material devolvido');
            setShowReturnModal(false);
            setReturnItem(null);
            loadOrder();

            // Suggest uploading return receipt for store returns
            if (returnDest === 'STORE') {
                setUploadType('RETURN_RECEIPT');
                setShowUploadModal(true);
            }
        } catch (err) {
            toast.error('Erro ao devolver');
        } finally {
            setActionLoading(false);
        }
    };

    const addTechToTeam = async (workerId: number) => {
        if (!order) return;
        setTeamLoading(workerId);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/technicians`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workerId }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.message || 'Erro ao adicionar técnico');
            }
            toast.success('Técnico adicionado à equipe');
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setTeamLoading(null);
        }
    };

    const removeTechFromTeam = async (workerId: number) => {
        if (!order) return;
        setTeamLoading(workerId);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/technicians/${workerId}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.message || 'Erro ao remover técnico');
            }
            toast.success('Técnico removido da equipe');
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setTeamLoading(null);
        }
    };

    const generateInvoice = async () => {
        if (!order) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/generate-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao gerar fatura');
            }
            const response = await res.json();
            const data = response.data ?? response;
            toast.success(data.isExisting ? 'Fatura já existe' : `Fatura ${data.invoice.numero} gerada!`);
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setActionLoading(false);
        }
    };

    const saveSchedule = async () => {
        if (!order) return;
        setActionLoading(true);
        try {
            const body: Record<string, string> = { scheduleType: scheduleForm.scheduleType };
            if (scheduleForm.scheduleType === 'FIXED' && scheduleForm.scheduledDate) {
                body.scheduledDate = new Date(scheduleForm.scheduledDate).toISOString();
            } else if (scheduleForm.scheduleType === 'FLEXIBLE') {
                if (scheduleForm.scheduleDateStart) body.scheduleDateStart = new Date(scheduleForm.scheduleDateStart).toISOString();
                if (scheduleForm.scheduleDateEnd) body.scheduleDateEnd = new Date(scheduleForm.scheduleDateEnd).toISOString();
            }
            const res = await fetch(`/api/service-orders/${order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Erro ao salvar agendamento');
            }
            toast.success('Agendamento salvo!');
            setEditingSchedule(false);
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setActionLoading(false);
        }
    };

    const addExternalMaterial = async () => {
        if (!order || !externalMaterial.name.trim()) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/materials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: externalMaterial.name.trim(),
                    unit: externalMaterial.unit || 'un',
                    quantityPlanned: parseFloat(externalMaterial.qty) || 1,
                    unitCostEstimated: externalMaterial.cost ? parseFloat(externalMaterial.cost) : undefined,
                    hasTax: externalMaterial.hasTax,
                    taxRate: externalMaterial.taxRate ? parseFloat(externalMaterial.taxRate) : undefined,
                }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Erro ao adicionar material externo');
            }
            toast.success('Material de campo adicionado!');
            setShowAddMaterial(false);
            setExternalMaterial({ name: '', unit: 'un', qty: '1', cost: '', hasTax: true, taxRate: '8.25' });
            setAddMaterialMode('stock');
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setActionLoading(false);
        }
    };

    const deleteMaterial = async (matId: number) => {
        if (!order) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/materials/${matId}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.message || 'Erro ao remover material');
            }
            toast.success('Material removido');
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setActionLoading(false);
        }
    };

    const deleteScopeItem = async (itemId: number) => {
        if (!order) return;
        try {
            const res = await fetch(`/api/service-orders/${order.id}/scope-items/${itemId}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.message || 'Erro ao remover item');
            }
            setScopeItems(prev => prev.filter(i => i.id !== itemId));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        }
    };

    const editScopeItem = async (itemId: number, description: string) => {
        if (!order || !description.trim()) return;
        try {
            const res = await fetch(`/api/service-orders/${order.id}/scope-items/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: description.trim() }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.message || 'Erro ao editar item');
            }
            setScopeItems(prev => prev.map(i => i.id === itemId ? { ...i, description: description.trim() } : i));
            setEditingScopeId(null);
            setEditingScopeText("");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        }
    };

    const markAsPurchased = async (matId: number, qty: number, estimatedCost: number) => {
        if (!order) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/materials/${matId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'CONSUMED',
                    quantityUsed: qty,
                    unitCostEstimated: estimatedCost || undefined,
                }),
            });
            const d = await res.json();
            if (res.status === 202 && d.needsApproval) {
                toast.success('Compra acima do limite. Solicitação enviada para aprovação do gerente.');
                loadOrder();
                return;
            }
            if (res.status === 409 && d.needsApproval) {
                toast.error('Compra aguardando aprovação do gerente.');
                return;
            }
            if (res.status === 409 && d.rejected) {
                toast.error('Compra rejeitada. Edite o material e tente novamente.');
                return;
            }
            if (!res.ok) {
                throw new Error(d.message ?? d.error ?? 'Erro ao marcar como comprado');
            }
            toast.success('Material marcado como comprado!');
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setActionLoading(false);
        }
    };

    const bulkConfirmPurchases = async () => {
        if (!order || bulkSelectedIds.size === 0) return;
        setBulkConfirmLoading(true);
        try {
            const items = order.materials
                .filter((m: any) => bulkSelectedIds.has(m.id))
                .map((m: any) => ({
                    materialId: m.id,
                    quantityUsed: Number(m.quantityPlanned),
                    unitCostEstimated: Number(m.unitCostEstimated || 0) || undefined,
                }));

            const res = await fetch(`/api/service-orders/${order.id}/materials/bulk-confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.message ?? d.error ?? 'Erro ao confirmar compras');

            const { succeeded, needsApproval, failed } = d.data;
            const parts: string[] = [];
            if (succeeded.length > 0) parts.push(`${succeeded.length} confirmado(s)`);
            if (needsApproval.length > 0) parts.push(`${needsApproval.length} aguardando aprovação`);
            if (failed.length > 0) parts.push(`${failed.length} falhou`);
            toast.success(parts.join(' · '));

            setBulkSelectedIds(new Set());
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setBulkConfirmLoading(false);
        }
    };

    const openCorrectCostModal = (mat: { id: number; name: string; unitCostActual: number | null; unitCostEstimated: number | null }) => {
        setCorrectingMaterial({ id: mat.id, name: mat.name, unitCostActual: mat.unitCostActual });
        setCorrectCostValue(String(mat.unitCostActual ?? mat.unitCostEstimated ?? ''));
        setCorrectCostReason('');
        setShowCorrectCost(true);
    };

    const submitCorrectCost = async () => {
        if (!order || !correctingMaterial) return;
        const val = parseFloat(correctCostValue);
        if (!val || val <= 0) { alert('Informe um valor válido'); return; }
        if (!correctCostReason.trim()) { alert('Motivo é obrigatório'); return; }
        setCorrectCostLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/materials/${correctingMaterial.id}/correct-cost`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unitCostActual: val, reason: correctCostReason }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Erro ao corrigir custo');
            setShowCorrectCost(false);
            setCorrectingMaterial(null);
            await loadOrder();
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : 'Erro ao corrigir custo');
        } finally {
            setCorrectCostLoading(false);
        }
    };

    const openEditMaterial = (mat: ServiceOrder['materials'][0]) => {
        setEditMaterialForm({
            name: mat.name,
            unit: mat.unit ?? 'un',
            quantityPlanned: String(mat.quantityPlanned),
            unitCostEstimated: mat.unitCostEstimated ? String(mat.unitCostEstimated) : '',
            hasTax: (mat as Record<string, unknown>).hasTax as boolean ?? true,
            taxRate: (mat as Record<string, unknown>).taxRate != null ? String((mat as Record<string, unknown>).taxRate) : '8.25',
        });
        setShowEditMaterialModal(true);
    };

    const saveMaterialEdit = async () => {
        if (!order || !editingMaterialId) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/materials/${editingMaterialId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editMaterialForm.name.trim(),
                    unit: editMaterialForm.unit.trim() || 'un',
                    quantityPlanned: parseFloat(editMaterialForm.quantityPlanned) || 1,
                    unitCostEstimated: editMaterialForm.unitCostEstimated ? parseFloat(editMaterialForm.unitCostEstimated) : undefined,
                    hasTax: editMaterialForm.hasTax,
                    taxRate: editMaterialForm.taxRate ? parseFloat(editMaterialForm.taxRate) : undefined,
                }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.message ?? d.error ?? 'Erro ao salvar');
            }
            toast.success('Material atualizado!');
            setShowEditMaterialModal(false);
            setEditingMaterialId(null);
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setActionLoading(false);
        }
    };

    const approveFieldPurchase = async (matId: number) => {
        if (!order) return;
        setFieldOpLoading(matId);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/materials/${matId}/approve-purchase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.message ?? d.error ?? 'Erro ao aprovar');
            }
            toast.success('Compra aprovada! O técnico pode prosseguir.');
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setFieldOpLoading(null);
        }
    };

    const rejectFieldPurchase = async () => {
        if (!order || !rejectingMaterialId || !rejectMotivo.trim()) return;
        setFieldOpLoading(rejectingMaterialId);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/materials/${rejectingMaterialId}/reject-purchase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ motivo: rejectMotivo.trim() }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.message ?? d.error ?? 'Erro ao rejeitar');
            }
            toast.success('Compra rejeitada.');
            setShowRejectPurchaseModal(false);
            setRejectingMaterialId(null);
            setRejectMotivo('');
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setFieldOpLoading(null);
        }
    };

    const uploadAttachment = async () => {
        if (!order || !uploadFile) return;
        setUploadLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', uploadFile);
            formData.append('type', uploadType);
            if (uploadCaption.trim()) formData.append('caption', uploadCaption.trim());
            if (uploadType === 'RECEIPT' || uploadType === 'RETURN_RECEIPT') {
                if (uploadVendor.trim()) formData.append('vendorName', uploadVendor.trim());
                if (uploadTotal.trim()) formData.append('receiptTotal', uploadTotal.trim());
                if (uploadMaterialLinks.length > 0) {
                    formData.append('materialLinks', JSON.stringify(
                        uploadMaterialLinks.map(l => ({
                            materialItemId: l.materialItemId,
                            quantityOnReceipt: l.quantityOnReceipt ? parseFloat(l.quantityOnReceipt) : null,
                            unitCostOnReceipt: l.unitCostOnReceipt ? parseFloat(l.unitCostOnReceipt) : null,
                            hasTax: l.hasTax,
                            taxRate: l.taxRate ? parseFloat(l.taxRate) : null,
                        }))
                    ));
                }
            }
            const res = await fetch(`/api/service-orders/${order.id}/attachments`, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.message || d.error || 'Erro no upload');
            }
            toast.success('Arquivo enviado!');
            setShowUploadModal(false);
            setUploadFile(null);
            setUploadCaption('');
            setUploadVendor('');
            setUploadTotal('');
            setUploadMaterialLinks([]);
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro no upload');
        } finally {
            setUploadLoading(false);
        }
    };

    // ── Edit OS Modal ──────────────────────────────────────────────────────────

    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM',
        techNotes: '',
        clientNotes: '',
    });

    const openEditModal = () => {
        if (!order) return;
        setEditForm({
            title: order.title,
            description: order.description ?? '',
            priority: order.priority ?? 'MEDIUM',
            techNotes: order.techNotes ?? '',
            clientNotes: order.clientNotes ?? '',
        });
        setShowEditModal(true);
    };

    const saveEdit = async () => {
        if (!order) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editForm.title.trim(),
                    description: editForm.description.trim() || null,
                    priority: editForm.priority,
                    techNotes: editForm.techNotes.trim() || null,
                    clientNotes: editForm.clientNotes.trim() || null,
                }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Erro ao salvar');
            }
            toast.success('OS atualizada!');
            setShowEditModal(false);
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setActionLoading(false);
        }
    };

    // ── NPS / Signature / Duplicate / Reimbursement / NF Approval ──────────────

    // NPS state
    const [npsRating, setNpsRating] = useState(0);
    const [npsComment, setNpsComment] = useState('');
    const [npsLoading, setNpsLoading] = useState(false);

    // Signature state
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [signatureLoading, setSignatureLoading] = useState(false);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [signatureData, setSignatureData] = useState<string | null>(null);

    // Duplicate / Reimbursement / NF Approval loading
    const [duplicateLoading, setDuplicateLoading] = useState(false);
    const [reimbursementLoading, setReimbursementLoading] = useState<number | null>(null);
    const [approvalLoading, setApprovalLoading] = useState<number | null>(null);

    // Edit Attachment
    const [showEditAttachmentModal, setShowEditAttachmentModal] = useState(false);
    const [editingAttachment, setEditingAttachment] = useState<AttachmentItem | null>(null);
    const [editAttachmentForm, setEditAttachmentForm] = useState({
        caption: '',
        type: 'BEFORE_PHOTO' as AttachmentType,
        vendorName: '',
        receiptTotal: '',
        linkedMaterials: [] as Array<{ materialItemId: number; quantityOnReceipt: string; unitCostOnReceipt: string; hasTax: boolean; taxRate: string }>,
    });

    // Delete Attachment confirmation
    const [showDeleteAttachmentConfirm, setShowDeleteAttachmentConfirm] = useState(false);
    const [attachmentToDelete, setAttachmentToDelete] = useState<AttachmentItem | null>(null);

    // Current user role (for approve/reject gates)
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

    // Edit material modal
    const [showEditMaterialModal, setShowEditMaterialModal] = useState(false);
    const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);
    const [editMaterialForm, setEditMaterialForm] = useState({ name: '', unit: 'un', quantityPlanned: '1', unitCostEstimated: '', hasTax: true, taxRate: '8.25' });

    // Reject field purchase modal
    const [showRejectPurchaseModal, setShowRejectPurchaseModal] = useState(false);
    const [rejectingMaterialId, setRejectingMaterialId] = useState<number | null>(null);
    const [rejectMotivo, setRejectMotivo] = useState('');
    const [fieldOpLoading, setFieldOpLoading] = useState<number | null>(null);

    // Recalcular apontamentos de mão de obra
    const [recalcLoading, setRecalcLoading] = useState(false);
    const recalculateWorkEntries = async () => {
        if (!orderId) return;
        setRecalcLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${orderId}/work-entries/recalculate`, {
                method: 'POST'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Erro ao recalcular');
            const { updatedCount } = data.data;
            toast.success(updatedCount > 0
                ? `${updatedCount} apontamento(s) recalculado(s) com sucesso`
                : 'Totais verificados — sem entradas para corrigir'
            );
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao recalcular');
        } finally {
            setRecalcLoading(false);
        }
    };

    // Submit NPS (CLOSED only, one-time)
    const submitNps = async () => {
        if (!order || npsRating === 0) return;
        setNpsLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/nps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score: npsRating, comment: npsComment.trim() || undefined }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Erro ao registrar NPS');
            }
            toast.success('Avaliação registrada!');
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setNpsLoading(false);
        }
    };

    // Upload ou captura da assinatura do cliente
    const uploadSignature = async (signatureDataOverride?: string) => {
        const dataToSend = signatureDataOverride ?? signatureData;
        if (!order || (!signatureFile && !dataToSend)) return;
        setSignatureLoading(true);
        try {
            let res: Response;
            if (signatureFile) {
                const formData = new FormData();
                formData.append('file', signatureFile);
                res = await fetch(`/api/service-orders/${order.id}/signature`, {
                    method: 'POST',
                    body: formData,
                });
            } else {
                res = await fetch(`/api/service-orders/${order.id}/signature`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ signatureData: dataToSend }),
                });
            }
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Erro ao salvar assinatura');
            }
            toast.success('Assinatura registrada!');
            setShowSignatureModal(false);
            setSignatureFile(null);
            setSignatureData(null);
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setSignatureLoading(false);
        }
    };

    // Duplicate OS
    const duplicateOS = async () => {
        if (!order) return;
        setDuplicateLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/duplicate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Erro ao duplicar OS');
            }
            const data = await res.json();
            toast.success(`OS ${data.newServiceOrder.ticketNumber} criada!`);
            router.push(`/ordens-servico/${data.newServiceOrder.id}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setDuplicateLoading(false);
        }
    };

    // Request reimbursement from RECEIPT attachment
    const requestReimbursement = async (attachmentId: number) => {
        if (!order) return;
        setReimbursementLoading(attachmentId);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/request-reimbursement`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attachmentId }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Erro ao solicitar reembolso');
            }
            toast.success('Solicitação de reembolso criada!');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setReimbursementLoading(null);
        }
    };

    // Approve or reject NF attachment (GERENTE/ADMIN only)
    const approveNF = async (attachmentId: number, action: 'approve' | 'reject') => {
        if (!order) return;
        setApprovalLoading(attachmentId);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/attachments/${attachmentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Erro');
            }
            toast.success(action === 'approve' ? 'NF aprovada!' : 'NF rejeitada');
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setApprovalLoading(null);
        }
    };

    // Open edit attachment modal pre-populated
    const openEditAttachment = (att: AttachmentItem) => {
        setEditingAttachment(att);
        setEditAttachmentForm({
            caption:           att.caption ?? '',
            type:              att.type,
            vendorName:        att.vendorName ?? '',
            receiptTotal:      att.receiptTotal != null ? String(att.receiptTotal) : '',
            linkedMaterials: att.materialItems.map(m => ({
                materialItemId: m.materialItemId,
                quantityOnReceipt: m.quantityOnReceipt != null ? String(m.quantityOnReceipt) : '',
                unitCostOnReceipt: m.unitCostOnReceipt != null ? String(m.unitCostOnReceipt) : '',
                hasTax: m.hasTax ?? true,
                taxRate: m.taxRate != null ? String(m.taxRate) : '8.25',
            })),
        });
        setShowEditAttachmentModal(true);
    };

    // Save attachment metadata edits
    const updateAttachment = async () => {
        if (!order || !editingAttachment) return;
        setActionLoading(true);
        try {
            const payload: Record<string, unknown> = {
                caption:    editAttachmentForm.caption || null,
                type:       editAttachmentForm.type,
                vendorName: editAttachmentForm.vendorName || null,
            };
            const total = parseFloat(editAttachmentForm.receiptTotal);
            payload.receiptTotal = isNaN(total) ? null : total;

            // Send full desired set — API does delete+recreate atomically
            payload.materialLinks = editAttachmentForm.linkedMaterials.map(l => ({
                materialItemId:    l.materialItemId,
                quantityOnReceipt: l.quantityOnReceipt ? parseFloat(l.quantityOnReceipt) : null,
                unitCostOnReceipt: l.unitCostOnReceipt ? parseFloat(l.unitCostOnReceipt) : null,
                hasTax:            l.hasTax,
                taxRate:           l.taxRate ? parseFloat(l.taxRate) : null,
            }));

            const res = await fetch(`/api/service-orders/${order.id}/attachments/${editingAttachment.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.message || d.error || 'Erro ao salvar');
            }
            toast.success('Anexo atualizado');
            setShowEditAttachmentModal(false);
            setEditingAttachment(null);
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setActionLoading(false);
        }
    };

    // Trigger delete confirmation modal
    const deleteAttachment = (att: AttachmentItem) => {
        setAttachmentToDelete(att);
        setShowDeleteAttachmentConfirm(true);
    };

    // Execute the confirmed delete
    const confirmDeleteAttachment = async () => {
        if (!order || !attachmentToDelete) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/service-orders/${order.id}/attachments/${attachmentToDelete.id}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.message || d.error || 'Erro ao remover');
            }
            toast.success('Anexo removido');
            setShowDeleteAttachmentConfirm(false);
            setAttachmentToDelete(null);
            loadOrder();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setActionLoading(false);
        }
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    const formatDateTime = (dateStr: string) =>
        new Date(dateStr).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Chicago'
        });

    const deferredMaterialSearch = useDeferredValue(materialSearch.trim().toLowerCase());
    const matchingStockMaterials = deferredMaterialSearch
        ? (Array.isArray(stockMaterials) ? stockMaterials : []).filter((material) =>
            material.nome.toLowerCase().includes(deferredMaterialSearch)
        )
        : [];
    const filteredStockMaterials = matchingStockMaterials.slice(0, 10);
    const hasStockMaterialMatches = matchingStockMaterials.length > 0;
    const externalOrderMaterials = order?.materials.filter((material) => !material.Material) ?? [];
    const hasOpenModal =
        showAddMaterial ||
        showAddWorkEntry ||
        showEditWorkEntryModal ||
        showEditAttachmentModal ||
        showDeleteAttachmentConfirm ||
        showConsumeMaterial ||
        showTechAssign ||
        showUploadModal ||
        showEditModal ||
        showSignatureModal ||
        showCancelModal ||
        showReopenModal ||
        showWriteOffModal;

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Header skeleton */}
                <div className="rounded-2xl bg-hero-gradient p-6">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <div className="h-4 w-32 animate-pulse rounded bg-white/20" />
                            <div className="h-7 w-48 animate-pulse rounded bg-white/30" />
                            <div className="h-4 w-64 animate-pulse rounded bg-white/20" />
                        </div>
                        <div className="flex gap-2">
                            <div className="h-9 w-24 animate-pulse rounded-lg bg-white/20" />
                            <div className="h-9 w-24 animate-pulse rounded-lg bg-white/20" />
                        </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                        <div className="h-6 w-20 animate-pulse rounded-full bg-white/20" />
                        <div className="h-6 w-16 animate-pulse rounded-full bg-white/20" />
                    </div>
                </div>
                {/* Stats cards skeleton */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="rounded-2xl border-none shadow-sm">
                            <CardContent className="p-4">
                                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                                <div className="mt-2 h-6 w-28 animate-pulse rounded bg-muted" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                {/* Tabs skeleton */}
                <Card className="rounded-2xl border-none shadow-sm">
                    <CardContent className="p-6">
                        <div className="mb-4 flex gap-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
                            ))}
                        </div>
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <div className="flex items-center justify-center pt-2 text-sm text-muted-foreground">
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Carregando ordem de serviço...
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <Card className="border-none shadow-sm">
                <CardContent className="py-12 text-center">
                    <h2 className="text-lg font-semibold text-red-600">{error || 'Ordem não encontrada'}</h2>
                    <Button onClick={() => router.push('/ordens-servico')} className="mt-4" variant="secondary">
                        Voltar
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const nextStatus = getNextStatus(order.status);
    const pendingMaterials = order.materials.filter(m => m.status === 'PENDING').length;
    const needsPurchase = order.materials.filter(m => m.status === 'NEEDS_PURCHASE').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <ModulePageHeader
                title={order.ticketNumber}
                description={order.title}
                icon={<ClipboardList />}
                accentColor="#0098DA"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Ordens de Serviço', href: '/ordens-servico' },
                    { label: order.ticketNumber },
                ]}
                badges={
                    <>
                        <Badge variant={getStatusVariant(order.status)}>
                            {getStatusLabel(order.status)}
                        </Badge>
                        {order.priority && !['LOW', 'MEDIUM'].includes(order.priority) && (
                            <Badge variant={order.priority === 'EMERGENCY' ? 'error' : 'warning'}>
                                {order.priority === 'EMERGENCY' ? 'Emergência' : 'Alta'}
                            </Badge>
                        )}
                        {order.slaDeadline && !['CLOSED', 'CANCELED', 'WRITE_OFF'].includes(order.status) && (() => {
                            const isOverdue = new Date(order.slaDeadline!) < new Date();
                            return (
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${isOverdue ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'}`}>
                                    <TimerIcon className="h-3 w-3" />
                                    SLA: {new Date(order.slaDeadline!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Chicago' })}
                                    {isOverdue && ' Vencido'}
                                </span>
                            );
                        })()}
                        {order.clientSignatureUrl && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 font-medium">
                                <Pen className="h-3 w-3" />
                                Assinado
                            </span>
                        )}
                    </>
                }
                actions={
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        {!['CLOSED', 'CANCELED', 'WRITE_OFF'].includes(order.status) && (
                            <Button variant="ghost" size="sm" onClick={openEditModal} title="Editar informações da OS">
                                <Pen className="h-4 w-4 mr-1" />
                                Editar
                            </Button>
                        )}
                        {order.status === 'DRAFT' && pendingMaterials > 0 && (
                            <Button onClick={reserveMaterials} disabled={actionLoading} variant="secondary">
                                <Package className="h-4 w-4 mr-2" />
                                Reservar ({pendingMaterials})
                            </Button>
                        )}
                        {order.status === 'COMPLETED' && !order.Invoice && (
                            <Button onClick={generateInvoice} disabled={actionLoading}>
                                <FileText className="h-4 w-4 mr-2" />
                                Gerar Fatura
                            </Button>
                        )}
                        {['COMPLETED', 'AWAITING_PAYMENT'].includes(order.status) && !order.clientSignatureUrl && (
                            <Button variant="secondary" onClick={() => { setSignatureFile(null); setSignatureData(null); setShowSignatureModal(true); }} disabled={actionLoading}>
                                <Pen className="h-4 w-4 mr-2" />
                                Assinar Conclusão
                            </Button>
                        )}
                        {nextStatus && order.status !== 'COMPLETED' && (
                            <Button
                                onClick={() => {
                                    if (order.status === 'SCHEDULED') {
                                        const hasBeforePhoto = order.attachments.some(a => a.type === 'BEFORE_PHOTO');
                                        if (!hasBeforePhoto) {
                                            toast.error('Envie ao menos uma foto do estado inicial antes de iniciar.');
                                            setUploadType('BEFORE_PHOTO');
                                            setUploadFile(null);
                                            setUploadCaption('');
                                            setShowUploadModal(true);
                                            return;
                                        }
                                    }
                                    changeStatus(nextStatus);
                                }}
                                disabled={actionLoading}
                            >
                                {order.status === 'DRAFT' && <Calendar className="h-4 w-4 mr-2" />}
                                {order.status === 'SCHEDULED' && <Play className="h-4 w-4 mr-2" />}
                                {order.status === 'IN_PROGRESS' && <CheckCircle className="h-4 w-4 mr-2" />}
                                Avançar → {getStatusLabel(nextStatus)}
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={duplicateOS} disabled={duplicateLoading} title="Criar nova OS com a mesma estrutura">
                            <Copy className="h-4 w-4 mr-1" />
                            OS Similar
                        </Button>
                        {['DRAFT', 'SCHEDULED'].includes(order.status) && (
                            <Button onClick={() => { setCancelReasonText(''); setShowCancelModal(true); }} disabled={actionLoading} variant="ghost" className="text-destructive">
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancelar
                            </Button>
                        )}
                        {['COMPLETED', 'AWAITING_PAYMENT'].includes(order.status) && (
                            <Button onClick={() => { setWriteOffReasonText(''); setShowWriteOffModal(true); }} disabled={actionLoading} variant="ghost" className="text-destructive">
                                <XCircle className="h-4 w-4 mr-2" />
                                Write-Off
                            </Button>
                        )}
                        {order.status === 'CANCELED' && (
                            <Button onClick={() => { setReopenReasonText(''); setShowReopenModal(true); }} disabled={actionLoading} variant="ghost" className="text-primary">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reabrir
                            </Button>
                        )}
                    </div>
                }
            />

            {/* Alerts */}
            {/* BEFORE_PHOTO warning — SCHEDULED without before photo */}
            {order.status === 'SCHEDULED' && !order.attachments.some(a => a.type === 'BEFORE_PHOTO') && (
                <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg text-orange-800 dark:text-orange-300">
                    <Camera className="h-5 w-5 shrink-0" />
                    <span className="flex-1">Envie uma <strong>foto do estado inicial</strong> (Foto Antes) antes de iniciar o serviço — obrigatório.</span>
                    <button
                        type="button"
                        onClick={() => { setUploadType('BEFORE_PHOTO'); setUploadFile(null); setShowUploadModal(true); }}
                        className="text-sm font-medium underline shrink-0"
                    >
                        Enviar foto
                    </button>
                </div>
            )}

            {needsPurchase > 0 && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg text-orange-800 dark:text-orange-300">
                    <AlertCircle className="h-5 w-5" />
                    <span>{needsPurchase} material(is) precisam ser comprados externamente</span>
                </div>
            )}

            {order.status === 'DRAFT' && !order.scheduledDate && !order.scheduleDateStart && (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-300">
                    <Calendar className="h-5 w-5 shrink-0" />
                    <span className="flex-1">Para avançar para AGENDADO é necessário definir a data do serviço.</span>
                    <button
                        type="button"
                        onClick={() => {
                            setScheduleForm({
                                scheduleType: (order.scheduleType as 'FIXED' | 'FLEXIBLE') || 'FIXED',
                                scheduledDate: '',
                                scheduleDateStart: '',
                                scheduleDateEnd: '',
                            });
                            setEditingSchedule(true);
                        }}
                        className="text-sm font-medium underline"
                    >
                        Definir agora
                    </button>
                </div>
            )}

            {/* Description Card */}
            {order.description && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <FileText className="h-4 w-4" />
                            Descrição do Problema
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{order.description}</p>
                    </CardContent>
                </Card>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Client & Location */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Cliente & Local
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Cliente</label>
                                    <p className="font-medium">{order.Cliente.nomeFantasia || order.Cliente.nomeCompleto}</p>
                                    <p className="text-sm text-muted-foreground">{order.Cliente.email}</p>
                                    <p className="text-sm text-muted-foreground">{order.Cliente.telefone}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        Local do Serviço
                                    </label>
                                    {order.sameClientAddress ? (
                                        // Show client address when sameClientAddress=true
                                        order.Cliente.addressStreet ? (
                                            <>
                                                <p className="font-medium">{order.Cliente.addressStreet}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {order.Cliente.addressCity}, {order.Cliente.addressState} {order.Cliente.addressZip}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">(Endereço do cliente)</p>
                                            </>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">Endereço do cliente não cadastrado</p>
                                        )
                                    ) : order.serviceAddressLine1 ? (
                                        // Show service-specific address
                                        <>
                                            <p className="font-medium">{order.serviceAddressLine1}</p>
                                            <p className="text-sm text-muted-foreground">{order.serviceCity}, {order.serviceState} {order.serviceZip}</p>
                                            {order.serviceContactName && (
                                                <p className="text-sm text-muted-foreground">Contato: {order.serviceContactName}</p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Endereço não informado</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Materials */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Materiais ({order.materials.length})
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                {bulkSelectedIds.size > 0 && (
                                    <Button
                                        size="sm"
                                        variant="default"
                                        className="h-8 bg-green-600 hover:bg-green-700 text-white"
                                        onClick={bulkConfirmPurchases}
                                        disabled={bulkConfirmLoading}
                                        aria-label={`Confirmar ${bulkSelectedIds.size} compra(s) selecionadas`}
                                    >
                                        <Check className="h-3.5 w-3.5 mr-1.5" />
                                        {bulkConfirmLoading ? 'Confirmando...' : `Confirmar Selecionadas (${bulkSelectedIds.size})`}
                                    </Button>
                                )}
                                {['DRAFT', 'SCHEDULED', 'IN_PROGRESS'].includes(order.status) && (
                                    <Button variant="ghost" size="sm" onClick={() => setShowAddMaterial(true)}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Adicionar
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {order.materials.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">Nenhum material adicionado</p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left border-b border-border">
                                            <th className="pb-2 w-8">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-border"
                                                    aria-label="Selecionar todos os materiais elegíveis para compra em lote"
                                                    checked={
                                                        bulkSelectedIds.size > 0 &&
                                                        order.materials
                                                            .filter((m: any) => !m.Material && ['PENDING', 'NEEDS_PURCHASE'].includes(m.status) && m.fieldExpense?.status !== 'AGUARDANDO_APROVACAO' && ['DRAFT', 'SCHEDULED', 'IN_PROGRESS'].includes(order.status))
                                                            .every((m: any) => bulkSelectedIds.has(m.id))
                                                    }
                                                    onChange={(e) => {
                                                        const eligible = order.materials.filter(
                                                            (m: any) => !m.Material && ['PENDING', 'NEEDS_PURCHASE'].includes(m.status) && m.fieldExpense?.status !== 'AGUARDANDO_APROVACAO' && ['DRAFT', 'SCHEDULED', 'IN_PROGRESS'].includes(order.status)
                                                        );
                                                        if (e.target.checked) {
                                                            setBulkSelectedIds(new Set(eligible.map((m: any) => m.id)));
                                                        } else {
                                                            setBulkSelectedIds(new Set());
                                                        }
                                                    }}
                                                />
                                            </th>
                                            <th className="pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Material</th>
                                            <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Qtd</th>
                                            <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Custo Est.</th>
                                            <th className="pb-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Status</th>
                                            <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.materials.map((mat) => (
                                            <tr key={mat.id} className="border-b border-border">
                                                <td className="py-2">
                                                    {!mat.Material && ['PENDING', 'NEEDS_PURCHASE'].includes(mat.status) && mat.fieldExpense?.status !== 'AGUARDANDO_APROVACAO' && ['DRAFT', 'SCHEDULED', 'IN_PROGRESS'].includes(order.status) ? (
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-border"
                                                            aria-label={`Selecionar ${mat.name} para compra em lote`}
                                                            checked={bulkSelectedIds.has(mat.id)}
                                                            onChange={(e) => {
                                                                setBulkSelectedIds(prev => {
                                                                    const next = new Set(prev);
                                                                    if (e.target.checked) next.add(mat.id);
                                                                    else next.delete(mat.id);
                                                                    return next;
                                                                });
                                                            }}
                                                        />
                                                    ) : (
                                                        <span className="w-4 block" />
                                                    )}
                                                </td>
                                                <td className="py-2">
                                                    <div>
                                                        <span className="font-medium">{mat.name}</span>
                                                        {mat.unit && (
                                                            <span className="text-xs text-muted-foreground ml-1">({mat.unit})</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-2 text-right font-mono">
                                                    <div>
                                                        {mat.quantityUsed > 0 ? mat.quantityUsed : mat.quantityPlanned}
                                                        {Number(mat.quantityReturned || 0) > 0 && (
                                                            <span className="block text-[10px] text-orange-600 font-normal">
                                                                -{mat.quantityReturned} devolvido
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-2 text-right">
                                                    {mat.unitCostActual || mat.unitCostEstimated
                                                        ? formatCurrency(Number(mat.unitCostActual || mat.unitCostEstimated))
                                                        : '-'}
                                                    {!!(mat as Record<string, unknown>).hasTax && (
                                                        <div className="text-[10px] text-amber-500 font-medium">
                                                            +{(mat as Record<string, unknown>).taxRate != null ? String((mat as Record<string, unknown>).taxRate) : '8.25'}% TX
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-2 text-center">
                                                    <Badge
                                                        variant={mat.status === 'NEEDS_PURCHASE' ? 'destructive' : mat.status === 'RESERVED' ? 'default' : 'secondary'}
                                                    >
                                                        {getMaterialStatusLabel(mat.status)}
                                                    </Badge>
                                                    {mat.fieldExpense?.status === 'AGUARDANDO_APROVACAO' && (
                                                        <div className="mt-1">
                                                            <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 font-medium">
                                                                Ag. Aprovação
                                                            </span>
                                                        </div>
                                                    )}
                                                    {mat.fieldExpense?.status === 'REJEITADA' && (
                                                        <div className="mt-1">
                                                            <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 font-medium">
                                                                Rejeitado
                                                            </span>
                                                        </div>
                                                    )}
                                                    {mat.returnDestination && (
                                                        <div className="mt-1">
                                                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                                                mat.returnDestination === 'STORE'
                                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400'
                                                                    : 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400'
                                                            }`}>
                                                                {mat.returnDestination === 'STORE' ? 'Dev. Loja' : 'Dev. Estoque'}
                                                            </span>
                                                            {mat.refundAmount && Number(mat.refundAmount) > 0 && (
                                                                <span className="text-xs text-green-600 ml-1">
                                                                    +{formatCurrency(Number(mat.refundAmount))}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-2 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {mat.status === 'RESERVED' && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 px-2"
                                                                    onClick={() => {
                                                                        setConsumeItem({
                                                                            id: mat.id,
                                                                            name: mat.name,
                                                                            reserved: mat.quantityPlanned,
                                                                            unit: mat.unit || ''
                                                                        });
                                                                        setConsumeQty(String(mat.quantityPlanned));
                                                                        setShowConsumeMaterial(true);
                                                                    }}
                                                                >
                                                                    Consumir
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 p-0 text-red-600"
                                                                    title="Devolver / Cancelar Reserva"
                                                                    onClick={() => openReturnModal(mat)}
                                                                >
                                                                    <XCircle className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        {mat.status === 'NEEDS_PURCHASE' && !mat.Material && (
                                                            mat.fieldExpense?.status === 'AGUARDANDO_APROVACAO' ? (
                                                                ['ADMIN', 'GERENTE'].includes(currentUserRole ?? '') ? (
                                                                    <>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-7 px-2 text-green-700 border-green-300 hover:bg-green-50 dark:hover:bg-green-950"
                                                                            title="Aprovar compra de campo"
                                                                            onClick={() => approveFieldPurchase(mat.id)}
                                                                            disabled={fieldOpLoading === mat.id}
                                                                        >
                                                                            <ShieldCheck className="h-3 w-3 mr-1" />
                                                                            {fieldOpLoading === mat.id ? '...' : 'Aprovar'}
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            className="h-7 px-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                                                            title="Rejeitar compra de campo"
                                                                            onClick={() => { setRejectingMaterialId(mat.id); setRejectMotivo(''); setShowRejectPurchaseModal(true); }}
                                                                            disabled={fieldOpLoading === mat.id}
                                                                        >
                                                                            Rejeitar
                                                                        </Button>
                                                                    </>
                                                                ) : null
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 px-2 text-green-700 border-green-300 hover:bg-green-50 dark:hover:bg-green-950"
                                                                    title="Marcar como comprado pelo técnico"
                                                                    onClick={() => markAsPurchased(mat.id, Number(mat.quantityPlanned), Number(mat.unitCostEstimated || 0))}
                                                                    disabled={actionLoading || mat.fieldExpense?.status === 'REJEITADA'}
                                                                >
                                                                    <Check className="h-3 w-3 mr-1" />
                                                                    Comprado
                                                                </Button>
                                                            )
                                                        )}
                                                        {/* Devolver material campo-comprado (CONSUMED with unused qty) */}
                                                        {mat.status === 'CONSUMED' && !mat.Material &&
                                                         Number(mat.quantityUsed || 0) < Number(mat.quantityPlanned) &&
                                                         !mat.returnedAt && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 px-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                                                                title="Devolver material na loja"
                                                                onClick={() => openReturnModal(mat)}
                                                                disabled={actionLoading}
                                                            >
                                                                <XCircle className="h-3 w-3 mr-1" />
                                                                Devolver
                                                            </Button>
                                                        )}
                                                        {/* Corrigir custo — ADMIN/FINANCEIRO, campo-comprado (CONSUMED sem estoque) */}
                                                        {mat.status === 'CONSUMED' && !mat.Material &&
                                                         ['ADMIN', 'FINANCEIRO'].includes(currentUserRole ?? '') && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 px-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                                                                title="Corrigir custo após lançamento"
                                                                onClick={() => openCorrectCostModal(mat as any)}
                                                                disabled={actionLoading}
                                                            >
                                                                <Pen className="h-3 w-3 mr-1" />
                                                                Corrigir
                                                            </Button>
                                                        )}
                                                        {!mat.Material && ['PENDING', 'NEEDS_PURCHASE'].includes(mat.status) && (mat.fieldExpense == null || mat.fieldExpense.status === 'REJEITADA') && ['DRAFT', 'SCHEDULED', 'IN_PROGRESS'].includes(order.status) && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 w-7 p-0"
                                                                title="Editar material"
                                                                onClick={() => openEditMaterial(mat)}
                                                                disabled={actionLoading}
                                                            >
                                                                <Pen className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                        {['PENDING', 'NEEDS_PURCHASE'].includes(mat.status) && ['DRAFT', 'SCHEDULED', 'IN_PROGRESS'].includes(order.status) && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                                                title="Remover material"
                                                                onClick={() => deleteMaterial(mat.id)}
                                                                disabled={actionLoading}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Work Entries */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Diário de Obra ({order.workEntries.length})
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                {['ADMIN', 'GERENTE'].includes(currentUserRole ?? '') && order.workEntries.some(e => Number(e.hourlyRate) === 0) && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={recalculateWorkEntries}
                                        disabled={recalcLoading}
                                        title="Recalcular apontamentos com taxa horária zerada"
                                    >
                                        <RefreshCw className={`h-4 w-4 mr-1 ${recalcLoading ? 'animate-spin' : ''}`} />
                                        Recalcular
                                    </Button>
                                )}
                                {['SCHEDULED', 'IN_PROGRESS'].includes(order.status) && (
                                    <Button variant="ghost" size="sm" onClick={() => setShowAddWorkEntry(true)}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Registrar
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {order.workEntries.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">Nenhum registro de trabalho</p>
                            ) : (
                                <div className="space-y-3">
                                    {order.workEntries.map((entry) => (
                                        <div key={entry.id} className="flex items-start justify-between p-3 bg-muted/40 rounded-lg gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium">{entry.Worker.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatDateTime(entry.startedAt)} - {formatDateTime(entry.endedAt)}
                                                </p>
                                                {entry.notes && <p className="text-sm mt-1">{entry.notes}</p>}
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <div className="text-right">
                                                    <p className="font-mono">{Math.floor(entry.totalMinutes / 60)}h {entry.totalMinutes % 60 > 0 ? `${entry.totalMinutes % 60}min` : ''}</p>
                                                    <p className="text-xs text-muted-foreground">{formatCurrency(Number(entry.hourlyRate))}/h</p>
                                                    <p className="text-sm font-medium text-green-600">{formatCurrency(Number(entry.totalCost))}</p>
                                                </div>
                                                {['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'AWAITING_PAYMENT'].includes(order.status) && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0"
                                                        title="Editar registro"
                                                        onClick={() => openEditWorkEntry(entry)}
                                                    >
                                                        <Pen className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Scope Checklist */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <ListChecks className="h-5 w-5" />
                                Checklist ({scopeItems.filter(i => i.status === 'DONE').length}/{scopeItems.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {scopeItems.length === 0 && !['DRAFT', 'SCHEDULED', 'IN_PROGRESS'].includes(order.status) ? (
                                <p className="text-center text-muted-foreground py-4">Sem itens de checklist</p>
                            ) : (
                                <div className="space-y-2">
                                    {scopeItems.length === 0 && (
                                        <p className="text-sm text-muted-foreground py-2">Nenhuma tarefa adicionada ainda.</p>
                                    )}
                                    {scopeItems.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className={`group flex items-center gap-2 p-2 rounded hover:bg-muted/40 ${item.status === 'DONE' ? 'opacity-60' : ''}`}
                                        >
                                            <span className="text-xs font-mono text-muted-foreground w-5 shrink-0 select-none">{index + 1}.</span>

                                            {editingScopeId === item.id ? (
                                                <>
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        value={editingScopeText}
                                                        onChange={(e) => setEditingScopeText(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') { e.preventDefault(); void editScopeItem(item.id, editingScopeText); }
                                                            if (e.key === 'Escape') { setEditingScopeId(null); setEditingScopeText(""); }
                                                        }}
                                                        className="flex-1 border border-border rounded px-2 py-0.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                    />
                                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0 text-green-600 hover:bg-green-500/10"
                                                        title="Salvar" onClick={() => void editScopeItem(item.id, editingScopeText)}>
                                                        <Check className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0 text-muted-foreground"
                                                        title="Cancelar" onClick={() => { setEditingScopeId(null); setEditingScopeText(""); }}>
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <div
                                                        className="flex items-center gap-2 flex-1 cursor-pointer"
                                                        onClick={() => ['DRAFT', 'SCHEDULED', 'IN_PROGRESS'].includes(order.status) && toggleScopeItem(item)}
                                                    >
                                                        {item.status === 'DONE' ? (
                                                            <Check className="h-4 w-4 text-green-600 shrink-0" />
                                                        ) : (
                                                            <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                                                        )}
                                                        <span className={item.status === 'DONE' ? 'line-through text-muted-foreground' : ''}>
                                                            {item.description}
                                                        </span>
                                                    </div>
                                                    {['DRAFT', 'SCHEDULED', 'IN_PROGRESS'].includes(order.status) && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                                                                title="Editar item"
                                                                onClick={(e) => { e.stopPropagation(); setEditingScopeId(item.id); setEditingScopeText(item.description); }}
                                                            >
                                                                <Pen className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 w-6 p-0 shrink-0 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100"
                                                                title="Remover item"
                                                                onClick={(e) => { e.stopPropagation(); deleteScopeItem(item.id); }}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}

                                    {/* Add new item */}
                                    {['DRAFT', 'SCHEDULED', 'IN_PROGRESS'].includes(order.status) && (
                                        <div className="flex gap-2 mt-3 pt-3 border-t">
                                            <input
                                                type="text"
                                                value={newScopeItem}
                                                onChange={(e) => setNewScopeItem(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addScopeItem()}
                                                placeholder="Novo item..."
                                                className="flex-1 border border-border rounded-md px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            />
                                            <Button size="sm" variant="ghost" onClick={addScopeItem} disabled={!newScopeItem.trim()}>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Attachments — Fotos e Notas Fiscais */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Paperclip className="h-5 w-5" />
                                Anexos ({order.attachments.length})
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setUploadType('BEFORE_PHOTO');
                                    setUploadFile(null);
                                    setUploadCaption('');
                                    setUploadVendor('');
                                    setUploadTotal('');
                                    setUploadMaterialLinks([]);
                                    setShowUploadModal(true);
                                }}
                            >
                                <Upload className="h-4 w-4 mr-1" />
                                Enviar
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {order.attachments.length === 0 ? (
                                <p className="text-muted-foreground text-sm text-center py-4">
                                    Nenhum anexo. Envie fotos antes/depois ou notas fiscais.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {/* Photos before */}
                                    {['BEFORE_PHOTO', 'AFTER_PHOTO'].map(photoType => {
                                        const photos = order.attachments.filter(a => a.type === photoType);
                                        if (photos.length === 0) return null;
                                        return (
                                            <div key={photoType}>
                                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                                                    <Camera className="h-3 w-3" />
                                                    {photoType === 'BEFORE_PHOTO' ? 'Antes' : 'Depois'}
                                                </p>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {photos.map(att => (
                                                        <div key={att.id} className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                                                            <a
                                                                href={`/api/uploads/${att.filepath}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="block w-full h-full hover:opacity-80 transition-opacity"
                                                                title={att.caption || att.filename}
                                                            >
                                                                {att.mime.startsWith('image/') ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img
                                                                        src={`/api/uploads/${att.filepath}`}
                                                                        alt={att.caption || att.filename}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <FileText className="h-8 w-8 text-muted-foreground" />
                                                                    </div>
                                                                )}
                                                            </a>
                                                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    type="button"
                                                                    aria-label="Editar foto"
                                                                    title="Editar"
                                                                    onClick={() => openEditAttachment(att)}
                                                                    className="h-6 w-6 rounded bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                                                                >
                                                                    <Pen className="h-3 w-3" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    aria-label="Remover foto"
                                                                    title="Remover"
                                                                    onClick={() => deleteAttachment(att)}
                                                                    disabled={actionLoading}
                                                                    className="h-6 w-6 rounded bg-black/60 text-white flex items-center justify-center hover:bg-red-600/90"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Receipts (NF) */}
                                    {order.attachments.filter(a => a.type === 'RECEIPT' || a.type === 'INVOICE_DOC').length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                                                <Receipt className="h-3 w-3" />
                                                Notas Fiscais / Documentos
                                            </p>
                                            <div className="space-y-2">
                                                {order.attachments
                                                    .filter(a => a.type === 'RECEIPT' || a.type === 'INVOICE_DOC')
                                                    .map(att => (
                                                        <div key={att.id} className="flex flex-col gap-1 p-2 bg-muted/40 rounded-lg">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-medium truncate">{att.vendorName || att.filename}</p>
                                                                        {att.receiptTotal && (
                                                                            <p className="text-xs text-green-600 font-medium">{formatCurrency(Number(att.receiptTotal))}</p>
                                                                        )}
                                                                        {att.caption && <p className="text-xs text-muted-foreground truncate">{att.caption}</p>}
                                                                        {/* Approval status badge */}
                                                                        {att.type === 'RECEIPT' && att.approvalStatus && att.approvalStatus !== 'NA' && (
                                                                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${att.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' : att.approvalStatus === 'REJECTED' ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400'}`}>
                                                                                {att.approvalStatus === 'APPROVED' ? 'Aprovado' : att.approvalStatus === 'REJECTED' ? 'Rejeitado' : 'Aguardando'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <a
                                                                    href={`/api/uploads/${att.filepath}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    title="Abrir arquivo"
                                                                    aria-label="Abrir arquivo em nova aba"
                                                                    className="shrink-0 ml-2"
                                                                >
                                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                                        <ExternalLink className="h-3 w-3" />
                                                                    </Button>
                                                                </a>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                                                                    title="Editar anexo"
                                                                    onClick={() => openEditAttachment(att)}
                                                                >
                                                                    <Pen className="h-3 w-3" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                                                                    title="Remover anexo"
                                                                    onClick={() => deleteAttachment(att)}
                                                                    disabled={actionLoading}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                            {/* NF action buttons — RECEIPT type only */}
                                                            {att.type === 'RECEIPT' && (
                                                                <div className="flex items-center gap-1 pt-1 flex-wrap">
                                                                    {att.approvalStatus === 'PENDING' && (
                                                                        <>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="h-6 text-xs text-green-600 border-green-400 hover:bg-green-50"
                                                                                onClick={() => approveNF(att.id, 'approve')}
                                                                                disabled={approvalLoading === att.id}
                                                                            >
                                                                                <ShieldCheck className="h-3 w-3 mr-1" />
                                                                                {approvalLoading === att.id ? '...' : 'Aprovar'}
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-6 text-xs text-red-600 hover:bg-red-50"
                                                                                onClick={() => approveNF(att.id, 'reject')}
                                                                                disabled={approvalLoading === att.id}
                                                                            >
                                                                                Rejeitar
                                                                            </Button>
                                                                        </>
                                                                    )}
                                                                    {att.approvalStatus === 'APPROVED' && att.receiptTotal && Number(att.receiptTotal) > 0 && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-6 text-xs text-blue-600 border-blue-400 hover:bg-blue-50"
                                                                            onClick={() => requestReimbursement(att.id)}
                                                                            disabled={reimbursementLoading === att.id}
                                                                        >
                                                                            <HandCoins className="h-3 w-3 mr-1" />
                                                                            {reimbursementLoading === att.id ? '...' : 'Solicitar Reembolso'}
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Return Receipts (Notas de Devolução) */}
                                    {order.attachments.filter(a => a.type === 'RETURN_RECEIPT').length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                                                <RefreshCw className="h-3 w-3 text-orange-500" />
                                                Notas de Devolução
                                            </p>
                                            <div className="space-y-2">
                                                {order.attachments
                                                    .filter(a => a.type === 'RETURN_RECEIPT')
                                                    .map(att => (
                                                        <div key={att.id} className="flex flex-col gap-1 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <RefreshCw className="h-4 w-4 text-orange-500 shrink-0" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-medium truncate">{att.vendorName || att.filename}</p>
                                                                        {att.receiptTotal && (
                                                                            <p className="text-xs text-red-500 font-medium">
                                                                                -{formatCurrency(Number(att.receiptTotal))} (reembolsado)
                                                                            </p>
                                                                        )}
                                                                        {att.caption && <p className="text-xs text-muted-foreground truncate">{att.caption}</p>}
                                                                        {att.materialItems && att.materialItems.length > 0 && (
                                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                                                Materiais: {att.materialItems.map(m => m.materialItem.name).join(', ')}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <a
                                                                    href={`/api/uploads/${att.filepath}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    title="Abrir arquivo"
                                                                    aria-label="Abrir devolução em nova aba"
                                                                    className="shrink-0 ml-2"
                                                                >
                                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                                        <ExternalLink className="h-3 w-3" />
                                                                    </Button>
                                                                </a>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                                                                    title="Editar devolução"
                                                                    onClick={() => openEditAttachment(att)}
                                                                >
                                                                    <Pen className="h-3 w-3" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                                                                    title="Remover devolução"
                                                                    onClick={() => deleteAttachment(att)}
                                                                    disabled={actionLoading}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Other attachments */}
                                    {order.attachments.filter(a => a.type === 'OTHER').length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Outros</p>
                                            <div className="space-y-1">
                                                {order.attachments.filter(a => a.type === 'OTHER').map(att => (
                                                    <div key={att.id} className="flex items-center gap-2">
                                                        <a
                                                            href={`/api/uploads/${att.filepath}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 text-sm text-primary hover:underline flex-1 min-w-0"
                                                        >
                                                            <Paperclip className="h-3 w-3 shrink-0" />
                                                            <span className="truncate">{att.caption || att.filename}</span>
                                                        </a>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                                                            title="Editar"
                                                            onClick={() => openEditAttachment(att)}
                                                        >
                                                            <Pen className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                                                            title="Remover"
                                                            onClick={() => deleteAttachment(att)}
                                                            disabled={actionLoading}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* NPS Card — CLOSED orders only */}
                    {order.status === 'CLOSED' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Star className="h-5 w-5 text-yellow-500" />
                                    Avaliação do Cliente
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {order.npsScore ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <Star key={s} className={`h-6 w-6 ${s <= order.npsScore! ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                                            ))}
                                            <span className="ml-2 text-lg font-bold">{order.npsScore}/5</span>
                                        </div>
                                        {order.npsComment && (
                                            <p className="text-sm text-muted-foreground italic">&quot;{order.npsComment}&quot;</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">Avaliação registrada</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-sm text-muted-foreground">Como o cliente avaliaria este serviço?</p>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    aria-label={`${s} estrela${s > 1 ? 's' : ''}`}
                                                    onClick={() => setNpsRating(s)}
                                                    className="p-1 rounded transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                >
                                                    <Star className={`h-7 w-7 transition-colors ${s <= npsRating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground hover:text-yellow-300'}`} />
                                                </button>
                                            ))}
                                            {npsRating > 0 && (
                                                <span className="ml-2 text-sm font-medium text-yellow-600">{npsRating}/5</span>
                                            )}
                                        </div>
                                        <textarea
                                            className="w-full text-sm border border-border rounded-lg p-2 bg-background resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            rows={2}
                                            placeholder="Comentário opcional..."
                                            value={npsComment}
                                            onChange={e => setNpsComment(e.target.value)}
                                            aria-label="Comentário da avaliação"
                                        />
                                        <Button
                                            size="sm"
                                            onClick={submitNps}
                                            disabled={npsRating === 0 || npsLoading}
                                            className="w-full"
                                        >
                                            {npsLoading ? 'Enviando...' : 'Registrar Avaliação'}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <ServiceOrderSidebar
                    actionLoading={actionLoading}
                    editingSchedule={editingSchedule}
                    formatCurrency={formatCurrency}
                    getStatusLabel={getStatusLabel as (status: string) => string}
                    history={history}
                    order={order}
                    orderTechnicians={order.technicians ?? []}
                    saveSchedule={saveSchedule}
                    scheduleForm={scheduleForm}
                    setEditingSchedule={setEditingSchedule}
                    setScheduleForm={setScheduleForm}
                    setShowTechAssign={setShowTechAssign}
                    setShowTeamModal={setShowTeamModal}
                />
            </div>

            {/* P&L — Rentabilidade (only when agreedClientPrice is set and field is visible to user) */}
            {order.agreedClientPrice && (
                <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <span>💰</span> P&amp;L — Análise de Rentabilidade
                    </h3>
                    {(() => {
                        const agreed = Number(order.agreedClientPrice);
                        const matEst = Number(order.materialEstimate || 0);
                        const labEst = Number(order.laborEstimate || 0);
                        const matActual = Number(order.materialTotal || 0);
                        const labActual = Number(order.laborTotal || 0);
                        const totalCost = matActual + labActual;
                        const margin = agreed > 0 ? agreed - totalCost : 0;
                        const marginPct = agreed > 0 ? (margin / agreed) * 100 : 0;
                        const consumedPct = agreed > 0 ? (totalCost / agreed) * 100 : 0;
                        const status = order.marginStatus || 'OK';
                        const statusColor: Record<string, string> = {
                            OK: 'text-green-500',
                            WARNING: 'text-yellow-500',
                            ALERT: 'text-orange-500',
                            CRITICAL: 'text-red-500',
                            LOSS: 'text-destructive',
                        };
                        const barColor: Record<string, string> = {
                            OK: 'bg-green-500',
                            WARNING: 'bg-yellow-500',
                            ALERT: 'bg-orange-500',
                            CRITICAL: 'bg-red-500',
                            LOSS: 'bg-destructive',
                        };
                        return (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground">Valor Acordado</p>
                                        <p className="font-semibold text-foreground">{formatCurrency(agreed)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground">Custo Total Atual</p>
                                        <p className="font-semibold text-foreground">{formatCurrency(totalCost)}</p>
                                    </div>
                                    {(matEst > 0 || labEst > 0) && (
                                        <>
                                            <div className="space-y-1">
                                                <p className="text-muted-foreground">Est. Material</p>
                                                <p className="text-sm text-foreground">{formatCurrency(matEst)}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-muted-foreground">Est. Mão de Obra</p>
                                                <p className="text-sm text-foreground">{formatCurrency(labEst)}</p>
                                            </div>
                                        </>
                                    )}
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground">Custo Material</p>
                                        <p className="text-sm text-foreground">{formatCurrency(matActual)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground">Custo Mão de Obra</p>
                                        <p className="text-sm text-foreground">{formatCurrency(labActual)}</p>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-border">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-muted-foreground">Margem</span>
                                        <span className={`font-bold ${statusColor[status] ?? 'text-green-500'}`}>
                                            {formatCurrency(margin)} ({marginPct.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${barColor[status] ?? 'bg-green-500'}`}
                                            style={{ width: `${Math.min(consumedPct, 100).toFixed(1)}%` } as React.CSSProperties}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {consumedPct.toFixed(1)}% do orçamento consumido
                                    </p>
                                </div>
                                {/* Change Order button — ADMIN/GERENTE only */}
                                {['ADMIN', 'GERENTE'].includes(currentUserRole ?? '') && (
                                    <div className="pt-2 border-t border-border">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setChangeOrderNewPrice(order.agreedClientPrice ? String(Number(order.agreedClientPrice)) : '');
                                                setShowChangeOrderModal(true);
                                            }}
                                            className="text-xs text-brand-primary hover:underline flex items-center gap-1"
                                        >
                                            ✏️ Emitir Change Order (alterar valor acordado)
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Change Order Modal */}
            {showChangeOrderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <div>
                            <h3 className="font-semibold text-foreground text-base">✏️ Change Order — Alterar Valor Acordado</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Esta ação registra um Change Order com auditoria. O motivo é obrigatório.
                            </p>
                        </div>
                        {order.agreedClientPrice && (
                            <p className="text-sm text-muted-foreground">
                                Valor atual: <span className="font-semibold text-foreground">{formatCurrency(Number(order.agreedClientPrice))}</span>
                            </p>
                        )}
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1">Novo Valor Acordado (USD)</label>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={changeOrderNewPrice}
                                    onChange={e => setChangeOrderNewPrice(e.target.value)}
                                    placeholder="1220.00"
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label="Novo valor acordado"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1">Motivo do Change Order *</label>
                                <textarea
                                    value={changeOrderReason}
                                    onChange={e => setChangeOrderReason(e.target.value)}
                                    placeholder="Ex: Cliente solicitou serviço adicional de instalação elétrica — aprovado em reunião de 04/26."
                                    rows={3}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label="Motivo do change order"
                                />
                                <p className="text-xs text-muted-foreground mt-0.5">{changeOrderReason.length}/10 caracteres mínimos</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => { setShowChangeOrderModal(false); setChangeOrderNewPrice(''); setChangeOrderReason(''); }}
                                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
                                disabled={changeOrderLoading}
                                aria-label="Cancelar change order"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleChangeOrder}
                                disabled={changeOrderLoading}
                                className="px-4 py-2 text-sm rounded-lg bg-brand-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                                aria-label="Confirmar change order"
                            >
                                {changeOrderLoading ? 'Salvando...' : 'Confirmar Change Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Material Modal */}
            {showEditMaterialModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
                        <h3 className="font-semibold text-base">Editar Material</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                                <input
                                    type="text"
                                    value={editMaterialForm.name}
                                    onChange={e => setEditMaterialForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Nome do material"
                                    className="w-full border border-border rounded-md px-3 py-1.5 text-sm bg-background mt-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">Unidade</label>
                                    <input
                                        type="text"
                                        value={editMaterialForm.unit}
                                        onChange={e => setEditMaterialForm(f => ({ ...f, unit: e.target.value }))}
                                        placeholder="un"
                                        className="w-full border border-border rounded-md px-3 py-1.5 text-sm bg-background mt-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">Qtd</label>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={editMaterialForm.quantityPlanned}
                                        onChange={e => setEditMaterialForm(f => ({ ...f, quantityPlanned: e.target.value }))}
                                        placeholder="1"
                                        className="w-full border border-border rounded-md px-3 py-1.5 text-sm bg-background mt-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Custo Unitário Est. (USD)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editMaterialForm.unitCostEstimated}
                                    onChange={e => setEditMaterialForm(f => ({ ...f, unitCostEstimated: e.target.value }))}
                                    placeholder="0.00"
                                    className="w-full border border-border rounded-md px-3 py-1.5 text-sm bg-background mt-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editMaterialForm.hasTax}
                                        onChange={e => setEditMaterialForm(f => ({ ...f, hasTax: e.target.checked }))}
                                        className="rounded border-border"
                                    />
                                    <span className="text-xs font-medium text-muted-foreground">Tem imposto (TX)</span>
                                </label>
                                {editMaterialForm.hasTax && (
                                    <div className="flex items-center gap-1 ml-auto">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={editMaterialForm.taxRate}
                                            onChange={e => setEditMaterialForm(f => ({ ...f, taxRate: e.target.value }))}
                                            className="w-16 border border-border rounded-md px-2 py-1 text-sm bg-background focus:outline-none"
                                        />
                                        <span className="text-xs text-muted-foreground">%</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <Button
                                variant="ghost"
                                className="flex-1"
                                onClick={() => { setShowEditMaterialModal(false); setEditingMaterialId(null); }}
                                disabled={actionLoading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={saveMaterialEdit}
                                disabled={actionLoading || !editMaterialForm.name.trim()}
                            >
                                {actionLoading ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Field Purchase Modal */}
            {showRejectPurchaseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
                        <h3 className="font-semibold text-base">Rejeitar Compra de Campo</h3>
                        <p className="text-sm text-muted-foreground">Informe o motivo da rejeição para o técnico.</p>
                        <textarea
                            className="w-full border border-border rounded-lg p-2 text-sm bg-background resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            rows={3}
                            placeholder="Ex: Valor acima do orçamento, contate o gerente..."
                            value={rejectMotivo}
                            onChange={e => setRejectMotivo(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                className="flex-1"
                                onClick={() => { setShowRejectPurchaseModal(false); setRejectingMaterialId(null); setRejectMotivo(''); }}
                                disabled={fieldOpLoading !== null}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={rejectFieldPurchase}
                                disabled={!rejectMotivo.trim() || fieldOpLoading !== null}
                            >
                                {fieldOpLoading !== null ? 'Rejeitando...' : 'Rejeitar'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Return Material Modal */}
            {showReturnModal && returnItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
                        <h3 className="font-semibold text-base">Devolver Material</h3>
                        <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{returnItem.name}</span>
                        </p>

                        <div>
                            <label htmlFor="return-qty" className="text-xs font-medium text-muted-foreground uppercase">
                                Quantidade a devolver (max: {returnItem.maxQty} {returnItem.unit})
                            </label>
                            <input
                                id="return-qty"
                                type="number"
                                min="0.001"
                                step="0.001"
                                max={returnItem.maxQty}
                                value={returnQty}
                                onChange={(e) => setReturnQty(e.target.value)}
                                className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase">Destino</label>
                            <div className="mt-2 space-y-2">
                                <label className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="returnDest"
                                        checked={returnDest === 'COMPANY_STOCK'}
                                        onChange={() => setReturnDest('COMPANY_STOCK')}
                                    />
                                    <div>
                                        <span className="text-sm font-medium">Estoque da Empresa</span>
                                        <p className="text-xs text-muted-foreground">Material volta ao inventário</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="returnDest"
                                        checked={returnDest === 'STORE'}
                                        onChange={() => setReturnDest('STORE')}
                                    />
                                    <div>
                                        <span className="text-sm font-medium">Devolver na Loja</span>
                                        <p className="text-xs text-muted-foreground">Reembolso pelo fornecedor</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {returnDest === 'STORE' && (
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Valor Reembolsado ($)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={returnRefund}
                                    onChange={(e) => setReturnRefund(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                                />
                            </div>
                        )}

                        <div className="flex gap-2 pt-1">
                            <Button
                                variant="ghost"
                                className="flex-1"
                                onClick={() => { setShowReturnModal(false); setReturnItem(null); }}
                                disabled={actionLoading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={submitReturn}
                                disabled={actionLoading || !returnQty || parseFloat(returnQty) <= 0}
                            >
                                {actionLoading ? 'Devolvendo...' : 'Confirmar Devoluçao'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cost Correction Modal — ADMIN/FINANCEIRO only */}
            {showCorrectCost && correctingMaterial && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
                        <h3 className="font-semibold text-base">Corrigir Custo de Material</h3>
                        <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{correctingMaterial.name}</span>
                        </p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 rounded-lg px-3 py-2">
                            ⚠️ Esta correção cria uma trilha de auditoria. Informe o motivo detalhado.
                        </p>
                        <div>
                            <label className="text-sm text-muted-foreground">Novo custo unitário (USD) *</label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={correctCostValue}
                                onChange={(e) => setCorrectCostValue(e.target.value)}
                                className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                                placeholder="0.00"
                                autoFocus
                            />
                            {correctingMaterial.unitCostActual !== null && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Valor atual: ${Number(correctingMaterial.unitCostActual).toFixed(2)}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground">Motivo da correção *</label>
                            <textarea
                                value={correctCostReason}
                                onChange={(e) => setCorrectCostReason(e.target.value)}
                                rows={3}
                                className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                                placeholder="Ex: Nota fiscal apresentava valor diferente do informado no campo..."
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                className="flex-1"
                                onClick={() => { setShowCorrectCost(false); setCorrectingMaterial(null); }}
                                disabled={correctCostLoading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={submitCorrectCost}
                                disabled={correctCostLoading || !correctCostValue || !correctCostReason.trim()}
                            >
                                {correctCostLoading ? 'Salvando...' : 'Confirmar Correção'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Team Management Modal */}
            {showTeamModal && order && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-base">Gerenciar Equipe</h3>
                            <button onClick={() => { setShowTeamModal(false); setTeamSearch(''); }} className="text-muted-foreground hover:text-foreground">✕</button>
                        </div>

                        {/* Current team members */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Equipe Atual</p>
                            {(order.technicians ?? []).length === 0 ? (
                                <p className="text-sm text-muted-foreground">Nenhum membro na equipe</p>
                            ) : (
                                <div className="space-y-1">
                                    {(order.technicians ?? []).map((t) => (
                                        <div key={t.workerId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                                            <div>
                                                <p className="text-sm font-medium">{t.worker.name}</p>
                                                <p className="text-xs text-muted-foreground">{t.worker.classification}</p>
                                            </div>
                                            <button
                                                onClick={() => removeTechFromTeam(t.workerId)}
                                                disabled={teamLoading === t.workerId}
                                                className="text-xs text-destructive hover:underline disabled:opacity-50"
                                            >
                                                {teamLoading === t.workerId ? '...' : 'Remover'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add from available technicians */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Adicionar Técnico</p>
                            <input
                                type="text"
                                placeholder="Buscar técnico..."
                                value={teamSearch}
                                onChange={(e) => setTeamSearch(e.target.value)}
                                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mb-2"
                            />
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {(() => {
                                    if (techniciansLoading) {
                                        return (
                                            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                                Carregando técnicos disponíveis...
                                            </div>
                                        );
                                    }
                                    const teamIds = (order.technicians ?? []).map((m) => m.workerId);
                                    const available = technicians.filter((t) => {
                                        const isResponsible = order.AssignedWorker?.id === t.id;
                                        const alreadyMember = teamIds.includes(t.id);
                                        const matchesSearch = t.name.toLowerCase().includes(teamSearch.toLowerCase());
                                        return !isResponsible && !alreadyMember && matchesSearch;
                                    });
                                    if (available.length === 0) {
                                        return <p className="text-sm text-muted-foreground text-center py-2">Nenhum técnico disponível</p>;
                                    }
                                    return available.map((t) => (
                                        <div key={t.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50">
                                            <div>
                                                <p className="text-sm font-medium">{t.name}</p>
                                                <p className="text-xs text-muted-foreground">{t.cargo}</p>
                                            </div>
                                            <button
                                                onClick={() => addTechToTeam(t.id)}
                                                disabled={teamLoading === t.id}
                                                className="text-xs text-primary hover:underline disabled:opacity-50"
                                            >
                                                {teamLoading === t.id ? '...' : '+ Adicionar'}
                                            </button>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {hasOpenModal ? (
                <ServiceOrderDetailModals
                    actionLoading={actionLoading}
                    addExternalMaterial={addExternalMaterial}
                    addMaterial={addMaterial}
                    addMaterialMode={addMaterialMode}
                    addWorkEntry={addWorkEntry}
                    allOrderMaterials={(order?.materials ?? []).map((m) => ({
                        id: m.id,
                        name: m.name,
                        quantityPlanned: Number(m.quantityPlanned),
                        unit: m.unit,
                        unitCostEstimated: m.unitCostEstimated != null ? Number(m.unitCostEstimated) : null,
                        unitCostActual: m.unitCostActual != null ? Number(m.unitCostActual) : null,
                        hasTax: (m as Record<string, unknown>).hasTax as boolean | null ?? null,
                        taxRate: (m as Record<string, unknown>).taxRate != null ? Number((m as Record<string, unknown>).taxRate) : null,
                    }))}
                    orderAttachments={(order?.attachments ?? []).map(a => ({
                        id: a.id,
                        materialItems: (a.materialItems ?? []).map(mi => ({ materialItemId: mi.materialItemId })),
                    }))}
                    assignTech={assignTech}
                    cancelReasonText={cancelReasonText}
                    changeStatus={changeStatus}
                    consumeItem={consumeItem}
                    consumeMaterial={consumeMaterial}
                    consumeQty={consumeQty}
                    editForm={editForm}
                    externalMaterial={externalMaterial}
                    externalOrderMaterials={externalOrderMaterials}
                    filteredStockMaterials={filteredStockMaterials}
                    formatCurrency={formatCurrency}
                    hasStockMaterialMatches={hasStockMaterialMatches}
                    materialQty={materialQty}
                    materialSearch={materialSearch}
                    reopenReasonText={reopenReasonText}
                    writeOffReasonText={writeOffReasonText}
                    saveEdit={saveEdit}
                    selectedMaterial={selectedMaterial}
                    setAddMaterialMode={setAddMaterialMode}
                    setCancelReasonText={setCancelReasonText}
                    setConsumeItem={setConsumeItem}
                    setConsumeQty={setConsumeQty}
                    setEditForm={setEditForm}
                    setExternalMaterial={setExternalMaterial}
                    setMaterialQty={setMaterialQty}
                    setMaterialSearch={setMaterialSearch}
                    setReopenReasonText={setReopenReasonText}
                    setWriteOffReasonText={setWriteOffReasonText}
                    setSelectedMaterial={setSelectedMaterial}
                    setShowAddMaterial={setShowAddMaterial}
                    setShowAddWorkEntry={setShowAddWorkEntry}
                    setShowCancelModal={setShowCancelModal}
                    setShowConsumeMaterial={setShowConsumeMaterial}
                    setShowEditModal={setShowEditModal}
                    setShowReopenModal={setShowReopenModal}
                    setShowWriteOffModal={setShowWriteOffModal}
                    setShowSignatureModal={setShowSignatureModal}
                    setShowTechAssign={setShowTechAssign}
                    setShowUploadModal={setShowUploadModal}
                    setSignatureFile={setSignatureFile}
                    setSignatureData={setSignatureData}
                    setUploadCaption={setUploadCaption}
                    setUploadFile={setUploadFile}
                    setUploadMaterialLinks={setUploadMaterialLinks}
                    setUploadTotal={setUploadTotal}
                    setUploadType={setUploadType}
                    setUploadVendor={setUploadVendor}
                    setWorkEntryForm={setWorkEntryForm}
                    showAddMaterial={showAddMaterial}
                    showAddWorkEntry={showAddWorkEntry}
                    showCancelModal={showCancelModal}
                    showConsumeMaterial={showConsumeMaterial}
                    showEditModal={showEditModal}
                    showReopenModal={showReopenModal}
                    showWriteOffModal={showWriteOffModal}
                    showSignatureModal={showSignatureModal}
                    showTechAssign={showTechAssign}
                    showUploadModal={showUploadModal}
                    signatureFile={signatureFile}
                    signatureData={signatureData}
                    signatureLoading={signatureLoading}
                    stockMaterials={stockMaterials}
                    technicians={technicians}
                    orderTechnicians={order.technicians ?? []}
                    uploadAttachment={uploadAttachment}
                    uploadCaption={uploadCaption}
                    uploadFile={uploadFile}
                    uploadLoading={uploadLoading}
                    uploadMaterialLinks={uploadMaterialLinks}
                    uploadSignature={uploadSignature}
                    uploadTotal={uploadTotal}
                    uploadType={uploadType}
                    uploadVendor={uploadVendor}
                    workEntryForm={workEntryForm}
                    showEditWorkEntryModal={showEditWorkEntryModal}
                    setShowEditWorkEntryModal={setShowEditWorkEntryModal}
                    editingWorkEntry={editingWorkEntry}
                    setEditingWorkEntry={setEditingWorkEntry}
                    editWorkEntryForm={editWorkEntryForm}
                    setEditWorkEntryForm={setEditWorkEntryForm}
                    updateWorkEntry={updateWorkEntry}
                    showEditAttachmentModal={showEditAttachmentModal}
                    setShowEditAttachmentModal={setShowEditAttachmentModal}
                    editingAttachment={editingAttachment}
                    setEditingAttachment={setEditingAttachment}
                    editAttachmentForm={editAttachmentForm}
                    setEditAttachmentForm={setEditAttachmentForm}
                    updateAttachment={updateAttachment}
                    showDeleteAttachmentConfirm={showDeleteAttachmentConfirm}
                    setShowDeleteAttachmentConfirm={setShowDeleteAttachmentConfirm}
                    attachmentToDelete={attachmentToDelete}
                    setAttachmentToDelete={setAttachmentToDelete}
                    confirmDeleteAttachment={confirmDeleteAttachment}
                />
            ) : null}
        </div>
    );
}
