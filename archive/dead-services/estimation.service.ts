import { Decimal } from '@prisma/client/runtime/library'
import { TexasTaxCalculator, TaxRateInfo } from '../../../packages/proposals/src/utils/tax-calculator'

export interface EstimationItemInput {
    name: string
    quantity: number
    unitCost: number
    marginPercent?: number // Target Margin % (e.g. 40 = 40%)
    markupPercent?: number // Optional: if specified, overrides margin calculation
    taxable: boolean
}

export interface CalculatedItem {
    name: string
    quantity: number
    unitCost: number
    totalCost: number
    unitPrice: number
    totalPrice: number
    marginPercent: number
    markupPercent: number
    grossProfit: number
    taxable: boolean
}

export interface CalculatedOption {
    name: string
    items: CalculatedItem[]
    totalCost: number
    totalPrice: number
    grossProfit: number
    grossMarginPercent: number
    taxResult: {
        taxAmount: number
        taxableAmount: number
        totalWithTax: number
        breakdown: any[]
    }
}

export class EstimationService {
    /**
     * Calculate Price based on Cost and desired Margin.
     * Formula: Price = Cost / (1 - (Margin / 100))
     */
    static calculatePriceFromMargin(cost: number, marginPercent: number): number {
        if (marginPercent >= 100) throw new Error("Margin cannot be 100% or more")
        if (marginPercent < 0) throw new Error("Margin cannot be negative") // Simplification
        return cost / (1 - (marginPercent / 100))
    }

    /**
     * Calculate Margin based on Cost and Price.
     * Formula: Margin = ((Price - Cost) / Price) * 100
     */
    static calculateMargin(cost: number, price: number): number {
        if (price === 0) return 0
        return ((price - cost) / price) * 100
    }

    /**
     * Process a full Estimation Option calculation
     */
    static calculateOption(
        name: string,
        items: EstimationItemInput[],
        taxRates: TaxRateInfo[]
    ): CalculatedOption {
        let optionTotalCost = 0
        let optionTotalPrice = 0

        const calculatedItems: CalculatedItem[] = items.map(item => {
            const quantity = item.quantity
            const unitCost = item.unitCost
            const totalCost = unitCost * quantity

            let unitPrice = 0
            let margin = 0
            let markup = 0

            // Logic: Prefer Margin if set, else Markup, else Default Margin (40%)
            if (item.marginPercent !== undefined) {
                margin = item.marginPercent
                unitPrice = this.calculatePriceFromMargin(unitCost, margin)
                // Calculate resulting markup: Markup = ((Price - Cost) / Cost) * 100
                markup = unitCost > 0 ? ((unitPrice - unitCost) / unitCost) * 100 : 0
            } else if (item.markupPercent !== undefined) {
                markup = item.markupPercent
                unitPrice = unitCost * (1 + (markup / 100))
                margin = this.calculateMargin(unitCost, unitPrice)
            } else {
                // Default to 40% margin
                margin = 40
                unitPrice = this.calculatePriceFromMargin(unitCost, margin)
                markup = unitCost > 0 ? ((unitPrice - unitCost) / unitCost) * 100 : 0
            }

            const totalPrice = unitPrice * quantity
            const grossProfit = totalPrice - totalCost

            optionTotalCost += totalCost
            optionTotalPrice += totalPrice

            return {
                name: item.name,
                quantity,
                unitCost,
                totalCost,
                unitPrice,
                totalPrice,
                marginPercent: margin,
                markupPercent: markup,
                grossProfit,
                taxable: item.taxable
            }
        })

        const grossProfit = optionTotalPrice - optionTotalCost
        const grossMarginPercent = optionTotalPrice > 0
            ? (grossProfit / optionTotalPrice) * 100
            : 0

        // Tax Calculation
        // Map CalculatedItem to format expected by TexasTaxCalculator
        const taxInput = calculatedItems.map(i => ({
            price: i.unitPrice,
            quantity: i.quantity,
            taxable: i.taxable
        }))

        const taxResult = TexasTaxCalculator.calculate(taxInput, taxRates)

        return {
            name,
            items: calculatedItems,
            totalCost: optionTotalCost,
            totalPrice: optionTotalPrice,
            grossProfit,
            grossMarginPercent,
            taxResult: {
                taxAmount: taxResult.taxAmount,
                taxableAmount: taxResult.taxableAmount,
                totalWithTax: taxResult.total,
                breakdown: taxResult.breakdown
            }
        }
    }
}
