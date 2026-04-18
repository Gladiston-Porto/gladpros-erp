import pino from 'pino';

// Evita thread-stream/pino-pretty no bundle do Next em desenvolvimento.
// O transport com worker continua disponível via flag explícita.
const enablePrettyTransport =
  process.env.NODE_ENV === 'development' &&
  process.env.ENABLE_PINO_PRETTY === 'true';

// Configuração do logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: enablePrettyTransport ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

export default logger;
