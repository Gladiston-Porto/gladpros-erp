# Módulo Reports (Relatórios) — Documentação Técnica

**Status:** ✅ Produção  
**Última atualização:** 2026-04-18  

---

## 1. Visão Geral

O módulo de Relatórios é o hub centralizado de geração de relatórios do GladPros ERP. Agrega dados de todos os módulos operacionais e permite visualização, filtragem e exportação (PDF, CSV) de informações gerenciais e financeiras. Cada módulo também possui sua própria página de relatório local.

---

## 2. Arquitetura (estrutura de pastas real)

```
src/app/(dashboard)/relatorios/
└── page.tsx                          # Hub central de relatórios

# Relatórios por módulo (dentro de cada módulo)
src/app/(dashboard)/invoices/relatorios/page.tsx
src/app/(dashboard)/ordens-servico/relatorios/page.tsx

src/app/api/reports/
├── route.ts                          # GET — listar relatórios disponíveis / POST — criar relatório
├── data/route.ts                     # GET — buscar dados de um relatório
├── export/route.ts                   # GET — exportar relatório (PDF/CSV)
├── advanced/route.ts                 # GET — relatórios avançados / cruzados
├── invoices/
│   └── pdf/route.ts                  # GET — PDF de relatório de invoices
└── [id]/
    ├── route.ts                      # GET / DELETE relatório salvo
    ├── data/route.ts                 # GET dados de relatório específico
    └── export/route.ts               # GET exportar relatório específico
```

---

## 3. Modelo de Dados

O módulo de relatórios não tem modelo Prisma próprio — consome dados de todos os outros módulos. Os relatórios podem ser:

- **Ad-hoc**: gerados sob demanda com parâmetros na requisição
- **Salvos**: definições armazenadas (se implementado) com `id` próprio

### Parâmetros típicos de filtro

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `tipo` | `string` | Tipo do relatório (invoices, service-orders, financeiro, etc.) |
| `dataInicio` | `DateTime` | Início do período |
| `dataFim` | `DateTime` | Fim do período |
| `clienteId` | `Int?` | Filtrar por cliente |
| `projetoId` | `Int?` | Filtrar por projeto |
| `status` | `string?` | Filtrar por status |
| `format` | `'pdf' \| 'csv' \| 'json'` | Formato de exportação |

---

## 4. API REST (endpoints reais)

| Método | Rota | RBAC mínimo | Descrição |
|--------|------|-------------|-----------|
| `GET` | `/api/reports` | `reports:read` | Listar relatórios disponíveis ou salvos |
| `POST` | `/api/reports` | `reports:create` | Criar/salvar relatório |
| `GET` | `/api/reports/data` | `reports:read` | Buscar dados de relatório ad-hoc |
| `GET` | `/api/reports/export` | `reports:read` | Exportar relatório (PDF / CSV) |
| `GET` | `/api/reports/advanced` | `reports:read` | Relatórios avançados (dados cruzados entre módulos) |
| `GET` | `/api/reports/invoices/pdf` | `reports:read` | PDF de relatório de invoices |
| `GET` | `/api/reports/:id` | `reports:read` | Detalhe de relatório salvo |
| `DELETE` | `/api/reports/:id` | `reports:delete` | Remover relatório salvo |
| `GET` | `/api/reports/:id/data` | `reports:read` | Dados do relatório salvo |
| `GET` | `/api/reports/:id/export` | `reports:read` | Exportar relatório salvo |

---

## 5. Regras de Negócio

- Relatórios **nunca alteram dados** — são operações de leitura pura
- Filtros de período são obrigatórios para relatórios financeiros (prevenção de queries excessivas)
- Exportações PDF são geradas server-side sob demanda
- Dados financeiros em relatórios são filtrados por RBAC: FINANCEIRO e ADMIN têm acesso total; GERENTE tem read only
- Relatórios de usuários internos **não** são acessíveis por CLIENTE
- Timezone de exibição: sempre `America/Chicago` — nunca UTC
- Moeda: sempre USD, locale `en-US`

---

## 6. Segurança & RBAC

| Role | Permissões |
|------|-----------|
| `ADMIN` | Acesso a todos os relatórios (ALL) |
| `GERENTE` | Read only — todos os relatórios |
| `FINANCEIRO` | Read only — relatórios financeiros e de invoices |
| `USUARIO` | Sem acesso ao hub de relatórios |
| `ESTOQUE` | Sem acesso |
| `CLIENTE` | Sem acesso |

```typescript
if (!can(user.role as Role, "reports", "read")) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

**Nota**: relatórios de módulos específicos (ex: `/invoices/relatorios`) usam o RBAC do módulo pai (`invoices:read`), não `reports:read`.

---

## 7. Tipos de Relatório Disponíveis

### Financeiro
- Receitas por período (agrupado por mês/semana/dia)
- Despesas por categoria (Schedule C line mapping)
- P&L simplificado
- Aging de receivables (30/60/90 dias)

### Invoices
- Invoices por status e período
- Top clientes por faturamento
- Relatório de inadimplência

### Service Orders
- OS por status e técnico
- Tempo médio de execução
- OS por tipo de serviço e cliente

### Projetos
- Projetos por status
- Budget vs. realizado
- Cronograma de etapas

### Estoque
- Movimentações por período
- Materiais com baixo estoque
- Valoração do estoque

---

## 8. Integrações

| Módulo | Dados consumidos |
|--------|-----------------|
| **Financeiro** | Receitas, despesas, ledger transactions |
| **Invoices** | Status, valores, aging, pagamentos |
| **Service Orders** | Execução, técnicos, materiais, OS por status |
| **Projetos** | Budget, etapas, cronograma |
| **Estoque** | Movimentações, valoração, alertas |
| **RH/Workforce** | Horas trabalhadas, produtividade por técnico |
| **Clientes** | Top clientes, receita por cliente |

---

## 9. Problemas Conhecidos

- Hub `/relatorios` central pode estar incompleto — relatórios mais ricos estão nos módulos individuais
- Relatórios avançados (`/advanced`) podem ter latência alta sem cache
- Exportação PDF de grandes datasets pode causar timeout — sem paginação de exportação

---

## 10. Roadmap Futuro

- [ ] Dashboard de relatórios com charts interativos (Recharts)
- [ ] Agendamento de relatórios por email (cron)
- [ ] Relatórios salvos e compartilháveis por link
- [ ] Exportação Excel (xlsx) além de CSV e PDF
- [ ] Filtros avançados: multi-cliente, multi-projeto, multi-status
- [ ] Relatório fiscal para contador (Schedule C line items export)
- [ ] Comparativo de períodos (MoM, YoY)
