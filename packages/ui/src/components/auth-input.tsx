"use client";
import React from "react";

export interface AuthInputProps {
  label?: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
  className?: string;
}

export function AuthInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  error,
  className = "",
}: AuthInputProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label htmlFor={name} className="mb-2 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`w-full h-11 rounded-xl border px-4 py-3 text-sm transition-colors focus:border-[#0098DA] focus:outline-none focus:ring-2 focus:ring-[#0098DA]/20 ${
          error 
            ? 'border-red-300 bg-red-50' 
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
