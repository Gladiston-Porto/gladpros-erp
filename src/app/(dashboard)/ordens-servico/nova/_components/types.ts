export type ServiceOrderClient = {
  id: number;
  name: string;
};

export type EmbalagemOption = {
  id: number;
  packageType: string;
  baseQtyPerUnit: number;
  purchaseUnit: string;
  precoCompra: number;
};

export type PlannedMaterial = {
  materialId?: number; // undefined = external field purchase (no stock entry)
  name: string;
  unit: string;
  quantityPlanned: number;
  unitCostEstimated: number;
  stockQty: number; // 0 for external materials
  // Embalagem snapshot fields (optional)
  embalagemId?: number;
  qtdEmbalagens?: number;
  embalagemBaseQtyAtTime?: number;
  embalagemPrecoAtTime?: number;
  embalagemUnitAtTime?: string;
};

export type StockMaterial = {
  id: number;
  nome: string;
  unidade: string;
  quantidadeEstoque: number;
  precoUnitario: number;
  embalagens?: EmbalagemOption[];
};

export type ServiceOrderFormState = {
  clienteId: number;
  title: string;
  description: string;
  scheduleType: "FIXED" | "FLEXIBLE";
  scheduledDate: string;
  scheduleDateStart: string;
  scheduleDateEnd: string;
  estimatedHours: string;
  hourlyRate: string;
  materialSupply: "CLIENT_PROVIDES" | "COMPANY_PROVIDES";
  sameClientAddress: boolean;
  serviceAddressLine1: string;
  serviceCity: string;
  serviceState: string;
  serviceZip: string;
  servicePhone: string;
  serviceContactName: string;
  endClientName: string;
  endClientPhone: string;
  endClientEmail: string;
  endClientNotes: string;
  assignedWorkerId: number | undefined;
  priority: string;
  // Financial estimates (Fase 1)
  agreedClientPrice: string;
  materialEstimate: string;
  laborEstimate: string;
  // Tax Classification (Fase 2)
  propertyType: "RESIDENTIAL" | "COMMERCIAL" | "MIXED_USE" | "EXEMPT_ORGANIZATION" | "GOVERNMENT";
  serviceCategory: "REPAIR" | "REMODEL" | "RESTORATION" | "NEW_CONSTRUCTION" | "MAINTENANCE" | "INSPECTION" | "CONSULTATION" | "OTHER";
  contractType: "LUMP_SUM" | "SEPARATED";
};
