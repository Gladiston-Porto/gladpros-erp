import { Decimal } from '@prisma/client/runtime/library'

export interface TaxRateInfo {
    id: number
    name: string
    rate: number // Decimal as number for calculation
    jurisdictionType: 'STATE' | 'COUNTY' | 'CITY' | 'SPECIAL_DISTRICT'
}

export interface TaxCalculationResult {
    subtotal: number
    taxableAmount: number
    taxAmount: number
    total: number
    breakdown: {
        jurisdiction: string
        rate: number
        amount: number
    }[]
}

/**
 * Texas Sales Tax Calculator
 * 
 * Rules:
 * - State Sales Tax: 6.25% (Base)
 * - Local Sales Tax: Up to 2.00% (City + County + Special Districts)
 * - Max Total: 8.25%
 */
export class TexasTaxCalculator {
    private static readonly STATE_RATE = 0.0625;

    /**
     * Calculate tax for a list of items given a set of applicable tax rates
     * @param items Array of items with { price, quantity, taxable }
     * @param localRates Array of local tax rates (County, City, etc.)
     */
    static calculate(
        items: { price: number; quantity: number; taxable: boolean }[],
        localRates: TaxRateInfo[]
    ): TaxCalculationResult {
        let subtotal = 0;
        let taxableAmount = 0;

        // 1. Calculate Base Totals
        items.forEach(item => {
            const lineTotal = item.price * item.quantity;
            subtotal += lineTotal;
            if (item.taxable) {
                taxableAmount += lineTotal;
            }
        });

        // 2. Determine Total Tax Rate
        // Cap local rate at 2% if necessary (though data should enforce this, checking here is safe)
        const totalLocalRate = localRates.reduce((sum, r) => sum + Number(r.rate), 0);

        // In a real scenario, we might clamp totalLocalRate, but typically we just sum active jurisdictions
        // Max rate is theoretical 8.25% (6.25 + 2.0)

        const effectiveStateRate = this.STATE_RATE;
        const effectiveLocalRate = totalLocalRate; // Assuming pass-in rates are valid

        const totalTaxRate = effectiveStateRate + effectiveLocalRate;

        // 3. Calculate Tax Amount
        const totalTaxAmount = taxableAmount * totalTaxRate; // Simple linear for now

        // 4. Breakdown
        const breakdown = [
            {
                jurisdiction: 'Texas State',
                rate: effectiveStateRate,
                amount: taxableAmount * effectiveStateRate
            },
            ...localRates.map(r => ({
                jurisdiction: r.name,
                rate: Number(r.rate),
                amount: taxableAmount * Number(r.rate)
            }))
        ];

        return {
            subtotal,
            taxableAmount,
            taxAmount: totalTaxAmount,
            total: subtotal + totalTaxAmount,
            breakdown
        };
    }
}
