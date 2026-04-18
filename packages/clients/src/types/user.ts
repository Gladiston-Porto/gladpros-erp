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
  ativo?: boolean; // se você ainda usa esse flag na UI, mantenha como alias de status === ATIVO

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