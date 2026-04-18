"use client";
import React, { useState } from "react";

export interface AuthPasswordProps {
  label?: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  className?: string;
}

export function AuthPassword({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  className = "",
}: AuthPasswordProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label htmlFor={name} className="mb-2 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full h-11 rounded-xl border px-4 py-3 pr-12 text-sm transition-colors focus:border-[#0098DA] focus:outline-none focus:ring-2 focus:ring-[#0098DA]/20 ${
            error 
              ? 'border-red-300 bg-red-50' 
              : 'border-gray-300 bg-white hover:border-gray-400'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {visible ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L12 12m0 0l2.122 2.122M12 12l2.122-2.122m-2.122 0L12 12m0 0l-2.122-2.122M12 12l-2.122 2.122" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
