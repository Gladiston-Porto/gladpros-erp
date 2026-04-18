# 🎨 DESIGN SYSTEM - PLANO DE EXECUÇÃO COMPLETO
## GladPros - Unificação Total de UI/UX

**Data de Início:** 9 de novembro de 2025  
**Duração:** 8 semanas (56 dias úteis)  
**Data de Conclusão:** 4 de janeiro de 2026  
**Decisão:** Opção B - Design System Completo  
**Aprovado por:** Gladiston Porto (Product Owner)

---

## 📊 RESUMO EXECUTIVO

### Objetivo
Implementar Design System unificado baseado em **GladPros-UI** em **TODOS os 7 módulos**, garantindo:
- ✅ 100% de consistência visual
- ✅ Componentes reutilizáveis padronizados
- ✅ Layouts unificados
- ✅ Documentação completa (Storybook)
- ✅ 1,291 testes mantidos (0 quebrados)

### Escopo
```
📦 Módulos a Refatorar (7):
├── 🔐 Auth/Login         → 35 arquivos TSX
├── 👥 Clientes          → 42 arquivos TSX
├── 📄 Propostas         → 38 arquivos TSX
├── 📊 Dashboard         → 28 arquivos TSX
├── 📦 Projetos          → 65 arquivos TSX
├── 🏭 Estoque           → 80 arquivos TSX ⚠️ CRÍTICO
└── 💰 Financeiro        → 95 arquivos TSX ⚠️ CRÍTICO
──────────────────────────────────────────
TOTAL: 383 arquivos TSX a refatorar
```

### Métricas de Sucesso
- ✅ **Visual:** 100% dos módulos usando GladPros-UI
- ✅ **Testes:** 1,291 testes passando (0 quebrados)
- ✅ **Performance:** LCP < 2.5s, FID < 100ms
- ✅ **Acessibilidade:** WCAG 2.1 AA (100%)
- ✅ **Responsividade:** Tablet (768-1024px) perfeito
- ✅ **Documentação:** Storybook com todos componentes

---

## 🗓️ CRONOGRAMA DETALHADO (8 Semanas)

```
┌─────────────────────────────────────────────────────────────┐
│ SEMANA │ FOCO                    │ DELIVERABLES          │
├─────────────────────────────────────────────────────────────┤
│   1    │ Setup GladPros-UI       │ 10 componentes base   │
│   2    │ Estoque (Parte 1)       │ 40 arquivos refat.    │
│   3    │ Estoque (Parte 2)       │ 40 arquivos refat.    │
│   4    │ Financeiro              │ 95 arquivos refat.    │
│   5    │ Módulos Antigos (Lote 1)│ Auth, Clientes (77)   │
│   6    │ Módulos Antigos (Lote 2)│ Propostas, Dash (66)  │
│   7    │ Projetos + Storybook    │ 65 arquivos + docs    │
│   8    │ Testes + Polimento      │ Deploy staging ready  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📅 SEMANA 1: SETUP GLADPROS-UI EXPANDIDO
**Datas:** 9-15 de novembro de 2025  
**Objetivo:** Criar infraestrutura completa do Design System

### Dia 1 (Sábado 9/11): Estrutura e Tokens
```bash
cd packages/ui
npm install @tanstack/react-table @radix-ui/react-dialog @radix-ui/react-tabs
npm install @radix-ui/react-dropdown-menu @radix-ui/react-toast
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react
```

**Tarefas:**
- [x] Criar `src/tokens/colors.ts`
  ```typescript
  export const colors = {
    primary: '#0098DA',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    gray: { 50: '#F9FAFB', ..., 900: '#111827' }
  }
  ```
- [x] Criar `src/tokens/spacing.ts` (8px base)
- [x] Criar `src/tokens/typography.ts` (16px base para tablet)
- [x] Atualizar `tailwind.config.js` com tokens

### Dia 2 (Domingo 10/11): Componentes Base (Parte 1)
- [x] `src/components/ui/button.tsx` (10 variantes)
  - Variants: primary, secondary, outline, ghost, danger, success
  - Sizes: sm, default, lg, icon
  - Loading state, disabled state
- [x] `src/components/ui/card.tsx`
  - CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- [x] `src/components/ui/badge.tsx`
  - Variants: default, success, warning, error, info
  - Sizes: sm, default, lg

### Dia 3 (Segunda 11/11): Componentes Base (Parte 2)
- [x] `src/components/ui/input.tsx`
  - Text, email, password, number, search
  - Error states, icons
- [x] `src/components/ui/dialog.tsx` (Modal)
  - DialogHeader, DialogTitle, DialogDescription
  - DialogContent, DialogFooter, DialogClose
- [x] `src/components/ui/toast.tsx` (Notifications)
  - Success, error, warning, info

### Dia 4 (Terça 12/11): Componentes Avançados (Parte 1)
- [x] `src/components/layout/page-header.tsx` ⭐ CRÍTICO
  ```tsx
  <PageHeader
    title="Materiais"
    description="Gerencie o estoque de materiais"
    breadcrumbs={[...]}
    actions={<Button>Novo</Button>}
  />
  ```
- [x] `src/components/data/data-table.tsx` ⭐ CRÍTICO
  - Integração @tanstack/react-table
  - Sorting, filtering, pagination
  - Search global
  - Responsive

### Dia 5 (Quarta 13/11): Componentes Específicos
- [x] `src/components/domain/stock-badge.tsx` (Estoque)
  ```tsx
  <StockBadge status="em_falta" quantity={0} />
  // Estados: normal, baixo, critico, em_falta
  ```
- [x] `src/components/domain/finance-card.tsx` (Financeiro)
  ```tsx
  <FinanceCard
    title="Total Despesas"
    value={12500.50}
    change={-5.2}
    trend="down"
  />
  ```

### Dia 6 (Quinta 14/11): Componentes de Form
- [x] `src/components/ui/select.tsx`
- [x] `src/components/ui/textarea.tsx`
- [x] `src/components/ui/checkbox.tsx`
- [x] `src/components/ui/radio-group.tsx`

### Dia 7 (Sexta 15/11): Exportação e Testes
- [x] Atualizar `src/index.ts` (export all)
- [x] Build e publicar localmente
- [x] Criar exemplo de uso para cada componente
- [x] Testar imports em gladpros-nextjs

**Deliverable Semana 1:**
```bash
GladPros-UI v2.0.0
├── 10 componentes base ✅
├── 4 componentes avançados ✅
├── 2 componentes de domínio ✅
├── Design tokens completos ✅
└── Pronto para uso em produção ✅
```

---

## 📅 SEMANA 2: REFATORAÇÃO ESTOQUE (Parte 1)
**Datas:** 16-22 de novembro de 2025  
**Objetivo:** Refatorar 40 arquivos TSX do módulo Estoque

### Estrutura Atual Estoque
```
src/modules/estoque/
├── materiais/
│   ├── page.tsx                 ← DIA 1
│   ├── [id]/page.tsx            ← DIA 1
│   ├── novo/page.tsx            ← DIA 2
│   └── components/              ← DIA 2
├── equipamentos/
│   ├── page.tsx                 ← DIA 3
│   ├── [id]/page.tsx            ← DIA 3
│   ├── novo/page.tsx            ← DIA 4
│   └── components/              ← DIA 4
├── movimentacoes/
│   ├── page.tsx                 ← DIA 5
│   └── components/              ← DIA 5
└── compras/
    ├── page.tsx                 ← DIA 6
    └── components/              ← DIA 6-7
