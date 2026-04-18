// src/types/api.ts - Tipos específicos para APIs

import type { NextRequest } from 'next/server';

// Tipos base para requests
export interface ApiRequest<T = unknown> extends NextRequest {
  json(): Promise<T>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode: number;
}

// Tipos para autenticação
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  requiresMFA?: boolean;
}

export interface MFACodeRequest {
  code: string;
  tempToken: string;
}

export interface MFACodeResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

// Tipos para usuários
export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  department?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: 'admin' | 'manager' | 'user';
  department?: string;
  isActive?: boolean;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  department?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

// Tipos para clientes
export interface CreateClientRequest {
  type: 'PF' | 'PJ';
  name: string;
  email: string;
  phone?: string;
  document: string;
  address?: {
    street: string;
    number: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface UpdateClientRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    number: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface ClientResponse {
  id: string;
  type: 'PF' | 'PJ';
  name: string;
  email: string;
  phone?: string;
  document: string;
  address?: {
    street: string;
    number: string;
    city: string;
    state: string;
    zipCode: string;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Tipos para propostas
export interface CreateProposalRequest {
  clientId: string;
  title: string;
  description: string;
  value: number;
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface UpdateProposalRequest {
  title?: string;
  description?: string;
  value?: number;
  status?: 'draft' | 'sent' | 'approved' | 'rejected';
  items?: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface ProposalResponse {
  id: string;
  clientId: string;
  title: string;
  description: string;
  value: number;
  status: string;
  items: Array<{
    id: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Tipos para dashboard
export interface DashboardStatsResponse {
  totalUsers: number;
  activeUsers: number;
  totalClients: number;
  totalProposals: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user?: string;
  }>;
}

export interface DashboardChartsResponse {
  userGrowth: Array<{
    month: string;
    users: number;
    activeUsers: number;
  }>;
  proposalStatus: Array<{
    status: string;
    count: number;
  }>;
}

// Tipos para erros
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  validationErrors?: ValidationError[];
}

// Tipos para paginação
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Tipos para upload de arquivos
export interface FileUploadRequest {
  file: File;
  type: 'document' | 'image' | 'attachment';
  metadata?: Record<string, unknown>;
}

export interface FileUploadResponse {
  id: string;
  filename: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

// Funções helper para type guards
export function isApiError(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    response.success === false &&
    'error' in response
  );
}

export function isPaginatedResponse<T>(
  response: unknown,
  itemValidator: (item: unknown) => item is T
): response is PaginatedResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'data' in response &&
    'pagination' in response &&
    Array.isArray((response as PaginatedResponse<T>).data) &&
    (response as PaginatedResponse<T>).data.every(itemValidator)
  );
}
