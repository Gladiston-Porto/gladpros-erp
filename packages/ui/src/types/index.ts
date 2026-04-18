// Common TypeScript types for UI components
export type { VariantProps } from 'class-variance-authority'

export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface LoadingState {
  isLoading?: boolean
  loadingText?: string
}

export interface ErrorState {
  error?: string | Error
  onRetry?: () => void
}