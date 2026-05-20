-- Preserve payment records during reversals and enforce gateway idempotency.
ALTER TABLE `InvoicePayment`
  ADD COLUMN `estornadoEm` DATETIME(3) NULL,
  ADD COLUMN `estornadoPor` INTEGER NULL,
  ADD COLUMN `motivoEstorno` VARCHAR(500) NULL;

ALTER TABLE `InvoicePayment`
  DROP INDEX `InvoicePayment_gatewayTransactionId_idx`,
  ADD UNIQUE INDEX `InvoicePayment_gatewayTransactionId_key`(`gatewayTransactionId`);
