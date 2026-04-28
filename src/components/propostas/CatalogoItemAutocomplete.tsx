"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";

export interface CatalogoItemOption {
  id: number;
  nome: string;
  codigo?: string | null;
  categoria?: string | null;
  unidade: string;
  precoUnitario?: number | null;
  tipo: string;
}

interface CatalogoItemAutocompleteProps {
  onSelect: (item: CatalogoItemOption) => void;
  placeholder?: string;
  className?: string;
}

export function CatalogoItemAutocomplete({
  onSelect,
  placeholder = "Buscar no catálogo...",
  className = "",
}: CatalogoItemAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CatalogoItemOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(async (q: string) => {
    if (q.length < 2) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/propostas/catalogo?q=${encodeURIComponent(q)}&pageSize=20`,
        { credentials: "include" }
      );
      if (res.ok) {
        const json = await res.json();
        setOptions(json.data ?? []);
      }
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchItems(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchItems]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(item: CatalogoItemOption) {
    onSelect(item);
    setQuery("");
    setOptions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center rounded-lg border border-border bg-background px-3 py-2 gap-2 focus-within:ring-2 focus-within:ring-brand-primary">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Buscar item no catálogo"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setOptions([]); setOpen(false); }}
            aria-label="Limpar busca"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {open && (loading || options.length > 0) && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-60 overflow-y-auto"
        >
          {loading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Buscando...</div>
          ) : (
            options.map((item) => (
              <button
                key={item.id}
                type="button"
                role="option"
                onClick={() => handleSelect(item)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-brand-primary/10 focus:bg-brand-primary/10 outline-none"
              >
                <div className="font-medium text-foreground">{item.nome}</div>
                <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                  {item.categoria && <span>{item.categoria}</span>}
                  <span>{item.unidade}</span>
                  {item.precoUnitario != null && (
                    <span>
                      ${item.precoUnitario.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
          {!loading && options.length === 0 && query.length >= 2 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum item encontrado</div>
          )}
        </div>
      )}
    </div>
  );
}
