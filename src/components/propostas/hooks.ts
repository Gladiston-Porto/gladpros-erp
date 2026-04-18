import { useMemo } from 'react'
import { Material, InternoInfo, TotaisCalculados } from './types'

export function useCalcularTotais(materiais: Material[], interno: InternoInfo): TotaisCalculados {
  return useMemo(() => {
    const mat = materiais.reduce((acc, m) => acc + (m.preco ? m.preco * (m.quantidade || 0) : 0), 0) || 0;
    const mo = interno.custo_mo || 0;
    const terce = interno.custo_terceiros || 0;
    const frete = interno.frete || 0;

    const base = mat + mo + terce + frete;
    const overhead = base * (Number(interno.overhead_pct || 0) / 100);
    const margem = (base + overhead) * (Number(interno.margem_pct || 0) / 100);
    const conting = (base + overhead + margem) * (Number(interno.contingencia_pct || 0) / 100);
    const subtotal = base + overhead + margem + conting;
    const impostos = subtotal * (Number(interno.impostos_pct || 0) / 100);

    const precoCliente = subtotal + impostos;

    return { mat, mo, terce, frete, overhead, margem, conting, impostos, precoCliente };
  }, [materiais, interno]);
}
