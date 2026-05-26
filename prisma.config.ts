import { defineConfig } from 'prisma/config';

const databaseUrl = process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/gladpros_ci';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    seed: 'node prisma/seed.js',
  },
});
