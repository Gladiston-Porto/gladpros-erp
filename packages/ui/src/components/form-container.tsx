"use client";
import React from "react";

export function FormContainer({
  title,
  children,
  onSubmit,
}: {
  title?: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="max-w-md w-full bg-card text-card-foreground p-6 rounded-xl border shadow-card">
      {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
      {children}
    </form>
  );
}
