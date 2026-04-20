-- AlterTable
ALTER TABLE `Invoice` ADD COLUMN `empresaId` INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX `Invoice_empresaId_status_idx` ON `Invoice`(`empresaId`, `status`);

-- CreateIndex
CREATE INDEX `Invoice_clienteId_status_idx` ON `Invoice`(`clienteId`, `status`);

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
