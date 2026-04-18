---
name: rbac-access
description: "Use when working with permissions, access control, role-based visibility, sidebar filtering, or RBAC in any component, page, or API route. Covers the full permission-checking workflow."
---

# Skill: RBAC & Access Control

## When to Use
- Creating/modifying any component, page, or API with role-based visibility
- Filtering sidebar navigation by user role
- Checking permissions before operations
- Implementing role hierarchy for user management

## Core Imports
```typescript
import { can, routeToModule, type Role, type ModuleKey } from "@/shared/lib/rbac-core"
import { requireUser } from "@/shared/lib/rbac"
import { requireServerUser } from "@/shared/lib/requireServerUser"
import { canManageRole, getManageableRoles } from "@/shared/lib/user-hierarchy"
```

## Permission Check Procedure

### 1. Identify Module & Action
Every permission check uses `can(role, moduleKey, action)`:
- `moduleKey`: one of 17 modules (see [policy-matrix.md](./references/policy-matrix.md))
- `action`: `"read" | "create" | "update" | "delete"`
- Returns `boolean` — ADMIN always returns `true`

### 2. Server Components (Pages)
```typescript
const user = await requireServerUser()
const mod = routeToModule("/current-path")
if (mod && !can(user.role as Role, mod, "read")) redirect("/403")
```

### 3. Client Components (UI Elements)
```typescript
// Receive role via props or context
{can(user.role as Role, "financeiro", "read") && <FinanceWidget />}

// For action buttons
{can(user.role as Role, "clientes", "create") && <Button>Novo Cliente</Button>}
{can(user.role as Role, "clientes", "delete") && <Button variant="destructive">Excluir</Button>}
```

### 4. API Routes
```typescript
const user = await requireUser(req)
if (!can(user.role as Role, "financeiro", "create")) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

### 5. Sidebar Filtering
Filter navigation groups based on user role. Each nav item's `href` maps to a module via `routeToModule()`. Only show items where `can(role, module, "read")` is `true`. See [sidebar-mapping.md](./references/sidebar-mapping.md) for the complete mapping.

## Role Hierarchy
See [hierarchy.md](./references/hierarchy.md) for details:
- `ADMIN (1)` → Full system control, manages all roles
- `GERENTE (2)` → Operations supervision, manages USUARIO/FINANCEIRO/ESTOQUE
- `FINANCEIRO (3)` → Financial management
- `ESTOQUE (4)` → Inventory control
- `USUARIO (5)` → Daily operations (field user)
- `CLIENTE (6)` → Portal access only (external)

## User Management Rules
- Use `canManageRole(managerRole, targetRole)` to check if a manager can manage a target
- Use `getManageableRoles(role)` to get the list of roles a user can assign
- ADMIN manages all roles
- GERENTE manages USUARIO, FINANCEIRO, ESTOQUE only
- Other roles cannot manage users

## Common Patterns

### Hide entire section
```typescript
{can(role, "financeiro", "read") && <FinanceSection data={data} />}
```

### Disable action (show but grayed out)
```typescript
<Button disabled={!can(role, "estoque", "delete")}>Excluir</Button>
```

### Filter list/table columns
```typescript
const columns = baseColumns.filter(col =>
  !col.requiredModule || can(role, col.requiredModule, "read")
)
```