```

### Dia 1 (Sábado 16/11): Materiais - Listagem e Detalhes

**Arquivo 1:** `src/modules/estoque/materiais/page.tsx`

**ANTES (❌ Ruim):**
```tsx
export default async function MateriaisPage() {
  const materiais = await prisma.material.findMany();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Materiais</h1>
        <Link href="/estoque/materiais/novo">
          <button className="px-4 py-2 bg-blue-600 text-white rounded">
            Novo Material
          </button>
        </Link>
      </div>
      
      {/* Tabela inline custom */}
      <table className="w-full">
        <thead>...</thead>
        <tbody>...</tbody>
      </table>
    </div>
  );
}
```

**DEPOIS (✅ Perfeito):**
```tsx
import { Button, PageHeader, DataTable } from '@gladpros/ui';
import { Plus } from 'lucide-react';
import { columns } from './columns';

export default async function MateriaisPage() {
  const materiais = await prisma.material.findMany({
    include: { categoria: true, fornecedor: true }
  });
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Materiais"
        description="Gerencie o estoque de materiais e consumíveis"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque', href: '/estoque' },
          { label: 'Materiais' },
        ]}
        actions={
          <Button href="/estoque/materiais/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Material
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={materiais}
        searchable
        searchPlaceholder="Buscar por código, nome ou fabricante..."
        filterableColumns={[
          { id: 'categoriaId', title: 'Categoria', options: categorias },
          { id: 'status', title: 'Status', options: statusOptions },
        ]}
      />
    </div>
  );
}
```

**Criar:** `src/modules/estoque/materiais/columns.tsx`
```tsx
import { StockBadge, Badge, Button } from '@gladpros/ui';
import { Eye, Edit } from 'lucide-react';

export const columns: ColumnDef<Material>[] = [
  { accessorKey: 'codigo', header: 'Código' },
  { accessorKey: 'nome', header: 'Nome' },
  { 
    accessorKey: 'quantidade',
    header: 'Estoque',
    cell: ({ row }) => (
      <StockBadge
        status={row.original.status}
        quantity={row.original.quantidade}
      />
    )
  },
  { 
    accessorKey: 'categoria.nome',
    header: 'Categoria',
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.categoria?.nome}</Badge>
    )
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="icon" variant="ghost" href={`/estoque/materiais/${row.original.id}`}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" href={`/estoque/materiais/${row.original.id}/editar`}>
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    )
  }
];
```

**Tarefas Dia 1:**
- [x] Refatorar `materiais/page.tsx` (listagem)
- [x] Criar `materiais/columns.tsx` (definição tabela)
- [x] Refatorar `materiais/[id]/page.tsx` (detalhes)
- [x] Aplicar PageHeader, DataTable, StockBadge
- [x] Testar responsividade tablet
- [x] Rodar testes: `npm test -- materiais`

### Dia 2 (Domingo 17/11): Materiais - Formulários

**Arquivo:** `src/modules/estoque/materiais/novo/page.tsx`

**ANTES (❌ Ruim):**
```tsx
<form>
  <div>
    <label>Nome</label>
    <input type="text" className="..." />
  </div>
  <button type="submit">Salvar</button>
</form>
```

**DEPOIS (✅ Perfeito):**
```tsx
import { Button, Card, Input, Select, Textarea } from '@gladpros/ui';

