import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // Standalone output para Docker (copia apenas o necessário para o container)
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  // E2E_BUILD=1 → build para suite E2E sem falhar em erros TS/ESLint herdados
  typescript: {
    ignoreBuildErrors: process.env.E2E_BUILD === '1',
  },
  eslint: {
    ignoreDuringBuilds: process.env.E2E_BUILD === '1',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  experimental: isDev
    ? {}
    : {
        optimizeCss: true,
      },
  // Servir arquivos estáticos do diretório uploads
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },
  // Configuração para desenvolvimento
  ...(process.env.NODE_ENV === 'development' && {
    headers: async () => [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ],
  }),
};

// Em dev: skip Sentry (reduz ~3000 módulos por rota e evita restart por memória)
// Em prod: Sentry ativo com source maps e upload automático
export default isDev
  ? nextConfig
  : withSentryConfig(nextConfig, {
      org: 'gladpros',
      project: 'gladpros',

      // Faz upload de source maps para o Sentry durante o build (erros mostram linha real)
      silent: !process.env.CI,

      // Desabilita telemetria do SDK no build
      telemetry: false,

      // Não injeta código automático do Sentry nos routes (já fazemos manualmente)
      autoInstrumentServerFunctions: false,
      autoInstrumentMiddleware: false,
      autoInstrumentAppDirectory: false,

      // Source maps: só em produção
      sourcemaps: {
        disable: false,
      },
    });
