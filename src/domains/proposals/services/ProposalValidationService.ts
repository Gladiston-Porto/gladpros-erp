export interface ProposalCompletenessResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ProposalMaterialLike {
  nome?: string | null;
  quantidade?: number | { toNumber(): number } | null;
}

interface ProposalStageLike {
  servico?: string | null;
  descricao?: string | null;
}

interface ProposalLike {
  clienteId?: number | null;
  titulo?: string | null;
  descricaoEscopo?: string | null;
  valorEstimado?: unknown;
  PropostaMaterial?: ProposalMaterialLike[];
  PropostaEtapa?: ProposalStageLike[];
}

export function validateProposalCompleteness(proposta: ProposalLike): ProposalCompletenessResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!proposta.clienteId) {
    errors.push('Proposta sem cliente vinculado');
  }

  if (!proposta.titulo?.trim()) {
    errors.push('Proposta sem título');
  }

  if (!proposta.descricaoEscopo?.trim()) {
    errors.push('Proposta sem descrição de escopo');
  }

  if (!proposta.PropostaEtapa?.length) {
    errors.push('Proposta sem etapas definidas');
  }

  if (proposta.PropostaEtapa?.some((etapa) => !etapa.servico?.trim())) {
    errors.push('Há etapas sem serviço definido');
  }

  if (proposta.PropostaEtapa?.some((etapa) => !etapa.descricao?.trim())) {
    warnings.push('Há etapas sem descrição detalhada');
  }

  if (!proposta.PropostaMaterial?.length) {
    warnings.push('Proposta sem materiais planejados');
  }

  if (proposta.PropostaMaterial?.some((material) => !material.nome?.trim())) {
    errors.push('Há materiais sem nome definido');
  }

  if (proposta.PropostaMaterial?.some((material) => !material.quantidade || Number(material.quantidade) <= 0)) {
    errors.push('Há materiais com quantidade inválida');
  }

  if (proposta.valorEstimado == null) {
    warnings.push('Proposta sem valor estimado definido');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}