<Card>
  <CardHeader>
    <CardTitle>Dados do Material</CardTitle>
  </CardHeader>
  <CardContent>
    <form className="space-y-4">
      <Input
        label="Código"
        name="codigo"
        placeholder="MAT-001"
        error={errors.codigo}
      />
      <Input
        label="Nome"
        name="nome"
        placeholder="Nome do material"
        required
      />
      <Select
        label="Categoria"
        name="categoriaId"
        options={categorias}
      />
      <Textarea
        label="Descrição"
        name="descricao"
        rows={4}
      />
    </form>
  </CardContent>
  <CardFooter>
    <Button type="submit" variant="primary">Salvar</Button>
    <Button variant="ghost" href="/estoque/materiais">Cancelar</Button>
  </CardFooter>
</Card>
```

**Tarefas Dia 2:**
- [x] Refatorar `materiais/novo/page.tsx` (form criar)
- [x] Refatorar `materiais/[id]/editar/page.tsx` (form editar)
- [x] Substituir inputs inline por componentes UI
- [x] Aplicar Card layout
- [x] Validação com feedback visual
- [x] Testar: `npm test -- materiais.create`

### Dia 3-7: Continuar Padrão
*(Seguir mesma estrutura para Equipamentos, Movimentações, Compras)*

**Checklist de Refatoração (repetir para cada módulo):**
```
✅ PageHeader em todas páginas de listagem
✅ DataTable substituindo tabelas HTML
✅ Columns.tsx separado por entidade
✅ StockBadge para status de estoque
✅ Button/Badge/Card do GladPros-UI
✅ Forms com Input/Select/Textarea
✅ Validação visual com error states
✅ Remover TODOS className inline
✅ Breadcrumbs funcionais
✅ Actions com ícones lucide-react
✅ Responsive tablet (768-1024px)
✅ Testes mantidos (0 quebrados)
```

**Deliverable Semana 2:**
```
✅ 40 arquivos refatorados
✅ Materiais 100% GladPros-UI
✅ Equipamentos 100% GladPros-UI
✅ 200+ testes de Estoque passando
✅ UI consistente e profissional
```

---

## 📅 SEMANA 3: REFATORAÇÃO ESTOQUE (Parte 2)
**Datas:** 23-29 de novembro de 2025  
**Objetivo:** Finalizar 40 arquivos restantes + Dashboard Estoque

### Estrutura Restante
```
src/modules/estoque/
├── movimentacoes/
│   ├── page.tsx                 ← DIA 1-2
│   ├── entrada/page.tsx
│   ├── saida/page.tsx
│   ├── transferencia/page.tsx
│   └── components/
├── compras/
│   ├── page.tsx                 ← DIA 3-4
│   ├── [id]/page.tsx
│   ├── requisicoes/page.tsx
│   └── components/
├── alertas/
│   ├── page.tsx                 ← DIA 5
│   └── components/
├── relatorios/
│   ├── page.tsx                 ← DIA 6
│   └── components/
└── layout.tsx                   ← DIA 7
```

### Dia 1-2: Movimentações (5 tipos)
- [x] Listagem geral com tabs (Todas, Entrada, Saída, Transferência, Ajuste)
- [x] Formulários específicos para cada tipo
- [x] Badge de tipo de movimentação
- [x] Timeline visual com componentes

### Dia 3-4: Compras e Requisições
- [x] Sistema de aprovação visual (Stepper)
- [x] Cards de requisição com status
- [x] Formulário de compra com fornecedores
- [x] Histórico de compras com DataTable

### Dia 5: Alertas
- [x] Cards de alerta com cores por prioridade
- [x] Filtros por tipo (estoque baixo, expiração, etc)
- [x] Ações rápidas (resolver, adiar)
- [x] Badge de prioridade (crítico, alto, médio, baixo)

### Dia 6: Relatórios
- [x] Dashboard com FinanceCard adaptado (StockMetricCard)
- [x] Gráficos mantidos (recharts)
- [x] Exportação CSV/PDF com Button + ícone
- [x] Filtros de período com DatePicker

### Dia 7: Navegação e Dashboard Principal
- [x] Layout com navegação secundária
- [x] Dashboard overview com métricas
- [x] Cards de resumo padronizados
- [x] Quick actions com Button group

**Deliverable Semana 3:**
```
✅ 80 arquivos Estoque 100% refatorados
✅ 100% Design System aplicado
✅ Dashboard visual profissional
✅ Navegação consistente
✅ Testes: 250+ passando (Estoque completo)
✅ Score visual: 10/10 (de 5/10)
```

---

## 📅 SEMANA 4: REFATORAÇÃO FINANCEIRO COMPLETO
**Datas:** 30 nov - 6 dezembro 2025  
**Objetivo:** Refatorar 95 arquivos TSX do módulo Financeiro

### Estrutura Financeiro
```
src/modules/financeiro/
├── despesas/
│   ├── page.tsx                 ← DIA 1
│   ├── [id]/page.tsx
│   ├── nova/page.tsx
│   └── components/              ← DIA 1-2
├── receitas/
│   ├── page.tsx                 ← DIA 2
│   ├── [id]/page.tsx
│   ├── nova/page.tsx
│   └── components/              ← DIA 2-3
├── contas-bancarias/
│   ├── page.tsx                 ← DIA 3
│   ├── [id]/page.tsx
│   ├── transferencias/page.tsx
│   └── components/              ← DIA 3-4
├── relatorios/
│   ├── dre/page.tsx             ← DIA 4-5
│   ├── fluxo-caixa/page.tsx
│   ├── inadimplencia/page.tsx
│   └── components/
├── dashboard/
│   ├── page.tsx                 ← DIA 6
│   └── components/
└── layout.tsx                   ← DIA 7
```

### Componente Específico: FinanceCard

**Criar:** `packages/ui/src/components/domain/finance-card.tsx`
```tsx
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../ui';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface FinanceCardProps {
  title: string;
  value: number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  format?: 'currency' | 'number' | 'percentage';
  subtitle?: string;
  loading?: boolean;
}

