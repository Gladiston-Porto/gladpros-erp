/**
 * Navegação do Módulo Estoque
 * Tabs de navegação entre as páginas principais
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/utils';
import {
  Package,
  Wrench,
  ArrowRightLeft,
  AlertTriangle,
  ShoppingCart,
  LayoutDashboard,
  FileText,
} from 'lucide-react';

const navItems = [
  {
    href: '/estoque',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/estoque/materiais',
    label: 'Materiais',
    icon: Package,
  },
  {
    href: '/estoque/equipamentos',
    label: 'Equipamentos',
    icon: Wrench,
  },
  {
    href: '/estoque/movimentacoes',
    label: 'Movimentações',
    icon: ArrowRightLeft,
  },
  {
    href: '/estoque/alertas',
    label: 'Alertas',
    icon: AlertTriangle,
  },
  {
    href: '/estoque/compras',
    label: 'Compras',
    icon: ShoppingCart,
  },
  {
    href: '/estoque/relatorios',
    label: 'Relatórios',
    icon: FileText,
  },
];

export function EstoqueNavigation() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/estoque') {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto">
        <div className="flex h-16 items-center px-6">
          <div className="mr-8">
            <h2 className="text-xl font-bold">Estoque</h2>
          </div>

          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
