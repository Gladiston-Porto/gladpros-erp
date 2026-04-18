import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@gladpros/ui/button';
import { Plus, Download, Trash2, Mail, ArrowLeft } from 'lucide-react';

/**
 * # Button Component
 * 
 * O componente Button do GladPros-UI oferece múltiplas variantes e tamanhos
 * para atender diferentes necessidades de interface.
 * 
 * ## Uso
 * ```tsx
 * import { Button } from '@gladpros/ui/button';
 * 
 * <Button variant="secondary">Clique aqui</Button>
 * ```
 * 
 * ## Variantes
 * - **default**: Botão padrão com cor brand
 * - **primary**: Botão primário azul
 * - **outline**: Botão com borda
 * - **ghost**: Botão transparente
 * - **error**: Botão vermelho para ações destrutivas
 * 
 * ## Tamanhos
 * - **sm**: Pequeno (altura 32px)
 * - **md**: Médio (altura 40px) - padrão
 * - **lg**: Grande (altura 48px)
 */
const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Componente de botão versátil com múltiplas variantes e tamanhos.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'outline', 'ghost', 'error'],
      description: 'Estilo visual do botão',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'default' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Tamanho do botão',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'md' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Desabilita o botão',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    children: {
      control: 'text',
      description: 'Conteúdo do botão',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Botão no estilo padrão (default) com cor brand
 */
export const Default: Story = {
  args: {
    children: 'Botão Padrão',
    variant: 'default',
    size: 'default',
  },
};

/**
 * Botão primário em azul, usado para ações principais
 */
export const Primary: Story = {
  args: {
    children: 'Botão Primário',
    variant: 'secondary',
    size: 'default',
  },
};

/**
 * Botão com borda (outline), usado para ações secundárias
 */
export const Outline: Story = {
  args: {
    children: 'Botão Outline',
    variant: 'outline',
    size: 'default',
  },
};

/**
 * Botão transparente (ghost), usado para ações terciárias
 */
export const Ghost: Story = {
  args: {
    children: 'Botão Ghost',
    variant: 'ghost',
    size: 'default',
  },
};

/**
 * Botão vermelho (error), usado para ações destrutivas como excluir
 */
export const Error: Story = {
  args: {
    children: 'Excluir',
    variant: 'destructive',
    size: 'default',
  },
};

/**
 * Botão pequeno (sm), altura 32px
 */
export const Small: Story = {
  args: {
    children: 'Botão Pequeno',
    size: 'sm',
  },
};

/**
 * Botão médio (md), altura 40px - tamanho padrão
 */
export const Medium: Story = {
  args: {
    children: 'Botão Médio',
    size: 'default',
  },
};

/**
 * Botão grande (lg), altura 48px
 */
export const Large: Story = {
  args: {
    children: 'Botão Grande',
    size: 'lg',
  },
};

/**
 * Botão desabilitado
 */
export const Disabled: Story = {
  args: {
    children: 'Botão Desabilitado',
    disabled: true,
  },
};

/**
 * Botão com ícone à esquerda
 */
export const WithIconLeft: Story = {
  args: {
    children: (
      <>
        <Plus className="h-4 w-4" />
        Nova Invoice
      </>
    ),
    variant: 'default',
    size: 'default',
  },
};

/**
 * Botão com ícone à direita
 */
export const WithIconRight: Story = {
  args: {
    children: (
      <>
        Download
        <Download className="h-4 w-4" />
      </>
    ),
    variant: 'outline',
    size: 'default',
  },
};

/**
 * Botão só com ícone
 */
export const IconOnly: Story = {
  args: {
    children: <Trash2 className="h-4 w-4" />,
    variant: 'ghost',
    size: 'sm',
    'aria-label': 'Excluir',
  },
};

/**
 * Exemplo de uso em formulário com múltiplos botões
 */
export const FormActions: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button variant="outline" size="default">
        <ArrowLeft className="h-4 w-4" />
        Cancelar
      </Button>
      <Button variant="default" size="default">
        <Mail className="h-4 w-4" />
        Enviar
      </Button>
    </div>
  ),
};

/**
 * Todas as variantes lado a lado
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <Button variant="default">Default</Button>
        <Button variant="secondary">Primary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Error</Button>
      </div>
      <div className="flex gap-3">
        <Button variant="default" disabled>Default</Button>
        <Button variant="secondary" disabled>Primary</Button>
        <Button variant="outline" disabled>Outline</Button>
        <Button variant="ghost" disabled>Ghost</Button>
        <Button variant="destructive" disabled>Error</Button>
      </div>
    </div>
  ),
};

/**
 * Todos os tamanhos lado a lado
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="default">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
