# GladPros-Financeiro Module

Financial Management System Module for GladPros

## Overview

This module handles all financial operations including:
- **Accounts Management** (Contas Bancárias)
- **Income** (Receitas)
- **Expenses** (Despesas)
- **Cash Flow Analysis** (Fluxo de Caixa)
- **Project Financial Integration** (Gateway Pattern with Projetos)

## Structure

```
src/
├── app/                    # Next.js pages and routes
│   ├── financeiro/        # Main financial dashboard
│   └── dashboard/         # Financial sub-routes
├── api/                   # API endpoints
├── components/            # React components
├── lib/                   # Utilities and helpers
├── gateways/             # Integration gateways (Projetos)
├── __tests__/            # Unit and integration tests
└── types/                # TypeScript type definitions
```

## Features

- **Gateway Pattern**: Seamless integration with ProjetoFinanceiro types
- **Real-time Dashboard**: Live financial metrics and analytics
- **Multi-account Support**: Manage multiple bank accounts
- **Cash Flow Forecasting**: Project future cash positions
- **Audit Trail**: Complete transaction history and logs

## Integration

### With Projetos Module

The module integrates with the Projetos module through the Gateway Pattern:

```typescript
// src/gateways/projeto-financeiro.ts
import type { ProjetoFinanceiro } from '@gladpros/financeiro/types'
```

## Testing

```bash
npm run test
npm run test:watch
npm run coverage
```

## Build

```bash
npm run build
npm run type-check
```

## API Endpoints

- `GET /api/financeiro/contas` - List accounts
- `GET /api/financeiro/receitas` - List income
- `POST /api/financeiro/receitas` - Create income
- `GET /api/financeiro/despesas` - List expenses
- `POST /api/financeiro/despesas` - Create expense
- `GET /api/financeiro/fluxo-caixa` - Cash flow analysis

## Dependencies

- React 18+
- Next.js 14+
- TypeScript 5+
- Prisma (for database access)

## Contributing

Follow the GladPros development guidelines.

## License

MIT
