export interface AuditoriaResponse {
  id: number;
  tabela: string;
  registroId: number;
  acao: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT";
  usuarioId?: number;
  ip?: string;
  payload?: string;
  criadoEm: string;
  nomeCompleto?: string; // Nome do usuário que executou a ação
  email?: string; // Email do usuário que executou a ação
  usuario?: {
    nomeCompleto?: string;
    email: string;
  };
}
