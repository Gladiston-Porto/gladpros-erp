-- ============================================================
-- GladPros ERP — Seed de Materiais Base
-- Plumbing | Electrical | Remodeling
-- Executado em: 2026-05-11
-- Seguro para re-executar (INSERT IGNORE)
-- ============================================================

-- ELECTRICAL — Wire (FT, categoria CABO id:2)
INSERT IGNORE INTO materiais (codigo, nome, unidade_id, categoria_id, estoque_minimo, ponto_reposicao, ativo, criado_em) VALUES
('EL-00002', '14/2 NM-B Wire with Ground',  2, 2, 100.000, 200.000, 1, NOW()),
('EL-00003', '10/2 NM-B Wire with Ground',  2, 2,  50.000, 100.000, 1, NOW()),
('EL-00004', '10/3 NM-B Wire with Ground',  2, 2,   0.000,  50.000, 1, NOW()),
('EL-00005', '8/2 NM-B Wire with Ground',   2, 2,   0.000,  25.000, 1, NOW()),
-- ELECTRICAL — Conduit (FT, cat Electrical id:1)
('EL-00006', '1/2 in. EMT Conduit',         2, 1,   0.000,  20.000, 1, NOW()),
('EL-00007', '3/4 in. EMT Conduit',         2, 1,   0.000,  20.000, 1, NOW()),
-- ELECTRICAL — Outlets & Switches (EA id:1, cat Electrical id:1)
('EL-00008', '15A Duplex Outlet',            1, 1,   5.000,  10.000, 1, NOW()),
('EL-00009', '20A Duplex Outlet',            1, 1,   5.000,  10.000, 1, NOW()),
('EL-00010', '20A GFCI Outlet',              1, 1,   3.000,   8.000, 1, NOW()),
('EL-00011', '15A Single Pole Switch',       1, 1,   5.000,  10.000, 1, NOW()),
('EL-00012', '3-Way Switch 15A',             1, 1,   2.000,   5.000, 1, NOW()),
-- ELECTRICAL — Boxes (EA)
('EL-00013', 'Single-Gang Plastic Box',      1, 1,   5.000,  15.000, 1, NOW()),
('EL-00014', '2-Gang Plastic Box',           1, 1,   2.000,   8.000, 1, NOW()),
('EL-00015', '4 in. Round Ceiling Box',      1, 1,   2.000,   5.000, 1, NOW()),
-- ELECTRICAL — Breakers (EA)
('EL-00016', '15A Single Pole Breaker',      1, 1,   2.000,   5.000, 1, NOW()),
('EL-00017', '20A Single Pole Breaker',      1, 1,   2.000,   5.000, 1, NOW()),
('EL-00018', '30A Double Pole Breaker',      1, 1,   0.000,   2.000, 1, NOW()),
('EL-00019', '50A Double Pole Breaker',      1, 1,   0.000,   2.000, 1, NOW()),
-- ELECTRICAL — Accessories
('EL-00020', 'Wire Nut Assortment',         14, 1,   1.000,   3.000, 1, NOW()),
('EL-00021', 'Electrical Tape 3/4 in.',     11, 1,   2.000,   5.000, 1, NOW()),
('EL-00022', 'Wire Staples 1/2 in.',         9, 1,   1.000,   3.000, 1, NOW());

