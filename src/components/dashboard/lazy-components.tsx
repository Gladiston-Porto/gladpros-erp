import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Loading component genérico compatível com Next.js dynamic
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Carregando...</p>
      </div>
    </div>
  );
}

// Code splitting por seções do dashboard
export const DashboardStats = dynamic(
  () => import('./DashboardStats').then(mod => ({ default: mod.DashboardStats })),
  {
    loading: LoadingSpinner,
    ssr: true // Server-side rendering para melhor SEO
  }
);

export const DashboardCharts = dynamic(
  () => import('./DashboardCharts').then(mod => ({ default: mod.DashboardCharts })),
  {
    loading: LoadingSpinner,
    ssr: false // Client-side only para melhor performance
  }
);

export const RecentActivity = dynamic(
  () => import('./RecentActivity').then(mod => ({ default: mod.RecentActivity })),
  {
    loading: LoadingSpinner,
    ssr: true
  }
);

export const QuickActions = dynamic(
  () => import('./QuickActions').then(mod => ({ default: mod.QuickActions })),
  {
    loading: LoadingSpinner,
    ssr: true
  }
);

export const SystemStatus = dynamic(
  () => import('./SystemStatus').then(mod => ({ default: mod.SystemStatus })),
  {
    loading: LoadingSpinner,
    ssr: false // Client-side para dados em tempo real
  }
);

// Lazy loading condicional baseado em permissões
export function createLazyComponent<T extends Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: {
    loading?: () => React.ReactNode;
    ssr?: boolean;
    permissionCheck?: () => boolean;
  } = {}
) {
  return dynamic(importFn, {
    loading: options.loading || LoadingSpinner,
    ssr: options.ssr ?? true,
    // Só carrega se o usuário tiver permissão
    ...(options.permissionCheck && {
      loader: async () => {
        if (options.permissionCheck!()) {
          return importFn();
        }
        // Retorna componente vazio se não tiver permissão
        return { default: () => null };
      }
    })
  });
}

// Hook para lazy loading sob demanda
export function useLazyComponent<T extends Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<T> }>
) {
  return dynamic(importFn, {
    loading: LoadingSpinner,
    ssr: false
  });
}

// Componentes pesados carregados apenas quando necessário
export const AdvancedCharts = dynamic(
  () => import('./DashboardCharts').then(mod => ({ default: mod.DashboardCharts })),
  {
    loading: LoadingSpinner,
    ssr: false
  }
);

export const ReportsGenerator = dynamic(
  () => import('./ReportBuilder').then(mod => ({ default: mod.ReportBuilder })),
  {
    loading: LoadingSpinner,
    ssr: false
  }
);
