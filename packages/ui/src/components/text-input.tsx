"use client";
import React from "react";

export interface TextInputProps {
  label?: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  className?: string;
}

export default function TextInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  className = "",
}: TextInputProps) {
  return (
    <div className={`mb-3 ${className}`}>
      {label && <label htmlFor={name} className="block text-sm mb-1">{label}</label>}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 rounded border bg-white text-slate-900 outline-none"
      />
    </div>
  );
}
