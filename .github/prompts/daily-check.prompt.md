---
description: "Daily health check: build, type-check, lint, console.log cleanup, TODO/FIXME review"
agent: "agent"
---

# Daily Check — Build & Code Quality

Run a daily health check on the GladPros project.

## Steps

1. **Build Check**: Run `npx next build` and report any errors
2. **Type Check**: Run `npx tsc --noEmit` and list type errors
3. **Lint**: Run `npx next lint` and summarize violations
4. **Console.log Scan**: Search for `console.log` in `src/app/` and `src/components/` — these should not be in production code
5. **TODO/FIXME**: Search for `TODO`, `FIXME`, `HACK`, `XXX` comments in `src/` — categorize by severity
6. **Dead Imports**: Check for unused imports flagged by lint

## Output Format
```markdown
## Daily Check — [Date]

### Build: ✅/❌
[errors if any]

### Type Check: ✅/❌
[X errors found — list top 10]

### Lint: ✅/❌
[X warnings, Y errors — summary]

### Console.log: X found
[list file:line for each]

### TODO/FIXME: X found
| Priority | File | Line | Comment |
|----------|------|------|---------|

### Recommendation
[Top 3 things to fix first]
```