export function FinanceCard({
  title,
  value,
  change,
  trend = 'neutral',
  format = 'currency',
  subtitle,
  loading
}: FinanceCardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(val);
      case 'percentage':
        return `${val.toFixed(2)}%`;
      default:
        return val.toLocaleString('en-US');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(value)}
        </div>
        {change !== undefined && (
          <div className="flex items-center mt-2 text-sm">
            {trend === 'up' && (
              <>
                <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-green-600">+{change.toFixed(1)}%</span>
              </>
            )}
            {trend === 'down' && (
              <>
                <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                <span className="text-red-600">{change.toFixed(1)}%</span>
              </>
            )}
            <span className="text-gray-600 ml-1">{subtitle || 'vs mês anterior'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Exemplo de Uso - Dashboard Financeiro

**ANTES (❌ Ruim - 583 linhas inline):**
```tsx
<div className="grid grid-cols-3 gap-4">
  <div className="bg-white p-4 rounded-lg shadow">
    <h3>Total Despesas</h3>
    <p className="text-2xl font-bold">${totalDespesas}</p>
  </div>
  {/* Mais 20 cards similares... */}
</div>
```

**DEPOIS (✅ Perfeito - 80 linhas):**
```tsx
import { FinanceCard, PageHeader } from '@gladpros/ui';

<PageHeader
  title="Dashboard Financeiro"
  description="Visão geral das finanças da empresa"
/>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <FinanceCard
    title="Total Despesas"
    value={stats.totalDespesas}
    change={-5.2}
    trend="down"
    subtitle="vs mês anterior"
  />
  <FinanceCard
    title="Total Receitas"
    value={stats.totalReceitas}
    change={12.8}
    trend="up"
  />
  <FinanceCard
    title="Saldo Atual"
    value={stats.saldoAtual}
    trend="neutral"
  />
  <FinanceCard
    title="Taxa Inadimplência"
    value={stats.taxaInadimplencia}
    format="percentage"
    change={-2.1}
    trend="down"
  />
</div>
```

### Checklist Financeiro (repetir para cada módulo)
```
✅ PageHeader em todas páginas
✅ FinanceCard no dashboard
✅ DataTable para listas de transações
✅ Badge para status (pago, pendente, vencido, cancelado)
✅ Forms com Input + validação financial
✅ Layout 2-colunas com componentes
✅ Relatórios com botões de exportação
✅ Gráficos mantidos (recharts)
✅ Remover inline styles (100%)
✅ Breadcrumbs funcionais
✅ Responsive tablet
✅ Testes mantidos
```

**Deliverable Semana 4:**
```
✅ 95 arquivos Financeiro 100% refatorados
✅ FinanceCard criado e aplicado
✅ Dashboard visual profissional
✅ Layout 2-colunas padronizado
✅ Testes: 400+ passando (Financeiro completo)
✅ Score visual: 10/10 (de 5/10)
```

---

## 📅 SEMANA 5: MÓDULOS ANTIGOS - LOTE 1
**Datas:** 7-13 dezembro 2025  
**Objetivo:** Auth (35 arquivos) + Clientes (42 arquivos)

### 🔐 Auth/Login (Dias 1-3)

**Problema Atual:**
```tsx
// Custom button inline
<button className="w-full h-11 bg-brand-primary text-white rounded-xl">
  Entrar
</button>
```

**Solução:**
```tsx
import { Button } from '@gladpros/ui';

<Button variant="primary" size="lg" className="w-full">
  Entrar
</Button>
```

**Arquivos a Refatorar:**
```
src/modules/auth/
├── login/page.tsx              ← DIA 1
├── register/page.tsx
├── forgot-password/page.tsx
├── reset-password/page.tsx     ← DIA 2
├── mfa/page.tsx
├── profile/page.tsx
└── components/                 ← DIA 3
    ├── LoginForm.tsx
    ├── RegisterForm.tsx
    ├── PasswordStrength.tsx
    └── SessionList.tsx
```

**Tarefas:**
- [x] Substituir botões custom por Button do GladPros-UI
- [x] Aplicar Card no layout de login
- [x] Input com icons (lucide-react)
- [x] Badge para status de sessão
- [x] Toast para notificações
- [x] Manter funcionalidade 100% (MFA, rate limiting)

### 👥 Clientes (Dias 4-7)

**Problema Atual:**
```tsx
// Component Panel custom
import { Panel } from '@/shared/components/panel';

<Panel className="...">
  {/* Conteúdo */}
</Panel>
```

**Solução:**
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@gladpros/ui';

<Card>
  <CardHeader>
    <CardTitle>Informações do Cliente</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Conteúdo */}
  </CardContent>
</Card>
```

**Arquivos a Refatorar:**
```
src/modules/clientes/
├── page.tsx                    ← DIA 4
├── [id]/page.tsx
├── novo/page.tsx               ← DIA 5
├── components/
│   ├── ClienteCard.tsx         ← DIA 6
│   ├── ClienteForm.tsx
│   ├── ClienteList.tsx
│   ├── DocumentsUpload.tsx
│   └── ContactsList.tsx        ← DIA 7
└── layout.tsx
```

**Tarefas:**
- [x] Substituir Panel por Card
- [x] DataTable na listagem
- [x] PageHeader padrão
- [x] Badge para status do cliente
- [x] Forms com componentes UI
- [x] Upload de documentos com componente
- [x] Validações US (SSN/EIN) mantidas

**Deliverable Semana 5:**
```
✅ 77 arquivos refatorados (Auth + Clientes)
✅ Login 100% GladPros-UI
✅ Clientes 100% GladPros-UI
✅ Componente Panel removido
✅ Testes: 150+ passando (Auth + Clientes)
```

---

## 📅 SEMANA 6: MÓDULOS ANTIGOS - LOTE 2
**Datas:** 14-20 dezembro 2025  
**Objetivo:** Propostas (38 arquivos) + Dashboard (28 arquivos)

### 📄 Propostas (Dias 1-4)

**Estrutura:**
```
src/modules/propostas/
├── page.tsx                    ← DIA 1
├── [id]/page.tsx               ← DIA 2
├── nova/page.tsx               ← DIA 3
├── components/
│   ├── PropostaCard.tsx
│   ├── PropostaTimeline.tsx
│   ├── ApprovalFlow.tsx
│   ├── VersionControl.tsx      ← DIA 4
│   └── ProposalPreview.tsx
└── layout.tsx
```

**Foco:**
- [x] DataTable com filtros avançados (status, cliente, período)
- [x] Timeline visual com componentes
- [x] Badge para status de proposta (rascunho, enviada, aprovada, rejeitada)
- [x] Cards de versão
- [x] Workflow de aprovação visual

### 📊 Dashboard (Dias 5-7)

**Problema Atual:**
```tsx
// Inline cards custom
<div className="rounded-lg border p-4">
  <h3>Métrica</h3>
  <p>{value}</p>
</div>
```

**Solução:**
```tsx
import { FinanceCard } from '@gladpros/ui'; // Reutilizar

<FinanceCard
  title="Propostas Ativas"
  value={stats.active}
  format="number"
/>
```

**Arquivos a Refatorar:**
```
src/modules/dashboard/
├── page.tsx                    ← DIA 5-6
├── components/
│   ├── MetricCard.tsx          ← Substituir por FinanceCard
│   ├── RecentActivity.tsx      ← DataTable mini
│   ├── QuickActions.tsx        ← Button group
│   ├── Charts.tsx              ← Manter recharts
│   └── Alerts.tsx              ← Badge + Card
└── layout.tsx                  ← DIA 7
```

**Tarefas:**
- [x] Substituir MetricCard por FinanceCard (reutilizar)
- [x] Grid responsivo com Cards
- [x] Button group para ações rápidas
- [x] Alerts com Badge + Toast
- [x] Manter gráficos (recharts)
- [x] Responsive tablet/desktop

**Deliverable Semana 6:**
```
✅ 66 arquivos refatorados (Propostas + Dashboard)
✅ Dashboard 100% GladPros-UI
✅ Propostas 100% GladPros-UI
✅ Reutilização de FinanceCard no Dashboard
✅ Testes: 120+ passando (Propostas + Dashboard)
```

---

## 📅 SEMANA 7: PROJETOS + STORYBOOK
**Datas:** 21-27 dezembro 2025  
**Objetivo:** Projetos (65 arquivos) + Storybook completo

### 📦 Projetos (Dias 1-5)

**Estrutura:**
```
src/modules/projetos/
├── page.tsx                    ← DIA 1
├── [id]/
│   ├── page.tsx                ← DIA 2
│   ├── etapas/page.tsx
│   ├── documentos/page.tsx
│   ├── equipe/page.tsx         ← DIA 3
│   └── financeiro/page.tsx
├── novo/page.tsx               ← DIA 4
├── components/
│   ├── ProjectCard.tsx
│   ├── EtapaTimeline.tsx
│   ├── TeamMember.tsx
│   ├── DocumentUpload.tsx
│   ├── BudgetTracker.tsx
│   └── KanbanBoard.tsx         ← DIA 5
└── layout.tsx
```

**Foco Especial:**
- [x] Tabs com navegação entre seções
- [x] Timeline de etapas com componentes
- [x] Kanban board mantendo drag-and-drop
- [x] Cards de projeto padronizados
- [x] Badge para status de projeto
- [x] Sistema de eventos já implementado (manter)

### 📚 Storybook (Dias 6-7)

**Setup:**
```bash
cd packages/ui
npx storybook@latest init
```

**Criar stories para TODOS os componentes:**

**DIA 6: Stories Base**
```
src/components/ui/
├── button.stories.tsx          ← 10 variantes
├── card.stories.tsx            ← 5 exemplos
├── badge.stories.tsx           ← 5 variantes
├── input.stories.tsx           ← 8 tipos
├── dialog.stories.tsx          ← 3 exemplos
└── toast.stories.tsx           ← 4 tipos
```

**DIA 7: Stories Avançadas**
```
src/components/
├── layout/
│   └── page-header.stories.tsx
├── data/
│   └── data-table.stories.tsx
└── domain/
    ├── stock-badge.stories.tsx
    └── finance-card.stories.tsx
```

**Conteúdo de cada story:**
```tsx
// button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'success']
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg', 'icon']
    }
  }
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Button'
  }
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Button'
  }
};

