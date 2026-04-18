# Role Hierarchy

Source: `src/shared/lib/user-hierarchy.ts`

## Hierarchy Levels

```
ADMIN (1)      → Full system control
GERENTE (2)    → Operations supervision
FINANCEIRO (3) → Financial management
ESTOQUE (4)    → Inventory control
USUARIO (5)    → Daily operations (field user)
CLIENTE (6)    → Limited external access (portal only)
```

Lower number = higher privilege.

## User Management Rules

| Manager Role | Can Manage |
|-------------|------------|
| ADMIN | ALL roles (ADMIN, GERENTE, FINANCEIRO, ESTOQUE, USUARIO, CLIENTE) |
| GERENTE | USUARIO, FINANCEIRO, ESTOQUE only |
| FINANCEIRO | Cannot manage users |
| ESTOQUE | Cannot manage users |
| USUARIO | Cannot manage users |
| CLIENTE | Cannot manage users |

## Key Functions

```typescript
import { canManageRole, getManageableRoles, hasRoleLevel, UserRole } from "@/shared/lib/user-hierarchy"

// Can this manager manage the target role?
canManageRole("GERENTE", "USUARIO")  // true
canManageRole("GERENTE", "ADMIN")    // false

// What roles can this user assign?
getManageableRoles("ADMIN")   // ["ADMIN", "GERENTE", "FINANCEIRO", "ESTOQUE", "USUARIO", "CLIENTE"]
getManageableRoles("GERENTE") // ["USUARIO", "FINANCEIRO", "ESTOQUE"]

// Is user's role at least this level?
hasRoleLevel("GERENTE", "USUARIO") // true (GERENTE=2 <= USUARIO=5)
```

## Colaborador → Usuário Relationship
- Each `Colaborador` (employee record) has a linked `Usuario` (user account)
- The `Usuario` has a `role` that determines system access level
- Creating a colaborador should create the linked user account
- The user login flow: credentials → MFA (if enabled) → dashboard
