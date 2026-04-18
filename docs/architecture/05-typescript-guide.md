# Guia de Desenvolvimento - TypeScript & Boas Práticas

## Visão Geral

Este guia estabelece as melhores práticas para desenvolvimento TypeScript no projeto GladPros, garantindo código type-safe, manutenível e escalável.

## TypeScript Strict Mode

O projeto utiliza **TypeScript strict mode** habilitado, que inclui:

```json
{
  "compilerOptions": {
    "strict": true,              // Habilita todas as verificações strict
    "noImplicitAny": true,       // Proíbe tipos 'any' implícitos
    "strictNullChecks": true,    // Verificações rigorosas de null/undefined
    "strictFunctionTypes": true, // Funções com tipos rigorosos
    "noImplicitThis": true,      // Proíbe 'this' implícito
    "alwaysStrict": true         // Sempre use strict mode
  }
}
```

### Benefícios do Strict Mode

- **Prevenção de Bugs**: Captura erros em tempo de compilação
- **Melhor IntelliSense**: Autocomplete mais preciso
- **Refatoração Segura**: Mudanças são verificadas pelo compilador
- **Documentação Viva**: Tipos servem como documentação

## Convenções de Tipos

### 1. Interfaces vs Types

```typescript
// ✅ Use interface para objetos que podem ser extendidos
interface User {
  id: number;
  email: string;
  role: UserRole;
}

// ✅ Use type para uniões e primitivos
type UserRole = 'admin' | 'manager' | 'user' | 'client';
type UserStatus = 'active' | 'inactive' | 'blocked';

// ✅ Use interface para classes
interface AuthService {
  login(credentials: LoginCredentials): Promise<AuthResult>;
}
```

### 2. Nomes de Tipos

```typescript
// ✅ PascalCase para tipos e interfaces
interface UserProfile {}
type LoginResponse {}
type ApiError {}

// ✅ Sufixos descritivos
interface CreateUserData {}    // Para dados de criação
interface UpdateUserData {}    // Para dados de atualização
interface UserFilters {}       // Para filtros de busca
```

### 3. Propriedades Opcionais

```typescript
// ✅ Use ? para propriedades realmente opcionais
interface User {
  id: number;           // Sempre presente
  email: string;        // Sempre presente
  phone?: string;       // Pode ser undefined
  avatar?: string;      // Pode ser undefined
}

// ❌ Evite union types desnecessários
interface User {
  phone: string | null; // Prefira undefined para opcional
}
```

## Documentação com JSDoc

### 1. Interfaces e Classes

```typescript
/**
 * User authentication service
 * Handles login, logout, and token management
 */
export class AuthService {
  /**
   * Authenticate user with email and password
   * @param credentials - User login credentials
   * @returns Promise resolving to authentication result
   * @throws {Error} If authentication fails
   */
  static async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    // Implementation
  }
}
```

### 2. Funções Complexas

```typescript
/**
 * Process user registration with validation
 * @param data - Registration data
 * @param options - Additional registration options
 * @returns Promise resolving to registration result
 * @example
 * ```typescript
 * const result = await registerUser({
 *   email: 'user@example.com',
 *   password: 'securePass123',
 *   name: 'John Doe'
 * });
 * ```
 */
async function registerUser(
  data: RegisterData,
  options: RegisterOptions = {}
): Promise<RegisterResult> {
  // Implementation
}
```

### 3. Parâmetros Complexos

```typescript
/**
 * Search users with filters
 * @param filters - Search criteria
 * @param filters.role - Filter by user role
 * @param filters.status - Filter by user status
 * @param filters.search - Text search in name/email
 * @param pagination - Pagination options
 * @param pagination.page - Page number (1-based)
 * @param pagination.limit - Items per page
 * @returns Promise resolving to paginated user list
 */
async function searchUsers(
  filters: UserFilters,
  pagination: PaginationOptions
): Promise<PaginatedUsers> {
  // Implementation
}
```

## Tratamento de Erros

### 1. Tipos de Erro Específicos

```typescript
// ✅ Defina tipos específicos para erros
export class AuthenticationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### 2. Result Types

```typescript
// ✅ Use Result types para operações que podem falhar
type AuthResult =
  | { success: true; user: User; tokens: AuthTokens }
  | { success: false; error: string; code: string };

// ✅ Ou use interfaces discriminadas
interface SuccessResult {
  success: true;
  data: User;
}

interface ErrorResult {
  success: false;
  error: string;
  code: string;
}

type ApiResult = SuccessResult | ErrorResult;
```

### 3. Error Handling Patterns

```typescript
// ✅ Use try/catch com tipos específicos
async function authenticateUser(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    const user = await validateCredentials(credentials);
    const tokens = await generateTokens(user);

    return { success: true, user, tokens };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error: error.message, code: 'VALIDATION_ERROR' };
    }

    if (error instanceof AuthenticationError) {
      return { success: false, error: error.message, code: 'AUTH_ERROR' };
    }

    // Log unexpected errors
    console.error('Unexpected authentication error:', error);
    return { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' };
  }
}
```

## Validação com Zod

### 1. Schema Definition

```typescript
import { z } from 'zod';

// ✅ Defina schemas para validação
export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  rememberMe: z.boolean().optional(),
});

// ✅ Use transforms para conversões
export const CreateUserSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
  name: z.string().min(2).trim(),
  role: z.enum(['admin', 'user', 'client']).default('user'),
});

