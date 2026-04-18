-- CreateTable
CREATE TABLE `AnexoProposta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propostaId` INTEGER NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `filepath` VARCHAR(500) NOT NULL,
    `mime` VARCHAR(100) NOT NULL,
    `uploadedBy` INTEGER NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `descricao` TEXT NULL,
    `privado` BOOLEAN NOT NULL DEFAULT false,

    INDEX `AnexoProposta_propostaId_idx`(`propostaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `entidade` VARCHAR(191) NOT NULL,
    `entidadeId` VARCHAR(191) NOT NULL,
    `acao` VARCHAR(191) NOT NULL,
    `diff` LONGTEXT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entidade_entidadeId_idx`(`entidade`, `entidadeId`),
    INDEX `AuditLog_timestamp_idx`(`timestamp`),
    INDEX `AuditLog_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Auditoria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tabela` VARCHAR(64) NOT NULL,
    `registroId` INTEGER NOT NULL,
    `acao` ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT') NOT NULL,
    `usuarioId` INTEGER NULL,
    `ip` VARCHAR(45) NULL,
    `payload` LONGTEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Auditoria_tabela_registroId_criadoEm_idx`(`tabela`, `registroId`, `criadoEm`),
    INDEX `Auditoria_tabela_registroId_idx`(`tabela`, `registroId`),
    INDEX `Auditoria_usuarioId_idx`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `empresas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(200) NOT NULL,
    `razaoSocial` VARCHAR(200) NOT NULL,
    `cnpj` VARCHAR(18) NULL,
    `email` VARCHAR(255) NULL,
    `telefone` VARCHAR(32) NULL,
    `endereco` JSON NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,
    `addressStreet` VARCHAR(255) NULL,
    `addressUnit` VARCHAR(50) NULL,
    `addressCity` VARCHAR(100) NULL,
    `addressState` VARCHAR(2) NULL DEFAULT 'TX',
    `addressZip` VARCHAR(20) NULL,
    `addressCounty` VARCHAR(100) NULL,

    UNIQUE INDEX `empresas_cnpj_key`(`cnpj`),
    INDEX `empresas_ativo_idx`(`ativo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cliente` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('PF', 'PJ') NOT NULL,
    `nomeCompleto` VARCHAR(191) NULL,
    `razaoSocial` VARCHAR(191) NULL,
    `nomeFantasia` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(32) NOT NULL,
    `nomeChave` VARCHAR(191) NOT NULL,
    `endereco` JSON NULL,
    `addressStreet` VARCHAR(255) NULL,
    `addressUnit` VARCHAR(50) NULL,
    `addressCity` VARCHAR(100) NULL,
    `addressState` VARCHAR(2) NULL DEFAULT 'TX',
    `addressZip` VARCHAR(20) NULL,
    `addressCounty` VARCHAR(100) NULL,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
    `tipoDocumentoPF` ENUM('SSN', 'ITIN') NULL,
    `ssn` VARCHAR(32) NULL,
    `itin` VARCHAR(32) NULL,
    `ein` VARCHAR(32) NULL,
    `documentoEnc` VARCHAR(191) NULL,
    `docLast4` VARCHAR(4) NULL,
    `docHash` CHAR(64) NULL,
    `observacoes` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Cliente_email_key`(`email`),
    UNIQUE INDEX `Cliente_docHash_key`(`docHash`),
    INDEX `Cliente_ativo_idx`(`ativo`),
    INDEX `Cliente_docLast4_idx`(`docLast4`),
    INDEX `Cliente_nomeChave_telefone_idx`(`nomeChave`, `telefone`),
    INDEX `Cliente_status_tipo_idx`(`status`, `tipo`),
    INDEX `Cliente_addressZip_idx`(`addressZip`),
    INDEX `Cliente_addressCounty_idx`(`addressCounty`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxRate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `jurisdictionType` ENUM('STATE', 'COUNTY', 'CITY', 'SPECIAL_DISTRICT') NOT NULL,
    `rate` DECIMAL(6, 4) NOT NULL,
    `code` VARCHAR(50) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TaxRate_code_key`(`code`),
    INDEX `TaxRate_active_idx`(`active`),
    INDEX `TaxRate_jurisdictionType_idx`(`jurisdictionType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pricebook_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `parentId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pricebook_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `categoryId` INTEGER NULL,
    `sku` VARCHAR(50) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('MATERIAL', 'LABOR', 'SERVICE', 'EQUIPMENT', 'FEE') NOT NULL,
    `unit` VARCHAR(20) NOT NULL DEFAULT 'EA',
    `unitCost` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `markupStrategy` ENUM('FIXED_MARGIN', 'FIXED_PRICE') NOT NULL DEFAULT 'FIXED_MARGIN',
    `defaultMargin` DECIMAL(5, 2) NOT NULL DEFAULT 40.00,
    `fixedPrice` DECIMAL(12, 2) NULL,
    `taxable` BOOLEAN NOT NULL DEFAULT true,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pricebook_items_sku_key`(`sku`),
    INDEX `pricebook_items_sku_idx`(`sku`),
    INDEX `pricebook_items_type_idx`(`type`),
    INDEX `pricebook_items_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estimations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projetoId` INTEGER NULL,
    `clienteId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `name` VARCHAR(200) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `estimations_clienteId_idx`(`clienteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estimation_options` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estimationId` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `totalCost` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalPrice` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `grossMargin` DECIMAL(5, 2) NOT NULL DEFAULT 0,

    INDEX `estimation_options_estimationId_idx`(`estimationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estimation_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estimationOptionId` INTEGER NOT NULL,
    `pricebookItemId` INTEGER NULL,
    `sku` VARCHAR(50) NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unit` VARCHAR(20) NOT NULL,
    `unitCost` DECIMAL(12, 2) NOT NULL,
    `totalCost` DECIMAL(15, 2) NOT NULL,
    `markup` DECIMAL(7, 2) NOT NULL DEFAULT 0,
    `margin` DECIMAL(7, 2) NOT NULL DEFAULT 0,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `totalPrice` DECIMAL(15, 2) NOT NULL,
    `taxable` BOOLEAN NOT NULL DEFAULT true,

    INDEX `estimation_items_estimationOptionId_idx`(`estimationOptionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CodigoMFA` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `codigo` CHAR(64) NOT NULL,
    `tipoAcao` ENUM('LOGIN', 'RESET', 'PRIMEIRO_ACESSO', 'DESBLOQUEIO') NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usado` BOOLEAN NOT NULL DEFAULT false,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip` VARCHAR(45) NULL,
    `userAgent` VARCHAR(255) NULL,

    INDEX `CodigoMFA_criadoEm_idx`(`criadoEm`),
    INDEX `CodigoMFA_tipoAcao_idx`(`tipoAcao`),
    INDEX `CodigoMFA_usuarioId_idx`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HistoricoSenha` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `senhaHash` VARCHAR(191) NOT NULL,
    `criadaEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HistoricoSenha_usuarioId_idx`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PasswordResetToken_tokenHash_idx`(`tokenHash`),
    INDEX `PasswordResetToken_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Projeto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clienteId` INTEGER NOT NULL,
    `propostaId` INTEGER NULL,
    `origem` ENUM('SEM_PROPOSTA', 'DE_PROPOSTA') NOT NULL DEFAULT 'SEM_PROPOSTA',
    `nome` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL DEFAULT 'INICIADO',
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Projeto_propostaId_key`(`propostaId`),
    INDEX `Projeto_clienteId_idx`(`clienteId`),
    INDEX `Projeto_origem_idx`(`origem`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Proposta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numeroProposta` VARCHAR(20) NOT NULL,
    `clienteId` INTEGER NOT NULL,
    `dataCriacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tipoServico` VARCHAR(191) NOT NULL,
    `permite` ENUM('SIM', 'NAO') NOT NULL,
    `quaisPermites` TEXT NULL,
    `condicoesPagamento` LONGTEXT NULL,
    `valorEstimado` DECIMAL(12, 2) NULL,
    `moeda` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `status` ENUM('RASCUNHO', 'ENVIADA', 'ASSINADA', 'APROVADA', 'CANCELADA') NOT NULL DEFAULT 'RASCUNHO',
    `enviadaParaOCliente` DATETIME(3) NULL,
    `assinaturaCliente` VARCHAR(255) NULL,
    `assinaturaResponsavel` VARCHAR(255) NULL,
    `assinadaEm` DATETIME(3) NULL,
    `tempoParaAceite` INTEGER NULL,
    `projetoId` INTEGER NULL,
    `historicoAlteracoes` LONGTEXT NULL,
    `deletedAt` DATETIME(3) NULL,
    `deletedBy` INTEGER NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,
    `aprovacaoInternaFinanceira` BOOLEAN NULL DEFAULT false,
    `aprovacaoInternaTecnica` BOOLEAN NULL DEFAULT false,
    `aprovadaEm` DATETIME(3) NULL,
    `assinaturaImagem` TEXT NULL,
    `assinaturaIp` VARCHAR(45) NULL,
    `assinaturaTipo` ENUM('CANVAS', 'CHECKBOX', 'NOME_CHECKBOX') NULL DEFAULT 'CANVAS',
    `assinaturaUserAgent` TEXT NULL,
    `atualizadoPor` INTEGER NULL,
    `condicoesGerais` TEXT NULL,
    `contatoEmail` VARCHAR(255) NOT NULL DEFAULT 'nao-informado@temp.com',
    `contatoNome` VARCHAR(255) NOT NULL DEFAULT 'Não informado',
    `contatoTelefone` VARCHAR(50) NULL,
    `criadoPor` INTEGER NULL,
    `dataConversao` DATETIME(3) NULL,
    `descontosCondicionais` TEXT NULL,
    `descontosOfertados` DECIMAL(5, 2) NULL,
    `descricaoEscopo` TEXT NULL,
    `exclusoes` TEXT NULL,
    `formaPagamentoPreferida` ENUM('PIX', 'CARTAO', 'BOLETO', 'TRANSFERENCIA', 'DINHEIRO', 'CHEQUE') NULL,
    `garantia` TEXT NULL,
    `gatilhoFaturamento` ENUM('NA_APROVACAO', 'POR_MARCOS', 'NA_ENTREGA', 'CUSTOMIZADO') NULL DEFAULT 'NA_APROVACAO',
    `inspecoesNecessarias` TEXT NULL,
    `instrucoesPagamento` TEXT NULL,
    `internalEstimate` LONGTEXT NULL,
    `janelaExecucaoPreferencial` TEXT NULL,
    `localExecucaoEndereco` TEXT NULL,
    `marcosPagamento` LONGTEXT NULL,
    `motivo_cancelamento` TEXT NULL,
    `multaAtraso` VARCHAR(100) NULL,
    `normasReferencias` TEXT NULL,
    `observacoesInternas` TEXT NULL,
    `observacoesParaCliente` TEXT NULL,
    `opcoesAlternativas` LONGTEXT NULL,
    `percentualSinal` DECIMAL(5, 2) NULL,
    `prazoExecucaoEstimadoDias` INTEGER NULL,
    `precoPropostaCliente` DECIMAL(12, 2) NULL,
    `responsavelConversao` INTEGER NULL,
    `restricoesDeAcesso` TEXT NULL,
    `riscosIdentificados` TEXT NULL,
    `titulo` VARCHAR(500) NOT NULL DEFAULT 'Proposta sem título',
    `tokenExpiresAt` DATETIME(3) NULL,
    `tokenPublico` VARCHAR(100) NULL,
    `validadeProposta` DATETIME(3) NULL,

    UNIQUE INDEX `Proposta_numeroProposta_key`(`numeroProposta`),
    UNIQUE INDEX `Proposta_projetoId_key`(`projetoId`),
    UNIQUE INDEX `Proposta_tokenPublico_key`(`tokenPublico`),
    INDEX `Proposta_clienteId_idx`(`clienteId`),
    INDEX `Proposta_dataCriacao_id_idx`(`dataCriacao`, `id`),
    INDEX `Proposta_status_dataCriacao_id_idx`(`status`, `dataCriacao`, `id`),
    INDEX `Proposta_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropostaEtapa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propostaId` INTEGER NOT NULL,
    `servico` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `status` ENUM('PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA') NOT NULL DEFAULT 'PLANEJADA',
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `custoMaoObraEstimado` DECIMAL(12, 2) NULL,
    `dependencias` TEXT NULL,
    `duracaoEstimadaHoras` DECIMAL(8, 2) NULL,
    `quantidade` DECIMAL(10, 2) NULL,
    `unidade` VARCHAR(20) NULL,

    INDEX `PropostaEtapa_propostaId_idx`(`propostaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropostaLog` (
    `id` VARCHAR(191) NOT NULL,
    `propostaId` INTEGER NOT NULL,
    `actorId` INTEGER NULL,
    `action` ENUM('CREATED', 'UPDATED', 'SENT', 'SIGNED', 'APPROVED', 'CANCELLED', 'ATTACH_ADDED', 'ATTACH_REMOVED') NOT NULL,
    `oldJson` LONGTEXT NULL,
    `newJson` LONGTEXT NULL,
    `ip` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `correlationId` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PropostaLog_createdAt_idx`(`createdAt`),
    INDEX `PropostaLog_propostaId_idx`(`propostaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropostaMaterial` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propostaId` INTEGER NOT NULL,
    `codigo` VARCHAR(50) NULL,
    `nome` VARCHAR(191) NOT NULL,
    `quantidade` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `unidade` VARCHAR(20) NULL,
    `status` ENUM('PLANEJADO', 'SUBSTITUIDO', 'REMOVIDO') NOT NULL DEFAULT 'PLANEJADO',
    `observacao` TEXT NULL,
    `precoUnitario` DECIMAL(12, 2) NULL,
    `moeda` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `totalItem` DECIMAL(12, 2) NULL,
    `fornecedorPreferencial` VARCHAR(255) NULL,

    INDEX `PropostaMaterial_propostaId_idx`(`propostaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projetos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `proposta_id` INTEGER NULL,
    `cliente_id` INTEGER NOT NULL,
    `numero_projeto` VARCHAR(30) NOT NULL,
    `titulo` VARCHAR(200) NOT NULL,
    `descricao` TEXT NULL,
    `status` ENUM('planejado', 'em_execucao', 'em_inspecao', 'aguardando_devolucoes', 'concluido', 'arquivado', 'suspenso', 'cancelado') NOT NULL DEFAULT 'planejado',
    `data_inicio_prevista` DATE NULL,
    `data_inicio_real` DATE NULL,
    `data_conclusao_prevista` DATE NULL,
    `data_conclusao_real` DATE NULL,
    `valor_estimado` DECIMAL(12, 2) NULL,
    `custo_previsto` DECIMAL(12, 2) NULL,
    `custo_real` DECIMAL(12, 2) NULL,
    `margem_prevista` DECIMAL(7, 2) NULL,
    `margem_real` DECIMAL(7, 2) NULL,
    `lucro_previsto` DECIMAL(12, 2) NULL,
    `lucro_real` DECIMAL(12, 2) NULL,
    `responsavel_id` INTEGER NULL,
    `prioridade` ENUM('baixa', 'media', 'alta', 'critica') NOT NULL DEFAULT 'media',
    `localidade` VARCHAR(150) NULL,
    `endereco` TEXT NULL,
    `criado_por` INTEGER NOT NULL,
    `atualizado_por` INTEGER NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NULL,

    UNIQUE INDEX `projetos_numero_projeto_key`(`numero_projeto`),
    INDEX `idx_projetos_cliente_status`(`cliente_id`, `status`),
    INDEX `idx_projetos_responsavel`(`responsavel_id`),
    INDEX `idx_projetos_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projetos_etapas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projeto_id` INTEGER NOT NULL,
    `servico` VARCHAR(150) NOT NULL,
    `descricao` TEXT NULL,
    `status` ENUM('pendente', 'em_andamento', 'em_validacao', 'concluida', 'bloqueada', 'cancelada') NOT NULL DEFAULT 'pendente',
    `ordem` INTEGER NOT NULL DEFAULT 1,
    `inicio_previsto` DATE NULL,
    `fim_previsto` DATE NULL,
    `inicio_real` DATE NULL,
    `fim_real` DATE NULL,
    `responsavel_id` INTEGER NULL,
    `porcentagem` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NULL,

    INDEX `idx_petapas_projeto`(`projeto_id`),
    INDEX `idx_petapas_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projetos_materiais` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projeto_id` INTEGER NOT NULL,
    `codigo` VARCHAR(60) NULL,
    `nome` VARCHAR(180) NOT NULL,
    `unidade` VARCHAR(20) NULL,
    `quantidade_planejada` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `quantidade_liberada` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `quantidade_utilizada` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `quantidade_devolvida` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `status` ENUM('planejado', 'liberado', 'em_uso', 'devolucao_pendente', 'triagem_pendente', 'finalizado') NOT NULL DEFAULT 'planejado',
    `centro_custo_id` INTEGER NULL,
    `repassar_custo_cliente` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NULL,

    INDEX `idx_pmat_projeto`(`projeto_id`),
    INDEX `idx_pmat_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projetos_anexos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projeto_id` INTEGER NOT NULL,
    `arquivo_url` VARCHAR(500) NOT NULL,
    `rotulo` VARCHAR(150) NULL,
    `publico_cliente` BOOLEAN NOT NULL DEFAULT true,
    `criado_por` INTEGER NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_panex_projeto`(`projeto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projetos_historico` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projeto_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `acao` VARCHAR(100) NOT NULL,
    `detalhes` JSON NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_phist_projeto`(`projeto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projetos_movimentacoes_estoque` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projeto_id` INTEGER NOT NULL,
    `material_id` INTEGER NOT NULL,
    `tipo_movimentacao` ENUM('LIBERACAO', 'DEVOLUCAO', 'AJUSTE', 'PERDA') NOT NULL,
    `quantidade` DECIMAL(12, 3) NOT NULL,
    `quantidade_anterior` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `observacao` TEXT NULL,
    `usuario_id` INTEGER NOT NULL,
    `estoque_externo_id` VARCHAR(100) NULL,
    `status_integracao` ENUM('PENDENTE', 'PROCESSANDO', 'CONCLUIDA', 'ERRO') NOT NULL DEFAULT 'PENDENTE',
    `erro_integracao` TEXT NULL,
    `metadados_integracao` JSON NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processado_em` DATETIME(3) NULL,

    INDEX `idx_pmov_projeto`(`projeto_id`),
    INDEX `idx_pmov_material`(`material_id`),
    INDEX `idx_pmov_tipo`(`tipo_movimentacao`),
    INDEX `idx_pmov_status`(`status_integracao`),
    INDEX `idx_pmov_criado`(`criado_em`),
    INDEX `idx_pmov_projeto_material`(`projeto_id`, `material_id`, `criado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projetos_tarefas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projeto_id` INTEGER NOT NULL,
    `etapa_id` INTEGER NULL,
    `titulo` VARCHAR(200) NOT NULL,
    `descricao` TEXT NULL,
    `status` ENUM('aberta', 'em_andamento', 'bloqueada', 'concluida', 'cancelada') NOT NULL DEFAULT 'aberta',
    `atribuida_para` INTEGER NULL,
    `prazo` DATE NULL,
    `prioridade` ENUM('baixa', 'media', 'alta', 'critica') NOT NULL DEFAULT 'media',
    `criado_por` INTEGER NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NULL,

    INDEX `idx_ptar_projeto`(`projeto_id`),
    INDEX `idx_ptar_etapa`(`etapa_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SessaoAtiva` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `token` VARCHAR(64) NOT NULL,
    `ip` VARCHAR(45) NULL,
    `userAgent` VARCHAR(255) NULL,
    `cidade` VARCHAR(64) NULL,
    `pais` VARCHAR(32) NULL,
    `ultimaAtividade` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SessaoAtiva_token_key`(`token`),
    INDEX `SessaoAtiva_token_idx`(`token`),
    INDEX `SessaoAtiva_ultimaAtividade_idx`(`ultimaAtividade`),
    INDEX `SessaoAtiva_usuarioId_idx`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TentativaLogin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NULL,
    `email` VARCHAR(191) NOT NULL,
    `sucesso` BOOLEAN NOT NULL,
    `ip` VARCHAR(45) NULL,
    `userAgent` VARCHAR(255) NULL,
    `motivo` VARCHAR(64) NULL,
    `criadaEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TentativaLogin_criadaEm_idx`(`criadaEm`),
    INDEX `TentativaLogin_email_idx`(`email`),
    INDEX `TentativaLogin_sucesso_idx`(`sucesso`),
    INDEX `TentativaLogin_usuarioId_idx`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(191) NOT NULL,
    `nivel` VARCHAR(191) NOT NULL,
    `endereco1` VARCHAR(191) NOT NULL,
    `endereco2` VARCHAR(191) NOT NULL,
    `cidade` VARCHAR(191) NOT NULL,
    `estado` VARCHAR(32) NULL,
    `zipcode` VARCHAR(16) NULL,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
    `avatarUrl` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,
    `nomeCompleto` VARCHAR(191) NULL,
    `telefone` VARCHAR(32) NULL,
    `dataNascimento` DATE NULL,
    `senhaProvisoria` BOOLEAN NOT NULL DEFAULT false,
    `primeiroAcesso` BOOLEAN NOT NULL DEFAULT false,
    `bloqueado` BOOLEAN NOT NULL DEFAULT false,
    `bloqueadoEm` DATETIME(3) NULL,
    `pinSeguranca` VARCHAR(191) NULL,
    `perguntaSecreta` VARCHAR(191) NULL,
    `respostaSecreta` VARCHAR(191) NULL,
    `anotacoes` LONGTEXT NULL,
    `ultimoLoginEm` DATETIME(3) NULL,
    `tokenVersion` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(500) NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `jti` VARCHAR(36) NOT NULL,
    `revogado` BOOLEAN NOT NULL DEFAULT false,
    `motivoRevogacao` VARCHAR(255) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiraEm` DATETIME(3) NOT NULL,
    `usadoEm` DATETIME(3) NULL,
    `revogadoEm` DATETIME(3) NULL,
    `ip` VARCHAR(45) NULL,
    `userAgent` VARCHAR(500) NULL,
    `tokenPaiId` INTEGER NULL,

    UNIQUE INDEX `refresh_tokens_token_key`(`token`),
    UNIQUE INDEX `refresh_tokens_jti_key`(`jti`),
    INDEX `refresh_tokens_usuarioId_idx`(`usuarioId`),
    INDEX `refresh_tokens_token_idx`(`token`),
    INDEX `refresh_tokens_jti_idx`(`jti`),
    INDEX `refresh_tokens_expiraEm_idx`(`expiraEm`),
    INDEX `refresh_tokens_revogado_idx`(`revogado`),
    INDEX `refresh_tokens_tokenPaiId_idx`(`tokenPaiId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `encryption_keys` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `keyType` ENUM('JWT_SIGNING', 'DOC_ENCRYPTION', 'SESSION', 'BACKUP') NOT NULL,
    `version` INTEGER NOT NULL,
    `encryptedKey` TEXT NOT NULL,
    `fingerprint` VARCHAR(64) NOT NULL,
    `algorithm` VARCHAR(50) NOT NULL,
    `keyLength` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'READ_ONLY', 'RETIRED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ativadoEm` DATETIME(3) NULL,
    `expiraEm` DATETIME(3) NULL,
    `retiradoEm` DATETIME(3) NULL,
    `criadoPorUsuarioId` INTEGER NULL,
    `motivoRotacao` VARCHAR(255) NULL,

    INDEX `encryption_keys_keyType_status_idx`(`keyType`, `status`),
    INDEX `encryption_keys_expiraEm_idx`(`expiraEm`),
    UNIQUE INDEX `encryption_keys_keyType_version_key`(`keyType`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `key_usage_audit` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `keyId` INTEGER NOT NULL,
    `keyVersion` INTEGER NOT NULL,
    `keyType` VARCHAR(50) NOT NULL,
    `operacao` ENUM('ENCRYPT', 'DECRYPT', 'SIGN', 'VERIFY', 'DERIVE', 'ROTATE') NOT NULL,
    `tipoEntidade` VARCHAR(50) NULL,
    `entidadeId` INTEGER NULL,
    `sucesso` BOOLEAN NOT NULL,
    `mensagemErro` VARCHAR(500) NULL,
    `usuarioId` INTEGER NULL,
    `ip` VARCHAR(45) NULL,
    `userAgent` VARCHAR(500) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `key_usage_audit_keyId_idx`(`keyId`),
    INDEX `key_usage_audit_timestamp_idx`(`timestamp`),
    INDEX `key_usage_audit_operacao_idx`(`operacao`),
    INDEX `key_usage_audit_sucesso_idx`(`sucesso`),
    INDEX `key_usage_audit_keyType_idx`(`keyType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unidades` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(20) NOT NULL,
    `nome` VARCHAR(50) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NULL,

    UNIQUE INDEX `unidades_codigo_key`(`codigo`),
    INDEX `unidades_codigo_idx`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categorias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `tipo` ENUM('MATERIAL', 'EQUIPAMENTO') NOT NULL,
    `pai_id` INTEGER NULL,
    `descricao` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NULL,

    INDEX `categorias_tipo_idx`(`tipo`),
    INDEX `categorias_pai_id_idx`(`pai_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `localizacoes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `codigo` VARCHAR(50) NOT NULL,
    `tipo` ENUM('DEPOSITO', 'PRATELEIRA', 'BIN', 'ARMARIO') NOT NULL,
    `descricao` VARCHAR(255) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NULL,

    UNIQUE INDEX `localizacoes_codigo_key`(`codigo`),
    INDEX `localizacoes_codigo_idx`(`codigo`),
    INDEX `localizacoes_ativo_idx`(`ativo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fornecedores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `tipo_documento` ENUM('CNPJ', 'EIN', 'CPF') NULL,
    `documento` VARCHAR(30) NULL,
    `email` VARCHAR(120) NULL,
    `telefone` VARCHAR(40) NULL,
    `endereco` VARCHAR(200) NULL,
    `cidade` VARCHAR(80) NULL,
    `estado` VARCHAR(40) NULL,
    `pais` VARCHAR(60) NOT NULL DEFAULT 'USA',
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `observacoes` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NULL,

    INDEX `fornecedores_documento_idx`(`documento`),
    INDEX `fornecedores_ativo_idx`(`ativo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materiais` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(60) NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `descricao` TEXT NULL,
    `categoria_id` INTEGER NULL,
    `unidade_id` INTEGER NOT NULL,
    `fabricante` VARCHAR(100) NULL,
    `modelo` VARCHAR(80) NULL,
    `ncm` VARCHAR(20) NULL,
    `peso_unitario` DECIMAL(10, 3) NULL,
    `dimensoes` VARCHAR(100) NULL,
    `foto_url` VARCHAR(255) NULL,
    `barcode_internal` VARCHAR(60) NULL,
    `atributos` JSON NULL,
    `estoque_minimo` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `ponto_reposicao` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `rastreio_lote` BOOLEAN NOT NULL DEFAULT true,
    `possui_validade` BOOLEAN NOT NULL DEFAULT false,
    `ultimo_custo` DECIMAL(14, 2) NULL,
    `custo_medio` DECIMAL(14, 2) NULL,
    `ultima_compra_em` DATETIME(3) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NULL,
    `criado_por` INTEGER NULL,
    `atualizado_por` INTEGER NULL,

    UNIQUE INDEX `materiais_codigo_key`(`codigo`),
    UNIQUE INDEX `materiais_barcode_internal_key`(`barcode_internal`),
    INDEX `materiais_codigo_idx`(`codigo`),
    INDEX `materiais_categoria_id_idx`(`categoria_id`),
    INDEX `materiais_ativo_idx`(`ativo`),
    INDEX `materiais_estoque_minimo_idx`(`estoque_minimo`),
    FULLTEXT INDEX `materiais_nome_descricao_codigo_idx`(`nome`, `descricao`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materiais_embalagens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `material_id` INTEGER NOT NULL,
    `upcEan` VARCHAR(20) NOT NULL,
    `brand` VARCHAR(100) NULL,
    `model` VARCHAR(80) NULL,
    `packageType` VARCHAR(30) NOT NULL,
    `baseQtyPerUnit` DECIMAL(14, 3) NOT NULL,
    `purchaseUnit` VARCHAR(10) NOT NULL DEFAULT 'EA',
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `materiais_embalagens_upcEan_key`(`upcEan`),
    INDEX `materiais_embalagens_material_id_idx`(`material_id`),
    INDEX `materiais_embalagens_upcEan_idx`(`upcEan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materiais_lotes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `material_id` INTEGER NOT NULL,
    `codigo_lote` VARCHAR(80) NOT NULL,
    `data_fabricacao` DATE NULL,
    `data_validade` DATE NULL,
    `observacoes` VARCHAR(255) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NULL,

    INDEX `materiais_lotes_data_validade_idx`(`data_validade`),
    UNIQUE INDEX `materiais_lotes_material_id_codigo_lote_key`(`material_id`, `codigo_lote`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materiais_saldo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `material_id` INTEGER NOT NULL,
    `lote_id` INTEGER NULL,
    `localizacao_id` INTEGER NOT NULL,
    `quantidade` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `reservado` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `disponivel` DECIMAL(14, 3) NULL,
    `atualizado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `materiais_saldo_disponivel_idx`(`disponivel`),
    INDEX `materiais_saldo_material_id_idx`(`material_id`),
    INDEX `materiais_saldo_localizacao_id_idx`(`localizacao_id`),
    UNIQUE INDEX `materiais_saldo_material_id_lote_id_localizacao_id_key`(`material_id`, `lote_id`, `localizacao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materiais_movimentacoes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('ENTRADA', 'RESERVA', 'CANCELAMENTO_RESERVA', 'SAIDA', 'DEVOLUCAO', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'PERDA', 'TRANSFERENCIA') NOT NULL,
    `material_id` INTEGER NOT NULL,
    `lote_id` INTEGER NULL,
    `localizacao_origem_id` INTEGER NULL,
    `localizacao_destino_id` INTEGER NULL,
    `quantidade` DECIMAL(14, 3) NOT NULL,
    `custo_unitario` DECIMAL(14, 2) NULL,
    `projeto_id` INTEGER NULL,
    `compra_id` INTEGER NULL,
    `motivo` VARCHAR(200) NULL,
    `referencia_externa` VARCHAR(120) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `criado_por` INTEGER NULL,

    INDEX `materiais_movimentacoes_material_id_idx`(`material_id`),
    INDEX `materiais_movimentacoes_projeto_id_idx`(`projeto_id`),
    INDEX `materiais_movimentacoes_tipo_idx`(`tipo`),
    INDEX `materiais_movimentacoes_criado_em_idx`(`criado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimentacoes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('ENTRADA', 'RESERVA', 'CANCELAMENTO_RESERVA', 'SAIDA', 'DEVOLUCAO', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'PERDA', 'TRANSFERENCIA') NOT NULL,
    `material_id` INTEGER NULL,
    `equipamento_id` INTEGER NULL,
    `quantidade` DECIMAL(14, 3) NOT NULL,
    `projeto_id` INTEGER NULL,
    `data_movimentacao` DATE NOT NULL,
    `observacao` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `criado_por` INTEGER NULL,

    INDEX `movimentacoes_tipo_idx`(`tipo`),
    INDEX `movimentacoes_material_id_idx`(`material_id`),
    INDEX `movimentacoes_equipamento_id_idx`(`equipamento_id`),
    INDEX `movimentacoes_projeto_id_idx`(`projeto_id`),
    INDEX `movimentacoes_data_movimentacao_idx`(`data_movimentacao`),
    INDEX `movimentacoes_criado_em_idx`(`criado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projeto_materiais` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projeto_id` INTEGER NOT NULL,
    `material_id` INTEGER NOT NULL,
    `lote_id` INTEGER NULL,
    `quantidade_reservada` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `quantidade_usada` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `custo_unitario` DECIMAL(14, 2) NULL,
    `custo_total` DECIMAL(14, 2) NULL,
    `cobrar_cliente` BOOLEAN NOT NULL DEFAULT false,
    `data_reserva` DATETIME(3) NULL,
    `data_uso` DATETIME(3) NULL,
    `observacoes` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NULL,
    `criado_por` INTEGER NULL,

    INDEX `projeto_materiais_projeto_id_idx`(`projeto_id`),
    INDEX `projeto_materiais_material_id_idx`(`material_id`),
    INDEX `projeto_materiais_cobrar_cliente_idx`(`cobrar_cliente`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `equipamentos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(60) NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `tipo` ENUM('FERRAMENTA_MANUAL', 'FERRAMENTA_ELETRICA', 'EQUIPAMENTO_MEDICAO', 'EQUIPAMENTO_SEGURANCA', 'ANDAIME', 'ESCADA', 'VEICULO', 'OUTRO') NOT NULL,
    `categoria_id` INTEGER NULL,
    `marca` VARCHAR(100) NULL,
    `modelo` VARCHAR(80) NULL,
    `numero_serie` VARCHAR(120) NULL,
    `ano_fabricacao` INTEGER NULL,
    `data_aquisicao` DATE NOT NULL,
    `valor_aquisicao` DECIMAL(14, 2) NOT NULL,
    `fornecedor_id` INTEGER NULL,
    `nota_fiscal` VARCHAR(60) NULL,
    `status` ENUM('DISPONIVEL', 'EM_USO', 'EM_MANUTENCAO', 'CALIBRACAO', 'PERDIDO', 'DANIFICADO', 'DESCARTADO') NOT NULL DEFAULT 'DISPONIVEL',
    `localizacao_atual` VARCHAR(200) NULL,
    `projeto_atual_id` INTEGER NULL,
    `requer_calibracao` BOOLEAN NOT NULL DEFAULT false,
    `periodicidade_calibracao_dias` INTEGER NULL,
    `ultima_calibracao` DATE NULL,
    `proxima_calibracao` DATE NULL,
    `requer_manutencao_periodica` BOOLEAN NOT NULL DEFAULT false,
    `periodicidade_manutencao_dias` INTEGER NULL,
    `ultima_manutencao` DATE NULL,
    `proxima_manutencao` DATE NULL,
    `foto_url` VARCHAR(255) NULL,
    `manual_url` VARCHAR(255) NULL,
    `observacoes` TEXT NULL,
    `barcode_internal` VARCHAR(60) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NULL,
    `criado_por` INTEGER NULL,
    `atualizado_por` INTEGER NULL,

    UNIQUE INDEX `equipamentos_codigo_key`(`codigo`),
    UNIQUE INDEX `equipamentos_numero_serie_key`(`numero_serie`),
    UNIQUE INDEX `equipamentos_barcode_internal_key`(`barcode_internal`),
    INDEX `equipamentos_codigo_idx`(`codigo`),
    INDEX `equipamentos_status_idx`(`status`),
    INDEX `equipamentos_tipo_idx`(`tipo`),
    INDEX `equipamentos_numero_serie_idx`(`numero_serie`),
    INDEX `equipamentos_proxima_calibracao_idx`(`proxima_calibracao`),
    INDEX `equipamentos_proxima_manutencao_idx`(`proxima_manutencao`),
    INDEX `equipamentos_projeto_atual_id_idx`(`projeto_atual_id`),
    FULLTEXT INDEX `equipamentos_nome_marca_modelo_codigo_idx`(`nome`, `marca`, `modelo`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projeto_equipamentos` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `projeto_id` INTEGER NOT NULL,
    `equipamento_id` INTEGER NOT NULL,
    `responsavel_id` INTEGER NOT NULL,
    `data_alocacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_devolucao_prevista` DATE NULL,
    `data_devolucao_real` DATETIME(3) NULL,
    `status` ENUM('ALOCADO', 'EM_USO', 'DEVOLVIDO', 'PERDIDO', 'DANIFICADO') NOT NULL DEFAULT 'ALOCADO',
    `condicao_saida` ENUM('EXCELENTE', 'BOM', 'REGULAR', 'RUIM') NOT NULL DEFAULT 'BOM',
    `condicao_saida_obs` TEXT NULL,
    `condicao_retorno` ENUM('EXCELENTE', 'BOM', 'REGULAR', 'RUIM', 'DANIFICADO', 'PERDIDO') NULL,
    `condicao_retorno_obs` TEXT NULL,
    `verificado_por` INTEGER NULL,
    `verificado_em` DATETIME(3) NULL,
    `custo_diaria` DECIMAL(10, 2) NULL,
    `dias_uso` INTEGER NULL,
    `valor_total` DECIMAL(14, 2) NULL,
    `cobrar_cliente` BOOLEAN NOT NULL DEFAULT false,
    `observacoes` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NULL,
    `criado_por` INTEGER NULL,

    INDEX `projeto_equipamentos_projeto_id_idx`(`projeto_id`),
    INDEX `projeto_equipamentos_equipamento_id_idx`(`equipamento_id`),
    INDEX `projeto_equipamentos_status_idx`(`status`),
    INDEX `projeto_equipamentos_responsavel_id_idx`(`responsavel_id`),
    INDEX `projeto_equipamentos_data_devolucao_prevista_idx`(`data_devolucao_prevista`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `equipamentos_manutencao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `equipamento_id` INTEGER NOT NULL,
    `tipo` ENUM('PREVENTIVA', 'CORRETIVA', 'CALIBRACAO', 'REVISAO') NOT NULL,
    `data_inicio` DATE NOT NULL,
    `data_conclusao` DATE NULL,
    `fornecedor_id` INTEGER NULL,
    `custo` DECIMAL(14, 2) NULL,
    `nota_fiscal` VARCHAR(60) NULL,
    `descricao` TEXT NOT NULL,
    `servicos_realizados` TEXT NULL,
    `pecas_trocadas` TEXT NULL,
    `proxima_manutencao` DATE NULL,
    `proxima_calibracao` DATE NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NULL,
    `criado_por` INTEGER NULL,

    INDEX `equipamentos_manutencao_equipamento_id_idx`(`equipamento_id`),
    INDEX `equipamentos_manutencao_tipo_idx`(`tipo`),
    INDEX `equipamentos_manutencao_data_inicio_idx`(`data_inicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alertas_estoque` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('ESTOQUE_MINIMO', 'ESTOQUE_ZERO', 'VALIDADE_PROXIMA', 'VALIDADE_VENCIDA', 'CALIBRACAO_PROXIMA', 'CALIBRACAO_VENCIDA', 'MANUTENCAO_PROXIMA', 'MANUTENCAO_VENCIDA', 'EQUIPAMENTO_NAO_DEVOLVIDO', 'EQUIPAMENTO_DANIFICADO') NOT NULL,
    `prioridade` ENUM('BAIXA', 'MEDIA', 'ALTA', 'CRITICA') NOT NULL DEFAULT 'MEDIA',
    `material_id` INTEGER NULL,
    `equipamento_id` INTEGER NULL,
    `projeto_id` INTEGER NULL,
    `titulo` VARCHAR(150) NOT NULL,
    `mensagem` TEXT NOT NULL,
    `data_alerta` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_visualizado` DATETIME(3) NULL,
    `visualizado_por` INTEGER NULL,
    `data_resolvido` DATETIME(3) NULL,
    `resolvido_por` INTEGER NULL,
    `solucao` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,

    INDEX `alertas_estoque_ativo_prioridade_data_alerta_idx`(`ativo`, `prioridade`, `data_alerta`),
    INDEX `alertas_estoque_tipo_idx`(`tipo`),
    INDEX `alertas_estoque_material_id_idx`(`material_id`),
    INDEX `alertas_estoque_equipamento_id_idx`(`equipamento_id`),
    INDEX `alertas_estoque_projeto_id_idx`(`projeto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `compras` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fornecedor_id` INTEGER NULL,
    `numero_nf` VARCHAR(60) NULL,
    `data_compra` DATE NOT NULL,
    `data_entrega` DATE NULL,
    `tipo` ENUM('MATERIAL', 'EQUIPAMENTO', 'AMBOS') NOT NULL,
    `projeto_id` INTEGER NULL,
    `valor_total` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `desconto` DECIMAL(14, 2) NULL,
    `frete` DECIMAL(14, 2) NULL,
    `forma_pagamento` VARCHAR(60) NULL,
    `status` ENUM('PENDENTE', 'PARCIAL', 'RECEBIDA', 'CANCELADA') NOT NULL DEFAULT 'PENDENTE',
    `observacoes` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NULL,
    `criado_por` INTEGER NULL,

    INDEX `compras_fornecedor_id_idx`(`fornecedor_id`),
    INDEX `compras_projeto_id_idx`(`projeto_id`),
    INDEX `compras_status_idx`(`status`),
    INDEX `compras_data_compra_idx`(`data_compra`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `compras_itens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `compra_id` INTEGER NOT NULL,
    `tipo_item` ENUM('MATERIAL', 'EQUIPAMENTO') NOT NULL,
    `material_id` INTEGER NULL,
    `equipamento_id` INTEGER NULL,
    `material_embalagem_id` INTEGER NULL,
    `lote_id` INTEGER NULL,
    `quantidade` DECIMAL(14, 3) NOT NULL,
    `custo_unitario` DECIMAL(14, 2) NOT NULL,
    `custo_total` DECIMAL(14, 2) NULL,
    `data_recebimento` DATETIME(3) NULL,
    `recebido_por` INTEGER NULL,

    INDEX `compras_itens_compra_id_idx`(`compra_id`),
    INDEX `compras_itens_tipo_item_idx`(`tipo_item`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numeroInvoice` VARCHAR(50) NOT NULL,
    `projetoId` INTEGER NULL,
    `clienteId` INTEGER NOT NULL,
    `dataEmissao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataVencimento` DATETIME(3) NOT NULL,
    `dataPagamento` DATETIME(3) NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `descontoValor` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `descontoPercentual` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `taxRate` DECIMAL(5, 4) NOT NULL DEFAULT 0.0825,
    `taxAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `valorTotal` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `valorPago` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `saldo` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'SENT', 'VIEWED', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `notas` TEXT NULL,
    `termos` TEXT NULL,
    `ledgerTransactionId` INTEGER NULL,
    `criadoPor` INTEGER NOT NULL,
    `atualizadoPor` INTEGER NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Invoice_numeroInvoice_key`(`numeroInvoice`),
    UNIQUE INDEX `Invoice_ledgerTransactionId_key`(`ledgerTransactionId`),
    INDEX `Invoice_numeroInvoice_idx`(`numeroInvoice`),
    INDEX `Invoice_clienteId_idx`(`clienteId`),
    INDEX `Invoice_projetoId_idx`(`projetoId`),
    INDEX `Invoice_status_idx`(`status`),
    INDEX `Invoice_dataVencimento_idx`(`dataVencimento`),
    INDEX `Invoice_criadoEm_idx`(`criadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceId` INTEGER NOT NULL,
    `tipo` ENUM('SERVICE', 'MATERIAL', 'EQUIPMENT', 'OTHER') NOT NULL DEFAULT 'SERVICE',
    `descricao` VARCHAR(500) NOT NULL,
    `quantidade` DECIMAL(15, 4) NOT NULL DEFAULT 1,
    `unidade` VARCHAR(50) NOT NULL,
    `precoUnitario` DECIMAL(15, 2) NOT NULL,
    `desconto` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `subtotal` DECIMAL(15, 2) NOT NULL,
    `taxavel` BOOLEAN NOT NULL DEFAULT true,
    `propostaEtapaId` INTEGER NULL,
    `materialId` INTEGER NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,

    INDEX `InvoiceItem_invoiceId_idx`(`invoiceId`),
    INDEX `InvoiceItem_propostaEtapaId_idx`(`propostaEtapaId`),
    INDEX `InvoiceItem_materialId_idx`(`materialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoicePayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceId` INTEGER NOT NULL,
    `valor` DECIMAL(15, 2) NOT NULL,
    `dataPagamento` DATETIME(3) NOT NULL,
    `metodoPagamento` ENUM('BANK_TRANSFER', 'CHECK', 'CARD', 'CASH', 'STRIPE', 'SQUARE', 'OTHER') NOT NULL DEFAULT 'BANK_TRANSFER',
    `bankAccountId` INTEGER NULL,
    `referencia` VARCHAR(100) NULL,
    `notas` TEXT NULL,
    `ledgerTransactionId` INTEGER NULL,
    `gatewayId` VARCHAR(100) NULL,
    `gatewayTransactionId` VARCHAR(255) NULL,
    `criadoPor` INTEGER NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `InvoicePayment_ledgerTransactionId_key`(`ledgerTransactionId`),
    INDEX `InvoicePayment_invoiceId_idx`(`invoiceId`),
    INDEX `InvoicePayment_dataPagamento_idx`(`dataPagamento`),
    INDEX `InvoicePayment_gatewayTransactionId_idx`(`gatewayTransactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceReminder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceId` INTEGER NOT NULL,
    `tipo` ENUM('INITIAL_SEND', 'REMINDER', 'OVERDUE_NOTICE', 'ESCALATION') NOT NULL DEFAULT 'REMINDER',
    `diasAposVencimento` INTEGER NOT NULL DEFAULT 0,
    `dataEnvio` DATETIME(3) NULL,
    `metodo` ENUM('EMAIL', 'SMS', 'PHONE_CALL', 'LETTER') NOT NULL DEFAULT 'EMAIL',
    `destinatario` VARCHAR(255) NOT NULL,
    `assunto` VARCHAR(255) NULL,
    `mensagem` TEXT NULL,
    `status` ENUM('SENT', 'DELIVERED', 'OPENED', 'FAILED') NOT NULL DEFAULT 'SENT',
    `erro` TEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InvoiceReminder_invoiceId_idx`(`invoiceId`),
    INDEX `InvoiceReminder_tipo_idx`(`tipo`),
    INDEX `InvoiceReminder_status_idx`(`status`),
    INDEX `InvoiceReminder_dataEnvio_idx`(`dataEnvio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `revenues` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `categoriaId` INTEGER NOT NULL,
    `clienteId` INTEGER NULL,
    `descricao` VARCHAR(255) NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `dataEmissao` DATETIME(3) NOT NULL,
    `dataVencimento` DATETIME(3) NOT NULL,
    `dataPagamento` DATETIME(3) NULL,
    `tipo` ENUM('SERVICO', 'VENDA_PRODUTO', 'CONSULTORIA', 'MENSALIDADE', 'COMISSAO', 'OUTROS') NOT NULL,
    `formaPagamento` ENUM('DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'TRANSFERENCIA', 'BOLETO', 'CHEQUE') NOT NULL,
    `status` ENUM('PENDENTE', 'RECEBIDA', 'VENCIDA', 'CANCELADA') NOT NULL,
    `observacoes` TEXT NULL,
    `recorrente` BOOLEAN NOT NULL DEFAULT false,
    `recorrenciaId` INTEGER NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `revenues_recorrenciaId_key`(`recorrenciaId`),
    INDEX `revenues_empresaId_idx`(`empresaId`),
    INDEX `revenues_categoriaId_idx`(`categoriaId`),
    INDEX `revenues_clienteId_idx`(`clienteId`),
    INDEX `revenues_dataVencimento_idx`(`dataVencimento`),
    INDEX `revenues_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `revenue_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `nome` VARCHAR(100) NOT NULL,
    `descricao` TEXT NULL,
    `cor` VARCHAR(7) NULL,
    `icone` VARCHAR(50) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `revenue_categories_empresaId_nome_key`(`empresaId`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `revenue_recurrences` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `revenueId` INTEGER NOT NULL,
    `frequencia` ENUM('SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL') NOT NULL,
    `diaVencimento` INTEGER NOT NULL,
    `dataInicio` DATETIME(3) NOT NULL,
    `dataFim` DATETIME(3) NULL,
    `proximaGeracao` DATETIME(3) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `revenue_recurrences_revenueId_key`(`revenueId`),
    INDEX `revenue_recurrences_proximaGeracao_idx`(`proximaGeracao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `categoriaId` INTEGER NOT NULL,
    `fornecedorId` INTEGER NULL,
    `descricao` VARCHAR(255) NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `tipo` ENUM('OPERACIONAL', 'ADMINISTRATIVA', 'PESSOAL', 'MARKETING', 'TECNOLOGIA', 'IMPOSTOS', 'ALUGUEL', 'SERVIÇOS', 'FORNECEDORES', 'OUTROS') NOT NULL,
    `formaPagamento` ENUM('DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'TRANSFERENCIA', 'BOLETO', 'CHEQUE') NOT NULL,
    `status` ENUM('PENDENTE', 'AGUARDANDO_APROVACAO', 'APROVADA', 'REJEITADA', 'PAGA', 'CANCELADA') NOT NULL DEFAULT 'PENDENTE',
    `dataEmissao` DATETIME(3) NOT NULL,
    `dataVencimento` DATETIME(3) NOT NULL,
    `dataPagamento` DATETIME(3) NULL,
    `requerAprovacao` BOOLEAN NOT NULL DEFAULT false,
    `aprovacaoId` INTEGER NULL,
    `anexoUrl` VARCHAR(500) NULL,
    `numeroDocumento` VARCHAR(100) NULL,
    `observacoes` TEXT NULL,
    `compra_id` INTEGER NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,
    `criadoPor` INTEGER NULL,
    `recorrente` BOOLEAN NOT NULL DEFAULT false,
    `recorrenciaId` INTEGER NULL,

    UNIQUE INDEX `expenses_aprovacaoId_key`(`aprovacaoId`),
    UNIQUE INDEX `expenses_compra_id_key`(`compra_id`),
    UNIQUE INDEX `expenses_recorrenciaId_key`(`recorrenciaId`),
    INDEX `expenses_empresaId_status_dataVencimento_idx`(`empresaId`, `status`, `dataVencimento`),
    INDEX `expenses_categoriaId_idx`(`categoriaId`),
    INDEX `expenses_fornecedorId_idx`(`fornecedorId`),
    INDEX `expenses_status_idx`(`status`),
    INDEX `expenses_dataVencimento_idx`(`dataVencimento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expense_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `nome` VARCHAR(100) NOT NULL,
    `descricao` TEXT NULL,
    `cor` VARCHAR(7) NOT NULL DEFAULT '#EF4444',
    `icone` VARCHAR(50) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `orcamentoMensal` DECIMAL(10, 2) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `expense_categories_empresaId_nome_key`(`empresaId`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expense_approvals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `expenseId` INTEGER NOT NULL,
    `status` ENUM('PENDENTE', 'EM_ANALISE', 'APROVADA', 'REJEITADA', 'CANCELADA') NOT NULL DEFAULT 'PENDENTE',
    `aprovadorId` INTEGER NOT NULL,
    `tipoAprovador` ENUM('GERENTE', 'DIRETOR', 'FINANCEIRO', 'ADMINISTRADOR') NOT NULL DEFAULT 'GERENTE',
    `nivelAprovacao` INTEGER NOT NULL DEFAULT 1,
    `requerProximoNivel` BOOLEAN NOT NULL DEFAULT false,
    `proximoAprovadorId` INTEGER NULL,
    `solicitadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revisadoEm` DATETIME(3) NULL,
    `justificativa` TEXT NULL,
    `comentario` TEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `expense_approvals_expenseId_key`(`expenseId`),
    INDEX `expense_approvals_status_solicitadoEm_idx`(`status`, `solicitadoEm`),
    INDEX `expense_approvals_aprovadorId_idx`(`aprovadorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `banco` VARCHAR(191) NOT NULL,
    `agencia` VARCHAR(191) NOT NULL,
    `conta` VARCHAR(191) NOT NULL,
    `digito` VARCHAR(191) NULL,
    `tipo` ENUM('CORRENTE', 'POUPANCA', 'INVESTIMENTO', 'CAIXA', 'CARTEIRA_DIGITAL') NOT NULL DEFAULT 'CORRENTE',
    `saldoAtual` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `saldoInicial` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `limiteCredito` DECIMAL(15, 2) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `principal` BOOLEAN NOT NULL DEFAULT false,
    `observacoes` TEXT NULL,
    `ultimaConciliacao` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `bank_accounts_empresaId_ativo_idx`(`empresaId`, `ativo`),
    INDEX `bank_accounts_tipo_idx`(`tipo`),
    UNIQUE INDEX `bank_accounts_empresaId_banco_agencia_conta_key`(`empresaId`, `banco`, `agencia`, `conta`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accountId` INTEGER NOT NULL,
    `empresaId` INTEGER NOT NULL,
    `tipo` ENUM('CREDITO', 'DEBITO', 'TRANSFERENCIA_ENTRADA', 'TRANSFERENCIA_SAIDA', 'TAXA', 'JUROS', 'ESTORNO') NOT NULL,
    `categoria` VARCHAR(191) NULL,
    `valor` DECIMAL(15, 2) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `documento` VARCHAR(191) NULL,
    `dataTransacao` DATETIME(3) NOT NULL,
    `dataLancamento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `saldoAnterior` DECIMAL(15, 2) NOT NULL,
    `saldoPosterior` DECIMAL(15, 2) NOT NULL,
    `reconciliada` BOOLEAN NOT NULL DEFAULT false,
    `dataReconciliacao` DATETIME(3) NULL,
    `revenueId` INTEGER NULL,
    `expenseId` INTEGER NULL,
    `transferId` INTEGER NULL,
    `comprovante` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `metadata` JSON NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `bank_transactions_accountId_dataTransacao_idx`(`accountId`, `dataTransacao`),
    INDEX `bank_transactions_empresaId_dataTransacao_idx`(`empresaId`, `dataTransacao`),
    INDEX `bank_transactions_tipo_reconciliada_idx`(`tipo`, `reconciliada`),
    INDEX `bank_transactions_categoria_idx`(`categoria`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_transfers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `fromAccountId` INTEGER NOT NULL,
    `toAccountId` INTEGER NOT NULL,
    `valor` DECIMAL(15, 2) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDENTE', 'PROCESSANDO', 'CONCLUIDA', 'CANCELADA', 'FALHOU', 'ESTORNADA') NOT NULL DEFAULT 'PENDENTE',
    `dataAgendamento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataExecucao` DATETIME(3) NULL,
    `dataConclusao` DATETIME(3) NULL,
    `tentativas` INTEGER NOT NULL DEFAULT 0,
    `ultimaResposta` TEXT NULL,
    `processadoPor` INTEGER NULL,
    `comprovante` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `metadata` JSON NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `bank_transfers_empresaId_status_idx`(`empresaId`, `status`),
    INDEX `bank_transfers_fromAccountId_dataAgendamento_idx`(`fromAccountId`, `dataAgendamento`),
    INDEX `bank_transfers_toAccountId_dataAgendamento_idx`(`toAccountId`, `dataAgendamento`),
    INDEX `bank_transfers_status_dataAgendamento_idx`(`status`, `dataAgendamento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `funcionarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `usuarioId` INTEGER NULL,
    `supervisorId` INTEGER NULL,
    `nomeCompleto` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(191) NULL,
    `cpf` VARCHAR(191) NOT NULL,
    `rg` VARCHAR(191) NULL,
    `dataNascimento` DATETIME(3) NULL,
    `endereco` JSON NULL,
    `cargo` VARCHAR(191) NOT NULL,
    `departamento` VARCHAR(191) NOT NULL,
    `setor` VARCHAR(191) NULL,
    `dataAdmissao` DATETIME(3) NOT NULL,
    `dataDemissao` DATETIME(3) NULL,
    `tipoContrato` ENUM('CLT', 'PJ', 'ESTAGIO', 'TEMPORARIO', 'AUTONOMO', 'FREELANCER') NOT NULL,
    `status` ENUM('ATIVO', 'FERIAS', 'AFASTADO', 'SUSPENSO', 'DESLIGADO') NOT NULL DEFAULT 'ATIVO',
    `salario` DECIMAL(10, 2) NOT NULL,
    `bonus` DECIMAL(10, 2) NULL,
    `beneficios` JSON NULL,
    `banco` VARCHAR(191) NULL,
    `agencia` VARCHAR(191) NULL,
    `conta` VARCHAR(191) NULL,
    `tipoConta` ENUM('CORRENTE', 'POUPANCA') NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `funcionarios_usuarioId_key`(`usuarioId`),
    UNIQUE INDEX `funcionarios_email_key`(`email`),
    UNIQUE INDEX `funcionarios_cpf_key`(`cpf`),
    INDEX `funcionarios_empresaId_status_idx`(`empresaId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ferias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `funcionarioId` INTEGER NOT NULL,
    `dataInicio` DATETIME(3) NOT NULL,
    `dataFim` DATETIME(3) NOT NULL,
    `diasCorridos` INTEGER NOT NULL,
    `diasUteis` INTEGER NOT NULL,
    `anoReferencia` INTEGER NOT NULL,
    `status` ENUM('SOLICITADO', 'APROVADO', 'RECUSADO', 'EM_FERIAS', 'FINALIZADO') NOT NULL DEFAULT 'SOLICITADO',
    `abonoPecuniario` BOOLEAN NOT NULL DEFAULT false,
    `diasAbono` INTEGER NULL,
    `aprovadoPor` INTEGER NULL,
    `dataAprovacao` DATETIME(3) NULL,
    `motivoRecusa` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faltas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `funcionarioId` INTEGER NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `periodo` ENUM('MANHA', 'TARDE', 'INTEGRAL') NOT NULL,
    `tipo` ENUM('INJUSTIFICADA', 'ATESTADO', 'LICENCA_MEDICA', 'FALTA_ABONADA') NOT NULL,
    `justificativa` VARCHAR(191) NULL,
    `atestadoUrl` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `horas_extras` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `funcionarioId` INTEGER NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `horaInicio` VARCHAR(191) NOT NULL,
    `horaFim` VARCHAR(191) NOT NULL,
    `totalHoras` DECIMAL(4, 2) NOT NULL,
    `tipo` ENUM('NORMAL', 'NOTURNO', 'DOMINGO_FERIADO', 'BANCO_HORAS') NOT NULL,
    `percentual` DECIMAL(5, 2) NOT NULL,
    `valorHora` DECIMAL(10, 2) NOT NULL,
    `valorTotal` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDENTE', 'APROVADO', 'RECUSADO', 'PAGO') NOT NULL DEFAULT 'PENDENTE',
    `aprovadoPor` INTEGER NULL,
    `dataAprovacao` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `avaliacoes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `funcionarioId` INTEGER NOT NULL,
    `avaliadorId` INTEGER NOT NULL,
    `dataAvaliacao` DATETIME(3) NOT NULL,
    `periodoInicio` DATETIME(3) NOT NULL,
    `periodoFim` DATETIME(3) NOT NULL,
    `tipo` ENUM('EXPERIENCIA', 'ANUAL', 'PROMOCAO', 'FEEDBACK_360', 'DESLIGAMENTO') NOT NULL,
    `notaDesempenho` INTEGER NOT NULL,
    `notaPontualidade` INTEGER NOT NULL,
    `notaProatividade` INTEGER NOT NULL,
    `notaEquipe` INTEGER NOT NULL,
    `notaComunicacao` INTEGER NOT NULL,
    `notaMedia` DECIMAL(3, 2) NOT NULL,
    `pontosFortes` TEXT NULL,
    `pontosMelhoria` TEXT NULL,
    `metas` TEXT NULL,
    `observacoes` TEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documentos_funcionario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `funcionarioId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` ENUM('RG', 'CPF', 'CNH', 'CTPS', 'CONTRATO_TRABALHO', 'ATESTADO_MEDICO', 'CERTIFICADO', 'OUTROS') NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `dataEmissao` DATETIME(3) NULL,
    `dataValidade` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `colaboradores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NULL,
    `nomeCompleto` VARCHAR(191) NOT NULL,
    `emailContato` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `dataNascimento` DATETIME(3) NULL,
    `fotoUrl` VARCHAR(191) NULL,
    `endereco` VARCHAR(191) NULL,
    `apartamentoUnidade` VARCHAR(191) NULL,
    `cidade` VARCHAR(191) NULL,
    `estado` VARCHAR(191) NULL,
    `cep` VARCHAR(191) NULL,
    `tipoPessoa` VARCHAR(191) NULL,
    `razaoSocial` VARCHAR(191) NULL,
    `nomeFantasia` VARCHAR(191) NULL,
    `ein` VARCHAR(191) NULL,
    `contatoResponsavel` VARCHAR(191) NULL,
    `emailContatoEmpresa` VARCHAR(191) NULL,
    `telefoneContatoEmpresa` VARCHAR(191) NULL,
    `cargo` VARCHAR(191) NULL,
    `departamento` VARCHAR(191) NULL,
    `supervisor` VARCHAR(191) NULL,
    `dataAdmissao` DATETIME(3) NOT NULL,
    `dataDemissao` DATETIME(3) NULL,
    `status` VARCHAR(191) NULL,
    `tipoContrato` ENUM('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN', 'TEMPORARY') NOT NULL,
    `localTrabalho` VARCHAR(191) NULL,
    `jornadaTrabalho` VARCHAR(191) NULL,
    `periodoExperiencia` INTEGER NULL,
    `salarioBase` DECIMAL(65, 30) NULL,
    `beneficios` JSON NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `colaboradores_usuarioId_key`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dados_financeiros_colaborador` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `colaboradorId` INTEGER NOT NULL,
    `tipoPagamento` ENUM('HORA', 'MONTHLY', 'PROJETO') NOT NULL,
    `valorSalario` DECIMAL(65, 30) NULL,
    `valorHoraCusto` DECIMAL(65, 30) NULL,
    `valorHoraVenda` DECIMAL(65, 30) NULL,
    `taxId` VARCHAR(191) NULL,
    `filingStatus` VARCHAR(191) NULL,
    `bancoNome` VARCHAR(191) NULL,
    `routingNumber` VARCHAR(191) NULL,
    `accountNumber` VARCHAR(191) NULL,
    `tipoConta` VARCHAR(191) NULL,
    `metodoPagamentoAlternativo` VARCHAR(191) NULL,
    `frequenciaPagamento` VARCHAR(191) NULL,
    `texasDriverLicense` VARCHAR(191) NULL,
    `dependents` INTEGER NULL,
    `additionalWithholding` DECIMAL(65, 30) NULL,
    `zelleEmail` VARCHAR(191) NULL,
    `zellePhone` VARCHAR(191) NULL,
    `paypalEmail` VARCHAR(191) NULL,
    `paypalUsername` VARCHAR(191) NULL,
    `venmoUsername` VARCHAR(191) NULL,

    UNIQUE INDEX `dados_financeiros_colaborador_colaboradorId_key`(`colaboradorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `habilidades_colaborador` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `colaboradorId` INTEGER NULL,
    `worker_id` INTEGER NULL,
    `habilidade` VARCHAR(191) NOT NULL,
    `nivel` VARCHAR(191) NULL,
    `certificado` BOOLEAN NULL DEFAULT false,
    `cert_expiry` DATETIME(3) NULL,

    INDEX `habilidades_colaborador_colaboradorId_idx`(`colaboradorId`),
    INDEX `habilidades_colaborador_worker_id_idx`(`worker_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documentos_colaborador` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `colaboradorId` INTEGER NULL,
    `worker_id` INTEGER NULL,
    `nome` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NULL,
    `expires_at` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `documentos_colaborador_colaboradorId_idx`(`colaboradorId`),
    INDEX `documentos_colaborador_worker_id_idx`(`worker_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NULL,
    `name` VARCHAR(200) NOT NULL,
    `email` VARCHAR(200) NULL,
    `email_normalized` VARCHAR(200) NULL,
    `phone` VARCHAR(30) NULL,
    `address_line1` VARCHAR(200) NULL,
    `address_line2` VARCHAR(100) NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(50) NULL,
    `zip` VARCHAR(20) NULL,
    `type` ENUM('INDIVIDUAL', 'COMPANY') NOT NULL DEFAULT 'INDIVIDUAL',
    `company_name` VARCHAR(200) NULL,
    `ein` VARCHAR(20) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `default_hourly_rate` DECIMAL(10, 2) NULL,
    `legacy_colaborador_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `workers_usuario_id_key`(`usuario_id`),
    UNIQUE INDEX `workers_email_normalized_key`(`email_normalized`),
    UNIQUE INDEX `workers_ein_key`(`ein`),
    UNIQUE INDEX `workers_legacy_colaborador_id_key`(`legacy_colaborador_id`),
    INDEX `workers_status_idx`(`status`),
    INDEX `workers_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `worker_financial_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `worker_id` INTEGER NOT NULL,
    `payment_method` ENUM('CHECK', 'ZELLE', 'ACH', 'CASH', 'WIRE', 'OTHER') NOT NULL DEFAULT 'CHECK',
    `payee_name` VARCHAR(200) NULL,
    `account_last4` VARCHAR(4) NULL,
    `tax_id_last4` VARCHAR(4) NULL,
    `notes` TEXT NULL,
    `encrypted_routing` TEXT NULL,
    `encrypted_account` TEXT NULL,
    `encrypted_tax_id` TEXT NULL,
    `preferred_payday` VARCHAR(20) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `worker_financial_profiles_worker_id_key`(`worker_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `worker_id` INTEGER NOT NULL,
    `job_id` INTEGER NULL,
    `project_id` INTEGER NULL,
    `pay_type` ENUM('HOURLY', 'FIXED') NOT NULL DEFAULT 'HOURLY',
    `cost_rate_hourly` DECIMAL(10, 2) NULL,
    `fixed_cost_amount` DECIMAL(12, 2) NULL,
    `effective_from` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `effective_to` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `role` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` INTEGER NULL,
    `source` ENUM('MANUAL', 'COMPAT_LAYER') NOT NULL DEFAULT 'MANUAL',

    INDEX `assignments_worker_id_idx`(`worker_id`),
    INDEX `assignments_job_id_idx`(`job_id`),
    INDEX `assignments_project_id_idx`(`project_id`),
    INDEX `assignments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `timesheets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assignment_id` INTEGER NOT NULL,
    `period_start` DATE NOT NULL,
    `period_end` DATE NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'LOCKED') NOT NULL DEFAULT 'DRAFT',
    `submitted_at` DATETIME(3) NULL,
    `submitted_by_id` INTEGER NULL,
    `approved_at` DATETIME(3) NULL,
    `approved_by_id` INTEGER NULL,
    `total_hours` DECIMAL(8, 2) NOT NULL DEFAULT 0,
    `total_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `timesheets_status_idx`(`status`),
    INDEX `timesheets_period_start_idx`(`period_start`),
    UNIQUE INDEX `timesheets_assignment_id_period_start_period_end_key`(`assignment_id`, `period_start`, `period_end`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `timesheet_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `timesheet_id` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `hours` DECIMAL(5, 2) NOT NULL,
    `job_id` INTEGER NULL,
    `project_id` INTEGER NULL,
    `note` TEXT NULL,
    `status` ENUM('DRAFT', 'APPROVED', 'LOCKED') NOT NULL DEFAULT 'DRAFT',
    `migrated_from` VARCHAR(50) NULL,
    `migrated_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `timesheet_entries_timesheet_id_idx`(`timesheet_id`),
    INDEX `timesheet_entries_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `milestones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assignment_id` INTEGER NOT NULL,
    `job_id` INTEGER NULL,
    `project_id` INTEGER NULL,
    `description` VARCHAR(500) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'LOCKED') NOT NULL DEFAULT 'DRAFT',
    `approved_at` DATETIME(3) NULL,
    `approved_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` INTEGER NULL,

    INDEX `milestones_assignment_id_idx`(`assignment_id`),
    INDEX `milestones_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payables` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `worker_id` INTEGER NOT NULL,
    `period_start` DATETIME(3) NULL,
    `period_end` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `created_from` ENUM('TIMESHEET', 'MILESTONE', 'MANUAL') NOT NULL,
    `description` VARCHAR(500) NULL,
    `paid_at` DATETIME(3) NULL,
    `paid_by_id` INTEGER NULL,
    `payment_method` ENUM('CHECK', 'ZELLE', 'ACH', 'CASH', 'WIRE', 'OTHER') NULL,
    `payment_ref` VARCHAR(100) NULL,
    `expense_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_id` INTEGER NULL,
    `approved_at` DATETIME(3) NULL,
    `approved_by_id` INTEGER NULL,

    UNIQUE INDEX `payables_expense_id_key`(`expense_id`),
    INDEX `payables_worker_id_idx`(`worker_id`),
    INDEX `payables_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payable_line_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payable_id` INTEGER NOT NULL,
    `job_id` INTEGER NULL,
    `project_id` INTEGER NULL,
    `description` VARCHAR(300) NOT NULL,
    `quantity` DECIMAL(8, 2) NOT NULL,
    `unit_cost` DECIMAL(10, 2) NOT NULL,
    `line_total` DECIMAL(12, 2) NOT NULL,
    `source_type` ENUM('TIMESHEET_ENTRY', 'MILESTONE') NOT NULL,
    `source_id` INTEGER NOT NULL,

    INDEX `payable_line_items_payable_id_idx`(`payable_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expense_recurrences` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `expenseId` INTEGER NOT NULL,
    `frequencia` ENUM('SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL') NOT NULL,
    `diaVencimento` INTEGER NOT NULL,
    `dataInicio` DATETIME(3) NOT NULL,
    `dataFim` DATETIME(3) NULL,
    `proximaGeracao` DATETIME(3) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `expense_recurrences_expenseId_key`(`expenseId`),
    INDEX `expense_recurrences_proximaGeracao_idx`(`proximaGeracao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticketNumber` VARCHAR(50) NOT NULL,
    `clienteId` INTEGER NOT NULL,
    `sameClientAddress` BOOLEAN NOT NULL DEFAULT true,
    `serviceAddressLine1` VARCHAR(200) NULL,
    `serviceAddressLine2` VARCHAR(200) NULL,
    `serviceCity` VARCHAR(100) NULL,
    `serviceState` VARCHAR(50) NULL,
    `serviceZip` VARCHAR(20) NULL,
    `servicePhone` VARCHAR(30) NULL,
    `serviceContactName` VARCHAR(100) NULL,
    `scheduleType` ENUM('FIXED', 'FLEXIBLE') NOT NULL DEFAULT 'FIXED',
    `scheduledDate` DATETIME(3) NULL,
    `scheduleDateStart` DATETIME(3) NULL,
    `scheduleDateEnd` DATETIME(3) NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `estimatedHours` DECIMAL(5, 2) NULL,
    `hourlyRate` DECIMAL(10, 2) NULL,
    `materialSupply` ENUM('CLIENT_PROVIDES', 'COMPANY_PROVIDES') NOT NULL DEFAULT 'COMPANY_PROVIDES',
    `assignedTechId` INTEGER NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'AWAITING_PAYMENT', 'CLOSED', 'WRITE_OFF', 'CANCELED') NOT NULL DEFAULT 'DRAFT',
    `priority` VARCHAR(20) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `scheduledAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `canceledAt` DATETIME(3) NULL,
    `writtenOffAt` DATETIME(3) NULL,
    `createdById` INTEGER NULL,
    `closedById` INTEGER NULL,
    `canceledById` INTEGER NULL,
    `writtenOffById` INTEGER NULL,
    `cancellationReason` VARCHAR(500) NULL,
    `writeOffReason` VARCHAR(500) NULL,
    `techNotes` TEXT NULL,
    `clientNotes` TEXT NULL,
    `invoiceId` INTEGER NULL,
    `total` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `laborTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `materialTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `projetoId` INTEGER NULL,

    UNIQUE INDEX `service_orders_ticketNumber_key`(`ticketNumber`),
    UNIQUE INDEX `service_orders_invoiceId_key`(`invoiceId`),
    INDEX `service_orders_clienteId_idx`(`clienteId`),
    INDEX `service_orders_status_idx`(`status`),
    INDEX `service_orders_assignedTechId_idx`(`assignedTechId`),
    INDEX `service_orders_scheduledDate_idx`(`scheduledDate`),
    INDEX `service_orders_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_order_materials` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serviceOrderId` INTEGER NOT NULL,
    `materialId` INTEGER NULL,
    `name` VARCHAR(200) NOT NULL,
    `unit` VARCHAR(20) NULL,
    `externalSku` VARCHAR(50) NULL,
    `quantityPlanned` DECIMAL(12, 3) NOT NULL,
    `quantityUsed` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `quantityReturned` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `unitCostEstimated` DECIMAL(12, 2) NULL,
    `unitCostActual` DECIMAL(12, 2) NULL,
    `unitPrice` DECIMAL(12, 2) NULL,
    `status` ENUM('PENDING', 'NEEDS_PURCHASE', 'RESERVED', 'CONSUMED', 'RETURNED') NOT NULL DEFAULT 'PENDING',
    `reservedAt` DATETIME(3) NULL,
    `consumedAt` DATETIME(3) NULL,
    `returnedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `service_order_materials_serviceOrderId_idx`(`serviceOrderId`),
    INDEX `service_order_materials_materialId_idx`(`materialId`),
    INDEX `service_order_materials_status_idx`(`status`),
    INDEX `service_order_materials_name_unit_idx`(`name`, `unit`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serviceOrderId` INTEGER NOT NULL,
    `funcionarioId` INTEGER NOT NULL,
    `startedAt` DATETIME(3) NOT NULL,
    `endedAt` DATETIME(3) NOT NULL,
    `hourlyRate` DECIMAL(10, 2) NOT NULL,
    `totalMinutes` INTEGER NOT NULL,
    `totalCost` DECIMAL(10, 2) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `work_entries_serviceOrderId_idx`(`serviceOrderId`),
    INDEX `work_entries_funcionarioId_idx`(`funcionarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_order_scope_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serviceOrderId` INTEGER NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `description` VARCHAR(500) NOT NULL,
    `status` ENUM('PENDING', 'DONE', 'BLOCKED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `service_order_scope_items_serviceOrderId_idx`(`serviceOrderId`),
    UNIQUE INDEX `service_order_scope_items_serviceOrderId_sortOrder_key`(`serviceOrderId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_order_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serviceOrderId` INTEGER NOT NULL,
    `eventType` ENUM('CREATED', 'STATUS_CHANGED', 'CANCELED', 'REOPENED', 'TECH_ASSIGNED', 'MATERIAL_ADDED', 'WORK_ENTRY_ADDED') NOT NULL,
    `fromStatus` ENUM('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'AWAITING_PAYMENT', 'CLOSED', 'WRITE_OFF', 'CANCELED') NULL,
    `toStatus` ENUM('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'AWAITING_PAYMENT', 'CLOSED', 'WRITE_OFF', 'CANCELED') NULL,
    `reason` VARCHAR(500) NULL,
    `metadata` JSON NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `service_order_history_serviceOrderId_idx`(`serviceOrderId`),
    INDEX `service_order_history_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_RecurrenceOrigin` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_RecurrenceOrigin_AB_unique`(`A`, `B`),
    INDEX `_RecurrenceOrigin_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ExpenseRecurrenceOrigin` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_ExpenseRecurrenceOrigin_AB_unique`(`A`, `B`),
    INDEX `_ExpenseRecurrenceOrigin_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AnexoProposta` ADD CONSTRAINT `AnexoProposta_propostaId_fkey` FOREIGN KEY (`propostaId`) REFERENCES `Proposta`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Auditoria` ADD CONSTRAINT `Auditoria_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pricebook_categories` ADD CONSTRAINT `pricebook_categories_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `pricebook_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pricebook_items` ADD CONSTRAINT `pricebook_items_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `pricebook_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estimations` ADD CONSTRAINT `estimations_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estimations` ADD CONSTRAINT `estimations_projetoId_fkey` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estimation_options` ADD CONSTRAINT `estimation_options_estimationId_fkey` FOREIGN KEY (`estimationId`) REFERENCES `estimations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estimation_items` ADD CONSTRAINT `estimation_items_pricebookItemId_fkey` FOREIGN KEY (`pricebookItemId`) REFERENCES `pricebook_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estimation_items` ADD CONSTRAINT `estimation_items_estimationOptionId_fkey` FOREIGN KEY (`estimationOptionId`) REFERENCES `estimation_options`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CodigoMFA` ADD CONSTRAINT `CodigoMFA_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoricoSenha` ADD CONSTRAINT `HistoricoSenha_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Projeto` ADD CONSTRAINT `Projeto_propostaId_fkey` FOREIGN KEY (`propostaId`) REFERENCES `Proposta`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Proposta` ADD CONSTRAINT `Proposta_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropostaEtapa` ADD CONSTRAINT `PropostaEtapa_propostaId_fkey` FOREIGN KEY (`propostaId`) REFERENCES `Proposta`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropostaLog` ADD CONSTRAINT `PropostaLog_propostaId_fkey` FOREIGN KEY (`propostaId`) REFERENCES `Proposta`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropostaMaterial` ADD CONSTRAINT `PropostaMaterial_propostaId_fkey` FOREIGN KEY (`propostaId`) REFERENCES `Proposta`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos` ADD CONSTRAINT `projetos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos` ADD CONSTRAINT `projetos_proposta_id_fkey` FOREIGN KEY (`proposta_id`) REFERENCES `Proposta`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos` ADD CONSTRAINT `projetos_responsavel_fk_custom` FOREIGN KEY (`responsavel_id`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos` ADD CONSTRAINT `projetos_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos` ADD CONSTRAINT `projetos_atualizado_por_fkey` FOREIGN KEY (`atualizado_por`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos_etapas` ADD CONSTRAINT `projetos_etapas_projeto_id_fkey` FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos_etapas` ADD CONSTRAINT `projetos_etapas_responsavel_id_fkey` FOREIGN KEY (`responsavel_id`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos_materiais` ADD CONSTRAINT `projetos_materiais_projeto_id_fkey` FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos_anexos` ADD CONSTRAINT `projetos_anexos_projeto_id_fkey` FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos_anexos` ADD CONSTRAINT `projetos_anexos_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos_historico` ADD CONSTRAINT `projetos_historico_projeto_id_fkey` FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos_historico` ADD CONSTRAINT `projetos_historico_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos_movimentacoes_estoque` ADD CONSTRAINT `projetos_movimentacoes_estoque_projeto_id_fkey` FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos_movimentacoes_estoque` ADD CONSTRAINT `projetos_movimentacoes_estoque_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `projetos_materiais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos_movimentacoes_estoque` ADD CONSTRAINT `projetos_movimentacoes_estoque_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos_tarefas` ADD CONSTRAINT `projetos_tarefas_projeto_id_fkey` FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos_tarefas` ADD CONSTRAINT `projetos_tarefas_etapa_id_fkey` FOREIGN KEY (`etapa_id`) REFERENCES `projetos_etapas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos_tarefas` ADD CONSTRAINT `projetos_tarefas_atribuida_para_fkey` FOREIGN KEY (`atribuida_para`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos_tarefas` ADD CONSTRAINT `projetos_tarefas_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SessaoAtiva` ADD CONSTRAINT `SessaoAtiva_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TentativaLogin` ADD CONSTRAINT `TentativaLogin_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_tokenPaiId_fkey` FOREIGN KEY (`tokenPaiId`) REFERENCES `refresh_tokens`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `encryption_keys` ADD CONSTRAINT `encryption_keys_criadoPorUsuarioId_fkey` FOREIGN KEY (`criadoPorUsuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `key_usage_audit` ADD CONSTRAINT `key_usage_audit_keyId_fkey` FOREIGN KEY (`keyId`) REFERENCES `encryption_keys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `key_usage_audit` ADD CONSTRAINT `key_usage_audit_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categorias` ADD CONSTRAINT `categorias_pai_id_fkey` FOREIGN KEY (`pai_id`) REFERENCES `categorias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiais` ADD CONSTRAINT `materiais_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiais` ADD CONSTRAINT `materiais_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiais` ADD CONSTRAINT `materiais_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiais` ADD CONSTRAINT `materiais_atualizado_por_fkey` FOREIGN KEY (`atualizado_por`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiais_embalagens` ADD CONSTRAINT `materiais_embalagens_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materiais`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiais_lotes` ADD CONSTRAINT `materiais_lotes_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materiais`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiais_saldo` ADD CONSTRAINT `materiais_saldo_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materiais`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiais_saldo` ADD CONSTRAINT `materiais_saldo_lote_id_fkey` FOREIGN KEY (`lote_id`) REFERENCES `materiais_lotes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiais_saldo` ADD CONSTRAINT `materiais_saldo_localizacao_id_fkey` FOREIGN KEY (`localizacao_id`) REFERENCES `localizacoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiais_movimentacoes` ADD CONSTRAINT `materiais_movimentacoes_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materiais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiais_movimentacoes` ADD CONSTRAINT `materiais_movimentacoes_lote_id_fkey` FOREIGN KEY (`lote_id`) REFERENCES `materiais_lotes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiais_movimentacoes` ADD CONSTRAINT `materiais_movimentacoes_localizacao_origem_id_fkey` FOREIGN KEY (`localizacao_origem_id`) REFERENCES `localizacoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiais_movimentacoes` ADD CONSTRAINT `materiais_movimentacoes_localizacao_destino_id_fkey` FOREIGN KEY (`localizacao_destino_id`) REFERENCES `localizacoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiais_movimentacoes` ADD CONSTRAINT `materiais_movimentacoes_projeto_id_fkey` FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiais_movimentacoes` ADD CONSTRAINT `materiais_movimentacoes_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimentacoes` ADD CONSTRAINT `movimentacoes_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materiais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimentacoes` ADD CONSTRAINT `movimentacoes_equipamento_id_fkey` FOREIGN KEY (`equipamento_id`) REFERENCES `equipamentos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimentacoes` ADD CONSTRAINT `movimentacoes_projeto_id_fkey` FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimentacoes` ADD CONSTRAINT `movimentacoes_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projeto_materiais` ADD CONSTRAINT `projeto_materiais_projeto_id_fkey` FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projeto_materiais` ADD CONSTRAINT `projeto_materiais_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materiais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projeto_materiais` ADD CONSTRAINT `projeto_materiais_lote_id_fkey` FOREIGN KEY (`lote_id`) REFERENCES `materiais_lotes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projeto_materiais` ADD CONSTRAINT `projeto_materiais_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipamentos` ADD CONSTRAINT `equipamentos_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipamentos` ADD CONSTRAINT `equipamentos_fornecedor_id_fkey` FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipamentos` ADD CONSTRAINT `equipamentos_projeto_atual_id_fkey` FOREIGN KEY (`projeto_atual_id`) REFERENCES `projetos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipamentos` ADD CONSTRAINT `equipamentos_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipamentos` ADD CONSTRAINT `equipamentos_atualizado_por_fkey` FOREIGN KEY (`atualizado_por`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projeto_equipamentos` ADD CONSTRAINT `projeto_equipamentos_projeto_id_fkey` FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projeto_equipamentos` ADD CONSTRAINT `projeto_equipamentos_equipamento_id_fkey` FOREIGN KEY (`equipamento_id`) REFERENCES `equipamentos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projeto_equipamentos` ADD CONSTRAINT `projeto_equipamentos_responsavel_id_fkey` FOREIGN KEY (`responsavel_id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projeto_equipamentos` ADD CONSTRAINT `projeto_equipamentos_verificado_por_fkey` FOREIGN KEY (`verificado_por`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projeto_equipamentos` ADD CONSTRAINT `projeto_equipamentos_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipamentos_manutencao` ADD CONSTRAINT `equipamentos_manutencao_equipamento_id_fkey` FOREIGN KEY (`equipamento_id`) REFERENCES `equipamentos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipamentos_manutencao` ADD CONSTRAINT `equipamentos_manutencao_fornecedor_id_fkey` FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipamentos_manutencao` ADD CONSTRAINT `equipamentos_manutencao_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alertas_estoque` ADD CONSTRAINT `alertas_estoque_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materiais`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alertas_estoque` ADD CONSTRAINT `alertas_estoque_equipamento_id_fkey` FOREIGN KEY (`equipamento_id`) REFERENCES `equipamentos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alertas_estoque` ADD CONSTRAINT `alertas_estoque_projeto_id_fkey` FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alertas_estoque` ADD CONSTRAINT `alertas_estoque_visualizado_por_fkey` FOREIGN KEY (`visualizado_por`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alertas_estoque` ADD CONSTRAINT `alertas_estoque_resolvido_por_fkey` FOREIGN KEY (`resolvido_por`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compras` ADD CONSTRAINT `compras_fornecedor_id_fkey` FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compras` ADD CONSTRAINT `compras_projeto_id_fkey` FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compras` ADD CONSTRAINT `compras_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compras_itens` ADD CONSTRAINT `compras_itens_compra_id_fkey` FOREIGN KEY (`compra_id`) REFERENCES `compras`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compras_itens` ADD CONSTRAINT `compras_itens_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materiais`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compras_itens` ADD CONSTRAINT `compras_itens_equipamento_id_fkey` FOREIGN KEY (`equipamento_id`) REFERENCES `equipamentos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compras_itens` ADD CONSTRAINT `compras_itens_material_embalagem_id_fkey` FOREIGN KEY (`material_embalagem_id`) REFERENCES `materiais_embalagens`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compras_itens` ADD CONSTRAINT `compras_itens_lote_id_fkey` FOREIGN KEY (`lote_id`) REFERENCES `materiais_lotes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compras_itens` ADD CONSTRAINT `compras_itens_recebido_por_fkey` FOREIGN KEY (`recebido_por`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_projetoId_fkey` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_criadoPor_fkey` FOREIGN KEY (`criadoPor`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_atualizadoPor_fkey` FOREIGN KEY (`atualizadoPor`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_propostaEtapaId_fkey` FOREIGN KEY (`propostaEtapaId`) REFERENCES `PropostaEtapa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materiais`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoicePayment` ADD CONSTRAINT `InvoicePayment_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoicePayment` ADD CONSTRAINT `InvoicePayment_criadoPor_fkey` FOREIGN KEY (`criadoPor`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceReminder` ADD CONSTRAINT `InvoiceReminder_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `revenues` ADD CONSTRAINT `revenues_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `revenues` ADD CONSTRAINT `revenues_categoriaId_fkey` FOREIGN KEY (`categoriaId`) REFERENCES `revenue_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `revenues` ADD CONSTRAINT `revenues_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `revenues` ADD CONSTRAINT `revenues_recorrenciaId_fkey` FOREIGN KEY (`recorrenciaId`) REFERENCES `revenue_recurrences`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `revenue_categories` ADD CONSTRAINT `revenue_categories_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_recorrenciaId_fkey` FOREIGN KEY (`recorrenciaId`) REFERENCES `expense_recurrences`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_categoriaId_fkey` FOREIGN KEY (`categoriaId`) REFERENCES `expense_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_fornecedorId_fkey` FOREIGN KEY (`fornecedorId`) REFERENCES `fornecedores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_criadoPor_fkey` FOREIGN KEY (`criadoPor`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_compra_id_fkey` FOREIGN KEY (`compra_id`) REFERENCES `compras`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense_categories` ADD CONSTRAINT `expense_categories_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense_approvals` ADD CONSTRAINT `expense_approvals_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `expenses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense_approvals` ADD CONSTRAINT `expense_approvals_aprovadorId_fkey` FOREIGN KEY (`aprovadorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense_approvals` ADD CONSTRAINT `expense_approvals_proximoAprovadorId_fkey` FOREIGN KEY (`proximoAprovadorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_accounts` ADD CONSTRAINT `bank_accounts_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `bank_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_revenueId_fkey` FOREIGN KEY (`revenueId`) REFERENCES `revenues`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `expenses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_transferId_fkey` FOREIGN KEY (`transferId`) REFERENCES `bank_transfers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_transfers` ADD CONSTRAINT `bank_transfers_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_transfers` ADD CONSTRAINT `bank_transfers_fromAccountId_fkey` FOREIGN KEY (`fromAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_transfers` ADD CONSTRAINT `bank_transfers_toAccountId_fkey` FOREIGN KEY (`toAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `funcionarios` ADD CONSTRAINT `funcionarios_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `funcionarios` ADD CONSTRAINT `funcionarios_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `funcionarios` ADD CONSTRAINT `funcionarios_supervisorId_fkey` FOREIGN KEY (`supervisorId`) REFERENCES `funcionarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ferias` ADD CONSTRAINT `ferias_funcionarioId_fkey` FOREIGN KEY (`funcionarioId`) REFERENCES `funcionarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ferias` ADD CONSTRAINT `ferias_aprovadoPor_fkey` FOREIGN KEY (`aprovadoPor`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `faltas` ADD CONSTRAINT `faltas_funcionarioId_fkey` FOREIGN KEY (`funcionarioId`) REFERENCES `funcionarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `horas_extras` ADD CONSTRAINT `horas_extras_funcionarioId_fkey` FOREIGN KEY (`funcionarioId`) REFERENCES `funcionarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `horas_extras` ADD CONSTRAINT `horas_extras_aprovadoPor_fkey` FOREIGN KEY (`aprovadoPor`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avaliacoes` ADD CONSTRAINT `avaliacoes_funcionarioId_fkey` FOREIGN KEY (`funcionarioId`) REFERENCES `funcionarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avaliacoes` ADD CONSTRAINT `avaliacoes_avaliadorId_fkey` FOREIGN KEY (`avaliadorId`) REFERENCES `funcionarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos_funcionario` ADD CONSTRAINT `documentos_funcionario_funcionarioId_fkey` FOREIGN KEY (`funcionarioId`) REFERENCES `funcionarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `colaboradores` ADD CONSTRAINT `colaboradores_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dados_financeiros_colaborador` ADD CONSTRAINT `dados_financeiros_colaborador_colaboradorId_fkey` FOREIGN KEY (`colaboradorId`) REFERENCES `colaboradores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `habilidades_colaborador` ADD CONSTRAINT `habilidades_colaborador_colaboradorId_fkey` FOREIGN KEY (`colaboradorId`) REFERENCES `colaboradores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `habilidades_colaborador` ADD CONSTRAINT `habilidades_colaborador_worker_id_fkey` FOREIGN KEY (`worker_id`) REFERENCES `workers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos_colaborador` ADD CONSTRAINT `documentos_colaborador_colaboradorId_fkey` FOREIGN KEY (`colaboradorId`) REFERENCES `colaboradores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos_colaborador` ADD CONSTRAINT `documentos_colaborador_worker_id_fkey` FOREIGN KEY (`worker_id`) REFERENCES `workers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workers` ADD CONSTRAINT `workers_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `worker_financial_profiles` ADD CONSTRAINT `worker_financial_profiles_worker_id_fkey` FOREIGN KEY (`worker_id`) REFERENCES `workers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_worker_id_fkey` FOREIGN KEY (`worker_id`) REFERENCES `workers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `service_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projetos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timesheets` ADD CONSTRAINT `timesheets_assignment_id_fkey` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timesheet_entries` ADD CONSTRAINT `timesheet_entries_timesheet_id_fkey` FOREIGN KEY (`timesheet_id`) REFERENCES `timesheets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `milestones` ADD CONSTRAINT `milestones_assignment_id_fkey` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payables` ADD CONSTRAINT `payables_worker_id_fkey` FOREIGN KEY (`worker_id`) REFERENCES `workers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payable_line_items` ADD CONSTRAINT `payable_line_items_payable_id_fkey` FOREIGN KEY (`payable_id`) REFERENCES `payables`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_orders` ADD CONSTRAINT `service_orders_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_orders` ADD CONSTRAINT `service_orders_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_orders` ADD CONSTRAINT `service_orders_projetoId_fkey` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_orders` ADD CONSTRAINT `service_orders_assignedTechId_fkey` FOREIGN KEY (`assignedTechId`) REFERENCES `funcionarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_orders` ADD CONSTRAINT `service_orders_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_orders` ADD CONSTRAINT `service_orders_closedById_fkey` FOREIGN KEY (`closedById`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_orders` ADD CONSTRAINT `service_orders_canceledById_fkey` FOREIGN KEY (`canceledById`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_orders` ADD CONSTRAINT `service_orders_writtenOffById_fkey` FOREIGN KEY (`writtenOffById`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order_materials` ADD CONSTRAINT `service_order_materials_serviceOrderId_fkey` FOREIGN KEY (`serviceOrderId`) REFERENCES `service_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order_materials` ADD CONSTRAINT `service_order_materials_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materiais`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_entries` ADD CONSTRAINT `work_entries_serviceOrderId_fkey` FOREIGN KEY (`serviceOrderId`) REFERENCES `service_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_entries` ADD CONSTRAINT `work_entries_funcionarioId_fkey` FOREIGN KEY (`funcionarioId`) REFERENCES `funcionarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order_scope_items` ADD CONSTRAINT `service_order_scope_items_serviceOrderId_fkey` FOREIGN KEY (`serviceOrderId`) REFERENCES `service_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order_history` ADD CONSTRAINT `service_order_history_serviceOrderId_fkey` FOREIGN KEY (`serviceOrderId`) REFERENCES `service_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order_history` ADD CONSTRAINT `service_order_history_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_RecurrenceOrigin` ADD CONSTRAINT `_RecurrenceOrigin_A_fkey` FOREIGN KEY (`A`) REFERENCES `revenues`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_RecurrenceOrigin` ADD CONSTRAINT `_RecurrenceOrigin_B_fkey` FOREIGN KEY (`B`) REFERENCES `revenue_recurrences`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ExpenseRecurrenceOrigin` ADD CONSTRAINT `_ExpenseRecurrenceOrigin_A_fkey` FOREIGN KEY (`A`) REFERENCES `expenses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ExpenseRecurrenceOrigin` ADD CONSTRAINT `_ExpenseRecurrenceOrigin_B_fkey` FOREIGN KEY (`B`) REFERENCES `expense_recurrences`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
