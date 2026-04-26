/**
 * salesTaxService.ts — Texas Sales Tax Engine (Fase 2)
 *
 * Handles sales tax classification and calculation for GladPros invoices.
 * This is SEPARATE from taxCalculationEngine.ts (federal income tax / SE tax).
 *
 * Texas Sales Tax Rules for Construction Services:
 *   Scenario A — Residential + lump-sum contract    → NON_TAXABLE (company pays tax on materials)
 *   Scenario B — Residential + separated contract   → tax only on MATERIAL line items
 *   Scenario C — Commercial/nonresidential          → full subtotal taxable at 8.25%
 *   Scenario D — Mixed-use or ambiguous             → MANUAL_REVIEW
 *   Scenario E — Exempt org / Government            → MANUAL_REVIEW (need exemption cert)
 *
 * Multi-state rule: Only TX is auto-calculated. Any other state → MANUAL_REVIEW.
 *
 * References: Texas Tax Code §151 + Texas Comptroller publications 94-105, 94-106
 */

import { ContractType, PropertyType, ServiceCategory, TaxMode } from "@prisma/client"

export type TaxScenario = "A" | "B" | "C" | "D" | "E"

export interface TaxClassificationInput {
  propertyType?: PropertyType | null
  serviceCategory?: ServiceCategory | null
  contractType?: ContractType | null
  /** Two-letter state code from the service address (e.g. "TX", "LA") */
  serviceAddressState?: string | null
}

export interface InvoiceLineItem {
  tipo: string          // "MATERIAL" | "LABOR" | "PERMIT_FEE" | "SERVICE" | "EQUIPMENT" | etc.
  taxable?: boolean | null
  /** Amount for this line item */
  total: number
}

export interface TaxCalculationInput {
  subtotal: number
  lineItems?: InvoiceLineItem[]
  classification: TaxClassificationInput
  /** Final price the client will be charged (used for TAX_INCLUDED reverse calc) */
  finalPrice?: number | null
  /** Apply tax-included reverse calculation instead of adding tax on top */
  taxIncluded?: boolean
}

export interface TaxCalculationResult {
  scenario: TaxScenario
  taxMode: TaxMode
  taxRate: number       // e.g. 0.0825
  taxableAmount: number
  nonTaxableAmount: number
  taxAmount: number
  total: number
  taxExplanation: string
  requiresManualReview: boolean
  manualReviewReason?: string
}

const TX_TAX_RATE = 0.0825

const TAXABLE_SERVICE_CATEGORIES: ServiceCategory[] = [
  ServiceCategory.REPAIR,
  ServiceCategory.REMODEL,
  ServiceCategory.RESTORATION,
  ServiceCategory.MAINTENANCE,
]

/**
 * Classify the tax scenario based on property type, service category, contract type, and state.
 */
