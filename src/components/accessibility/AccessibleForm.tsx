'use client';

import React from 'react';
import { useAriaAttributes } from '@/hooks/useAccessibility';

interface AccessibleFormFieldProps {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactElement;
  id?: string;
}

export function AccessibleFormField({
  label,
  description,
  error,
  required = false,
  children,
  id
}: AccessibleFormFieldProps) {
  const { generateId, getAriaProps } = useAriaAttributes();

  const fieldId = id || generateId();
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  const ariaProps = getAriaProps({
    describedBy: [descriptionId, errorId].filter(Boolean).join(' ') || undefined,
    invalid: !!error,
    required,
  });

  const childWithProps = React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    id: fieldId,
    ...ariaProps,
  });

  return (
    <div className="space-y-2">
      <label
        htmlFor={fieldId}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="campo obrigatório">
            *
          </span>
        )}
      </label>

      {description && (
        <p
          id={descriptionId}
          className="text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}

      {childWithProps}

      {error && (
        <p
          id={errorId}
          className="text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// Component for accessible buttons
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
}

export function AccessibleButton({
  children,
  loading = false,
  loadingText = 'Carregando...',
  disabled,
  ...props
}: AccessibleButtonProps) {
  const { getAriaProps } = useAriaAttributes();

  const ariaProps = getAriaProps({
    busy: loading,
  });

  return (
    <button
      {...props}
      {...ariaProps}
      disabled={disabled || loading}
      {...(disabled || loading ? { 'aria-disabled': true } : {})}
    >
      {loading ? loadingText : children}
    </button>
  );
}
