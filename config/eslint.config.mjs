import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Ignores (substitui .eslintignore)
    ignores: [
      ".scripts/**",
      "scripts/powershell/**",
      ".next/**",
      "out/**",
      "dist/**",
      "build/**",
      "node_modules/**",
      "coverage/**",
      "*.log",
      "*.tmp",
      ".DS_Store",
      "tsconfig.tsbuildinfo",
      "test-results/**",
      "playwright-report/**",
      "docs/archived/**",
      "debug-*.js",
      "checkuser.js",
      "checkuser.mjs",
      "archive/**",
      "old/**",
      "test-*.log",
      "count-records.js",
      "config/jest.config.js",
      "config/jest.setup.js",
      "tests/**",
      "test-prisma.js",
      "fix_*.js",
      "fix_*.py",
      "query-ids.js",
      "seed-*.js",
      "check-and-fix-duplicates.js",
      "dedupe-workers.js",
      "backfill-*.js",
      "src/lib/estoque/types.ts",
      "src/shared/types/prisma-temp.d.ts",
      "src/shared/types/proposta.ts",
      "src/shared/lib/sanitize.ts",
      "src/lib/estoque/types.ts",
      "src/domains/projects/**",
      "prisma/**",
      "packages/**",
      "scripts/**",
      "next-env.d.ts",
      "jest.config.js",
      "fix-material-code.js",
    ],
  },
  {
    rules: {
      // Basic TypeScript rules - Fase 3 foundation
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",

      // Allow during transition
      "@typescript-eslint/ban-ts-comment": "warn",

      // Proibir console.log em produção — usar console.error/warn para erros reais.
      // Logs operacionais intencionais devem usar // eslint-disable-next-line no-console
      "no-console": ["warn", { allow: ["error", "warn"] }],
    },
  },
  {
    files: ["src/tests/**/*.{js,ts,tsx}", "src/__tests__/**/*.{js,ts,tsx}", "src/**/__tests__/**/*.{js,ts,tsx}", "scripts/**/*.{js,ts}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "import/no-anonymous-default-export": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    files: ["packages/auth-core/**/*.{ts,tsx}"],
    rules: {
      // Stricter rules for core packages
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];

export default eslintConfig;