-- PLUMBING — Pipe (FT id:2, cat Plumbing id:3)
INSERT IGNORE INTO materiais (codigo, nome, unidade_id, categoria_id, estoque_minimo, ponto_reposicao, ativo, criado_em) VALUES
('PL-00002', '1/2 in. PVC Schedule 40 Pipe',        2, 3,  20.000,  50.000, 1, NOW()),
('PL-00003', '3/4 in. PVC Schedule 40 Pipe',        2, 3,  20.000,  50.000, 1, NOW()),
('PL-00004', '1 in. PVC Schedule 40 Pipe',          2, 3,  10.000,  30.000, 1, NOW()),
('PL-00005', '1-1/2 in. PVC Schedule 40 Pipe',      2, 3,   0.000,  20.000, 1, NOW()),
('PL-00006', '2 in. PVC Schedule 40 Pipe',          2, 3,   0.000,  20.000, 1, NOW()),
('PL-00007', '1/2 in. CPVC Pipe',                   2, 3,  10.000,  30.000, 1, NOW()),
('PL-00008', '3/4 in. CPVC Pipe',                   2, 3,  10.000,  30.000, 1, NOW()),
('PL-00009', '1/2 in. PEX-A Pipe',                  2, 3,  50.000, 100.000, 1, NOW()),
('PL-00010', '3/4 in. PEX-A Pipe',                  2, 3,  50.000, 100.000, 1, NOW()),
-- PLUMBING — PVC Fittings (EA id:1, cat Fitting id:18)
('PL-00011', '1/2 in. PVC 90 Degree Elbow',         1, 18, 10.000,  20.000, 1, NOW()),
('PL-00012', '3/4 in. PVC 90 Degree Elbow',         1, 18, 10.000,  20.000, 1, NOW()),
('PL-00013', '1 in. PVC 90 Degree Elbow',           1, 18,  5.000,  10.000, 1, NOW()),
('PL-00014', '1/2 in. PVC 45 Degree Elbow',         1, 18,  5.000,  10.000, 1, NOW()),
('PL-00015', '3/4 in. PVC 45 Degree Elbow',         1, 18,  5.000,  10.000, 1, NOW()),
('PL-00016', '1/2 in. PVC Tee',                     1, 18, 10.000,  20.000, 1, NOW()),
('PL-00017', '3/4 in. PVC Tee',                     1, 18, 10.000,  20.000, 1, NOW()),
('PL-00018', '1/2 in. PVC Coupling',                1, 18, 10.000,  20.000, 1, NOW()),
('PL-00019', '3/4 in. PVC Coupling',                1, 18, 10.000,  20.000, 1, NOW()),
('PL-00020', '1/2 in. PVC End Cap',                 1, 18,  5.000,  10.000, 1, NOW()),
-- PLUMBING — Push-to-Connect (EA, cat Fitting id:18)
('PL-00021', '1/2 in. Push-to-Connect Coupling',    1, 18,  5.000,  10.000, 1, NOW()),
('PL-00022', '1/2 in. Push-to-Connect 90 Elbow',    1, 18,  3.000,   8.000, 1, NOW()),
('PL-00023', '3/4 in. Push-to-Connect Coupling',    1, 18,  3.000,   8.000, 1, NOW()),
-- PLUMBING — Ball Valves (EA, cat Plumbing id:3)
('PL-00024', '1/2 in. Ball Valve Full Port',         1, 3,  2.000,   5.000, 1, NOW()),
('PL-00025', '3/4 in. Ball Valve Full Port',         1, 3,  2.000,   5.000, 1, NOW()),
('PL-00026', '1 in. Ball Valve Full Port',           1, 3,  0.000,   2.000, 1, NOW()),
-- PLUMBING — Supplies (ROLL id:11, OZ id:19, cat Plumbing)
('PL-00027', 'Teflon Tape 1/2 in.',                 11, 3,  3.000,  10.000, 1, NOW()),
('PL-00028', 'PVC Primer Purple 8 oz',              19, 3,  1.000,   3.000, 1, NOW()),
('PL-00029', 'PVC Cement Regular 8 oz',             19, 3,  1.000,   3.000, 1, NOW()),
('PL-00030', 'CPVC Cement 8 oz',                    19, 3,  1.000,   3.000, 1, NOW()),
('PL-00031', 'Pipe Thread Sealant 8 oz',            19, 3,  1.000,   3.000, 1, NOW()),
('PL-00032', 'Plumbers Putty 14 oz',                19, 3,  1.000,   3.000, 1, NOW());

-- REMODELING — Drywall (SF id:7, cat Drywall id:7)
INSERT IGNORE INTO materiais (codigo, nome, unidade_id, categoria_id, estoque_minimo, ponto_reposicao, ativo, criado_em) VALUES
('RM-00001', '1/2 in. Drywall 4x8 Sheet',            7, 7,  0.000,   0.000, 1, NOW()),
('RM-00002', '5/8 in. Fire-Rated Drywall 4x8 Sheet', 7, 7,  0.000,   0.000, 1, NOW()),
('RM-00003', '1/4 in. Drywall 4x8 Sheet',            7, 7,  0.000,   0.000, 1, NOW()),
('RM-00004', 'Drywall Screw 1-5/8 in.',              4, 5,  1.000,   3.000, 1, NOW()),
('RM-00005', 'Drywall Screw 3 in.',                  4, 5,  0.500,   1.500, 1, NOW()),
('RM-00006', 'Joint Compound All Purpose',            5, 7,  0.000,   5.000, 1, NOW()),
('RM-00007', 'Paper Drywall Tape',                  11, 7,  1.000,   3.000, 1, NOW()),
('RM-00008', 'Fiberglass Mesh Drywall Tape',        11, 7,  1.000,   3.000, 1, NOW()),
('RM-00009', 'Metal Corner Bead 8 ft',               2, 7,  0.000,   5.000, 1, NOW()),
('RM-00010', 'Wood Screw #8 x 1-5/8 in.',            4, 5,  0.500,   2.000, 1, NOW()),
('RM-00011', 'Wood Screw #8 x 3 in.',                4, 5,  0.500,   2.000, 1, NOW()),
('RM-00012', 'Concrete Screw 3/16 in. x 1-3/4 in.', 9, 5,  1.000,   2.000, 1, NOW()),
('RM-00013', 'Plastic Drywall Anchor Kit',          14, 5,  1.000,   3.000, 1, NOW()),
('RM-00014', 'Construction Adhesive Tube',           1,14,  2.000,   5.000, 1, NOW()),
('RM-00015', 'Silicone Caulk White',                 1,14,  2.000,   5.000, 1, NOW()),
('RM-00016', 'Silicone Caulk Clear',                 1,14,  2.000,   5.000, 1, NOW()),
('RM-00017', 'Paintable Caulk White',                1,14,  2.000,   5.000, 1, NOW()),
('RM-00018', 'Expanding Foam Sealant 12 oz',         1,14,  1.000,   3.000, 1, NOW()),
('RM-00019', 'Interior Paint White 1 Gal',           5, 9,  0.000,   0.000, 1, NOW()),
('RM-00020', 'Drywall Primer 1 Gal',                 5, 9,  0.000,   2.000, 1, NOW());