export function classifyTaxScenario(input: TaxClassificationInput): {
  scenario: TaxScenario
  taxMode: TaxMode
  requiresManualReview: boolean
  manualReviewReason?: string
} {
  const { propertyType, serviceCategory, contractType, serviceAddressState } = input
  const state = (serviceAddressState ?? "TX").toUpperCase()

  // Multi-state rule: only Texas is auto-calculated
  if (state !== "TX") {
    return {
      scenario: "D",
      taxMode: TaxMode.MANUAL_REVIEW,
      requiresManualReview: true,
      manualReviewReason: `Out-of-state service (${state}). Texas sales tax rules do not apply. Review required by ADMIN or FINANCEIRO.`,
    }
  }

  // Scenario E — Exempt organizations / Government
  if (
    propertyType === PropertyType.EXEMPT_ORGANIZATION ||
    propertyType === PropertyType.GOVERNMENT
  ) {
    return {
      scenario: "E",
      taxMode: TaxMode.MANUAL_REVIEW,
      requiresManualReview: true,
      manualReviewReason: "Exempt organization or government client. Exemption certificate required before finalizing invoice.",
    }
  }

  // Scenario D — Mixed-use (cannot auto-classify)
  if (propertyType === PropertyType.MIXED_USE) {
    return {
      scenario: "D",
      taxMode: TaxMode.MANUAL_REVIEW,
      requiresManualReview: true,
      manualReviewReason: "Mixed-use property requires manual classification of taxable vs. non-taxable portions.",
    }
  }

  // Scenario A — Residential + lump-sum contract
  // The company pays tax when purchasing materials; client is NOT charged sales tax.
  if (
    propertyType === PropertyType.RESIDENTIAL &&
    contractType === ContractType.LUMP_SUM
  ) {
    return {
      scenario: "A",
      taxMode: TaxMode.NON_TAXABLE,
      requiresManualReview: false,
    }
  }

  // Scenario B — Residential + separated contract
  // Only material line items are taxable; labor is non-taxable.
  if (
    propertyType === PropertyType.RESIDENTIAL &&
    contractType === ContractType.SEPARATED
  ) {
    return {
      scenario: "B",
      taxMode: TaxMode.TAX_EXCLUDED,
      requiresManualReview: false,
    }
  }

  // Scenario C — Commercial / non-residential (repair/remodel/restoration)
  if (
    propertyType === PropertyType.COMMERCIAL &&
    serviceCategory &&
    TAXABLE_SERVICE_CATEGORIES.includes(serviceCategory)
  ) {
    return {
      scenario: "C",
      taxMode: TaxMode.TAX_EXCLUDED,
      requiresManualReview: false,
    }
  }

  // Scenario C — Commercial, non-taxable service categories (new construction, inspection, consultation)
  if (propertyType === PropertyType.COMMERCIAL) {
    return {
      scenario: "D",
      taxMode: TaxMode.MANUAL_REVIEW,
      requiresManualReview: true,
      manualReviewReason: "Commercial property with service category that may require special tax treatment. Manual review required.",
    }
  }

  // Fallback — insufficient data to auto-classify
  return {
    scenario: "D",
    taxMode: TaxMode.MANUAL_REVIEW,
    requiresManualReview: true,
    manualReviewReason: "Insufficient information to determine tax scenario. Property type or contract type not specified.",
  }
}

/**
 * Calculate sales tax for an invoice.
 * Call this whenever invoice is created, updated, or tax fields change.
 */
