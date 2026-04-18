-- CreateTable
CREATE TABLE `domain_events` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `aggregate_type` VARCHAR(50) NOT NULL,
    `aggregate_id` VARCHAR(50) NOT NULL,
    `correlation_id` VARCHAR(36) NULL,
    `payload` LONGTEXT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `error` TEXT NULL,
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,

    INDEX `de_name_status_idx`(`name`, `status`),
    INDEX `de_aggregate_idx`(`aggregate_type`, `aggregate_id`),
    INDEX `de_correlation_idx`(`correlation_id`),
    INDEX `de_occurred_idx`(`occurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
