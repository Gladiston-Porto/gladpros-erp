"use client";
import React from "react";

export function SubmitButton({ label = "Enviar", disabled = false }: { label?: string; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition disabled:opacity-60"
    >
      {label}
    </button>
  );
}
