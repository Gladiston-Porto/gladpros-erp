export type UserRole = "ADMIN" | "GERENTE" | "USUARIO" | "FINANCEIRO" | "ESTOQUE" | "CLIENTE";
export type UserStatus = "ATIVO" | "INATIVO";

export type Usuario = {
  id: number;
  email: string;
  nomeCompleto: string;
  dataNascimento?: string | Date;
  role: UserRole;
  status: UserStatus;
  telefone?: string;
  ativo?: boolean;
  endereco1?: string;
  endereco2?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  anotacoes?: string;
  mfaEnabled?: boolean;
  mfaChannel?: "EMAIL" | "TOTP";
  mustResetPassword?: boolean;
  ultimoLoginEm?: string | Date;
  criadoEm?: string | Date;
  atualizadoEm?: string | Date;
};

export type SortKey = "nome" | "email" | "role" | "ativo" | "criadoEm";

export type UsersList = Usuario[] | { items: Usuario[] };

export const isWrapped = (data: UsersList): data is { items: Usuario[] } =>
  !Array.isArray(data)
  && data !== null
  && typeof data === "object"
  && "items" in data
  && Array.isArray((data as { items: unknown }).items);

export const unwrapUsers = (data?: UsersList): Usuario[] => {
  if (!data) return [];
  return Array.isArray(data) ? data : isWrapped(data) ? data.items : [];
};
