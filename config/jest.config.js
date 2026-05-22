const nextJest = require('next/jest');

/** @type {import('jest').Config} */
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const config = {
  displayName: 'unit',
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/config/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/shared/(.*)$': '<rootDir>/src/shared/$1',
    // Workspace package — resolve from source so tests do not depend on dist artifacts in CI
    '^@gladpros/ui$': '<rootDir>/packages/ui/src/index.ts',
    '^@gladpros/ui/(.*)$': '<rootDir>/packages/ui/src/components/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**/layout.tsx',
    '!src/app/**/page.tsx',
    '!src/app/**/not-found.tsx',
    '!src/app/**/error.tsx',
    '!src/app/**/loading.tsx',
  ],

  // Thresholds de cobertura por módulo auditado.
  // Módulos novos devem adicionar sua entrada aqui ao atingir maturidade de testes.
  // Isso garante que adições futuras não reduzam silenciosamente a cobertura conquistada.
  coverageThreshold: {
    // Módulo Clientes — auditado e com cobertura garantida (Abril/2026)
    './src/app/api/clientes/': {
      lines: 70,
      functions: 70,
      branches: 60,
      statements: 70,
    },
    './src/components/clientes/': {
      lines: 70,
      functions: 65,
      statements: 70,
    },
    './src/shared/lib/helpers/': {
      lines: 65,
      functions: 65,
      statements: 65,
    },
    // Módulo Usuários — auditado e com cobertura garantida (Abril/2026)
    './src/app/api/usuarios/': {
      lines: 75,
      functions: 70,
      branches: 65,
      statements: 75,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/?(*.)+(spec|test).{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/integration/',
    '/__tests__/database/',
    'integration.test.ts',
  ],
  modulePathIgnorePatterns: ['<rootDir>/docs/archived/'],
  watchPathIgnorePatterns: ['<rootDir>/docs/archived/'],
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
// We wrap it to forcibly override transformIgnorePatterns since next/jest overrides our custom value
const baseConfig = createJestConfig(config);
module.exports = async () => {
  const resolved = await baseConfig();
  resolved.transformIgnorePatterns = [
    '/node_modules/(?!(jsdom|parse5|nwsapi|cssstyle|whatwg-url|jose)/)',
  ];
  return resolved;
};
