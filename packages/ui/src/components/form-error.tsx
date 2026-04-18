"use client";
import React from "react";

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-3 rounded bg-red-100 text-red-700 text-sm px-3 py-2" role="alert">
      {message}
    </div>
  );
}