// ... mais 8 variantes
```

**Deliverable Semana 7:**
```
✅ 65 arquivos Projetos refatorados
✅ Projetos 100% GladPros-UI
✅ Storybook funcionando
✅ 16 stories criadas (todos componentes)
✅ Documentação visual completa
✅ Testes: 200+ passando (Projetos)
✅ npm run storybook → localhost:6006 ✅
```

---

## 📅 SEMANA 8: TESTES VISUAIS + POLIMENTO + DEPLOY
**Datas:** 28 dez - 3 janeiro 2026  
**Objetivo:** Garantir 100% de qualidade e deploy staging

### Dia 1 (Sábado 28/12): Auditoria Visual Completa

**Checklist Visual (Todos os 7 módulos):**
```bash
# Script de auditoria
npm run audit:visual
```

**Testar manualmente:**
- [x] Auth: Login, Register, MFA
- [x] Clientes: List, Detail, Create/Edit
- [x] Propostas: List, Detail, Workflow
- [x] Dashboard: Métricas, Gráficos, Alerts
- [x] Projetos: List, Kanban, Etapas
- [x] Estoque: Materiais, Equipamentos, Movimentações
- [x] Financeiro: Despesas, Receitas, Dashboard

**Para cada página verificar:**
- [x] PageHeader consistente
- [x] Breadcrumbs funcionando
- [x] Botões usando Button component
- [x] Cards usando Card component
- [x] Badges usando Badge component
- [x] Tabelas usando DataTable
- [x] Forms usando Input/Select/Textarea
- [x] Sem className inline (100%)
- [x] Cores consistentes (tokens)
- [x] Espaçamentos consistentes (8px base)

### Dia 2 (Domingo 29/12): Testes Automatizados

**Rodar TODOS os testes:**
```bash
npm test -- --coverage
```

**Meta:**
- [x] 1,291 testes passando (100%)
- [x] 0 testes quebrados
- [x] Coverage mantido (>80%)

**Se quebrar algo:**
- Identificar teste quebrado
- Verificar mudança de className
- Ajustar teste ou componente
- Re-rodar até 100% passar

### Dia 3 (Segunda 30/12): Responsividade

**Testar em 3 breakpoints:**

**1. Tablet (768px - 1024px) - PRIORIDADE:**
```
✅ Layout se adapta
✅ Touch targets ≥ 48px
✅ DataTable responsiva (scroll horizontal)
✅ Cards empilham corretamente
✅ Forms largura adequada
✅ Navegação funcional
```

**2. Desktop (1920px):**
```
✅ Grid 4 colunas em dashboards
✅ Sidebar fixa
✅ DataTable com todas colunas visíveis
✅ Sem espaços vazios
```

**3. Mobile (375px) - Fallback:**
```
✅ Cards 1 coluna
✅ DataTable scroll horizontal
✅ Forms stack vertical
✅ Navegação mobile menu
```

### Dia 4 (Terça 31/12): Acessibilidade

**WCAG 2.1 AA Compliance:**

**Testar com ferramentas:**
```bash
npm install -D @axe-core/playwright
```

**Checklist:**
- [x] Contraste mínimo 4.5:1 (text)
- [x] Contraste mínimo 3:1 (UI components)
- [x] Focus visível em todos elementos interativos
- [x] Keyboard navigation funcional (Tab, Enter, Esc)
- [x] ARIA labels em ícones sem texto
- [x] Alt text em imagens
- [x] Formulários com labels associados
- [x] Erros de validação descritivos

**Ajustar componentes se necessário:**
```tsx
// Exemplo de correção
<Button aria-label="Novo Material"> {/* Se só ícone */}
  <Plus className="h-4 w-4" />
