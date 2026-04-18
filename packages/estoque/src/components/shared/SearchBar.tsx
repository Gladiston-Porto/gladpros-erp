/**
 * Search Bar Component
 * Campo de busca com debounce
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

type SearchBarProps = {
  placeholder?: string;
  className?: string;
};

export function SearchBar({
  placeholder = 'Buscar...',
  className,
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  // Debounce manual
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (searchTerm) {
        params.set('search', searchTerm);
        params.set('page', '1'); // Reset para primeira página
      } else {
        params.delete('search');
      }

      router.push(`?${params.toString()}`);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, router, searchParams]);

  return (
    <div className={className}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  );
}
