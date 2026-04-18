// packages/auth-core/src/types/user.ts
export interface User {
  id: number;
  email: string;
  nomeCompleto?: string;
  nome?: string;
  role: UserRole;
  nivel?: string;
  status: UserStatus;
  telefone?: string;
  endereco1?: string;
  endereco2?: string;
  cidade?: string;
  estado?: string;
  zipcode?: string;
  cep?: string;
  anotacoes?: string;
  ultimoLoginEm?: Date;
  criadoEm: Date;
  tokenVersion: number;
  mfaEnabled: boolean;
  mfaSecret?: string;
  permissions: string[];
}

export type UserRole = 'admin' | 'manager' | 'user' | 'client';

export type UserStatus = 'active' | 'inactive' | 'blocked' | 'pending';

export interface UserProfile {
  id: number;
  email: string;
  nomeCompleto: string;
  role: UserRole;
  status: UserStatus;
  telefone?: string;
  ultimoLoginEm?: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  nomeCompleto: string;
  role?: UserRole;
  telefone?: string;
  status?: UserStatus;
}

export interface UpdateUserData {
  nomeCompleto?: string;
  telefone?: string;
  endereco1?: string;
  endereco2?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  anotacoes?: string;
}