// ✅ Schema para queries
export const UserFiltersSchema = z.object({
  role: z.enum(['admin', 'user', 'client']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});
```

### 2. Type Inference

```typescript
// ✅ Infira tipos dos schemas
export type LoginCredentials = z.infer<typeof LoginSchema>;
export type CreateUserData = z.infer<typeof CreateUserSchema>;
export type UserFilters = z.infer<typeof UserFiltersSchema>;
```

### 3. Validation Usage

```typescript
// ✅ Valide dados de entrada
export async function login(credentials: unknown): Promise<AuthResult> {
  try {
    const validCredentials = LoginSchema.parse(credentials);
    // Use validCredentials.email, etc. (tipos garantidos)
    return await authenticateUser(validCredentials);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      };
    }
    throw error;
  }
}
```

## Padrões de API

### 1. Next.js API Routes

```typescript
// ✅ Use tipos consistentes para params
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Next.js 15+ async params
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

### 2. Response Types

```typescript
// ✅ Defina tipos para responses
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ✅ Use generics para type safety
export async function getUsers(
  filters: UserFilters
): Promise<NextResponse<PaginatedResponse<User>>> {
  // Implementation
}
```

## Testes

### 1. Testes de Tipo

```typescript
// ✅ Teste se tipos estão corretos
describe('Auth Types', () => {
  it('should have correct LoginCredentials type', () => {
    const credentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: true,
    };

    expect(credentials.email).toBe('test@example.com');
  });

  it('should reject invalid email', () => {
    // @ts-expect-error - This should cause a type error
    const invalid: LoginCredentials = {
      email: 'invalid-email',
      password: 'password123',
    };
  });
});
```

### 2. Testes de Função

```typescript
// ✅ Teste funções com tipos
describe('AuthService.authenticate', () => {
  it('should return AuthResult on success', async () => {
    const credentials: LoginCredentials = {
      email: 'user@example.com',
      password: 'password123',
    };

    const result = await AuthService.authenticate(credentials);

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.tokens).toBeDefined();
  });

  it('should return error on invalid credentials', async () => {
    const credentials: LoginCredentials = {
      email: 'invalid@example.com',
      password: 'wrongpassword',
    };

    const result = await AuthService.authenticate(credentials);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

## Boas Práticas Gerais

### 1. Evite any

```typescript
// ❌ Evite any
function processData(data: any) {
  return data.value;
}

// ✅ Use unknown para dados externos
function processData(data: unknown): string | null {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return String(data.value);
  }
  return null;
}

// ✅ Use generics quando apropriado
function processData<T extends { value: unknown }>(data: T): string {
  return String(data.value);
}
```

### 2. Null vs Undefined

```typescript
// ✅ Use undefined para valores opcionais
interface User {
  id: number;
  email: string;
  phone?: string; // Pode ser undefined
}

// ✅ Use null para valores ausentes intencionais
interface ApiResponse {
  data: User | null; // Explicitamente null quando não encontrado
}
```

### 3. Utility Types

```typescript
// ✅ Use utility types do TypeScript
type PartialUser = Partial<User>;           // Todas propriedades opcionais
type RequiredUser = Required<User>;         // Todas propriedades obrigatórias
type ReadonlyUser = Readonly<User>;         // Propriedades readonly
type PickUser = Pick<User, 'id' | 'email'>; // Apenas propriedades selecionadas
type OmitUser = Omit<User, 'password'>;     // Exclui propriedades
```

### 4. Discriminated Unions

```typescript
// ✅ Use discriminated unions para tipos relacionados
type ApiResponse =
  | { type: 'success'; data: User }
  | { type: 'error'; error: string; code: string }
  | { type: 'loading' };

// ✅ Type narrowing funciona automaticamente
function handleResponse(response: ApiResponse) {
  switch (response.type) {
    case 'success':
      console.log('User:', response.data); // response.data é User
      break;
    case 'error':
      console.error('Error:', response.error); // response.error é string
      break;
    case 'loading':
      console.log('Loading...');
      break;
  }
}
```

## Code Reviews

### Checklist para Revisão

- [ ] **TypeScript strict mode**: Nenhum erro de compilação
- [ ] **Tipos explícitos**: Evite `any`, use tipos específicos
- [ ] **JSDoc**: Documentação completa para APIs públicas
- [ ] **Error handling**: Tratamento adequado de erros
- [ ] **Validação**: Uso de Zod para dados externos
- [ ] **Testes**: Cobertura de tipos e funcionalidades
- [ ] **Nomenclatura**: Convenções consistentes
- [ ] **Performance**: Tipos não impactam performance em runtime

### Ferramentas de Análise

```bash
# Verificar tipos
npx tsc --noEmit

# Verificar linting
npx eslint src/ --ext .ts,.tsx

# Verificar cobertura de testes
npx jest --coverage

# Verificar bundle size
npx next build --analyze
```

## Conclusão

Seguir estas práticas garante:
- **Código mais seguro** com menos bugs em runtime
- **Melhor manutenibilidade** com tipos auto-documentados
- **Desenvolvimento mais rápido** com melhor IntelliSense
- **Refatoração segura** com verificação de tipos
- **Documentação viva** através dos tipos

Lembre-se: **tipos são documentação executável**!</content>
<parameter name="filePath">c:\Users\gladi\Documents\gladpros-nextjs\docs\typescript-guide.md
