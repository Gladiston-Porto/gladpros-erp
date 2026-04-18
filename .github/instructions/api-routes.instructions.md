---
description: "Use when creating or modifying API route handlers. Covers authentication, authorization, validation, error handling, and response format for all API routes in src/app/api/."
applyTo: "src/app/api/**/*.ts"
---

# API Route Standards

## Authentication
Every API route MUST call `requireUser()` as the first operation, except:
- `/api/auth/*` (login, MFA, password reset)
- `/api/portal/*` (public client portal, token-based)
- `/api/webhooks/*` (external integrations)

```typescript
import { requireUser } from "@/shared/lib/rbac"

export async function GET(request: NextRequest) {
  const user = await requireUser(request)
  // ...
}
```

## Authorization (RBAC)
After authentication, check permissions using `can()`:

```typescript
import { can, type Role } from "@/shared/lib/rbac-core"

if (!can(user.role as Role, "financeiro", "read")) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

### User Management Hierarchy
When managing users, enforce hierarchy:
- ADMIN can manage all roles
- GERENTE can manage only USUARIO, FINANCEIRO, ESTOQUE
- Other roles cannot manage users

## Input Validation
Always validate request body/params with Zod:

```typescript
import { z } from "zod"

const schema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
})

const body = schema.safeParse(await request.json())
if (!body.success) {
  return NextResponse.json(
    { error: "Validation failed", message: body.error.issues[0]?.message, success: false },
    { status: 400 }
  )
}
```

## Response Format
```typescript
// Success with data
NextResponse.json({ data: result, success: true })

// Success with pagination
NextResponse.json({
  data: items,
  pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  success: true,
})

// Error
NextResponse.json({ error: "Not found", message: "Resource not found", success: false }, { status: 404 })
```

## Error Handling
Wrap route body in try/catch:

```typescript
try {
  // route logic
} catch (error) {
  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
  }
  console.error("[API] Error:", error)
  return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
}
```

## Database
- Import: `import { prisma } from "@/lib/prisma"` — ONLY this path
- Never hardcode `empresaId` — use `where: { empresaId: 1 }` only as documented single-tenant default
- Always use `select` or `include` to limit returned fields

## Formatting
- Currency: USD with `en-US` locale
- Dates: `America/Chicago` timezone for any display values
- Never return dates in UTC without timezone context
