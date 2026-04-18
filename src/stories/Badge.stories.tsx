import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '@gladpros/ui/badge';
import { CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react';

/**
 * # Badge Component
 * 
 * O componente Badge é usado para exibir status, categorias ou metadados.
 * Ideal para indicadores visuais rápidos em tabelas, cards e listas.
 * 
 * ## Uso
 * ```tsx
 * import { Badge } from '@gladpros/ui/badge';
 * 
 * <Badge variant="default">Ativo</Badge>
 * ```
 * 
 * ## Variantes
 * - **default**: Badge cinza padrão
 * - **primary**: Badge azul para itens principais
 * - **success**: Badge verde para status positivo
 * - **warning**: Badge amarelo para avisos
 * - **error**: Badge vermelho para erros ou status crítico
 * 
 * ## Uso comum
 * - Status de documentos (RASCUNHO, ENVIADO, APROVADO)
 * - Status de clientes (ATIVO, INATIVO)
 * - Tipo de pessoa (PF, PJ)
 * - Status de pagamento (PAGO, PENDENTE, ATRASADO)
 */
const meta = {
  title: 'Components/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Componente de badge para exibir status e categorias.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'success', 'warning', 'error'],
      description: 'Estilo visual do badge',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'default' },
      },
    },
    children: {
      control: 'text',
      description: 'Conteúdo do badge',
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Badge padrão (default) em cinza
 */
export const Default: Story = {
  args: {
    children: 'Padrão',
    variant: 'default',
  },
};

/**
 * Badge primário em azul
 */
export const Primary: Story = {
  args: {
    children: 'Primário',
    variant: 'secondary',
  },
};

/**
 * Badge de sucesso em verde
 */
export const Success: Story = {
  args: {
    children: 'Sucesso',
    variant: 'default',
  },
};

/**
 * Badge de aviso em amarelo
 */
export const Warning: Story = {
  args: {
    children: 'Aviso',
    variant: 'outline',
  },
};

/**
 * Badge de erro em vermelho
 */
export const Error: Story = {
  args: {
    children: 'Erro',
    variant: 'destructive',
  },
};

/**
 * Badge com ícone
 */
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <CheckCircle className="h-3 w-3" />
        Ativo
      </>
    ),
    variant: 'default',
  },
};

/**
 * Badges de status de proposta
 */
export const PropostaStatus: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="default">RASCUNHO</Badge>
      <Badge variant="secondary">ENVIADA</Badge>
      <Badge variant="outline">ASSINADA</Badge>
      <Badge variant="default">APROVADA</Badge>
      <Badge variant="destructive">CANCELADA</Badge>
    </div>
  ),
};

/**
 * Badges de status de invoice
 */
export const InvoiceStatus: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="default">
        <Clock className="h-3 w-3" />
        RASCUNHO
      </Badge>
      <Badge variant="secondary">
        <CheckCircle className="h-3 w-3" />
        ENVIADA
      </Badge>
      <Badge variant="default">
        <CheckCircle className="h-3 w-3" />
        PAGA
      </Badge>
      <Badge variant="outline">
        <AlertCircle className="h-3 w-3" />
        ATRASADA
      </Badge>
      <Badge variant="destructive">
        <XCircle className="h-3 w-3" />
        CANCELADA
      </Badge>
    </div>
  ),
};

/**
 * Badges de tipo de cliente
 */
export const ClienteTipo: Story = {
  render: () => (
    <div className="flex gap-3">
      <Badge variant="secondary">PF</Badge>
      <Badge variant="default">PJ</Badge>
    </div>
  ),
};

/**
 * Badges de status de cliente
 */
export const ClienteStatus: Story = {
  render: () => (
    <div className="flex gap-3">
      <Badge variant="default">
        <CheckCircle className="h-3 w-3" />
        Ativo
      </Badge>
      <Badge variant="destructive">
        <XCircle className="h-3 w-3" />
        Inativo
      </Badge>
    </div>
  ),
};

/**
 * Todas as variantes lado a lado
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="outline">Ghost</Badge>
    </div>
  ),
};

/**
 * Exemplo de uso em tabela
 */
export const InTable: Story = {
  render: () => (
    <div className="w-full max-w-2xl">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="p-3 text-left text-sm font-medium text-gray-700">Nome</th>
            <th className="p-3 text-left text-sm font-medium text-gray-700">Tipo</th>
            <th className="p-3 text-left text-sm font-medium text-gray-700">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100">
            <td className="p-3 text-sm">João Silva</td>
            <td className="p-3">
              <Badge variant="secondary">PF</Badge>
            </td>
            <td className="p-3">
              <Badge variant="default">Ativo</Badge>
            </td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="p-3 text-sm">Empresa XYZ Ltda</td>
            <td className="p-3">
              <Badge variant="default">PJ</Badge>
            </td>
            <td className="p-3">
              <Badge variant="default">Ativo</Badge>
            </td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="p-3 text-sm">Maria Santos</td>
            <td className="p-3">
              <Badge variant="secondary">PF</Badge>
            </td>
            <td className="p-3">
              <Badge variant="destructive">Inativo</Badge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  ),
};

/**
 * Exemplo de uso em card
 */
export const InCard: Story = {
  render: () => (
    <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Proposta #1234</h3>
        <Badge variant="default">APROVADA</Badge>
      </div>
      <div className="space-y-2 text-sm text-gray-600">
        <p>Cliente: João Silva</p>
        <p>Valor: R$ 15.000,00</p>
        <p>Validade: 30 dias</p>
      </div>
    </div>
  ),
};
