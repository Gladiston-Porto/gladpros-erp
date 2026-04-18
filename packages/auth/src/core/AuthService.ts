import { LoginCredentials, RegisterData, User, AuthTokens, AuthConfig, UserRole } from '../types'
import { validatePassword } from '../utils/password'
import { hashPassword, comparePassword } from '../utils/bcrypt'
import { generateTokens, verifyToken } from '../utils/jwt'

export class AuthService {
  private config: AuthConfig

  constructor(config: AuthConfig) {
    this.config = config
  }

  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    // This would typically query your database
    // For now, we'll simulate with a mock user
    const mockUser = await this.findUserByEmail(credentials.email)

    if (!mockUser) {
      throw new Error('User not found')
    }

    // In a real implementation, you'd compare the hashed password
    const isValidPassword = await comparePassword(credentials.password, mockUser.password || 'hashedpassword')

    if (!isValidPassword) {
      throw new Error('Invalid password')
    }

    const tokens = generateTokens(
      mockUser,
      this.config.jwtSecret,
      'refresh-secret', // Should be from config
      this.config.jwtExpiresIn,
      this.config.refreshTokenExpiresIn
    )

    // Remove password from response
    const { password, ...userWithoutPassword } = mockUser

    return {
      user: userWithoutPassword,
      tokens
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<User> {
    // Validate password
    const passwordValidation = validatePassword(data.password, this.config)
    if (!passwordValidation.isValid) {
      throw new Error(`Invalid password: ${passwordValidation.errors.join(', ')}`)
    }

    // Check if user already exists
    const existingUser = await this.findUserByEmail(data.email)
    if (existingUser) {
      throw new Error('User already exists')
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password, this.config.bcryptRounds)

    // Create user (this would typically save to database)
    const newUser: User = {
      id: Date.now().toString(), // Mock ID generation
      email: data.email,
      name: data.name,
      role: UserRole.USER, // Default role
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // In a real implementation, you'd save the user with hashed password
    console.log('User registered:', { ...newUser, password: hashedPassword })

    return newUser
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): User | null {
    return verifyToken(token, this.config.jwtSecret)
  }

  /**
   * Mock user lookup - replace with actual database query
   */
  private async findUserByEmail(email: string): Promise<(User & { password?: string }) | null> {
    // Mock implementation
    if (email === 'admin@example.com') {
      return {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: await hashPassword('password', this.config.bcryptRounds)
      }
    }

    return null
  }
}