# @gladpros/ui

A comprehensive UI component library for GladPros applications, built with React, TypeScript, and Tailwind CSS.

## Features

- 🎨 Modern design system with Tailwind CSS
- 🔧 TypeScript support with full type safety
- 📱 Responsive components
- ♿ Accessibility-first approach
- 🎯 Consistent API across all components
- 🚀 Optimized for performance

## Installation

```bash
npm install @gladpros/ui
```

## Usage

```tsx
import { Button, Card, Input } from '@gladpros/ui'

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Form</CardTitle>
        <CardDescription>Fill out the form below</CardDescription>
      </CardHeader>
      <CardContent>
        <Input placeholder="Enter your name" />
        <Button>Submit</Button>
      </CardContent>
    </Card>
  )
}
```

## Components

### Core Components
- `Button` - Interactive button with multiple variants
- `Input` - Text input field
- `Card` - Container component with header, content, and footer
- `Loading` - Loading spinner with customizable size
- `Modal` - Modal dialog component

### Form Components
- `Form` - Form wrapper component
- `FormField` - Form field wrapper with label and error
- `FormError` - Error message display

### Layout Components
- `Container` - Responsive container with max-width
- `Grid` - CSS Grid layout component
- `Flex` - Flexbox layout component

## Utilities

### Hooks
- `useToggle` - Boolean state management
- `useLocalStorage` - Local storage with SSR safety
- `useDebounce` - Value and function debouncing

### Utilities
- `cn` - Class name utility for conditional styling
- `cva` - Class variance authority for component variants

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

# Run linting
npm run lint
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © GladPros Team