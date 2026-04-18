# Módulos do Projeto

Resumo automático dos módulos detectados no repositório e arquivos representativos.

**Módulos de Rotas (src/app)**

- **Clientes (CRM):** visão e APIs relacionadas — [src/app/clientes/page.tsx](src/app/clientes/page.tsx)
- **Propostas (Proposals):** criação, lista, detalhe, assinatura — [src/app/propostas/page.tsx](src/app/propostas/page.tsx)
- **Projetos (Project Management):** páginas e detalhes de projeto — [src/app/(dashboard)/projetos/page.tsx](src/app/(dashboard)/projetos/page.tsx)
- **Relatórios (Reports):** dashboards e relatórios financeiros — [src/app/(dashboard)/relatorios/page.tsx](src/app/(dashboard)/relatorios/page.tsx)
- **Usuários (User Management):** listagem e criação — [src/app/(dashboard)/usuarios/page.tsx](src/app/(dashboard)/usuarios/page.tsx)
- **RH / Colaboradores:** gestão de colaboradores — [src/app/(dashboard)/rh/page.tsx](src/app/(dashboard)/rh/page.tsx)
- **Estoque (Inventory):** materiais, movimentações, lotes, inventário — [src/app/(protected)/estoque/page.tsx](src/app/(protected)/estoque/page.tsx)
- **Faturamento / Invoices:** listagem e detalhe de invoices — [src/app/(protected)/invoices/page.tsx](src/app/(protected)/invoices/page.tsx)
- **Ordens de Serviço (Service Orders):** lista e detalhe — [src/app/ordens-servico/page.tsx](src/app/ordens-servico/page.tsx)
- **Portal do Cliente:** área de cliente por token — [src/app/portal/[token]/page.tsx](src/app/portal/%5Btoken%5D/page.tsx)

**APIs (grupos em src/app/api)**

- **Service Orders API:** [src/app/api/service-orders/route.ts](src/app/api/service-orders/route.ts)
- **Estoque API:** materiais, movimentacoes, lotes, localizacoes, inventario — exemplo [src/app/api/estoque/materiais/route.ts](src/app/api/estoque/materiais/route.ts)
- **Clients API:** [src/app/api/clients/route.ts](src/app/api/clients/route.ts)
- **Propostas API:** [src/app/api/propostas/[id]/route.ts](src/app/api/propostas/%5Bid%5D/route.ts)
- **Warranty / Warranty tickets:** [src/app/api/service-orders/warranty-tickets/route.ts](src/app/api/service-orders/warranty-tickets/route.ts)
- **Notifications / Email / WhatsApp:** exemplo [src/app/api/whatsapp/send/route.ts](src/app/api/whatsapp/send/route.ts)

**Pacotes (packages/)**

- `@gladpros/estoque` — [packages/estoque/package.json](packages/estoque/package.json)
- `@gladpros/financeiro` — [packages/financeiro/package.json](packages/financeiro/package.json)
- `@gladpros/colaborador` — [packages/colaborador/package.json](packages/colaborador/package.json)
- `@gladpros/auth` / `auth-core` — [packages/auth-core/package.json](packages/auth-core/package.json)
- `@gladpros/proposals` / `proposals-core` — [packages/proposals-core/package.json](packages/proposals-core/package.json)
- `@gladpros/ui` — componente de design compartilhado (usado por várias páginas)

**Modelos Prisma (domínio principal)**

- `Cliente` — CRM, relações com `Proposta`, `Projeto`, `ServiceOrder`, `Invoice` — [prisma/schema.prisma](prisma/schema.prisma#L80-L150)
- `Proposta` — propostas comerciais e ciclo de aprovação — [prisma/schema.prisma](prisma/schema.prisma#L1000-L1050)
- `Projeto` / `ServiceOrder` — delivery e ordens de serviço — [prisma/schema.prisma](prisma/schema.prisma#L300-L350)
- `Material`, `MaterialLote`, `MaterialSaldo`, `MaterialMovimentacao` — estoque e movimentações — [prisma/schema.prisma](prisma/schema.prisma#L1449-L1510)
- `Invoice`, `Revenue`, `Expense` — faturamento e contabilidade — [prisma/schema.prisma](prisma/schema.prisma#L200-L260)

---

Se quiser, posso:

- Gerar um arquivo CSV com todos os caminhos de arquivos (rotas + APIs + pacotes + modelos).
- Expandir cada módulo listando todas as rotas e endpoints encontrados.
- Abrir um relatório detalhado de segurança/quality para cada módulo.

Diga qual formato prefere (MD/CSV/JSON) ou qual módulo quer detalhar primeiro.