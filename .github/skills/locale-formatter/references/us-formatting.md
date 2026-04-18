# US Formatting Standards

## Quick Reference

| Type | Format | Locale | Example |
|------|--------|--------|---------|
| Currency | `$X,XXX.XX` | `en-US` + `USD` | `$1,234.56` |
| Date (short) | `MM/DD/YYYY` | `en-US` | `03/29/2026` |
| Date (medium) | `Mon DD, YYYY` | `en-US` | `Mar 29, 2026` |
| Time | `HH:MM AM/PM` | `en-US` | `2:30 PM` |
| Timezone | Central Time | `America/Chicago` | `CST` / `CDT` |
| Phone | `(XXX) XXX-XXXX` | — | `(214) 555-1234` |
| ZIP | `XXXXX` or `XXXXX-XXXX` | — | `75201` |
| State | 2-letter code | — | `TX` |

## Module Formatting Status

| Module | Current | Correct | Status |
|--------|---------|---------|--------|
| Dashboard | Mixed | USD / en-US | ⚠️ Needs review |
| Financeiro | **BRL (R$)** | **USD ($)** | ❌ **Must fix** |
| Estoque | USD | USD | ✅ Correct |
| Propostas | USD | USD | ✅ Correct |
| Projetos | Mixed | USD / en-US | ⚠️ Needs review |
| Invoices | USD | USD | ✅ Correct |
| Clientes | — | en-US dates | ⚠️ Needs review |

## Common Mistakes to Avoid

1. **`R$` or `BRL`** → Always `$` / `USD`
2. **`DD/MM/YYYY`** → Always `MM/DD/YYYY`
3. **24-hour time** → Always 12-hour with AM/PM
4. **UTC dates** → Always `America/Chicago`
5. **`pt-BR` number format** (`1.234,56`) → Always `en-US` (`1,234.56`)
6. **CEP format** → Always US ZIP code
7. **Brazilian phone format** → Always US `(XXX) XXX-XXXX`

## Intl API Cheat Sheet

```typescript
// Currency
new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

// Percentage
new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 })

// Number (plain)
new Intl.NumberFormat("en-US")

// Date (medium)
new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", dateStyle: "medium" })

// Date + Time
new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" })

// Relative time
new Intl.RelativeTimeFormat("en-US", { numeric: "auto" })
```
