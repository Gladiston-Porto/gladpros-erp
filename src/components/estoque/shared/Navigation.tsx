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
  ClipboardList,
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
    href: '/estoque/solicitacoes-compra',
    label: 'Sol. Compra',
    icon: ClipboardList,
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
    <nav className="border-b border-gray-200 bg-white/50 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50 rounded-2xl">
      <div className="px-4">
        <div className="flex h-14 items-center justify-between overflow-x-auto scrollbar-hide">
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                    active
                      ? 'bg-[#0098DA]/10 text-[#0098DA]'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
