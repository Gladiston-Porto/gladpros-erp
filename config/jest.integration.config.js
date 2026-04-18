/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path')
const nextJest = require('next/jest')

const projectRoot = path.resolve(__dirname, '..')
const createJestConfig = nextJest({ dir: projectRoot })

const customConfig = {
  rootDir: projectRoot,
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/**/__tests__/integration/**/*.test.{ts,tsx,js}',
    '<rootDir>/src/**/__tests__/integration/**/*.{ts,tsx,js}',
  ],
  setupFilesAfterEnv: ['<rootDir>/config/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/shared/(.*)$': '<rootDir>/src/shared/$1',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(jsdom|parse5|nwsapi|cssstyle|whatwg-url)/)',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/docs/archived/',
  ],
  watchPathIgnorePatterns: [
    '<rootDir>/docs/archived/',
  ],
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
}

module.exports = createJestConfig(customConfig)
