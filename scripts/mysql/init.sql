-- Script de inicialização do MySQL em produção
-- Executado automaticamente na primeira inicialização do container

-- Garantir charset correto
ALTER DATABASE gladpros CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Configurações de performance
SET GLOBAL innodb_buffer_pool_size = 256 * 1024 * 1024;  -- 256MB
SET GLOBAL max_connections = 100;
SET GLOBAL wait_timeout = 28800;
SET GLOBAL interactive_timeout = 28800;
