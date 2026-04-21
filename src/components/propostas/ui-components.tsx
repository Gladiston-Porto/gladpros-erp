/**
 * UI Components Barrel
 * Re-exports and custom components for propostas sections
 */

import React from 'react';

// Core UI components from @gladpros/ui
export { Input, Textarea, Button, Badge } from "@gladpros/ui";

// Label with required prop support
interface CustomLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
    required?: boolean;
    children: React.ReactNode;
}

export function Label({ required, children, className = '', ...props }: CustomLabelProps) {
    return (
        <label className={`block text-sm font-medium text-slate-700 mb-1 ${className}`} {...props}>
            {children}
            {required && <span className="text-red-500 ml-1">*</span>}
        </label>
    );
}

// Section component with title and subtitle
interface SectionProps {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
}

export function Section({ title, subtitle, children, className = '' }: SectionProps) {
    return (
        <div className={`bg-white rounded-xl border border-slate-200 p-6 shadow-sm ${className}`}>
            {(title || subtitle) && (
                <div className="mb-6">
                    {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
                    {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
                </div>
            )}
            {children}
        </div>
    );
}

// Custom Select that accepts standard onChange
interface CustomSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    children: React.ReactNode;
}

export function Select({ value, onChange, children, className = '', disabled, ...props }: CustomSelectProps) {
    return (
        <select
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`w-full rounded-2xl border border-border px-3 py-2 text-sm bg-background text-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:bg-muted ${className}`}
            {...props}
        >
            {children}
        </select>
    );
}

// Currency formatter utility
export function currency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
}
