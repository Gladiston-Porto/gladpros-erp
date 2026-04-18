import logger from '../../../shared/lib/logger'

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should log info messages', () => {
    // Pino logger with pretty transport outputs to console
    // We can verify it doesn't throw errors
    expect(() => {
      logger.info({ userId: 1 }, 'Test info message')
    }).not.toThrow()
  })

  it('should log error messages', () => {
    const error = new Error('Test error')
    expect(() => {
      logger.error({ error: error.message, stack: error.stack }, 'Test error message')
    }).not.toThrow()
  })

  it('should log debug messages', () => {
    expect(() => {
      logger.debug({ data: { key: 'value' } }, 'Test debug message')
    }).not.toThrow()
  })

  it('should handle objects in log context', () => {
    const context = { userId: 123, action: 'login', timestamp: new Date() }
    expect(() => {
      logger.info(context, 'User action')
    }).not.toThrow()
  })

  it('should log simple string messages', () => {
    expect(() => {
      logger.info('Simple log message')
    }).not.toThrow()
  })

  it('should be a function (logger instance)', () => {
    expect(typeof logger).toBe('object')
    expect(logger.info).toBeDefined()
    expect(logger.error).toBeDefined()
    expect(logger.debug).toBeDefined()
  })
})
