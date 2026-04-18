# RBAC Policy Matrix

Source: `src/shared/lib/rbac-core.ts`

| Module | ADMIN | GERENTE | FINANCEIRO | ESTOQUE | USUARIO | CLIENTE |
|--------|-------|---------|------------|---------|---------|---------|
| dashboard | ALL | RO | RO | RO | RO | — |
| usuarios | ALL | — | — | — | — | — |
| clientes | ALL | RW | RO | RO | RW | — |
| propostas | ALL | ALL | ALL | — | — | — |
| projetos | ALL | ALL | ALL | ALL | ALL | RO |
| service-orders | ALL | ALL | RO | RO | RW | — |
| estoque | ALL | RO | RO | ALL | RO | — |
| financeiro | ALL | RO | ALL | — | — | — |
| invoices | ALL | ALL | ALL | — | RO | RO |
| rh | ALL | ALL | RO | — | — | — |
| workforce | ALL | ALL | RO | — | RO | — |
| reports | ALL | RO | RO | — | — | — |
| analytics | ALL | RO | — | — | — | — |
| documents | ALL | ALL | RO | RO | RW | — |
| aprovacoes | ALL | ALL | RW | — | RO | — |
| notifications | ALL | RO | RO | RO | RO | — |
| configuracoes | ALL | RO | — | — | — | — |

**Legend**: ALL = CRUD, RW = Read+Create+Update, RO = Read Only, — = No Access

**Key function**: `can(role: Role, moduleKey: ModuleKey, action: Action): boolean`
- ADMIN always returns `true` (hardcoded short-circuit)
- Other roles check against this matrix
