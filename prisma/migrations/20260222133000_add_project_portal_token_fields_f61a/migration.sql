ALTER TABLE `projetos`
  ADD COLUMN `portal_token_hash` VARCHAR(64) NULL,
  ADD COLUMN `portal_token_created_at` DATETIME(3) NULL,
  ADD COLUMN `portal_token_revoked_at` DATETIME(3) NULL;

CREATE UNIQUE INDEX `projetos_portal_token_hash_key`
  ON `projetos`(`portal_token_hash`);
