-- AddIndex: Cliente.addressCity
CREATE INDEX `Cliente_addressCity_idx` ON `Cliente`(`addressCity`);

-- AddIndex: Cliente.addressState
CREATE INDEX `Cliente_addressState_idx` ON `Cliente`(`addressState`);

-- AddIndex: Cliente.addressCity + addressState (composite)
CREATE INDEX `Cliente_addressCity_addressState_idx` ON `Cliente`(`addressCity`, `addressState`);
