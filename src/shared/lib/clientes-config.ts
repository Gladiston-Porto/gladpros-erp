export const CLIENTES_CONFIG_STORAGE_KEY = "gladpros:clientes:config";

export type ClienteSortKey =
  | "nome"
  | "tipo"
  | "email"
  | "telefone"
  | "documento"
  | "cidadeEstado"
  | "status"
  | "criadoEm";

export interface ClienteModuleConfig {
  defaultPageSize: number;
  defaultTipo: "all" | "PF" | "PJ";
  defaultSortKey: ClienteSortKey;
  defaultSortDir: "asc" | "desc";
  defaultStatus: "all" | "true" | "false";
  showDocumentoColumn: boolean;
  showEnderecoColumn: boolean;
}

export const DEFAULT_CLIENTE_MODULE_CONFIG: ClienteModuleConfig = {
  defaultPageSize: 10,
  defaultTipo: "all",
  defaultSortKey: "nome",
  defaultSortDir: "asc",
  defaultStatus: "all",
  showDocumentoColumn: true,
  showEnderecoColumn: true,
};

export function readClienteModuleConfig(): ClienteModuleConfig {
  if (typeof window === "undefined") {
    return DEFAULT_CLIENTE_MODULE_CONFIG;
  }

  try {
    const raw = window.localStorage.getItem(CLIENTES_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_CLIENTE_MODULE_CONFIG;

    return {
      ...DEFAULT_CLIENTE_MODULE_CONFIG,
      ...(JSON.parse(raw) as Partial<ClienteModuleConfig>),
    };
  } catch {
    return DEFAULT_CLIENTE_MODULE_CONFIG;
  }
}
