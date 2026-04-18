import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@gladpros/ui/button'
import { PageHeader } from '@gladpros/ui/page-header';
import { Plus, Download, Filter, ArrowLeft, Settings, Bell } from 'lucide-react';

/**
 * # PageHeader Component
 * 
 * O componente PageHeader fornece um cabeçalho consistente para páginas,
 * incluindo título, descrição opcional e ações.
 * 
 * ## Uso
 * ```tsx
 * import { Button } from '@gladpros/ui/button'
import { PageHeader } from '@gladpros/ui/page-header';
 * 
 * <PageHeader
 *   title="Clientes"
 *   description="Gerencie seus clientes"
 *   action={
 *     <Button>
 *       <Plus /> Novo Cliente
 *     </Button>
 *   }
 * />
 * ```
 * 
 * ## Props
 * - **title**: Título da página (obrigatório)
 * - **description**: Descrição/subtítulo da página (opcional)
 * - **actions**: Botões de ação (opcional)
 * - **breadcrumbs**: Breadcrumbs de navegação (opcional)
 * 
 * ## Uso comum
 * - Páginas de listagem (Clientes, Propostas, Invoices)
 * - Páginas de formulário (Novo Cliente, Editar Proposta)
 * - Páginas de detalhes (Detalhes da Invoice)
 * - Dashboards
 */
const meta = {
  title: 'Components/PageHeader',
  component: PageHeader,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Componente de cabeçalho de página com título, descrição e ações.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Título da página',
      table: {
        type: { summary: 'string' },
      },
    },
    description: {
      control: 'text',
      description: 'Descrição da página',
      table: {
        type: { summary: 'string' },
      },
    },
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * PageHeader básico apenas com título
 */
export const Basic: Story = {
  args: {
    title: 'Título da Página',
  },
};

/**
 * PageHeader com título e descrição
 */
export const WithDescription: Story = {
  args: {
    title: 'Clientes',
    description: 'Gerencie seus clientes e informações de contato',
  },
};

/**
 * PageHeader com botão de ação
 */
export const WithAction: Story = {
  args: {
    title: 'Clientes',
    description: 'Gerencie seus clientes e informações de contato',
    action: (
      <Button>
        <Plus className="h-4 w-4" />
        Novo Cliente
      </Button>
    ),
  },
};

/**
 * PageHeader com múltiplas ações
 */
export const WithMultipleActions: Story = {
  args: {
    title: 'Propostas',
    description: 'Visualize e gerencie todas as suas propostas',
    action: (
      <div className="flex gap-2">
        <Button variant="outline">
          <Filter className="h-4 w-4" />
          Filtrar
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
        <Button variant="default">
          <Plus className="h-4 w-4" />
          Nova Proposta
        </Button>
      </div>
    ),
  },
};

/**
 * PageHeader de listagem de clientes
 */
export const ClientesPage: Story = {
  args: {
    title: "Clientes",
  },
  render: () => (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Clientes"
        description="Gerencie seus clientes e informações de contato"
        action={
          <Button variant="default">
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        }
      />
      <div className="p-6">
        <p className="text-sm text-gray-600">Conteúdo da página aqui...</p>
      </div>
    </div>
  ),
};

/**
 * PageHeader de listagem de propostas
 */
export const PropostasPage: Story = {
  args: {
    title: "Propostas",
  },
  render: () => (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Propostas"
        description="Visualize e gerencie todas as suas propostas"
        action={
          <Button variant="default">
            <Plus className="h-4 w-4" />
            Nova Proposta
          </Button>
        }
      />
      <div className="p-6">
        <p className="text-sm text-gray-600">Conteúdo da página aqui...</p>
      </div>
    </div>
  ),
};

/**
 * PageHeader de listagem de invoices
 */
export const InvoicesPage: Story = {
  args: {
    title: "Invoices",
  },
  render: () => (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Invoices"
        description="Gerencie suas faturas e pagamentos"
        action={
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button variant="default">
              <Plus className="h-4 w-4" />
              Nova Invoice
            </Button>
          </div>
        }
      />
      <div className="p-6">
        <p className="text-sm text-gray-600">Conteúdo da página aqui...</p>
      </div>
    </div>
  ),
};

/**
 * PageHeader de formulário de criação
 */
export const FormPage: Story = {
  args: {
    title: "Novo Cliente",
  },
  render: () => (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Novo Cliente"
        description="Preencha as informações do cliente"
        action={
          <div className="flex gap-2">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button variant="default">Salvar</Button>
          </div>
        }
      />
      <div className="p-6">
        <p className="text-sm text-gray-600">Formulário aqui...</p>
      </div>
    </div>
  ),
};

/**
 * PageHeader de página de detalhes
 */
export const DetailsPage: Story = {
  args: {
    title: "Invoice #INV-2024-001",
  },
  render: () => (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Invoice #INV-2024-001"
        description="Cliente: João Silva • Status: Paga"
        action={
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="ghost">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        }
      />
      <div className="p-6">
        <p className="text-sm text-gray-600">Detalhes da invoice aqui...</p>
      </div>
    </div>
  ),
};

/**
 * PageHeader de dashboard
 */
export const DashboardPage: Story = {
  args: {
    title: "Dashboard",
  },
  render: () => (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Dashboard"
        description="Visão geral do seu negócio"
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Exportar Relatório
            </Button>
          </div>
        }
      />
      <div className="p-6">
        <p className="text-sm text-gray-600">Widgets do dashboard aqui...</p>
      </div>
    </div>
  ),
};

/**
 * PageHeader com navegação de volta
 */
export const WithBackNavigation: Story = {
  args: {
    title: "Editar Cliente",
  },
  render: () => (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Editar Cliente"
        description="João Silva - Pessoa Física"
        action={
          <div className="flex gap-2">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Cancelar
            </Button>
            <Button variant="default">Salvar Alterações</Button>
          </div>
        }
      />
      <div className="p-6">
        <p className="text-sm text-gray-600">Formulário de edição aqui...</p>
      </div>
    </div>
  ),
};

/**
 * PageHeader de página de projeto
 */
export const ProjectPage: Story = {
  args: {
    title: "Projetos",
  },
  render: () => (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Projeto Alpha"
        description="Cliente: João Silva • Status: Em Andamento • Prazo: 15 dias"
        action={
          <div className="flex gap-2">
            <Button variant="outline">
              <Settings className="h-4 w-4" />
              Configurações
            </Button>
            <Button variant="default">
              <Plus className="h-4 w-4" />
              Nova Tarefa
            </Button>
          </div>
        }
      />
      <div className="p-6">
        <p className="text-sm text-gray-600">Conteúdo do projeto aqui...</p>
      </div>
    </div>
  ),
};

/**
 * Exemplo completo com contexto de aplicação
 */
export const CompleteExample: Story = {
  args: {
    title: "Propostas",
  },
  render: () => (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Propostas"
        description="Visualize e gerencie todas as suas propostas comerciais"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="default">
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
            <Button variant="default" size="default">
              <Plus className="h-4 w-4" />
              Nova Proposta
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">Total de Propostas</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">124</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">Aprovadas</p>
            <p className="mt-2 text-2xl font-bold text-green-600">89</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">Pendentes</p>
            <p className="mt-2 text-2xl font-bold text-yellow-600">28</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">Canceladas</p>
            <p className="mt-2 text-2xl font-bold text-red-600">7</p>
          </div>
        </div>
      </div>
    </div>
  ),
};
