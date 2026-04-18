-- Migration: add client_signature_url to service_orders
ALTER TABLE `service_orders`
  ADD COLUMN `client_signature_url` VARCHAR(500) NULL;
