-- CreateTable
CREATE TABLE `ledger_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `descricao` VARCHAR(255) NULL,
    `sourceType` ENUM('INVOICE', 'INVOICE_PAYMENT', 'EXPENSE_PAYMENT', 'OWNER_COMPENSATION', 'BANK_TRANSFER', 'REVERSAL', 'ADJUSTMENT') NOT NULL,
    `sourceId` INTEGER NOT NULL,
    `status` ENUM('POSTED', 'VOIDED', 'REVERSAL') NOT NULL DEFAULT 'POSTED',
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ledger_transactions_empresaId_sourceType_sourceId_key`(`empresaId`, `sourceType`, `sourceId`),
    INDEX `ledger_transactions_empresaId_idx`(`empresaId`),
    INDEX `ledger_transactions_empresaId_data_idx`(`empresaId`, `data`),
    INDEX `ledger_transactions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ledger_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `ledgerTransactionId` INTEGER NOT NULL,
    `accountCode` ENUM('CASH', 'ACCOUNTS_RECEIVABLE', 'REVENUE', 'EXPENSE', 'OWNER_EQUITY_DRAW', 'OWNER_DISTRIBUTION', 'WAGES_PAYROLL_EXPENSE', 'BANK_TRANSFER_CLEARING') NOT NULL,
    `debit` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `credit` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `memo` VARCHAR(255) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `ledger_entries_empresaId_idx`(`empresaId`),
    INDEX `ledger_entries_ledgerTransactionId_idx`(`ledgerTransactionId`),
    INDEX `ledger_entries_empresaId_accountCode_idx`(`empresaId`, `accountCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ledger_transactions` ADD CONSTRAINT `ledger_transactions_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger_entries` ADD CONSTRAINT `ledger_entries_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger_entries` ADD CONSTRAINT `ledger_entries_ledgerTransactionId_fkey` FOREIGN KEY (`ledgerTransactionId`) REFERENCES `ledger_transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_ledgerTransactionId_fkey` FOREIGN KEY (`ledgerTransactionId`) REFERENCES `ledger_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoicePayment` ADD CONSTRAINT `InvoicePayment_ledgerTransactionId_fkey` FOREIGN KEY (`ledgerTransactionId`) REFERENCES `ledger_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
