---
description: "RBAC review: sidebar filtering, API permissions, page access control, role hierarchy"
agent: "agent"
---

# RBAC Review — Access Control Audit

Comprehensive review of role-based access control across a module or the entire system.

**Ask the user**: Review a specific module or the full system?

## Checks

### 1. Sidebar Filtering
- [ ] `filterNavGroupsByRole()` is applied in DashboardShell?
- [ ] Each nav item maps correctly to an RBAC module via `routeToModule()`?
- [ ] Test: ADMIN sees all 7 groups, USUARIO sees only permitted groups
- [ ] Test: CLIENTE sees minimal navigation

### 2. Page Access Control
For each page in the module:
- [ ] Calls `requireServerUser()`?
- [ ] Checks `can(role, module, "read")` before rendering?
- [ ] Redirects to `/403` on unauthorized access?
- [ ] No server data leaked to unauthorized roles?

### 3. API Route Protection
For each API route in the module:
- [ ] Calls `requireUser()` as first operation?
- [ ] Checks `can(role, module, action)` for write operations?
- [ ] Returns 403 (not 401) for valid user without permission?
- [ ] Returns 401 for unauthenticated requests?

### 4. UI Element Visibility
- [ ] Create/New buttons hidden for users without `create` permission?
- [ ] Edit buttons hidden for users without `update` permission?
- [ ] Delete buttons hidden for users without `delete` permission?
- [ ] Sensitive data (financials, salaries) hidden from unauthorized roles?

### 5. Role Hierarchy
- [ ] User management respects `canManageRole()` from user-hierarchy?
- [ ] ADMIN can manage all roles?
- [ ] GERENTE can only manage USUARIO, FINANCEIRO, ESTOQUE?
- [ ] Other roles cannot access user management at all?

### 6. Data Filtering
- [ ] Queries filter by `empresaId` from user context?
- [ ] No cross-tenant data leakage?
- [ ] Role-appropriate data scope? (USUARIO sees own projects, GERENTE sees team projects)

## Testing Matrix
Test each role against the module:

| Action | ADMIN | GERENTE | FINANCEIRO | ESTOQUE | USUARIO | CLIENTE |
|--------|-------|---------|------------|---------|---------|---------|
| View page | | | | | | |
| List items | | | | | | |
| Create | | | | | | |
| Edit | | | | | | |
| Delete | | | | | | |

Fill with ✅ (works correctly), ❌ (broken), ⚠️ (needs fix)

## Output Format
```markdown
## RBAC Review: [Module/System]
Date: [Date]

### Sidebar: ✅/❌
[details]

### Pages: X/Y compliant
| Page | requireServerUser | can() check | 403 redirect |
|------|-------------------|-------------|--------------|

### APIs: X/Y compliant
| Route | Method | requireUser | can() check | 403 response |
|-------|--------|-------------|-------------|--------------|

### UI Elements: X issues
[list visible elements that should be hidden]

### Critical Issues
1. [must fix before user testing]

### Recommendations
1. ...
```