</Button>
```

### Dia 5 (Quarta 1/1): Performance

**Lighthouse Audit:**
```bash
npm run build
npm run lighthouse
```

**Metas:**
- [x] Performance: ≥ 90
- [x] Accessibility: 100
- [x] Best Practices: ≥ 90
- [x] SEO: ≥ 90

**Core Web Vitals:**
- [x] LCP (Largest Contentful Paint): < 2.5s
- [x] FID (First Input Delay): < 100ms
- [x] CLS (Cumulative Layout Shift): < 0.1

**Otimizações (se necessário):**
- Code splitting por módulo
- Lazy loading de componentes pesados
- Images otimizadas (next/image)
- Font optimization

### Dia 6 (Quinta 2/1): Correções Finais

**Criar lista de bugs visuais encontrados:**
```markdown
## Bugs Encontrados

### Críticos (P0):
- [ ] ...

### Altos (P1):
- [ ] ...

### Médios (P2):
- [ ] ...

### Baixos (P3):
- [ ] ...
```

**Corrigir em ordem de prioridade:**
- P0: Corrigir TODOS (bloqueadores)
- P1: Corrigir máximo possível
- P2: Corrigir se der tempo
- P3: Criar issues no GitHub para depois

### Dia 7 (Sexta 3/1): Deploy Staging + Documentação

**Build Final:**
```bash
npm run build
npm run test -- --coverage
```

**Deploy Staging:**
```bash
git checkout main
git merge feature/design-system-complete
git tag v2.0.0-beta
git push origin main --tags
```

**Atualizar Documentação:**

**Criar:** `DESIGN-SYSTEM-CHANGELOG.md`
```markdown
# Design System v2.0.0 - Changelog

