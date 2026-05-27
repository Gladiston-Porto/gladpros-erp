ALTER TABLE `refresh_tokens`
  ADD COLUMN `sessionId` INTEGER NULL;

CREATE INDEX `refresh_tokens_sessionId_idx` ON `refresh_tokens`(`sessionId`);

ALTER TABLE `refresh_tokens`
  ADD CONSTRAINT `refresh_tokens_sessionId_fkey`
  FOREIGN KEY (`sessionId`) REFERENCES `SessaoAtiva`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;