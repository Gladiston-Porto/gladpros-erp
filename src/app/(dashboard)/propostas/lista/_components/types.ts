export type StatusProposta =
  | "RASCUNHO"
  | "ENVIADA"
  | "ASSINADA"
  | "APROVADA"
  | "CANCELADA";

export type PropostaDTO = {
  id: string;
  numeroProposta: string;
  titulo: string;
  cliente?: {
    id: string;
    nomeCompleto?: string;
    razaoSocial?: string;
    nomeFantasia?: string;
  };
  status: StatusProposta;
  valor?: number;
  criadoEm: string;
  atualizadoEm?: string;
};

export type SortKey =
  | "numeroProposta"
  | "titulo"
  | "cliente"
  | "status"
  | "valor"
  | "criadoEm";

export type PropostasList = PropostaDTO[] | { items: PropostaDTO[] };

export type PropostaClienteOption = {
  id: string;
  nome: string;
};