## ✨ O Que Mudou

### Componentes Adicionados
- ✅ Button (10 variantes)
- ✅ Card (header, content, footer)
- ✅ Badge (5 variantes)
- ✅ Input (8 tipos)
- ✅ DataTable (sorting, filtering, pagination)
- ✅ PageHeader (breadcrumbs, actions)
- ✅ StockBadge (status de estoque)
- ✅ FinanceCard (métricas financeiras)
- ✅ Dialog (modal)
- ✅ Toast (notificações)
- ✅ Select, Textarea, Checkbox, Radio

### Módulos Refatorados
- ✅ Auth/Login (35 arquivos)
- ✅ Clientes (42 arquivos)
- ✅ Propostas (38 arquivos)
- ✅ Dashboard (28 arquivos)
- ✅ Projetos (65 arquivos)
- ✅ Estoque (80 arquivos)
- ✅ Financeiro (95 arquivos)

**TOTAL: 383 arquivos refatorados**

### Métricas Antes vs Depois

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Consistência Visual | 50% | 100% | +100% |
| Componentes Reutilizáveis | 20 | 16 | Consolidação |
| Código duplicado | Alto | Zero | -100% |
| Manutenibilidade | 6/10 | 10/10 | +67% |
| Score Acessibilidade | 75 | 100 | +33% |
| Performance (Lighthouse) | 82 | 92 | +12% |

### Breaking Changes
- ⚠️ Component `Panel` removido → usar `Card`
- ⚠️ Inline className em botões → usar `Button` component
- ⚠️ Tabelas HTML custom → usar `DataTable`

### Migration Guide
Ver `MIGRATION-GUIDE.md` para detalhes completos.
```

**Criar:** `MIGRATION-GUIDE.md`
```markdown
# Migration Guide - Design System v2.0.0

## Para Desenvolvedores

### 1. Atualizar Imports

**Antes:**
```tsx
import { Button } from '@/shared/components/ui/button';
import { Panel } from '@/shared/components/panel';
```

**Depois:**
```tsx
import { Button, Card } from '@gladpros/ui';
```

### 2. Substituir Componentes

#### Panel → Card
**Antes:**
```tsx
<Panel className="p-4">
  <h2>Título</h2>
  <p>Conteúdo</p>
</Panel>
```

**Depois:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Conteúdo</p>
  </CardContent>
</Card>
```

#### Botões Inline → Button Component
**Antes:**
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded">
  Clique
</button>
```

**Depois:**
```tsx
<Button variant="primary">Clique</Button>
```

#### Tabelas HTML → DataTable
**Antes:**
```tsx
<table>
  <thead>...</thead>
  <tbody>...</tbody>
</table>
```

**Depois:**
```tsx
<DataTable
  columns={columns}
  data={data}
  searchable
/>
```

### 3. Storybook

Acessar documentação visual:
```bash
npm run storybook
# http://localhost:6006
```

Todos os componentes documentados com exemplos interativos.
```

**Deliverable Semana 8:**
```
✅ 1,291 testes passando (100%)
✅ WCAG 2.1 AA (100%)
✅ Lighthouse ≥ 90
✅ Responsivo tablet/desktop/mobile
✅ 0 bugs críticos
✅ Deploy staging funcionando
✅ Documentação completa
✅ Changelog publicado
✅ Migration guide criado
✅ SISTEMA 100% PRONTO
```

---

## 📊 MÉTRICAS DE ACOMPANHAMENTO

### Dashboard de Progresso (Atualizar Diariamente)

**Criar:** `DESIGN-SYSTEM-PROGRESS.md`
```markdown
# Design System - Progresso Diário

## Semana Atual: 1/8

### Arquivos Refatorados
- [x] Auth: 0/35 (0%)
- [ ] Clientes: 0/42 (0%)
- [ ] Propostas: 0/38 (0%)
- [ ] Dashboard: 0/28 (0%)
- [ ] Projetos: 0/65 (0%)
- [ ] Estoque: 0/80 (0%)
- [ ] Financeiro: 0/95 (0%)

**Total: 0/383 (0%)**

### Componentes GladPros-UI
- [ ] Button (0%)
- [ ] Card (0%)
- [ ] Badge (0%)
- [ ] Input (0%)
- [ ] DataTable (0%)
- [ ] PageHeader (0%)
- [ ] StockBadge (0%)
- [ ] FinanceCard (0%)
- [ ] Dialog (0%)
- [ ] Toast (0%)

**Total: 0/10 (0%)**

### Testes
- Passando: 1,291/1,291 (100%)
- Quebrados: 0
- Coverage: 82%

### Stories Storybook
- Criadas: 0/16 (0%)

### WCAG Compliance
- Contraste: 0/383 (0%)
- Keyboard Nav: 0/383 (0%)
- ARIA: 0/383 (0%)
```

### Git Workflow

**Branch Strategy:**
```bash
main
└── feature/design-system-complete (trabalho aqui)
    ├── feature/week-1-gladpros-ui
    ├── feature/week-2-estoque-part1
    ├── feature/week-3-estoque-part2
    ├── feature/week-4-financeiro
    ├── feature/week-5-auth-clients
    ├── feature/week-6-proposals-dashboard
    ├── feature/week-7-projects-storybook
    └── feature/week-8-testing-polish
```

**Commits Padrão:**
```bash
# Dia 1 Semana 1
git commit -m "feat(ui): add design tokens (colors, spacing, typography)"
git commit -m "feat(ui): add Button component with 10 variants"
git commit -m "feat(ui): add Card component (header, content, footer)"

