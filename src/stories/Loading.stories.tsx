import type { Meta, StoryObj } from '@storybook/react';
import { Loading } from '@gladpros/ui/loading';

/**
 * # Loading Component
 * 
 * O componente Loading fornece feedback visual durante operações assíncronas.
 * Usa um spinner animado com tamanhos e variantes configuráveis.
 * 
 * ## Uso
 * ```tsx
 * import { Loading } from '@gladpros/ui/loading';
 * 
 * <Loading size="md" />
 * <Loading size="lg" text="Carregando..." />
 * ```
 * 
 * ## Props
 * - **size**: Tamanho do spinner (sm, md, lg)
 * - **text**: Texto descritivo opcional abaixo do spinner
 * - **className**: Classes CSS adicionais
 * 
 * ## Uso comum
 * - Estados de carregamento de páginas
 * - Carregamento de dados em tabelas
 * - Submissão de formulários
 * - Carregamento de modais
 */
const meta = {
  title: 'Components/Loading',
  component: Loading,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Componente de loading com spinner animado para feedback visual.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Tamanho do spinner',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'md' },
      },
    },
    text: {
      control: 'text',
      description: 'Texto descritivo opcional',
      table: {
        type: { summary: 'string' },
      },
    },
  },
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Loading pequeno (sm) - 16px
 */
export const Small: Story = {
  args: {
    size: 'sm',
  },
};

/**
 * Loading médio (md) - 24px - tamanho padrão
 */
export const Medium: Story = {
  args: {
    size: 'md',
  },
};

/**
 * Loading grande (lg) - 32px
 */
export const Large: Story = {
  args: {
    size: 'lg',
  },
};

/**
 * Loading com texto descritivo
 */
export const WithText: Story = {
  args: {
    size: 'md',
    text: 'Carregando...',
  },
};

/**
 * Loading com texto personalizado
 */
export const WithCustomText: Story = {
  args: {
    size: 'lg',
    text: 'Processando sua solicitação...',
  },
};

/**
 * Todos os tamanhos lado a lado
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <Loading size="sm" />
        <p className="text-xs text-gray-600">Small (16px)</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Loading size="md" />
        <p className="text-xs text-gray-600">Medium (24px)</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Loading size="lg" />
        <p className="text-xs text-gray-600">Large (32px)</p>
      </div>
    </div>
  ),
};

/**
 * Loading em card centralizado
 */
export const InCard: Story = {
  render: () => (
    <div className="w-[400px] rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col items-center justify-center">
        <Loading size="lg" text="Carregando dados..." />
      </div>
    </div>
  ),
};

/**
 * Loading em página (full screen)
 */
export const FullScreen: Story = {
  render: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loading size="lg" text="Carregando página..." />
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Loading em tabela (skeleton)
 */
export const InTable: Story = {
  render: () => (
    <div className="w-[600px] rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900">Clientes</h3>
      </div>
      <div className="p-12 flex items-center justify-center">
        <Loading size="md" text="Carregando clientes..." />
      </div>
    </div>
  ),
};

/**
 * Loading em modal
 */
export const InModal: Story = {
  render: () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="w-[400px] rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Processando
        </h3>
        <div className="flex flex-col items-center justify-center py-8">
          <Loading size="lg" text="Salvando alterações..." />
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Loading inline com texto
 */
export const Inline: Story = {
  render: () => (
    <div className="w-[400px] rounded-lg border border-gray-200 bg-white p-6">
      <p className="text-sm text-gray-600 mb-4">
        Suas alterações estão sendo salvas...
      </p>
      <div className="flex items-center gap-3">
        <Loading size="sm" />
        <span className="text-sm text-gray-600">Sincronizando com o servidor</span>
      </div>
    </div>
  ),
};

/**
 * Loading em botão (button loading state)
 */
export const InButton: Story = {
  render: () => (
    <div className="flex gap-3">
      <button 
        disabled
        className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white opacity-70 cursor-not-allowed"
      >
        <Loading size="sm" />
        Salvando...
      </button>
      <button 
        disabled
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 opacity-70 cursor-not-allowed"
      >
        <Loading size="sm" />
        Processando...
      </button>
    </div>
  ),
};

/**
 * Estados de loading em lista
 */
export const InList: Story = {
  render: () => (
    <div className="w-[500px] space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Enviando email...</p>
            <p className="text-sm text-gray-600">para joao@example.com</p>
          </div>
          <Loading size="sm" />
        </div>
      </div>
      
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Gerando relatório...</p>
            <p className="text-sm text-gray-600">Relatório mensal de vendas</p>
          </div>
          <Loading size="sm" />
        </div>
      </div>
      
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Sincronizando dados...</p>
            <p className="text-sm text-gray-600">Últimas atualizações</p>
          </div>
          <Loading size="sm" />
        </div>
      </div>
    </div>
  ),
};

/**
 * Loading com overlay (bloqueio de tela)
 */
export const WithOverlay: Story = {
  render: () => (
    <div className="relative w-[600px] h-[400px]">
      {/* Conteúdo de fundo */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 h-full">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Conteúdo da Página</h2>
        <p className="text-gray-600 mb-4">
          Este conteúdo fica atrás do overlay de loading...
        </p>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-4/5"></div>
          <div className="h-4 bg-gray-200 rounded w-3/5"></div>
        </div>
      </div>
      
      {/* Overlay de loading */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
        <Loading size="lg" text="Carregando dados..." />
      </div>
    </div>
  ),
};
