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
  valorEstimado?: number | null;
  validadeProposta?: string | null;
  diasAteVencimento?: number | null;
  aprovacaoInternaFinanceira?: boolean;
  aprovacaoInternaTecnica?: boolean;
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
