/**
 * Seed Pack - Estoque (Materiais de Construção Civil - US Market)
 * 
 * VERSÃO CORRIGIDA conforme feedback dos analistas:
 * 1. CategoryMap usa path completo (tipo|path) para evitar colisões
 * 2. Unidades base apenas (sem RL/BX/PK - usar MaterialEmbalagem para conversões)
 * 3. valorAquisicao placeholder (0.01) para equipamentos de seed
 * 
 * IDEMPOTENTE: Pode rodar múltiplas vezes sem duplicar dados.
 * 
 * Comando: npx tsx prisma/seed-estoque.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// UNIDADES DE MEDIDA - APENAS UNIDADES BASE
// ============================================================================
// NOTA: RL (Roll), BX (Box), PK (Pack) são unidades de EMBALAGEM, não de estoque.
// Use MaterialEmbalagem para conversões (ex: 1 Roll = 250 FT)
const UNITS = [
    { codigo: 'EA',   nome: 'Each (Unit)' },
    { codigo: 'FT',   nome: 'Feet' },
    { codigo: 'IN',   nome: 'Inches' },
    { codigo: 'LF',   nome: 'Linear Feet' },
    { codigo: 'SF',   nome: 'Square Feet' },
    { codigo: 'SY',   nome: 'Square Yard' },
    { codigo: 'CF',   nome: 'Cubic Feet' },
    { codigo: 'CY',   nome: 'Cubic Yard' },
    { codigo: 'LB',   nome: 'Pound' },
    { codigo: 'OZ',   nome: 'Ounce' },
    { codigo: 'TN',   nome: 'Ton' },
    { codigo: 'GAL',  nome: 'Gallon' },
    { codigo: 'QT',   nome: 'Quart' },
    { codigo: 'BAG',  nome: 'Bag' },
    { codigo: 'BOX',  nome: 'Box' },
    { codigo: 'ROLL', nome: 'Roll' },
    { codigo: 'SET',  nome: 'Set' },
    { codigo: 'PR',   nome: 'Pair' },
    { codigo: 'PK',   nome: 'Pack' },
    { codigo: 'HR',   nome: 'Hour' },
    { codigo: 'LS',   nome: 'Lump Sum' },
];

// ============================================================================
// CATEGORIAS - MATERIAIS (Hierárquica)
// ============================================================================
type CategoryDef = {
    nome: string;
    tipo: 'MATERIAL' | 'EQUIPAMENTO';
    filhos?: CategoryDef[];
};

const MATERIAL_CATEGORIES: CategoryDef[] = [
    {
        nome: 'Electrical',
        tipo: 'MATERIAL',
        filhos: [
            {
                nome: 'Wire & Cable',
                tipo: 'MATERIAL',
                filhos: [
                    { nome: 'NM-B (Romex)', tipo: 'MATERIAL' },
                    { nome: 'THHN/THWN', tipo: 'MATERIAL' },
                    { nome: 'MC Cable', tipo: 'MATERIAL' },
                    { nome: 'UF-B Underground', tipo: 'MATERIAL' },
                ],
            },
            {
                nome: 'Conduit & Fittings',
                tipo: 'MATERIAL',
                filhos: [
                    { nome: 'EMT Conduit', tipo: 'MATERIAL' },
                    { nome: 'PVC Conduit', tipo: 'MATERIAL' },
                    { nome: 'Flexible Conduit', tipo: 'MATERIAL' },
                    { nome: 'Conduit Fittings', tipo: 'MATERIAL' },
                ],
            },
            {
                nome: 'Boxes & Covers',
                tipo: 'MATERIAL',
                filhos: [
                    { nome: 'Junction Boxes', tipo: 'MATERIAL' },
                    { nome: 'Outlet Boxes', tipo: 'MATERIAL' },
                    { nome: 'Switch Boxes', tipo: 'MATERIAL' },
                ],
            },
            {
                nome: 'Breakers & Panels',
                tipo: 'MATERIAL',
                filhos: [
                    { nome: 'Circuit Breakers', tipo: 'MATERIAL' },
                    { nome: 'Load Centers', tipo: 'MATERIAL' },
                    { nome: 'Sub Panels', tipo: 'MATERIAL' },
                ],
            },
            { nome: 'Connectors & Accessories', tipo: 'MATERIAL' },
            { nome: 'Switches & Outlets', tipo: 'MATERIAL' },
        ],
    },
    {
        nome: 'Plumbing',
        tipo: 'MATERIAL',
        filhos: [
            {
                nome: 'Pipes & Fittings',
                tipo: 'MATERIAL',
                filhos: [
                    { nome: 'PVC Schedule 40', tipo: 'MATERIAL' },
                    { nome: 'PEX Tubing', tipo: 'MATERIAL' },
                    { nome: 'Copper Pipe', tipo: 'MATERIAL' },
                    { nome: 'CPVC', tipo: 'MATERIAL' },
                    { nome: 'ABS/DWV', tipo: 'MATERIAL' },
                ],
            },
            { nome: 'Valves & Shutoffs', tipo: 'MATERIAL' },
            { nome: 'Drains & P-Traps', tipo: 'MATERIAL' },
            { nome: 'Faucets & Fixtures', tipo: 'MATERIAL' },
            { nome: 'Water Heater Parts', tipo: 'MATERIAL' },
            { nome: 'Adhesives & Primers', tipo: 'MATERIAL' },
        ],
    },
    {
        nome: 'Framing & Lumber',
        tipo: 'MATERIAL',
        filhos: [
            { nome: 'Dimensional Lumber', tipo: 'MATERIAL' },
            { nome: 'Plywood & OSB', tipo: 'MATERIAL' },
            { nome: 'Engineered Wood', tipo: 'MATERIAL' },
            { nome: 'Treated Lumber', tipo: 'MATERIAL' },
        ],
    },
    {
        nome: 'Drywall',
        tipo: 'MATERIAL',
        filhos: [
            { nome: 'Gypsum Board', tipo: 'MATERIAL' },
            { nome: 'Metal Framing', tipo: 'MATERIAL' },
            { nome: 'Joint Compound & Tape', tipo: 'MATERIAL' },
            { nome: 'Corner Beads', tipo: 'MATERIAL' },
        ],
    },
    {
        nome: 'Paint & Finishes',
        tipo: 'MATERIAL',
        filhos: [
            { nome: 'Interior Paint', tipo: 'MATERIAL' },
            { nome: 'Exterior Paint', tipo: 'MATERIAL' },
            { nome: 'Primers', tipo: 'MATERIAL' },
            { nome: 'Stains & Sealers', tipo: 'MATERIAL' },
            { nome: 'Caulks & Sealants', tipo: 'MATERIAL' },
        ],
    },
    {
        nome: 'Fasteners & Hardware',
        tipo: 'MATERIAL',
        filhos: [
            { nome: 'Screws', tipo: 'MATERIAL' },
            { nome: 'Nails', tipo: 'MATERIAL' },
            { nome: 'Bolts & Anchors', tipo: 'MATERIAL' },
            { nome: 'Staples', tipo: 'MATERIAL' },
        ],
    },
    {
        nome: 'Consumables',
        tipo: 'MATERIAL',
        filhos: [
            { nome: 'Tapes', tipo: 'MATERIAL' },
            { nome: 'Abrasives', tipo: 'MATERIAL' },
            { nome: 'Adhesives', tipo: 'MATERIAL' },
            { nome: 'Solvents & Cleaners', tipo: 'MATERIAL' },
        ],
    },
    {
        nome: 'Safety',
        tipo: 'MATERIAL',
        filhos: [
            { nome: 'PPE', tipo: 'MATERIAL' },
            { nome: 'Safety Barriers', tipo: 'MATERIAL' },
        ],
    },
    {
        nome: 'Finishes & Trim',
        tipo: 'MATERIAL',
        filhos: [
            { nome: 'Moldings', tipo: 'MATERIAL' },
            { nome: 'Door Hardware', tipo: 'MATERIAL' },
            { nome: 'Bathroom Accessories', tipo: 'MATERIAL' },
        ],
    },
];

const EQUIPMENT_CATEGORIES: CategoryDef[] = [
    {
        nome: 'Power Tools',
        tipo: 'EQUIPAMENTO',
        filhos: [
            { nome: 'Drills & Drivers', tipo: 'EQUIPAMENTO' },
            { nome: 'Saws', tipo: 'EQUIPAMENTO' },
            { nome: 'Sanders & Grinders', tipo: 'EQUIPAMENTO' },
            { nome: 'Rotary Tools', tipo: 'EQUIPAMENTO' },
        ],
    },
    {
        nome: 'Hand Tools',
        tipo: 'EQUIPAMENTO',
        filhos: [
            { nome: 'Measuring & Layout', tipo: 'EQUIPAMENTO' },
            { nome: 'Cutting Tools', tipo: 'EQUIPAMENTO' },
            { nome: 'Striking Tools', tipo: 'EQUIPAMENTO' },
            { nome: 'Plumbing Tools', tipo: 'EQUIPAMENTO' },
            { nome: 'Electrical Tools', tipo: 'EQUIPAMENTO' },
        ],
    },
    {
        nome: 'Access Equipment',
        tipo: 'EQUIPAMENTO',
        filhos: [
            { nome: 'Ladders', tipo: 'EQUIPAMENTO' },
            { nome: 'Scaffolding', tipo: 'EQUIPAMENTO' },
            { nome: 'Lifts', tipo: 'EQUIPAMENTO' },
        ],
    },
    {
        nome: 'Measurement Equipment',
        tipo: 'EQUIPAMENTO',
        filhos: [
            { nome: 'Laser Levels', tipo: 'EQUIPAMENTO' },
            { nome: 'Distance Meters', tipo: 'EQUIPAMENTO' },
            { nome: 'Inspection Tools', tipo: 'EQUIPAMENTO' },
        ],
    },
    {
        nome: 'Safety Equipment',
        tipo: 'EQUIPAMENTO',
        filhos: [
            { nome: 'Respiratory', tipo: 'EQUIPAMENTO' },
            { nome: 'Fall Protection', tipo: 'EQUIPAMENTO' },
        ],
    },
    {
        nome: 'Site Equipment',
        tipo: 'EQUIPAMENTO',
        filhos: [
            { nome: 'Extension Cords', tipo: 'EQUIPAMENTO' },
            { nome: 'Lighting', tipo: 'EQUIPAMENTO' },
            { nome: 'Vacuums & Blowers', tipo: 'EQUIPAMENTO' },
        ],
    },
];

// ============================================================================
// MATERIAIS - Usando categoriaPath para evitar colisões
// ============================================================================
type MaterialDef = {
    codigo: string;
    nome: string;
    categoriaPath: string; // Path: "tipo|Cat1 > Cat2 > Cat3"
    unidade: string;
    estoqueMinimo?: number;
    pontoReposicao?: number;
};

const MATERIALS: MaterialDef[] = [
    // ELECTRICAL - Wire
    { codigo: 'NMB-14-2', nome: 'NM-B 14/2 w/Ground Romex', categoriaPath: 'MATERIAL|Electrical > Wire & Cable > NM-B (Romex)', unidade: 'FT', estoqueMinimo: 250, pontoReposicao: 500 },
    { codigo: 'NMB-14-3', nome: 'NM-B 14/3 w/Ground Romex', categoriaPath: 'MATERIAL|Electrical > Wire & Cable > NM-B (Romex)', unidade: 'FT', estoqueMinimo: 100, pontoReposicao: 250 },
    { codigo: 'NMB-12-2', nome: 'NM-B 12/2 w/Ground Romex', categoriaPath: 'MATERIAL|Electrical > Wire & Cable > NM-B (Romex)', unidade: 'FT', estoqueMinimo: 250, pontoReposicao: 500 },
    { codigo: 'NMB-12-3', nome: 'NM-B 12/3 w/Ground Romex', categoriaPath: 'MATERIAL|Electrical > Wire & Cable > NM-B (Romex)', unidade: 'FT', estoqueMinimo: 100, pontoReposicao: 250 },
    { codigo: 'NMB-10-2', nome: 'NM-B 10/2 w/Ground Romex', categoriaPath: 'MATERIAL|Electrical > Wire & Cable > NM-B (Romex)', unidade: 'FT', estoqueMinimo: 50, pontoReposicao: 100 },
    { codigo: 'THHN-14-BLK', nome: 'THHN 14 AWG Black Stranded', categoriaPath: 'MATERIAL|Electrical > Wire & Cable > THHN/THWN', unidade: 'FT', estoqueMinimo: 500, pontoReposicao: 1000 },
    { codigo: 'THHN-14-WHT', nome: 'THHN 14 AWG White Stranded', categoriaPath: 'MATERIAL|Electrical > Wire & Cable > THHN/THWN', unidade: 'FT', estoqueMinimo: 500, pontoReposicao: 1000 },
    { codigo: 'THHN-12-BLK', nome: 'THHN 12 AWG Black Stranded', categoriaPath: 'MATERIAL|Electrical > Wire & Cable > THHN/THWN', unidade: 'FT', estoqueMinimo: 500, pontoReposicao: 1000 },
    { codigo: 'THHN-12-WHT', nome: 'THHN 12 AWG White Stranded', categoriaPath: 'MATERIAL|Electrical > Wire & Cable > THHN/THWN', unidade: 'FT', estoqueMinimo: 500, pontoReposicao: 1000 },

    // ELECTRICAL - Conduit
    { codigo: 'EMT-1/2', nome: 'EMT Conduit 1/2" x 10ft', categoriaPath: 'MATERIAL|Electrical > Conduit & Fittings > EMT Conduit', unidade: 'EA', estoqueMinimo: 20, pontoReposicao: 50 },
    { codigo: 'EMT-3/4', nome: 'EMT Conduit 3/4" x 10ft', categoriaPath: 'MATERIAL|Electrical > Conduit & Fittings > EMT Conduit', unidade: 'EA', estoqueMinimo: 20, pontoReposicao: 50 },
    { codigo: 'EMT-CONN-1/2', nome: 'EMT Connector 1/2"', categoriaPath: 'MATERIAL|Electrical > Conduit & Fittings > Conduit Fittings', unidade: 'EA', estoqueMinimo: 50, pontoReposicao: 100 },
    { codigo: 'EMT-CONN-3/4', nome: 'EMT Connector 3/4"', categoriaPath: 'MATERIAL|Electrical > Conduit & Fittings > Conduit Fittings', unidade: 'EA', estoqueMinimo: 50, pontoReposicao: 100 },
    { codigo: 'FLEX-1/2', nome: 'Flexible Metal Conduit 1/2"', categoriaPath: 'MATERIAL|Electrical > Conduit & Fittings > Flexible Conduit', unidade: 'FT', estoqueMinimo: 25, pontoReposicao: 50 },

    // ELECTRICAL - Boxes
    { codigo: 'BOX-1G-OLD', nome: 'Old Work Box 1-Gang 18 cu.in.', categoriaPath: 'MATERIAL|Electrical > Boxes & Covers > Outlet Boxes', unidade: 'EA', estoqueMinimo: 25, pontoReposicao: 50 },
    { codigo: 'BOX-2G-OLD', nome: 'Old Work Box 2-Gang 32 cu.in.', categoriaPath: 'MATERIAL|Electrical > Boxes & Covers > Outlet Boxes', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 25 },
    { codigo: 'BOX-4SQ', nome: '4" Square Box 21 cu.in.', categoriaPath: 'MATERIAL|Electrical > Boxes & Covers > Junction Boxes', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 25 },
    { codigo: 'BOX-OCT', nome: 'Octagon Box 4" 15.5 cu.in.', categoriaPath: 'MATERIAL|Electrical > Boxes & Covers > Junction Boxes', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 25 },

    // ELECTRICAL - Accessories
    { codigo: 'WIRENUT-YLW', nome: 'Wire Nut Yellow (22-10 AWG)', categoriaPath: 'MATERIAL|Electrical > Connectors & Accessories', unidade: 'EA', estoqueMinimo: 100, pontoReposicao: 200 },
    { codigo: 'WIRENUT-RED', nome: 'Wire Nut Red (18-10 AWG)', categoriaPath: 'MATERIAL|Electrical > Connectors & Accessories', unidade: 'EA', estoqueMinimo: 100, pontoReposicao: 200 },
    { codigo: 'STAPLE-NMB', nome: 'NM Cable Staple 1/2"', categoriaPath: 'MATERIAL|Electrical > Connectors & Accessories', unidade: 'EA', estoqueMinimo: 100, pontoReposicao: 200 },

    // PLUMBING - PVC
    { codigo: 'PVC-1/2', nome: 'PVC Sch 40 Pipe 1/2" x 10ft', categoriaPath: 'MATERIAL|Plumbing > Pipes & Fittings > PVC Schedule 40', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 25 },
    { codigo: 'PVC-3/4', nome: 'PVC Sch 40 Pipe 3/4" x 10ft', categoriaPath: 'MATERIAL|Plumbing > Pipes & Fittings > PVC Schedule 40', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 25 },
    { codigo: 'PVC-1', nome: 'PVC Sch 40 Pipe 1" x 10ft', categoriaPath: 'MATERIAL|Plumbing > Pipes & Fittings > PVC Schedule 40', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 15 },
    { codigo: 'PVC-ELB-1/2-90', nome: 'PVC 90° Elbow 1/2"', categoriaPath: 'MATERIAL|Plumbing > Pipes & Fittings > PVC Schedule 40', unidade: 'EA', estoqueMinimo: 25, pontoReposicao: 50 },
    { codigo: 'PVC-TEE-1/2', nome: 'PVC Tee 1/2"', categoriaPath: 'MATERIAL|Plumbing > Pipes & Fittings > PVC Schedule 40', unidade: 'EA', estoqueMinimo: 15, pontoReposicao: 30 },

    // PLUMBING - PEX
    { codigo: 'PEX-1/2-RED', nome: 'PEX-B Tubing 1/2" Red', categoriaPath: 'MATERIAL|Plumbing > Pipes & Fittings > PEX Tubing', unidade: 'FT', estoqueMinimo: 100, pontoReposicao: 300 },
    { codigo: 'PEX-1/2-BLU', nome: 'PEX-B Tubing 1/2" Blue', categoriaPath: 'MATERIAL|Plumbing > Pipes & Fittings > PEX Tubing', unidade: 'FT', estoqueMinimo: 100, pontoReposicao: 300 },
    { codigo: 'PEX-3/4-RED', nome: 'PEX-B Tubing 3/4" Red', categoriaPath: 'MATERIAL|Plumbing > Pipes & Fittings > PEX Tubing', unidade: 'FT', estoqueMinimo: 50, pontoReposicao: 150 },

    // PLUMBING - Valves & Drains
    { codigo: 'VALVE-BALL-1/2', nome: 'Ball Valve 1/2" Full Port', categoriaPath: 'MATERIAL|Plumbing > Valves & Shutoffs', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'VALVE-BALL-3/4', nome: 'Ball Valve 3/4" Full Port', categoriaPath: 'MATERIAL|Plumbing > Valves & Shutoffs', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'PTRAP-1-1/2', nome: 'P-Trap 1-1/2" PVC', categoriaPath: 'MATERIAL|Plumbing > Drains & P-Traps', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },

    // PLUMBING - Adhesives
    { codigo: 'PRIM-PURPLE-8', nome: 'PVC Primer Purple 8oz', categoriaPath: 'MATERIAL|Plumbing > Adhesives & Primers', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'CEMENT-BLUE-8', nome: 'PVC Cement Blue Medium 8oz', categoriaPath: 'MATERIAL|Plumbing > Adhesives & Primers', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'TEFLON-1/2', nome: 'PTFE Thread Tape 1/2" x 520"', categoriaPath: 'MATERIAL|Plumbing > Adhesives & Primers', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },

    // DRYWALL
    { codigo: 'DW-1/2-4x8', nome: 'Drywall 1/2" x 4\' x 8\'', categoriaPath: 'MATERIAL|Drywall > Gypsum Board', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 25 },
    { codigo: 'DW-5/8-4x8', nome: 'Drywall 5/8" x 4\' x 8\' Type X', categoriaPath: 'MATERIAL|Drywall > Gypsum Board', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 15 },
    { codigo: 'DW-MR-1/2', nome: 'Drywall Green Board (Moisture) 1/2"', categoriaPath: 'MATERIAL|Drywall > Gypsum Board', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'JC-LITE-4.5', nome: 'Joint Compound Lightweight 4.5 GAL', categoriaPath: 'MATERIAL|Drywall > Joint Compound & Tape', unidade: 'EA', estoqueMinimo: 2, pontoReposicao: 4 },
    { codigo: 'JC-AP-4.5', nome: 'Joint Compound All-Purpose 4.5 GAL', categoriaPath: 'MATERIAL|Drywall > Joint Compound & Tape', unidade: 'EA', estoqueMinimo: 2, pontoReposicao: 4 },
    { codigo: 'DW-TAPE-250', nome: 'Drywall Paper Tape 2" x 250\'', categoriaPath: 'MATERIAL|Drywall > Joint Compound & Tape', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'CB-PAPER-8', nome: 'Corner Bead Paper-Faced 8\'', categoriaPath: 'MATERIAL|Drywall > Corner Beads', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 25 },

    // PAINT
    { codigo: 'PAINT-INT-WHT-5', nome: 'Interior Latex Flat White 5 GAL', categoriaPath: 'MATERIAL|Paint & Finishes > Interior Paint', unidade: 'EA', estoqueMinimo: 2, pontoReposicao: 4 },
    { codigo: 'PAINT-INT-EGG-5', nome: 'Interior Latex Eggshell White 5 GAL', categoriaPath: 'MATERIAL|Paint & Finishes > Interior Paint', unidade: 'EA', estoqueMinimo: 2, pontoReposicao: 4 },
    { codigo: 'PRIMER-INT-5', nome: 'Interior Primer/Sealer 5 GAL', categoriaPath: 'MATERIAL|Paint & Finishes > Primers', unidade: 'EA', estoqueMinimo: 1, pontoReposicao: 2 },
    { codigo: 'CAULK-PAINT-WHT', nome: 'Paintable Caulk 10.1oz White', categoriaPath: 'MATERIAL|Paint & Finishes > Caulks & Sealants', unidade: 'EA', estoqueMinimo: 12, pontoReposicao: 24 },
    { codigo: 'CAULK-SIL-CLR', nome: 'Silicone Caulk 10.1oz Clear', categoriaPath: 'MATERIAL|Paint & Finishes > Caulks & Sealants', unidade: 'EA', estoqueMinimo: 6, pontoReposicao: 12 },

    // FRAMING
    { codigo: 'STUD-2X4-96', nome: 'Stud 2x4x96" Spruce-Pine-Fir', categoriaPath: 'MATERIAL|Framing & Lumber > Dimensional Lumber', unidade: 'EA', estoqueMinimo: 25, pontoReposicao: 50 },
    { codigo: 'STUD-2X4-104', nome: 'Stud 2x4x104-5/8" Pre-Cut', categoriaPath: 'MATERIAL|Framing & Lumber > Dimensional Lumber', unidade: 'EA', estoqueMinimo: 25, pontoReposicao: 50 },
    { codigo: 'LUMBER-2X4-8', nome: 'Lumber 2x4x8\' SPF #2', categoriaPath: 'MATERIAL|Framing & Lumber > Dimensional Lumber', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 25 },
    { codigo: 'PLY-CDX-1/2', nome: 'Plywood CDX 1/2" x 4\' x 8\'', categoriaPath: 'MATERIAL|Framing & Lumber > Plywood & OSB', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'PLY-CDX-3/4', nome: 'Plywood CDX 3/4" x 4\' x 8\'', categoriaPath: 'MATERIAL|Framing & Lumber > Plywood & OSB', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'OSB-7/16', nome: 'OSB Sheathing 7/16" x 4\' x 8\'', categoriaPath: 'MATERIAL|Framing & Lumber > Plywood & OSB', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },

    // FASTENERS
    { codigo: 'DW-SCREW-1-1/4', nome: 'Drywall Screw #6 x 1-1/4" Coarse', categoriaPath: 'MATERIAL|Fasteners & Hardware > Screws', unidade: 'EA', estoqueMinimo: 500, pontoReposicao: 1000 },
    { codigo: 'DW-SCREW-1-5/8', nome: 'Drywall Screw #6 x 1-5/8" Coarse', categoriaPath: 'MATERIAL|Fasteners & Hardware > Screws', unidade: 'EA', estoqueMinimo: 500, pontoReposicao: 1000 },
    { codigo: 'SCREW-DECK-3', nome: 'Deck Screw #10 x 3" Coated', categoriaPath: 'MATERIAL|Fasteners & Hardware > Screws', unidade: 'EA', estoqueMinimo: 200, pontoReposicao: 500 },
    { codigo: 'SCREW-CONST-3', nome: 'Construction Screw #9 x 3" Yellow', categoriaPath: 'MATERIAL|Fasteners & Hardware > Screws', unidade: 'EA', estoqueMinimo: 200, pontoReposicao: 500 },
    { codigo: 'NAIL-FRAMING-3.5', nome: 'Framing Nail 16d 3-1/2" Bright', categoriaPath: 'MATERIAL|Fasteners & Hardware > Nails', unidade: 'EA', estoqueMinimo: 500, pontoReposicao: 1000 },
    { codigo: 'NAIL-COM-2.5', nome: 'Common Nail 8d 2-1/2" Galv', categoriaPath: 'MATERIAL|Fasteners & Hardware > Nails', unidade: 'EA', estoqueMinimo: 200, pontoReposicao: 500 },
    { codigo: 'ANCHOR-CONC-1/4', nome: 'Concrete Anchor 1/4" x 1-3/4"', categoriaPath: 'MATERIAL|Fasteners & Hardware > Bolts & Anchors', unidade: 'EA', estoqueMinimo: 50, pontoReposicao: 100 },

    // CONSUMABLES
    { codigo: 'TAPE-ELEC-BLK', nome: 'Electrical Tape 3/4" Black', categoriaPath: 'MATERIAL|Consumables > Tapes', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'TAPE-DUCT-SLV', nome: 'Duct Tape 1.88" x 55yd Silver', categoriaPath: 'MATERIAL|Consumables > Tapes', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'TAPE-MASK-1.5', nome: 'Masking Tape 1.5" x 60yd', categoriaPath: 'MATERIAL|Consumables > Tapes', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'SANDP-120', nome: 'Sandpaper 120 Grit Sheet', categoriaPath: 'MATERIAL|Consumables > Abrasives', unidade: 'EA', estoqueMinimo: 25, pontoReposicao: 50 },
    { codigo: 'SANDP-220', nome: 'Sandpaper 220 Grit Sheet', categoriaPath: 'MATERIAL|Consumables > Abrasives', unidade: 'EA', estoqueMinimo: 25, pontoReposicao: 50 },

    // SAFETY
    { codigo: 'GLOVE-LEATHER-L', nome: 'Work Gloves Leather L', categoriaPath: 'MATERIAL|Safety > PPE', unidade: 'EA', estoqueMinimo: 6, pontoReposicao: 12 },
    { codigo: 'MASK-N95', nome: 'N95 Respirator Mask', categoriaPath: 'MATERIAL|Safety > PPE', unidade: 'EA', estoqueMinimo: 20, pontoReposicao: 50 },
    { codigo: 'GLASSES-SAFETY', nome: 'Safety Glasses Clear', categoriaPath: 'MATERIAL|Safety > PPE', unidade: 'EA', estoqueMinimo: 6, pontoReposicao: 12 },
    { codigo: 'EARPLUGS', nome: 'Ear Plugs Foam', categoriaPath: 'MATERIAL|Safety > PPE', unidade: 'EA', estoqueMinimo: 50, pontoReposicao: 100 },
];

// ============================================================================
// EQUIPAMENTOS - valorAquisicao como placeholder
// ============================================================================
type EquipmentDef = {
    codigo: string;
    nome: string;
    tipo: 'FERRAMENTA_MANUAL' | 'FERRAMENTA_ELETRICA' | 'EQUIPAMENTO_MEDICAO' | 'EQUIPAMENTO_SEGURANCA' | 'ANDAIME' | 'ESCADA' | 'VEICULO' | 'OUTRO';
    categoriaPath: string;
    marca?: string;
};

// NOTA: valorAquisicao será 0.01 (placeholder) - atualizar após compra real
const EQUIPMENTS: EquipmentDef[] = [
    // Power Tools
    { codigo: 'EQ-DRILL-DEWALT', nome: 'Cordless Drill/Driver 20V', tipo: 'FERRAMENTA_ELETRICA', categoriaPath: 'EQUIPAMENTO|Power Tools > Drills & Drivers', marca: 'DeWalt' },
    { codigo: 'EQ-IMPACT-MILW', nome: 'Impact Driver M18 1/4"', tipo: 'FERRAMENTA_ELETRICA', categoriaPath: 'EQUIPAMENTO|Power Tools > Drills & Drivers', marca: 'Milwaukee' },
    { codigo: 'EQ-HAMMER-BOSCH', nome: 'Rotary Hammer SDS-Plus', tipo: 'FERRAMENTA_ELETRICA', categoriaPath: 'EQUIPAMENTO|Power Tools > Rotary Tools', marca: 'Bosch' },
    { codigo: 'EQ-CIRCSAW-DW', nome: 'Circular Saw 7-1/4" 20V', tipo: 'FERRAMENTA_ELETRICA', categoriaPath: 'EQUIPAMENTO|Power Tools > Saws', marca: 'DeWalt' },
    { codigo: 'EQ-JIGSAW-MILW', nome: 'Jig Saw M18', tipo: 'FERRAMENTA_ELETRICA', categoriaPath: 'EQUIPAMENTO|Power Tools > Saws', marca: 'Milwaukee' },
    { codigo: 'EQ-RECIP-DW', nome: 'Reciprocating Saw 20V', tipo: 'FERRAMENTA_ELETRICA', categoriaPath: 'EQUIPAMENTO|Power Tools > Saws', marca: 'DeWalt' },
    { codigo: 'EQ-MITER-DW', nome: 'Miter Saw 12" Sliding Compound', tipo: 'FERRAMENTA_ELETRICA', categoriaPath: 'EQUIPAMENTO|Power Tools > Saws', marca: 'DeWalt' },
    { codigo: 'EQ-GRINDER-MKT', nome: 'Angle Grinder 4-1/2"', tipo: 'FERRAMENTA_ELETRICA', categoriaPath: 'EQUIPAMENTO|Power Tools > Sanders & Grinders', marca: 'Makita' },
    { codigo: 'EQ-SANDER-DW', nome: 'Random Orbit Sander 5"', tipo: 'FERRAMENTA_ELETRICA', categoriaPath: 'EQUIPAMENTO|Power Tools > Sanders & Grinders', marca: 'DeWalt' },
    { codigo: 'EQ-OSCIL-DW', nome: 'Oscillating Multi-Tool 20V', tipo: 'FERRAMENTA_ELETRICA', categoriaPath: 'EQUIPAMENTO|Power Tools > Rotary Tools', marca: 'DeWalt' },

    // Hand Tools
    { codigo: 'EQ-TAPE-25', nome: 'Tape Measure 25ft', tipo: 'FERRAMENTA_MANUAL', categoriaPath: 'EQUIPAMENTO|Hand Tools > Measuring & Layout', marca: 'Stanley' },
    { codigo: 'EQ-LEVEL-48', nome: 'Spirit Level 48"', tipo: 'FERRAMENTA_MANUAL', categoriaPath: 'EQUIPAMENTO|Hand Tools > Measuring & Layout', marca: 'Empire' },
    { codigo: 'EQ-SQUARE-12', nome: 'Combination Square 12"', tipo: 'FERRAMENTA_MANUAL', categoriaPath: 'EQUIPAMENTO|Hand Tools > Measuring & Layout', marca: 'Empire' },
    { codigo: 'EQ-HAMMER-20', nome: 'Claw Hammer 20oz Fiberglass', tipo: 'FERRAMENTA_MANUAL', categoriaPath: 'EQUIPAMENTO|Hand Tools > Striking Tools', marca: 'Estwing' },
    { codigo: 'EQ-PRYBAR-18', nome: 'Pry Bar Flat 18"', tipo: 'FERRAMENTA_MANUAL', categoriaPath: 'EQUIPAMENTO|Hand Tools > Striking Tools', marca: 'Stanley' },
    { codigo: 'EQ-CUTTER-PVC', nome: 'PVC Pipe Cutter Ratchet', tipo: 'FERRAMENTA_MANUAL', categoriaPath: 'EQUIPAMENTO|Hand Tools > Plumbing Tools', marca: 'Ridgid' },
    { codigo: 'EQ-WRENCH-PIPE', nome: 'Pipe Wrench 14"', tipo: 'FERRAMENTA_MANUAL', categoriaPath: 'EQUIPAMENTO|Hand Tools > Plumbing Tools', marca: 'Ridgid' },
    { codigo: 'EQ-CRIMP-PEX', nome: 'PEX Crimp Tool', tipo: 'FERRAMENTA_MANUAL', categoriaPath: 'EQUIPAMENTO|Hand Tools > Plumbing Tools', marca: 'SharkBite' },
    { codigo: 'EQ-STRIPPER-WIRE', nome: 'Wire Stripper 10-20 AWG', tipo: 'FERRAMENTA_MANUAL', categoriaPath: 'EQUIPAMENTO|Hand Tools > Electrical Tools', marca: 'Klein' },
    { codigo: 'EQ-VOLTAGE-TICK', nome: 'Non-Contact Voltage Tester', tipo: 'FERRAMENTA_MANUAL', categoriaPath: 'EQUIPAMENTO|Hand Tools > Electrical Tools', marca: 'Klein' },

    // Measurement
    { codigo: 'EQ-LASER-LVL', nome: 'Laser Level Self-Leveling', tipo: 'EQUIPAMENTO_MEDICAO', categoriaPath: 'EQUIPAMENTO|Measurement Equipment > Laser Levels', marca: 'Bosch' },
    { codigo: 'EQ-DISTANCE-MTR', nome: 'Laser Distance Meter 65ft', tipo: 'EQUIPAMENTO_MEDICAO', categoriaPath: 'EQUIPAMENTO|Measurement Equipment > Distance Meters', marca: 'Bosch' },
    { codigo: 'EQ-STUD-FINDER', nome: 'Stud Finder Digital', tipo: 'EQUIPAMENTO_MEDICAO', categoriaPath: 'EQUIPAMENTO|Measurement Equipment > Inspection Tools', marca: 'Zircon' },

    // Access
    { codigo: 'EQ-LADDER-6FT', nome: 'Step Ladder Fiberglass 6ft', tipo: 'ESCADA', categoriaPath: 'EQUIPAMENTO|Access Equipment > Ladders', marca: 'Werner' },
    { codigo: 'EQ-LADDER-8FT', nome: 'Step Ladder Fiberglass 8ft', tipo: 'ESCADA', categoriaPath: 'EQUIPAMENTO|Access Equipment > Ladders', marca: 'Werner' },
    { codigo: 'EQ-LADDER-EXT-24', nome: 'Extension Ladder Aluminum 24ft', tipo: 'ESCADA', categoriaPath: 'EQUIPAMENTO|Access Equipment > Ladders', marca: 'Werner' },

    // Site Equipment
    { codigo: 'EQ-EXTCORD-50', nome: 'Extension Cord 12/3 50ft', tipo: 'OUTRO', categoriaPath: 'EQUIPAMENTO|Site Equipment > Extension Cords', marca: 'Southwire' },
    { codigo: 'EQ-EXTCORD-100', nome: 'Extension Cord 12/3 100ft', tipo: 'OUTRO', categoriaPath: 'EQUIPAMENTO|Site Equipment > Extension Cords', marca: 'Southwire' },
    { codigo: 'EQ-SHOPVAC-16', nome: 'Shop Vacuum 16 Gallon', tipo: 'OUTRO', categoriaPath: 'EQUIPAMENTO|Site Equipment > Vacuums & Blowers', marca: 'Ridgid' },
    { codigo: 'EQ-BLOWER-LEAF', nome: 'Leaf Blower Cordless 20V', tipo: 'OUTRO', categoriaPath: 'EQUIPAMENTO|Site Equipment > Vacuums & Blowers', marca: 'DeWalt' },
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedUnits() {
    console.log('🔧 Seeding Units (base only, no RL/BX/PK)...');
    let created = 0;
    let skipped = 0;

    for (const unit of UNITS) {
        const existing = await prisma.unidade.findUnique({ where: { codigo: unit.codigo } });
        if (!existing) {
            await prisma.unidade.create({ data: unit });
            created++;
        } else {
            skipped++;
        }
    }

    console.log(`   ✅ Units: ${created} created, ${skipped} skipped`);
    return created;
}

async function seedCategories(
    categories: CategoryDef[],
    parentId: number | null,
    parentPath: string
): Promise<{ created: number; map: Map<string, number> }> {
    let created = 0;
    const map = new Map<string, number>();

    for (const cat of categories) {
        const currentPath = parentPath ? `${parentPath} > ${cat.nome}` : cat.nome;
        const fullPath = `${cat.tipo}|${currentPath}`;

        let existing = await prisma.categoria.findFirst({
            where: { nome: cat.nome, tipo: cat.tipo, paiId: parentId },
        });

        let categoryId: number;
        if (!existing) {
            const newCat = await prisma.categoria.create({
                data: { nome: cat.nome, tipo: cat.tipo, paiId: parentId },
            });
            categoryId = newCat.id;
            created++;
        } else {
            categoryId = existing.id;
        }

        // Store with full path to avoid collisions
        map.set(fullPath, categoryId);

        if (cat.filhos && cat.filhos.length > 0) {
            const childResult = await seedCategories(cat.filhos, categoryId, currentPath);
            created += childResult.created;
            childResult.map.forEach((id, path) => map.set(path, id));
        }
    }

    return { created, map };
}

async function seedMaterials(categoryMap: Map<string, number>) {
    console.log('📦 Seeding Materials...');
    let created = 0;
    let skipped = 0;

    const units = await prisma.unidade.findMany();
    const unitMap = new Map<string, number>();
    units.forEach(u => unitMap.set(u.codigo, u.id));

    for (const mat of MATERIALS) {
        const existing = await prisma.material.findUnique({ where: { codigo: mat.codigo } });
        if (existing) {
            skipped++;
            continue;
        }

        const categoriaId = categoryMap.get(mat.categoriaPath);
        const unidadeId = unitMap.get(mat.unidade);

        if (!unidadeId) {
            console.warn(`   ⚠️ Unit not found: ${mat.unidade} for ${mat.codigo}`);
            continue;
        }

        if (!categoriaId) {
            console.warn(`   ⚠️ Category not found: ${mat.categoriaPath} for ${mat.codigo}`);
        }

        await prisma.material.create({
            data: {
                codigo: mat.codigo,
                nome: mat.nome,
                categoriaId: categoriaId || null,
                unidadeId: unidadeId,
                barcodeInternal: mat.codigo,
                estoqueMinimo: mat.estoqueMinimo ?? 0,
                pontoReposicao: mat.pontoReposicao ?? 0,
                rastreioLote: false,
                possuiValidade: false,
                ativo: true,
            },
        });
        created++;
    }

    console.log(`   ✅ Materials: ${created} created, ${skipped} skipped`);
    return created;
}

async function seedEquipments(categoryMap: Map<string, number>) {
    console.log('🔨 Seeding Equipments (valorAquisicao=0.01 placeholder)...');
    let created = 0;
    let skipped = 0;

    for (const eq of EQUIPMENTS) {
        const existing = await prisma.equipamento.findUnique({ where: { codigo: eq.codigo } });
        if (existing) {
            skipped++;
            continue;
        }

        const categoriaId = categoryMap.get(eq.categoriaPath);

        if (!categoriaId) {
            console.warn(`   ⚠️ Category not found: ${eq.categoriaPath} for ${eq.codigo}`);
        }

        await prisma.equipamento.create({
            data: {
                codigo: eq.codigo,
                nome: eq.nome,
                tipo: eq.tipo,
                categoriaId: categoriaId || null,
                marca: eq.marca,
                dataAquisicao: new Date(),
                valorAquisicao: 0.01, // Placeholder - update after real purchase
                barcodeInternal: eq.codigo,
                ativo: true,
            },
        });
        created++;
    }

    console.log(`   ✅ Equipments: ${created} created, ${skipped} skipped`);
    return created;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  SEED PACK v2 - Estoque (Construção Civil US)');
    console.log('  Correções: categoryPath, unidades base, valorAquisicao=0.01');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    try {
        const unitsCreated = await seedUnits();

        console.log('📁 Seeding Material Categories...');
        const matCatResult = await seedCategories(MATERIAL_CATEGORIES, null, '');
        console.log(`   ✅ Material Categories: ${matCatResult.created} created`);

        console.log('📁 Seeding Equipment Categories...');
        const eqCatResult = await seedCategories(EQUIPMENT_CATEGORIES, null, '');
        console.log(`   ✅ Equipment Categories: ${eqCatResult.created} created`);

        const allCategoryMap = new Map<string, number>();
        matCatResult.map.forEach((id, path) => allCategoryMap.set(path, id));
        eqCatResult.map.forEach((id, path) => allCategoryMap.set(path, id));

        const materialsCreated = await seedMaterials(allCategoryMap);
        const equipmentsCreated = await seedEquipments(allCategoryMap);

        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`  Units:                ${unitsCreated} created`);
        console.log(`  Material Categories:  ${matCatResult.created} created`);
        console.log(`  Equipment Categories: ${eqCatResult.created} created`);
        console.log(`  Materials:            ${materialsCreated} created`);
        console.log(`  Equipments:           ${equipmentsCreated} created`);
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
        console.log('✅ Seed v2 completed successfully!');
        console.log('');

    } catch (error) {
        console.error('❌ Seed failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main();
