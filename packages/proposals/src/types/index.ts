// Proposal Types
export interface Proposal {
  id: string
  title: string
  description: string
  clientId: string
  clientName: string
  status: ProposalStatus
  value: number
  currency: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
  items: ProposalItem[]
  notes?: string
  attachments?: ProposalAttachment[]
}

export interface ProposalItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  category?: string
}

export interface ProposalAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploadedAt: Date
}

export enum ProposalStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export interface CreateProposalData {
  title: string
  description: string
  clientId: string
  value: number
  currency?: string
  items: Omit<ProposalItem, 'id' | 'totalPrice'>[]
  expiresAt?: Date
  notes?: string
}

export interface UpdateProposalData {
  title?: string
  description?: string
  value?: number
  status?: ProposalStatus
  items?: ProposalItem[]
  expiresAt?: Date
  notes?: string
}

export interface ProposalFilters {
  status?: ProposalStatus
  clientId?: string
  dateFrom?: Date
  dateTo?: Date
  minValue?: number
  maxValue?: number
}

export interface ProposalStats {
  total: number
  draft: number
  sent: number
  accepted: number
  rejected: number
  totalValue: number
  averageValue: number
}