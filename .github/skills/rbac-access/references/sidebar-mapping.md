# Sidebar → RBAC Module Mapping

Each sidebar NavGroup maps to RBAC modules. A group is visible if the user has `read` access to **at least one** module in that group. Individual items are visible only if the user can read their specific module.

## NavGroup Mapping

| Sidebar Group | Nav Item | href | RBAC Module |
|---------------|----------|------|-------------|
| *(no title)* | Dashboard | `/dashboard` | `dashboard` |
| MINHA ÁREA | Meus Projetos | `/meus-projetos` | `projetos` |
| COMERCIAL | Clientes | `/clientes` | `clientes` |
| COMERCIAL | Propostas | `/propostas` | `propostas` |
| COMERCIAL | Projetos | `/projetos` | `projetos` |
| COMERCIAL | Ordens de Serviço | `/ordens-servico` | `service-orders` |
| OPERACIONAL | Estoque | `/estoque` | `estoque` |
| OPERACIONAL | Documentos | `/documentos` | `documents` |
| OPERACIONAL | Relatórios | `/relatorios` | `reports` |
| RECURSOS HUMANOS | Colaboradores | `/rh/colaboradores` | `rh` |
| RECURSOS HUMANOS | Workers (1099) | `/rh/workers` | `rh` |
| FINANCEIRO | Dashboard | `/dashboard/financeiro` | `financeiro` |
| FINANCEIRO | Receitas | `/dashboard/financeiro/receitas` | `financeiro` |
| FINANCEIRO | Despesas | `/dashboard/financeiro/despesas` | `financeiro` |
| FINANCEIRO | Contas | `/dashboard/financeiro/contas` | `financeiro` |
| FINANCEIRO | Transferências | `/dashboard/financeiro/transferencias` | `financeiro` |
| FINANCEIRO | Invoices | `/invoices` | `invoices` |
| FINANCEIRO | Payables (1099) | `/dashboard/financeiro/payables` | `financeiro` |
| FINANCEIRO | Fluxo de Caixa | `/dashboard/financeiro/fluxo-caixa` | `financeiro` |
| SISTEMA | Usuários | `/usuarios` | `usuarios` |
| SISTEMA | Eventos | `/admin/eventos` | `configuracoes` |
| SISTEMA | Integração | `/admin/integracao` | `configuracoes` |
| SISTEMA | Perfil | `/perfil` | *(always visible)* |

## Role Visibility Summary

| Role | Visible Groups |
|------|---------------|
| ADMIN | All 7 groups |
| GERENTE | Dashboard, Minha Área, Comercial, Operacional, RH, Financeiro (RO), Sistema (Perfil only) |
| FINANCEIRO | Dashboard, Minha Área, Comercial (limited), Operacional (limited), RH (RO), Financeiro, Sistema (Perfil only) |
| ESTOQUE | Dashboard, Minha Área, Comercial (limited), Operacional, Sistema (Perfil only) |
| USUARIO | Dashboard, Minha Área, Comercial (limited), Operacional (limited), Sistema (Perfil only) |
| CLIENTE | Dashboard (if enabled), Minha Área (projetos RO) |

## Implementation
Filtering is done in `DashboardShell` using `filterNavGroupsByRole()` which calls `can(role, module, "read")` + `routeToModule(href)` for each nav item.
