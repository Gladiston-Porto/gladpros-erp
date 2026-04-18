# @gladpros/auth

A comprehensive authentication module for GladPros applications, providing secure user management, JWT tokens, and React hooks.

## Features

- 🔐 JWT-based authentication with refresh tokens
- 👤 User registration and login
- 🔒 Password hashing with bcrypt
- 🎣 React hooks for authentication state
- 🛡️ TypeScript support with full type safety
- 🔄 Automatic token refresh
- 📱 React components for auth forms
- 🏗️ Modular architecture

## Installation

```bash
npm install @gladpros/auth
```

## Quick Start

```tsx
import { AuthProvider, useAuth, LoginForm } from '@gladpros/auth'

function App() {
  return (
    <AuthProvider>
      <MyApp />
    </AuthProvider>
  )
}

function MyApp() {
  const { isAuthenticated, user, logout } = useAuth()

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return (
    <div>
      <h1>Welcome, {user?.name}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

## API Reference

### Hooks

#### `useAuth()`
Provides authentication state and methods.

```tsx
const {
  user,           // Current user object
  isAuthenticated, // Boolean indicating auth status
  isLoading,      // Loading state
  error,          // Error message
  login,          // Login function
  logout,         // Logout function
  updateUser,     // Update user data
  setError        // Set error message
} = useAuth()
```

#### `useLogin()`
Handles user login with loading and error states.

```tsx
const { login, isLoading, error } = useLogin()

const handleLogin = async (credentials) => {
  await login(credentials)
}
```

#### `useRegister()`
Handles user registration.

```tsx
const { register, isLoading, error } = useRegister()

const handleRegister = async (userData) => {
  await register(userData)
}
```

### Components

#### `LoginForm`
Pre-built login form component.

```tsx
<LoginForm
  onSuccess={() => navigate('/dashboard')}
  onForgotPassword={() => navigate('/forgot-password')}
/>
```

#### `AuthProvider`
Context provider for authentication state.

```tsx
<AuthProvider>
  <App />
</AuthProvider>
```

### Core Services

#### `AuthService`
Core authentication service for server-side operations.

```tsx
import { AuthService } from '@gladpros/auth/core'

const authService = new AuthService({
  jwtSecret: 'your-secret',
  jwtExpiresIn: '1h',
  bcryptRounds: 12
})

const result = await authService.login(credentials)
```

## Configuration

Create an auth configuration object:

```typescript
const authConfig = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: '1h',
  refreshTokenExpiresIn: '7d',
  bcryptRounds: 12,
  passwordMinLength: 8,
  passwordRequireSpecialChar: true,
  passwordRequireNumber: true,
  passwordRequireUppercase: true
}
```

## Security Features

- **Password Hashing**: Uses bcrypt with configurable rounds
- **JWT Tokens**: Secure token generation and verification
- **Password Validation**: Configurable password requirements
- **MFA Support**: Built-in multi-factor authentication
- **Session Management**: Automatic token refresh

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

## Environment Variables

```env
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © GladPros Team