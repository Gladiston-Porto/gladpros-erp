import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@gladpros/ui/card';
import { Plus, TrendingUp, Users, DollarSign, FileText } from 'lucide-react';

/**
 * # Card Components
 * 
 * Sistema de componentes Card para criar containers de conteúdo estruturado.
 * Ideal para dashboards, formulários, listas e qualquer conteúdo agrupado.
 * 
 * ## Componentes
 * - **Card**: Container principal
 * - **CardHeader**: Cabeçalho do card (opcional)
 * - **CardTitle**: Título do card
 * - **CardDescription**: Descrição/subtítulo do card
 * - **CardContent**: Conteúdo principal do card
 * 
 * ## Uso
 * ```tsx
 * import { Card, CardHeader, CardTitle, CardContent } from '@gladpros/ui/card';
 * 
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Título</CardTitle>
 *   </CardHeader>
 *   <CardContent>
 *     Conteúdo aqui
 *   </CardContent>
 * </Card>
 * ```
 * 
 * ## Uso comum
 * - Containers de conteúdo em dashboards
 * - Formulários estruturados
 * - Listas de itens
 * - Painéis de estatísticas
 */
const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Sistema de componentes para criar containers de conteúdo estruturado.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Card básico apenas com conteúdo
 */
export const Basic: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardContent className="pt-6">
        <p className="text-sm text-gray-600">
          Este é um card básico com apenas conteúdo. Ideal para containers simples.
        </p>
      </CardContent>
    </Card>
  ),
};

/**
 * Card com título
 */
export const WithTitle: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Título do Card</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">
          Card com título no cabeçalho. Use CardTitle para destacar o título principal.
        </p>
      </CardContent>
    </Card>
  ),
};

/**
 * Card com título e descrição
 */
export const WithDescription: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Título do Card</CardTitle>
        <CardDescription>
          Uma breve descrição ou subtítulo para fornecer contexto adicional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">
          Conteúdo principal do card vai aqui. A descrição ajuda a dar contexto.
        </p>
      </CardContent>
    </Card>
  ),
};

/**
 * Card com ações no header
 */
export const WithActions: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>Gerencie seus clientes</CardDescription>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">
          Lista de clientes apareceria aqui...
        </p>
      </CardContent>
    </Card>
  ),
};

/**
 * Card de estatística/métrica
 */
export const StatCard: Story = {
  render: () => (
    <Card className="w-[280px]">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Receita Total</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">R$ 45.231</p>
            <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +20.1% em relação ao mês passado
            </p>
          </div>
          <div className="rounded-full bg-green-100 p-3">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

/**
 * Grid de cards de estatísticas
 */
export const StatsGrid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Clientes</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">1,234</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Propostas Ativas</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">56</p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Receita Mensal</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">R$ 45k</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  ),
};

/**
 * Card com lista
 */
export const WithList: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Atividades Recentes</CardTitle>
        <CardDescription>Últimas ações no sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Nova proposta criada</p>
              <p className="text-xs text-gray-500">Cliente: João Silva</p>
            </div>
            <Badge variant="default">Nova</Badge>
          </div>
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Invoice paga</p>
              <p className="text-xs text-gray-500">Valor: R$ 5.000,00</p>
            </div>
            <Badge variant="secondary">Paga</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Cliente atualizado</p>
              <p className="text-xs text-gray-500">Maria Santos</p>
            </div>
            <Badge variant="default">Atualizado</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

/**
 * Card de formulário
 */
export const FormCard: Story = {
  render: () => (
    <Card className="w-[450px]">
      <CardHeader>
        <CardTitle>Novo Cliente</CardTitle>
        <CardDescription>Preencha as informações do cliente</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Digite o nome"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Digite o email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" aria-label="Tipo de cliente">
              <option>Pessoa Física</option>
              <option>Pessoa Jurídica</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline">Cancelar</Button>
            <Button variant="default">Salvar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  ),
};

/**
 * Card vazio (empty state)
 */
export const EmptyState: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardContent className="pt-10 pb-10 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-gray-100 p-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Nenhuma proposta encontrada</p>
            <p className="mt-1 text-sm text-gray-500">
              Comece criando sua primeira proposta
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4" />
            Nova Proposta
          </Button>
        </div>
      </CardContent>
    </Card>
  ),
};

/**
 * Cards aninhados
 */
export const Nested: Story = {
  render: () => (
    <Card className="w-[500px]">
      <CardHeader>
        <CardTitle>Projeto Alpha</CardTitle>
        <CardDescription>Detalhes do projeto</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-gray-900 mb-2">Informações Gerais</p>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Cliente: João Silva</p>
              <p>Status: Em andamento</p>
              <p>Prazo: 30 dias</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-gray-900 mb-2">Financeiro</p>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Valor: R$ 15.000,00</p>
              <p>Pago: R$ 5.000,00</p>
              <p>Pendente: R$ 10.000,00</p>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  ),
};
