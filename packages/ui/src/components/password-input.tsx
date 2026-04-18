"use client";
import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export interface PasswordInputProps {
  id?: string;
  label?: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  "aria-describedby"?: string;
}

export default function PasswordInput({
  id,
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  className = "",
  disabled = false,
  "aria-describedby": ariaDescribedBy,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? name;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-describedby={ariaDescribedBy}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 pr-10 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {visible ? (
            <EyeOff className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
