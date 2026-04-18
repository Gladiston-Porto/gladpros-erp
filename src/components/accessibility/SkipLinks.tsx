'use client';

import { useAccessibility } from '@/hooks/useAccessibility';
import { Button } from "@gladpros/ui/button";

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SkipLink({ href, children, className }: SkipLinkProps) {
  const { skipToContent } = useAccessibility();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const targetId = href.replace('#', '');
    skipToContent(targetId);
  };

  return (
    <Button
      variant="ghost"
      className={`sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-primary-foreground ${className}`}
      onClick={handleClick}
    >
      {children}
    </Button>
  );
}

export function SkipLinks() {
  return (
    <nav aria-label="Links de navegação rápida" className="sr-only focus-within:not-sr-only">
      <div className="absolute top-0 left-0 z-50 p-4 space-y-2">
        <SkipLink href="#main-content">Ir para conteúdo principal</SkipLink>
        <SkipLink href="#navigation">Ir para navegação</SkipLink>
        <SkipLink href="#search">Ir para busca</SkipLink>
      </div>
    </nav>
  );
}
