-- CreateTable
CREATE TABLE `triagens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projeto_id` INTEGER NOT NULL,
    `tipo` ENUM('MATERIAL', 'EQUIPAMENTO', 'FERRAMENTA', 'INSPECAO') NOT NULL,
    `status` ENUM('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA') NOT NULL DEFAULT 'PENDENTE',
    `prioridade` ENUM('BAIXA', 'MEDIA', 'ALTA', 'URGENTE') NOT NULL DEFAULT 'MEDIA',
    `item_id` INTEGER NULL,
    `motivo` TEXT NOT NULL,
    `resultado` TEXT NULL,
    `observacoes` TEXT NULL,
    `acoes_corretivas` TEXT NULL,
    `prazo_estimado` DATETIME(3) NULL,
    `usuario_solicitante_id` INTEGER NOT NULL,
    `usuario_responsavel_id` INTEGER NULL,
    `abertura_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `conclusao_em` DATETIME(3) NULL,

    INDEX `triagem_projeto_status_idx`(`projeto_id`, `status`),
    INDEX `triagem_tipo_idx`(`tipo`),
    INDEX `triagem_prazo_idx`(`prazo_estimado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `triagens` ADD CONSTRAINT `triagens_projeto_id_fkey` FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `triagens` ADD CONSTRAINT `triagens_usuario_solicitante_id_fkey` FOREIGN KEY (`usuario_solicitante_id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `triagens` ADD CONSTRAINT `triagens_usuario_responsavel_id_fkey` FOREIGN KEY (`usuario_responsavel_id`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