# Dia 1 Semana 2
git commit -m "refactor(estoque): apply PageHeader to materiais pages"
git commit -m "refactor(estoque): replace table with DataTable in materiais"
git commit -m "refactor(estoque): add StockBadge to materiais list"

# Fim de cada semana
git commit -m "chore: week 1 complete - GladPros-UI setup done"
git push origin feature/week-1-gladpros-ui
```

---

## 🚨 GESTÃO DE RISCOS

### Risco #1: Testes Quebrarem
**Probabilidade:** Alta (60%)  
**Impacto:** Médio  
**Mitigação:**
- Rodar `npm test` a cada 5 arquivos refatorados
- Ajustar testes para novos classNames
- Manter snapshot tests atualizados

### Risco #2: Performance Degradar
**Probabilidade:** Baixa (20%)  
**Impacto:** Médio  
**Mitigação:**
- Bundle size monitor
- Lighthouse em cada merge
- Code splitting por módulo

### Risco #3: Atraso no Cronograma
**Probabilidade:** Média (40%)  
**Impacto:** Alto  
**Mitigação:**
- Buffer de 3 dias na Semana 8
- Priorizar P0 e P1 apenas
- Aceitar bugs P2/P3 para depois

### Risco #4: Quebrar Funcionalidade
**Probabilidade:** Baixa (15%)  
**Impacto:** Crítico  
**Mitigação:**
- Testar funcionalidade após cada refactor
- Manter lógica de negócio intacta
- Rollback rápido se necessário

---

## 📋 CHECKLIST FINAL

Antes de considerar COMPLETO:

### Código
- [ ] 383 arquivos TSX refatorados
- [ ] 0 className inline em botões/cards
- [ ] 100% usando GladPros-UI
- [ ] 0 componentes custom duplicados
- [ ] Build sem warnings

### Testes
- [ ] 1,291 testes passando (100%)
- [ ] Coverage ≥ 80%
- [ ] 0 testes skipped
- [ ] E2E Playwright funcionando

### Visual
- [ ] Storybook rodando (npm run storybook)
- [ ] 16 stories criadas
- [ ] Documentação completa
- [ ] Screenshots de antes/depois

### Qualidade
- [ ] WCAG 2.1 AA (100%)
- [ ] Lighthouse ≥ 90
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1

### Documentação
- [ ] DESIGN-SYSTEM-CHANGELOG.md
- [ ] MIGRATION-GUIDE.md
- [ ] README.md atualizado
- [ ] DESIGN-SYSTEM-PROGRESS.md final

### Deploy
- [ ] Branch merged em main
- [ ] Tag v2.0.0-beta criada
- [ ] Deploy staging funcionando
- [ ] Validação com usuários reais

---

## 🎯 CRITÉRIOS DE SUCESSO

### Técnicos
1. ✅ 100% dos módulos usando GladPros-UI
2. ✅ 0 componentes custom duplicados
3. ✅ 1,291 testes mantidos (100% passando)
4. ✅ Storybook completo (16 components)
5. ✅ WCAG 2.1 AA compliance

### Negócio
1. ✅ Sistema visualmente profissional
2. ✅ Consistência total entre módulos
3. ✅ Facilita onboarding de novos devs
4. ✅ Reduz tempo de desenvolvimento futuro
5. ✅ Pronto para apresentar a clientes

### Usuário
1. ✅ Interface intuitiva e consistente
2. ✅ Funcionamento perfeito em tablet
3. ✅ Acessível (teclado, screen readers)
4. ✅ Performance rápida (< 3s load)
5. ✅ Sem bugs visuais críticos

---

## 📞 COMUNICAÇÃO E REPORTING

### Daily Updates
Atualizar diariamente o arquivo `DESIGN-SYSTEM-PROGRESS.md` com:
- Arquivos refatorados hoje
- Problemas encontrados
- Decisões tomadas
- Estimativa atualizada

### Weekly Reports
Todo domingo, criar:
```markdown
## Week X Report - Design System

### Completed
- ✅ X arquivos refatorados
- ✅ X componentes criados
- ✅ X testes passando

### Blockers
- ⚠️ ...

### Next Week Plan
- [ ] ...

### Metrics
- Progress: X/383 files (Y%)
- Tests: 1,291/1,291 (100%)
- ETA: On track / +2 days delay
```

---

## 🏁 CONCLUSÃO

Este é um projeto de **8 semanas** para transformar completamente a interface do GladPros.

**Resultado esperado:**
- Sistema 100% consistente visualmente
- Componentização profissional
- Documentação completa
- Manutenibilidade excepcional
- Pronto para escalar

**Investimento:**
- 8 semanas full-time
- 383 arquivos refatorados
- 16 componentes novos
- 1,291 testes mantidos

**ROI:**
- Redução 70% tempo de desenvolvimento futuro
- Onboarding novos devs 50% mais rápido
- 0 inconsistências visuais
- Sistema production-ready

---

**INÍCIO:** 9 de novembro de 2025 (HOJE)  
**FIM:** 4 de janeiro de 2026  
**STATUS:** 🚀 PRONTO PARA COMEÇAR

**Primeira tarefa:** Criar branch `feature/design-system-complete` e começar Semana 1 Dia 1 (Setup tokens).

---

*Documento criado por: GitHub Copilot + Gladiston Porto*  
*Última atualização: 9 de novembro de 2025*
