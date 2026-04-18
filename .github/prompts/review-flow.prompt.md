---
description: "Review a business flow end-to-end: states, transitions, feedback, error recovery"
agent: "agent"
---

# Review Flow — Business Process Audit

Review a complete business flow in GladPros from start to finish.

**Ask the user which flow to review**:
- Login → Dashboard
- Proposal lifecycle (RASCUNHO → APROVADA)
- Project lifecycle (PLANEJADO → ARQUIVADO)
- Material flow (PLANNED → CONSUMED/RETURNED)
- Financial flow (Estimation → Revenue)
- Service Order (CRIADA → CONCLUIDA)
- User creation → First login

## Review Points

### 1. State Machine
- [ ] All states defined as enum/constant?
- [ ] Valid transitions documented and enforced?
- [ ] Invalid transitions blocked with error message?
- [ ] Terminal states cannot be exited?

### 2. Permissions
- [ ] Each transition checks RBAC with `can()`?
- [ ] Different roles see appropriate actions?
- [ ] Unauthorized transitions return 403?

### 3. UI Feedback
- [ ] Current state clearly visible (Badge, status indicator)?
- [ ] Available actions match current state?
- [ ] Confirmation dialog for destructive actions (cancel, delete)?
- [ ] Loading state during transitions?
- [ ] Success/error toast after transition?

### 4. Data Integrity
- [ ] State change persisted to database?
- [ ] Related records updated (e.g., stock reserved when project starts)?
- [ ] Audit log created for state changes?
- [ ] Rollback on partial failure?

### 5. Edge Cases
- [ ] Concurrent state change handling?
- [ ] Network failure during transition?
- [ ] Browser back button after transition?
- [ ] Page refresh during transition?

## Output Format
```markdown
## Flow Review: [Flow Name]
Date: [Date]
States: [list all states]
Files: [list relevant files]

### Flow Diagram
[ASCII or description of the actual flow in code]

### State Transitions
| From | To | Permission | UI Feedback | Status |
|------|----|-----------|-------------|--------|
| RASCUNHO | ENVIADA | propostas:update | ✅ toast | ✅ |

### Issues
1. [severity] [description] [file:line]

### Recommendations
1. ...
```
