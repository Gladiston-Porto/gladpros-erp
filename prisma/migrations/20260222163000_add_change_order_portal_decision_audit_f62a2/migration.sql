ALTER TABLE `change_orders` ADD COLUMN IF NOT EXISTS `approved_by_name` VARCHAR(120) NULL;
ALTER TABLE `change_orders` ADD COLUMN IF NOT EXISTS `approved_ip` VARCHAR(64) NULL;
ALTER TABLE `change_orders` ADD COLUMN IF NOT EXISTS `approved_user_agent` VARCHAR(255) NULL;
ALTER TABLE `change_orders` ADD COLUMN IF NOT EXISTS `rejected_by_name` VARCHAR(120) NULL;
ALTER TABLE `change_orders` ADD COLUMN IF NOT EXISTS `rejected_ip` VARCHAR(64) NULL;
ALTER TABLE `change_orders` ADD COLUMN IF NOT EXISTS `rejected_user_agent` VARCHAR(255) NULL;
