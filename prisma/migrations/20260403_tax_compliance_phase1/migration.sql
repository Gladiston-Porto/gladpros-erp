-- Tax Compliance Phase 1: Enums, fields, and new models
-- GladPros ERP — US Federal Tax (LLC + S-Corp)

-- AlterTable: Add OWNER_OPERATOR to WorkerClassification enum
ALTER TABLE `workers` MODIFY `classification` ENUM('W2_EMPLOYEE', 'CONTRACTOR_1099', 'SUBCONTRACTOR', 'OWNER_OPERATOR') NOT NULL DEFAULT 'CONTRACTOR_1099';

ALTER TABLE `employer_burden_rates` MODIFY `classification` ENUM('W2_EMPLOYEE', 'CONTRACTOR_1099', 'SUBCONTRACTOR', 'OWNER_OPERATOR') NOT NULL;

-- AlterTable: Add tax regime to Empresa
ALTER TABLE `empresas` ADD COLUMN `tipoTributacao` ENUM('LLC_DEFAULT', 'S_CORP') NOT NULL DEFAULT 'LLC_DEFAULT',
    ADD COLUMN `tipo_tributacao_desde` DATETIME(3) NULL;

-- AlterTable: Add deductibility fields to Expense
ALTER TABLE `expenses` ADD COLUMN `dedutivel` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `percentual_dedutivel` INTEGER NULL;

-- AlterTable: Add Schedule C mapping to ExpenseCategory
ALTER TABLE `expense_categories` ADD COLUMN `dedutivel` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `schedule_c_line` VARCHAR(20) NULL,
    ADD COLUMN `slug` VARCHAR(50) NULL;

-- CreateIndex: Unique slug on ExpenseCategory
CREATE UNIQUE INDEX `expense_categories_slug_key` ON `expense_categories`(`slug`);

-- CreateTable: OwnerCompensation
CREATE TABLE `owner_compensations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `workerId` INTEGER NOT NULL,
    `tipo` ENUM('OWNER_DRAW', 'SALARY', 'DISTRIBUTION') NOT NULL,
    `valor` DECIMAL(14, 2) NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `descricao` VARCHAR(255) NULL,
    `referencia` VARCHAR(100) NULL,
    `bankAccountId` INTEGER NULL,
    `criadoPor` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `owner_compensations_empresaId_data_idx`(`empresaId`, `data`),
    INDEX `owner_compensations_workerId_idx`(`workerId`),
    INDEX `owner_compensations_tipo_idx`(`tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: EstimatedTaxPayment
CREATE TABLE `estimated_tax_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `taxYear` INTEGER NOT NULL,
    `quarter` ENUM('Q1', 'Q2', 'Q3', 'Q4') NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `estimatedAmount` DECIMAL(14, 2) NOT NULL,
    `paidAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `paidDate` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'PAID', 'PARTIAL', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    `notas` TEXT NULL,
    `criadoPor` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `estimated_tax_payments_empresaId_taxYear_idx`(`empresaId`, `taxYear`),
    INDEX `estimated_tax_payments_status_idx`(`status`),
    UNIQUE INDEX `estimated_tax_payments_empresaId_taxYear_quarter_key`(`empresaId`, `taxYear`, `quarter`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: OwnerCompensation
ALTER TABLE `owner_compensations` ADD CONSTRAINT `owner_compensations_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `owner_compensations` ADD CONSTRAINT `owner_compensations_workerId_fkey` FOREIGN KEY (`workerId`) REFERENCES `workers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `owner_compensations` ADD CONSTRAINT `owner_compensations_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `owner_compensations` ADD CONSTRAINT `owner_compensations_criadoPor_fkey` FOREIGN KEY (`criadoPor`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: EstimatedTaxPayment
ALTER TABLE `estimated_tax_payments` ADD CONSTRAINT `estimated_tax_payments_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `estimated_tax_payments` ADD CONSTRAINT `estimated_tax_payments_criadoPor_fkey` FOREIGN KEY (`criadoPor`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
