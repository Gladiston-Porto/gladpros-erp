/**
 * Loading Spinner Component
 * Exibe spinner de carregamento
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

type LoadingSpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
};

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export { LoadingSpinner, LoadingSkeleton } from '@gladpros/ui'