export function calculateInvoiceTax(input: TaxCalculationInput): TaxCalculationResult {
  const classification = classifyTaxScenario(input.classification)
  const { scenario, taxMode, requiresManualReview, manualReviewReason } = classification

  if (requiresManualReview || taxMode === TaxMode.MANUAL_REVIEW) {
    return {
      scenario,
      taxMode: TaxMode.MANUAL_REVIEW,
      taxRate: TX_TAX_RATE,
      taxableAmount: 0,
      nonTaxableAmount: input.subtotal,
      taxAmount: 0,
      total: input.subtotal,
      taxExplanation: manualReviewReason ?? "Manual review required.",
      requiresManualReview: true,
      manualReviewReason,
    }
  }

  // Scenario A — Non-taxable (residential lump-sum)
  if (scenario === "A") {
    return {
      scenario,
      taxMode: TaxMode.NON_TAXABLE,
      taxRate: TX_TAX_RATE,
      taxableAmount: 0,
      nonTaxableAmount: input.subtotal,
      taxAmount: 0,
      total: input.subtotal,
      taxExplanation:
        "Residential real property repair/remodel — lump-sum contract. Sales tax is not charged to the client. The company pays sales tax on material purchases.",
      requiresManualReview: false,
    }
  }

  // Scenario B — Residential separated: tax only on MATERIAL items
  if (scenario === "B") {
    const materialAmount = calculateMaterialTotal(input)
    const laborAmount = input.subtotal - materialAmount
    const taxAmount = round2(materialAmount * TX_TAX_RATE)

    return {
      scenario,
      taxMode: TaxMode.TAX_EXCLUDED,
      taxRate: TX_TAX_RATE,
      taxableAmount: round2(materialAmount),
      nonTaxableAmount: round2(laborAmount),
      taxAmount,
      total: round2(input.subtotal + taxAmount),
      taxExplanation:
        `Residential real property repair/remodel — separated contract. Labor ($${laborAmount.toFixed(2)}) is non-taxable. Materials ($${materialAmount.toFixed(2)}) are taxable at ${(TX_TAX_RATE * 100).toFixed(2)}%. Tax: $${taxAmount.toFixed(2)}.`,
      requiresManualReview: false,
    }
  }

  // Scenario C — Commercial: full subtotal taxable
  if (scenario === "C") {
    // Handle TAX_INCLUDED (reverse calculation)
    if (input.taxIncluded && input.finalPrice) {
      const taxableBase = round2(input.finalPrice / (1 + TX_TAX_RATE))
      const taxAmount = round2(input.finalPrice - taxableBase)
      return {
        scenario,
        taxMode: TaxMode.TAX_INCLUDED,
        taxRate: TX_TAX_RATE,
        taxableAmount: taxableBase,
        nonTaxableAmount: 0,
        taxAmount,
        total: input.finalPrice,
        taxExplanation:
          `Commercial property repair/remodel — tax included in agreed price. Final price: $${input.finalPrice.toFixed(2)}. Taxable base: $${taxableBase.toFixed(2)}. Sales tax (${(TX_TAX_RATE * 100).toFixed(2)}%) included: $${taxAmount.toFixed(2)}.`,
        requiresManualReview: false,
      }
    }

    const taxAmount = round2(input.subtotal * TX_TAX_RATE)
    return {
      scenario,
      taxMode: TaxMode.TAX_EXCLUDED,
      taxRate: TX_TAX_RATE,
      taxableAmount: round2(input.subtotal),
      nonTaxableAmount: 0,
      taxAmount,
      total: round2(input.subtotal + taxAmount),
      taxExplanation:
        `Commercial/nonresidential property repair/remodel. Full subtotal ($${input.subtotal.toFixed(2)}) is taxable at ${(TX_TAX_RATE * 100).toFixed(2)}%. Sales tax: $${taxAmount.toFixed(2)}.`,
      requiresManualReview: false,
    }
  }

  // Should not reach here but safe fallback
  return {
    scenario: "D",
    taxMode: TaxMode.MANUAL_REVIEW,
    taxRate: TX_TAX_RATE,
    taxableAmount: 0,
    nonTaxableAmount: input.subtotal,
    taxAmount: 0,
    total: input.subtotal,
    taxExplanation: "Tax scenario could not be determined. Manual review required.",
    requiresManualReview: true,
  }
}

/**
 * Validate that an invoice is ready to be sent (DRAFT → SENT).
 * Returns array of blocking reasons. Empty array = OK to send.
 */
export function validateTaxBeforeSend(invoice: {
  taxMode?: TaxMode | null
  manualTaxOverride?: boolean
  propertyType?: PropertyType | null
  serviceCategory?: ServiceCategory | null
  contractType?: ContractType | null
}): string[] {
  const blockers: string[] = []

  if (invoice.taxMode === TaxMode.MANUAL_REVIEW && !invoice.manualTaxOverride) {
    blockers.push(
      "Invoice has unresolved tax classification. An ADMIN or FINANCEIRO must review and approve the tax settings before sending."
    )
  }

  return blockers
}

// ── Private helpers ──────────────────────────────────────────────────────────

function calculateMaterialTotal(input: TaxCalculationInput): number {
  if (!input.lineItems || input.lineItems.length === 0) {
    // No line items provided — treat entire subtotal as non-taxable for safety
    return 0
  }

  return input.lineItems
    .filter((item) => {
      // Explicitly taxable items
      if (item.taxable === true) return true
      // Default: MATERIAL items are taxable in separated contracts
      if (item.taxable === null || item.taxable === undefined) {
        return item.tipo === "MATERIAL"
      }
      return false
    })
    .reduce((sum, item) => sum + item.total, 0)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
