'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { useAccessibility } from '@/shared/hooks/useAccessibility';

interface BreadcrumbItem {
  label: string;
  href: string;
  current?: boolean;
}

interface BreadcrumbsProps {
  customItems?: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ customItems, className = '' }: BreadcrumbsProps) {
  const pathname = usePathname();
  const { } = useAccessibility();

  // Generate breadcrumbs from pathname if no custom items provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (customItems) return customItems;

    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Início', href: '/' }
    ];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;

      // Convert segment to readable label
      const label = segment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      breadcrumbs.push({
        label,
        href: currentPath,
        current: isLast,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Navegação estrutural"
      className={`flex items-center space-x-2 text-sm text-muted-foreground ${className}`}
    >
      <ol className="flex items-center space-x-2">
        {breadcrumbs.map((item, index) => (
          <li key={item.href} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground/50" />
            )}

            {index === 0 ? (
              <Link
                href={item.href}
                className="flex items-center hover:text-foreground transition-colors"
                aria-label={`Ir para ${item.label}`}
              >
                <Home className="h-4 w-4" />
                <span className="sr-only">{item.label}</span>
              </Link>
            ) : item.current ? (
              <span
                className="font-medium text-foreground"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
                aria-label={`Ir para ${item.label}`}
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Hook for managing breadcrumb state
export function useBreadcrumbs() {
  const pathname = usePathname();

  const setCustomBreadcrumbs = (items: BreadcrumbItem[]) => {
    // This would typically update a global state or context
    // For now, we'll just return the items
    return items;
  };

  const getCurrentPageTitle = () => {
    if (!pathname) return 'Página';

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'Início';

    const lastSegment = segments[segments.length - 1];
    return lastSegment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return {
    setCustomBreadcrumbs,
    getCurrentPageTitle,
    currentPath: pathname,
  };
}
