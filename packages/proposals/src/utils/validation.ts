import { CreateProposalData, UpdateProposalData, ProposalItem } from '../types'

/**
 * Validate proposal creation data
 */
export function validateProposal(data: CreateProposalData): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Required fields
  if (!data.title?.trim()) {
    errors.push('Title is required')
  }

  if (!data.description?.trim()) {
    errors.push('Description is required')
  }

  if (!data.clientId?.trim()) {
    errors.push('Client ID is required')
  }

  if (data.value <= 0) {
    errors.push('Value must be greater than 0')
  }

  // Items validation
  if (!data.items || data.items.length === 0) {
    errors.push('At least one item is required')
  } else {
    data.items.forEach((item, index) => {
      if (!item.description?.trim()) {
        errors.push(`Item ${index + 1}: Description is required`)
      }
      if (item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`)
      }
      if (item.unitPrice < 0) {
        errors.push(`Item ${index + 1}: Unit price cannot be negative`)
      }
    })
  }

  // Date validation
  if (data.expiresAt && data.expiresAt <= new Date()) {
    errors.push('Expiration date must be in the future')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate proposal update data
 */
export function validateProposalUpdate(data: UpdateProposalData): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Optional field validations
  if (data.title !== undefined && !data.title?.trim()) {
    errors.push('Title cannot be empty')
  }

  if (data.description !== undefined && !data.description?.trim()) {
    errors.push('Description cannot be empty')
  }

  if (data.value !== undefined && data.value <= 0) {
    errors.push('Value must be greater than 0')
  }

  // Items validation
  if (data.items) {
    data.items.forEach((item, index) => {
      if (!item.description?.trim()) {
        errors.push(`Item ${index + 1}: Description is required`)
      }
      if (item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`)
      }
      if (item.unitPrice < 0) {
        errors.push(`Item ${index + 1}: Unit price cannot be negative`)
      }
    })
  }

  // Date validation
  if (data.expiresAt && data.expiresAt <= new Date()) {
    errors.push('Expiration date must be in the future')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate proposal item
 */
export function validateProposalItem(item: Partial<ProposalItem>): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!item.description?.trim()) {
    errors.push('Description is required')
  }

  if (item.quantity !== undefined && item.quantity <= 0) {
    errors.push('Quantity must be greater than 0')
  }

  if (item.unitPrice !== undefined && item.unitPrice < 0) {
    errors.push('Unit price cannot be negative')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}