-- Hash bearer secrets at rest for Auth session, refresh and trusted-device tokens.

ALTER TABLE `SessaoAtiva`
  ADD COLUMN `tokenHash` CHAR(64) NULL;

UPDATE `SessaoAtiva`
SET `tokenHash` = SHA2(`token`, 256),
    `token` = SHA2(`token`, 256)
WHERE `tokenHash` IS NULL;

ALTER TABLE `SessaoAtiva`
  MODIFY COLUMN `tokenHash` CHAR(64) NOT NULL;

CREATE UNIQUE INDEX `SessaoAtiva_tokenHash_key` ON `SessaoAtiva`(`tokenHash`);
CREATE INDEX `SessaoAtiva_tokenHash_idx` ON `SessaoAtiva`(`tokenHash`);

ALTER TABLE `DispositivoConfiavel`
  ADD COLUMN `deviceTokenHash` CHAR(64) NULL;

UPDATE `DispositivoConfiavel`
SET `deviceTokenHash` = SHA2(`deviceToken`, 256),
    `deviceToken` = SHA2(`deviceToken`, 256)
WHERE `deviceTokenHash` IS NULL;

ALTER TABLE `DispositivoConfiavel`
  MODIFY COLUMN `deviceTokenHash` CHAR(64) NOT NULL;

CREATE UNIQUE INDEX `DispositivoConfiavel_deviceTokenHash_key` ON `DispositivoConfiavel`(`deviceTokenHash`);
CREATE INDEX `DispositivoConfiavel_deviceTokenHash_idx` ON `DispositivoConfiavel`(`deviceTokenHash`);

ALTER TABLE `refresh_tokens`
  ADD COLUMN `tokenHash` CHAR(64) NULL;

UPDATE `refresh_tokens`
SET `tokenHash` = SHA2(`token`, 256),
    `token` = SHA2(`token`, 256)
WHERE `tokenHash` IS NULL;

ALTER TABLE `refresh_tokens`
  MODIFY COLUMN `tokenHash` CHAR(64) NOT NULL;

CREATE UNIQUE INDEX `refresh_tokens_tokenHash_key` ON `refresh_tokens`(`tokenHash`);
CREATE INDEX `refresh_tokens_tokenHash_idx` ON `refresh_tokens`(`tokenHash`);