-- EMBALAGENS (packaging conversions)
INSERT IGNORE INTO materiais_embalagens (material_id, packageType, baseQtyPerUnit, purchaseUnit, brand, ativo, criado_em)
SELECT id, 'ROLL', 250.000, 'ROLL', NULL, 1, NOW() FROM materiais WHERE codigo = 'EL-00002';
INSERT IGNORE INTO materiais_embalagens (material_id, packageType, baseQtyPerUnit, purchaseUnit, brand, ativo, criado_em)
SELECT id, 'ROLL', 125.000, 'ROLL', NULL, 1, NOW() FROM materiais WHERE codigo = 'EL-00003';
INSERT IGNORE INTO materiais_embalagens (material_id, packageType, baseQtyPerUnit, purchaseUnit, brand, ativo, criado_em)
SELECT id, 'ROLL', 125.000, 'ROLL', NULL, 1, NOW() FROM materiais WHERE codigo IN ('EL-00004','EL-00005');
INSERT IGNORE INTO materiais_embalagens (material_id, packageType, baseQtyPerUnit, purchaseUnit, brand, ativo, criado_em)
SELECT id, 'STICK', 10.000, 'EA', NULL, 1, NOW() FROM materiais WHERE codigo IN ('EL-00006','EL-00007');
INSERT IGNORE INTO materiais_embalagens (material_id, packageType, baseQtyPerUnit, purchaseUnit, brand, ativo, criado_em)
SELECT id, 'PACK-10', 10.000, 'PK', NULL, 1, NOW() FROM materiais WHERE codigo IN ('EL-00008','EL-00009','EL-00010','EL-00011','EL-00012');
INSERT IGNORE INTO materiais_embalagens (material_id, packageType, baseQtyPerUnit, purchaseUnit, brand, ativo, criado_em)
SELECT id, 'STICK', 10.000, 'EA', NULL, 1, NOW() FROM materiais WHERE codigo IN ('PL-00002','PL-00003','PL-00004','PL-00005','PL-00006','PL-00007','PL-00008');
INSERT IGNORE INTO materiais_embalagens (material_id, packageType, baseQtyPerUnit, purchaseUnit, brand, ativo, criado_em)
SELECT id, 'COIL', 100.000, 'COIL', NULL, 1, NOW() FROM materiais WHERE codigo IN ('PL-00009','PL-00010');
INSERT IGNORE INTO materiais_embalagens (material_id, packageType, baseQtyPerUnit, purchaseUnit, brand, ativo, criado_em)
SELECT id, 'BAG-25', 25.000, 'BAG', NULL, 1, NOW() FROM materiais WHERE codigo IN ('PL-00011','PL-00012','PL-00013','PL-00014','PL-00015','PL-00016','PL-00017','PL-00018','PL-00019','PL-00020');
INSERT IGNORE INTO materiais_embalagens (material_id, packageType, baseQtyPerUnit, purchaseUnit, brand, ativo, criado_em)
SELECT id, 'SHEET', 32.000, 'EA', NULL, 1, NOW() FROM materiais WHERE codigo IN ('RM-00001','RM-00002','RM-00003');
INSERT IGNORE INTO materiais_embalagens (material_id, packageType, baseQtyPerUnit, purchaseUnit, brand, ativo, criado_em)
SELECT id, 'STICK', 8.000, 'EA', NULL, 1, NOW() FROM materiais WHERE codigo = 'RM-00009';
INSERT IGNORE INTO materiais_embalagens (material_id, packageType, baseQtyPerUnit, purchaseUnit, brand, ativo, criado_em)
SELECT id, 'BUCKET', 4.500, 'EA', NULL, 1, NOW() FROM materiais WHERE codigo = 'RM-00006';
INSERT IGNORE INTO materiais_embalagens (material_id, packageType, baseQtyPerUnit, purchaseUnit, brand, ativo, criado_em)
SELECT id, 'ROLL', 1.000, 'ROLL', NULL, 1, NOW() FROM materiais WHERE codigo IN ('RM-00007','RM-00008');
