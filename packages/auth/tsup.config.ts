import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Temporarily disabled due to TypeScript config issues
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'next'],
})