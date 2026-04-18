# @gladpros/proposals

A comprehensive proposal management module for GladPros applications, providing complete CRUD operations, status tracking, and business logic for proposals.

## Features

- 📋 Complete proposal lifecycle management
- 💰 Automatic price calculations and currency formatting
- 📊 Status tracking and analytics
- 🔍 Advanced filtering and search
- 📎 File attachments support
- 📧 Email notifications
- 📱 Responsive React components
- 🔒 TypeScript support with full type safety

## Installation

```bash
npm install @gladpros/proposals
```

## Quick Start

```tsx
import { ProposalProvider, useProposals, ProposalList } from '@gladpros/proposals'

function App() {
  return (
    <ProposalProvider>
      <MyProposalsApp />
    </ProposalProvider>
  )
}

function MyProposalsApp() {
  const { proposals, createProposal, updateProposal } = useProposals()

  return (
    <div>
      <ProposalList proposals={proposals} />
      <button onClick={() => createProposal(newProposalData)}>
        Create Proposal
      </button>
    </div>
  )
}
```

## API Reference

### Core Types

```typescript
interface Proposal {
  id: string
  title: string
  description: string
  clientId: string
  status: ProposalStatus
  value: number
  items: ProposalItem[]
  // ... more fields
}

enum ProposalStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}
```

### Hooks

#### `useProposals()`
Main hook for proposal management.

```tsx
const {
  proposals,        // Array of proposals
  loading,          // Loading state
  error,            // Error message
  createProposal,   // Create new proposal
  updateProposal,   // Update existing proposal
  deleteProposal,   // Delete proposal
  getProposal,      // Get single proposal
  filterProposals   // Filter proposals
} = useProposals()
```

### Components

#### `ProposalList`
Display list of proposals with filtering.

```tsx
<ProposalList
  proposals={proposals}
  onProposalClick={(proposal) => console.log(proposal)}
  filters={activeFilters}
/>
```

#### `ProposalForm`
Form for creating/editing proposals.

```tsx
<ProposalForm
  initialData={proposal}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
/>
```

### Utilities

#### Currency Formatting
```typescript
import { formatCurrency, calculateProposalTotal } from '@gladpros/proposals/utils'

const formatted = formatCurrency(1234.56, 'BRL') // "R$ 1.234,56"
const total = calculateProposalTotal(proposal.items)
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © GladPros Team