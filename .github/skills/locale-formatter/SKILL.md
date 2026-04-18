---
name: locale-formatter
description: "Use when working with currency, dates, timezone, locale formatting, phone numbers, or addresses. Covers US (Dallas, TX) formatting standards for GladPros."
---

# Skill: Locale & Formatting — US Standards

## When to Use
- Formatting currency values (ALWAYS USD, never BRL)
- Displaying dates and times (ALWAYS America/Chicago, never UTC)
- Formatting phone numbers or addresses
- Creating or modifying any display that involves money, dates, or locations

## Operation Context
- **Location**: Dallas, Texas, USA
- **Currency**: USD (US Dollar)
- **Locale**: `en-US`
- **Timezone**: `America/Chicago` (Central Time)
- **Interface language**: Portuguese (pt-BR) — labels and UI text in Portuguese
- **Data formatting**: US standards (dates, currency, phone, address)

## Currency — USD

### Formatting
```typescript
// Standard formatter
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)

// Examples:
formatCurrency(1234.56)    // "$1,234.56"
formatCurrency(0)          // "$0.00"
formatCurrency(-500)       // "-$500.00"
```

### Rules
- Always use `en-US` locale with `USD` currency
- Decimal separator: `.` (period)
- Thousands separator: `,` (comma)
- Symbol: `$` (prefix)
- Never use `R$`, `BRL`, or Brazilian formatting
- Store as `Decimal` in Prisma (not `Float`)

## Dates & Times

### Formatting
```typescript
// Date only
const formatDate = (date: Date | string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "medium", // "Mar 29, 2026"
  }).format(new Date(date))

// Date + Time
const formatDateTime = (date: Date | string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "medium",
    timeStyle: "short", // "Mar 29, 2026, 2:30 PM"
  }).format(new Date(date))

// Short date
const formatShortDate = (date: Date | string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "2-digit",
    day: "2-digit",
    year: "numeric", // "03/29/2026"
  }).format(new Date(date))
```

### Rules
- Always specify `timeZone: "America/Chicago"`
- Date format: MM/DD/YYYY (US standard)
- Time format: 12-hour with AM/PM
- Never display raw UTC dates to users
- Store as `DateTime` in Prisma (stored as UTC, displayed as Central)

## Phone Numbers

### Format
```
(214) 555-1234       // Local (Dallas area code 214, 469, 972)
+1 (214) 555-1234    // International format
```

### Validation (Zod)
```typescript
const phoneSchema = z.string()
  .regex(/^\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/, "Telefone inválido")
  .optional()
```

## Addresses

### US Format
```
Street Address
Unit/Suite (optional)
City, State ZIP

// Example:
1234 Main Street
Suite 200
Dallas, TX 75201
```

### Fields
```typescript
interface Address {
  street: string       // "1234 Main Street"
  unit?: string        // "Suite 200"
  city: string         // "Dallas"
  state: string        // "TX" (2-letter code)
  zipCode: string      // "75201" (5 digits) or "75201-1234" (ZIP+4)
  country?: string     // "US" (default, usually omitted)
}
```

### State Validation
```typescript
const stateSchema = z.string().length(2, "Use código de 2 letras (ex: TX)")
const zipSchema = z.string().regex(/^\d{5}(-\d{4})?$/, "ZIP inválido")
```

## Known Issues to Fix
See [us-formatting.md](./references/us-formatting.md) for the list of modules that need formatting correction.
