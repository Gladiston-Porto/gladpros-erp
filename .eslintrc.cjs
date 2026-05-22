module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'security',
    'no-secrets',
    'no-only-tests',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:security/recommended-legacy',
    'prettier'
  ],
  env: { node: true, browser: true, es2021: true },
  parserOptions: { ecmaVersion: 2020, sourceType: 'module', project: './tsconfig.json' },
  rules: {
    // Detecta tokens, senhas e secrets hardcoded no código
    'no-secrets/no-secrets': ['warn', { tolerance: 4.0 }],

    // Proíbe .only em testes (bloqueia CI se esquecido)
    'no-only-tests/no-only-tests': 'error',

    // Segurança — desabilitar regras com muito falso positivo no Next.js
    'security/detect-object-injection': 'off',
    'security/detect-non-literal-fs-filename': 'off',
  },
  overrides: [
    {
      // Arquivos de teste — liberar algumas regras de segurança
      files: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx', 'tests/**'],
      rules: {
        'no-secrets/no-secrets': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      }
    }
  ]
};
