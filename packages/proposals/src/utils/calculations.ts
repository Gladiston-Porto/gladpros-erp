import { ProposalItem } from '../types'

/**
 * Calculate total value of proposal items
 */
export function calculateProposalTotal(items: ProposalItem[]): number {
  return items.reduce((total, item) => {
    return total + (item.quantity * item.unitPrice)
  }, 0)
}

/**
 * Calculate item total price
 */
export function calculateItemTotal(quantity: number, unitPrice: number): number {
  return quantity * unitPrice
}

/**
 * Apply discount to total value
 */
export function applyDiscount(total: number, discountPercent: number): number {
  const discount = (total * discountPercent) / 100
  return total - discount
}

/**
 * Calculate tax amount
 */
export function calculateTax(total: number, taxPercent: number): number {
  return (total * taxPercent) / 100
}

/**
 * Calculate final total with tax and discount
 */
export function calculateFinalTotal(
  items: ProposalItem[],
  discountPercent: number = 0,
  taxPercent: number = 0
): number {
  let total = calculateProposalTotal(items)

  if (discountPercent > 0) {
    total = applyDiscount(total, discountPercent)
  }

  if (taxPercent > 0) {
    total += calculateTax(total, taxPercent)
  }

  return total
}