---
name: business-logic-validator
description: "Use when validating business logic, state machines, workflows, or process flows. Covers all GladPros business flows: proposals, projects, materials, financials, service orders, users, and blocking."
---

# Skill: Business Logic Validator

## When to Use
- Creating or modifying state transitions (proposal status, project phases, etc.)
- Validating that a business flow is complete and correct
- Reviewing if all edge cases are handled
- Checking that status changes have proper permission checks

## Business Flows

### 1. Login Flow
```
Credentials → [valid?] → MFA Check → [valid?] → Dashboard
                ↓ no                    ↓ no
           Error + counter          Error + counter
                ↓ (5 fails)              ↓ (5 fails)
           Account Blocked          Account Blocked
                ↓                        ↓
        PIN/Security Q → Unblock → Login
```
- First access: forced password change + profile setup wizard
- Token: JWT (jose) with version tracking for invalidation
- MFA: 6-digit email code, optional per user

### 2. Proposal Flow
```
RASCUNHO → ENVIADA → ASSINADA → APROVADA
    ↓         ↓         ↓          ↓
CANCELADA  CANCELADA  CANCELADA   (final)
```
- **RASCUNHO**: Editable, not visible to client
- **ENVIADA**: Sent to client, read-only for internal, client can view/sign
- **ASSINADA**: Client signed, pending internal approval
- **APROVADA**: Approved, can generate project
- **CANCELADA**: Terminal state from any active state
- Transitions require: `can(role, "propostas", "update")`

### 3. Project Flow
```
PLANEJADO → EM_EXECUCAO → EM_INSPECAO → CONCLUIDO → ARQUIVADO
    ↓           ↓              ↓
 (cancel)    (cancel)       (reject → EM_EXECUCAO)
```
- **PLANEJADO**: Setup phase, assign team, materials
- **EM_EXECUCAO**: Active work, track hours, consume materials
- **EM_INSPECAO**: Quality check, inspection
- **CONCLUIDO**: Finished, generate invoice
- **ARQUIVADO**: Archived after payment complete

### 4. Material/Stock Flow
```
PLANNED → RESERVED → ISSUED → CONSUMED
                        ↓
                    RETURNED (partial/full)
```
- **PLANNED**: Material listed in project plan
- **RESERVED**: Quantity reserved from inventory
- **ISSUED**: Physically issued to project/worker
- **CONSUMED**: Used in project (decrements stock permanently)
- **RETURNED**: Returned to stock (increments back)
- Stock levels: track `quantity`, `reserved`, `available`

### 5. Financial Flow
```
Estimation → Invoice → Payment → Revenue
    ↓           ↓         ↓
 (adjust)    (void)    (refund)
```
- Estimation: linked to proposal
- Invoice: generated from approved proposal or completed project
- Payment: multiple methods (check, card, ACH, cash)
- Revenue: recognized on payment receipt
- All amounts in USD

### 6. Service Order (OS) Flow
```
CRIADA → EM_EXECUCAO → CONCLUIDA
   ↓         ↓
CANCELADA  CANCELADA
```
- Linked to project
- Assigned to workers/teams
- Track start/end times, materials used, notes

### 7. User Lifecycle
```
Created → Provisional Email → First Login → MFA Setup → Active Use
                                    ↓
                              Password Change (forced on first login)
```

### 8. Account Blocking
```
Login Fail (×5) → Account Blocked → PIN/Security Question → Unblocked
                                            ↓ fail
                                    Admin Manual Unblock
```

## Validation Checklist
When reviewing a flow:
1. [ ] All states defined in enum/constant?
2. [ ] Transition function validates current state before allowing change?
3. [ ] Each transition checks RBAC permission?
4. [ ] Invalid transitions return clear error message?
5. [ ] Terminal states cannot be transitioned out of?
6. [ ] Cancellation available from non-terminal states?
7. [ ] Status change creates audit log entry?
8. [ ] UI reflects all possible states with appropriate Badge variants?
9. [ ] Loading state during transition?
10. [ ] Optimistic update with rollback on failure?
