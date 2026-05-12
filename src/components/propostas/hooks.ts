import { useMemo } from 'react'
import { Material, InternoInfo, TotaisCalculados } from './types'

/** Texas combined sales tax rate: 6.25% state + 2% Dallas local */
const TX_SALES_TAX_RATE = 0.0825;

export function useCalcularTotais(materiais: Material[], interno: InternoInfo): TotaisCalculados {
  return useMemo(() => {
    // Materials from stock: price already includes tax paid to supplier — no additional tax
    const matEstoque = materiais
      .filter(m => !m.aComprar)
      .reduce((acc, m) => acc + (m.preco ? m.preco * (m.quantidade || 0) : 0), 0) || 0;

    // Materials to be purchased: price is pre-tax estimate — TX sales tax (8.25%) applies
    const matComprar = materiais
      .filter(m => m.aComprar)
      .reduce((acc, m) => acc + (m.preco ? m.preco * (m.quantidade || 0) : 0), 0) || 0;

    const salesTax = matComprar * TX_SALES_TAX_RATE;
    const mat = matEstoque + matComprar + salesTax;

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

    return { mat, matEstoque, matComprar, salesTax, mo, terce, frete, overhead, margem, conting, impostos, precoCliente };
  }, [materiais, interno]);
}
