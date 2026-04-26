export type ServiceOrderClient = {
  id: number;
  name: string;
};

export type PlannedMaterial = {
  materialId?: number; // undefined = external field purchase (no stock entry)
  name: string;
  unit: string;
  quantityPlanned: number;
  unitCostEstimated: number;
  stockQty: number; // 0 for external materials
};

export type StockMaterial = {
  id: number;
  nome: string;
  unidade: string;
  quantidadeEstoque: number;
  precoUnitario: number;
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
};
