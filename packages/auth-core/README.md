# Auth Core Package

A comprehensive authentication and authorization system for Next.js applications.

## Overview

The `@auth-core` package provides a complete authentication solution with:
- User authentication (login/logout)
- Password management
- Session handling
- Role-based access control (RBAC)
- JWT token management
- Middleware for route protection

## Installation

```bash
npm install @auth-core
# or
yarn add @auth-core
```

## Quick Start

### 1. Environment Variables

```env
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-token-secret
BCRYPT_ROUNDS=12
```

### 2. Basic Usage

```typescript
import { AuthService, AuthMiddleware } from '@auth-core';

// Authenticate user
const tokens = await AuthService.authenticate({
  email: 'user@example.com',
  password: 'password123'
});

// Protect a route
export async function GET(request: NextRequest) {
  const result = await AuthMiddleware.authenticate(request, {
    requiredRoles: ['admin'],
    requiredPermissions: ['read:users']
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.response?.statusText },
      { status: result.response?.status || 401 }
    );
  }

  // Your protected logic here
  return NextResponse.json({ data: 'Protected content' });
}
```

## Core Services

### AuthService

Handles user authentication and token management.

```typescript
import { AuthService } from '@auth-core';

// Login user
const tokens = await AuthService.authenticate({
  email: 'user@example.com',
  password: 'password123'
});

// Validate token
const isValid = await AuthService.validateToken(token);

// Logout user
await AuthService.logout(userId);
```

### PasswordService

Manages password operations securely.

```typescript
import { PasswordService } from '@auth-core';

// Change password
await PasswordService.changePassword(userId, {
  currentPassword: 'oldpass',
  newPassword: 'newpass123'
});

// Reset password
await PasswordService.resetPassword(email);

// Validate password strength
const isStrong = PasswordService.validatePasswordStrength('password123');
```

### SessionService

Manages user sessions and tokens.

```typescript
import { SessionService } from '@auth-core';

// Create session
const session = await SessionService.createSession({
  userId: 1,
  userAgent: 'Chrome/91.0',
  ipAddress: '192.168.1.1'
});

// Validate session
const isValid = await SessionService.validateSession(sessionId);

// Invalidate session
await SessionService.invalidateSession(sessionId);
```

### RBACService

Role-based access control system.

```typescript
import { RBACService } from '@auth-core';

// Check permission
const hasPermission = await RBACService.checkPermission({
  userId: 1,
  resource: 'users',
  action: 'read'
});

// Get user permissions
const permissions = await RBACService.getUserPermissions(userId);

// Check role access
const hasRole = await RBACService.hasRole(userId, 'admin');
```

## Middleware

### Authentication Middleware

```typescript
import { AuthMiddleware } from '@auth-core';

// Basic authentication
const result = await AuthMiddleware.authenticate(request);

// With role requirements
const result = await AuthMiddleware.authenticate(request, {
  requiredRoles: ['admin', 'manager']
});

// With permission requirements
const result = await AuthMiddleware.authenticate(request, {
  requiredPermissions: ['read:users', 'write:posts']
});

// Public route
const result = await AuthMiddleware.authenticate(request, {
  allowPublic: true
});
```

## Types

### Core Types

```typescript
import type {
  User,
  LoginCredentials,
  AuthTokens,
  AuthResult,
  AuthMiddlewareOptions
} from '@auth-core';

// User interface
interface User {
  id: number;
  email: string;
  nomeCompleto?: string;
  role: UserRole;
  status: UserStatus;
  // ... other properties
}

// Login credentials
const credentials: LoginCredentials = {
  email: 'user@example.com',
  password: 'password123',
  rememberMe: true
};
```

### User Roles

```typescript
type UserRole = 'admin' | 'manager' | 'user' | 'client';
```

### User Status

```typescript
type UserStatus = 'active' | 'inactive' | 'blocked' | 'pending';
```

## Error Handling

The package uses consistent error handling:

```typescript
try {
  const result = await AuthService.authenticate(credentials);

  if (!result.success) {
    // Handle authentication failure
    console.error('Authentication failed:', result.error);
    return NextResponse.json(
      { error: result.error },
      { status: 401 }
    );
  }

  // Success - use result.user and result.tokens
} catch (error) {
  // Handle unexpected errors
  console.error('Unexpected error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

## Security Features

- **Password Hashing**: Uses bcrypt with configurable rounds
- **JWT Tokens**: Secure token generation and validation
- **Session Management**: Automatic session invalidation
- **Role-Based Access**: Granular permission system
- **MFA Support**: Multi-factor authentication ready
- **Audit Logging**: Comprehensive security logging

## Configuration

### Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-token-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Password Security
BCRYPT_ROUNDS=12

# Session Configuration
SESSION_TIMEOUT=24h
MAX_SESSIONS_PER_USER=5
```

### Custom Configuration

```typescript
import { AuthService } from '@auth-core';

// Configure JWT settings
AuthService.configure({
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtExpiresIn: '15m',
  jwtRefreshExpiresIn: '7d'
});
```

## API Reference

### AuthService Methods

- `authenticate(credentials)` - Authenticate user
- `validateToken(token)` - Validate JWT token
- `refreshToken(refreshToken)` - Refresh access token
- `logout(userId)` - Logout user
- `getUserById(id)` - Get user by ID
- `getUserByEmail(email)` - Get user by email

### PasswordService Methods

- `changePassword(userId, data)` - Change user password
- `resetPassword(email)` - Initiate password reset
- `validatePasswordStrength(password)` - Check password strength
- `hashPassword(password)` - Hash password
- `verifyPassword(password, hash)` - Verify password against hash

### SessionService Methods

- `createSession(data)` - Create new session
- `validateSession(sessionId)` - Validate session
- `invalidateSession(sessionId)` - Invalidate session
- `getUserSessions(userId)` - Get all user sessions
- `invalidateAllUserSessions(userId)` - Invalidate all user sessions

### RBACService Methods

- `checkPermission(data)` - Check if user has permission
- `getUserPermissions(userId)` - Get user permissions
- `hasRole(userId, role)` - Check if user has role
- `getUserRoles(userId)` - Get user roles
- `assignRole(userId, role)` - Assign role to user
- `revokeRole(userId, role)` - Revoke role from user

## Contributing

1. Follow TypeScript strict mode guidelines
2. Add JSDoc comments for all public APIs
3. Write comprehensive tests
4. Follow semantic versioning
5. Update documentation for API changes

## License

MIT License - see LICENSE file for details.</content>
<parameter name="filePath">c:\Users\gladi\Documents\gladpros-nextjs\packages\auth-core\README.md
