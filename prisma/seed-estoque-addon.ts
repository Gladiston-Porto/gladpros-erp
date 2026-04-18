/**
 * SEED ADD-ON - Estoque (Reforma de Casa, Drywall, DWV, Tile)
 * 
 * ARQUIVO SEPARADO - NÃO MODIFICA seed-estoque.ts
 * 
 * Adiciona:
 * - Categorias: Devices & Wiring, DWV, Firestop, Tile, Metal Framing
 * - Materiais: ~55 itens específicos de reforma
 * - Equipamentos: 8 itens
 * 
 * IDEMPOTENTE: Pode rodar múltiplas vezes sem duplicar dados.
 * 
 * Comando: npx tsx prisma/seed-estoque-addon.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// DEFINIÇÃO DE CATEGORIAS ADD-ON
// ============================================================================
type CategoryNode = {
    nome: string;
    tipo: 'MATERIAL' | 'EQUIPAMENTO';
    filhos?: CategoryNode[];
};

// Categorias a adicionar embaixo de raízes EXISTENTES
const ADDON_MATERIAL_CATEGORIES: { parentName: string | null; categories: CategoryNode[] }[] = [
    // ELECTRICAL - adicionar subcategorias
    {
        parentName: 'Electrical',
        categories: [
            {
                nome: 'Devices & Wiring',
                tipo: 'MATERIAL',
                filhos: [
                    { nome: 'Switches', tipo: 'MATERIAL' },
                    { nome: 'Receptacles', tipo: 'MATERIAL' },
                    { nome: 'GFCI', tipo: 'MATERIAL' },
                    { nome: 'Wall Plates', tipo: 'MATERIAL' },
                ],
            },
            {
                nome: 'Low Voltage',
                tipo: 'MATERIAL',
                filhos: [
                    { nome: 'Cat6 / Coax / Rings / Keystones', tipo: 'MATERIAL' },
                ],
            },
        ],
    },
    // PLUMBING - adicionar subcategorias
    {
        parentName: 'Plumbing',
        categories: [
            {
                nome: 'DWV (Drain/Waste/Vent)',
                tipo: 'MATERIAL',
                filhos: [
                    { nome: 'PVC DWV Pipe & Fittings', tipo: 'MATERIAL' },
                    { nome: 'Cleanouts & Test Caps', tipo: 'MATERIAL' },
                    { nome: 'Couplings (Fernco) / Trap Adapters', tipo: 'MATERIAL' },
                ],
            },
            {
                nome: 'Supply & Shutoffs',
                tipo: 'MATERIAL',
                filhos: [
                    { nome: 'Angle Stops', tipo: 'MATERIAL' },
                    { nome: 'Supply Lines', tipo: 'MATERIAL' },
                    { nome: 'Toilet Parts', tipo: 'MATERIAL' },
                ],
            },
        ],
    },
    // DRYWALL - adicionar subcategorias
    {
        parentName: 'Drywall',
        categories: [
            { nome: 'Repair & Setting Compounds', tipo: 'MATERIAL' },
            { nome: 'Screws & Accessories', tipo: 'MATERIAL' },
            { nome: 'Metal Stud Framing', tipo: 'MATERIAL' },
        ],
    },
    // NOVAS CATEGORIAS RAIZ
    {
        parentName: null, // Nova raiz
        categories: [
            {
                nome: 'Firestop & Insulation',
                tipo: 'MATERIAL',
                filhos: [
                    {
                        nome: 'Firestop',
                        tipo: 'MATERIAL',
                        filhos: [
                            { nome: 'Intumescent Caulk', tipo: 'MATERIAL' },
                            { nome: 'Fireblock Foam', tipo: 'MATERIAL' },
                            { nome: 'Mineral Wool', tipo: 'MATERIAL' },
                        ],
                    },
                    {
                        nome: 'Insulation',
                        tipo: 'MATERIAL',
                        filhos: [
                            { nome: 'Fiberglass Batts', tipo: 'MATERIAL' },
                            { nome: 'Foam Board', tipo: 'MATERIAL' },
                            { nome: 'Spray Foam Cans', tipo: 'MATERIAL' },
                        ],
                    },
                ],
            },
            {
                nome: 'Tile & Waterproofing',
                tipo: 'MATERIAL',
                filhos: [
                    { nome: 'Cement Board & Fasteners', tipo: 'MATERIAL' },
                    { nome: 'Thinset & Mortar', tipo: 'MATERIAL' },
                    { nome: 'Grout', tipo: 'MATERIAL' },
                    { nome: 'Waterproofing (Liquid/Membrane)', tipo: 'MATERIAL' },
                    { nome: 'Tile Accessories (Spacers/Leveling)', tipo: 'MATERIAL' },
                ],
            },
        ],
    },
];

// ============================================================================
// MATERIAIS ADD-ON
// ============================================================================
type MaterialDef = {
    codigo: string;
    nome: string;
    categoriaPath: string; // "MATERIAL|Parent > Child > Leaf"
    unidade: string;
    estoqueMinimo?: number;
    pontoReposicao?: number;
};

const ADDON_MATERIALS: MaterialDef[] = [
    // === ELECTRICAL DEVICES ===
    { codigo: 'SW-1P-15A', nome: 'Switch 15A Single Pole (Decora)', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Switches', unidade: 'EA', estoqueMinimo: 20, pontoReposicao: 40 },
    { codigo: 'SW-3W-15A', nome: 'Switch 15A 3-Way (Decora)', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Switches', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'SW-4W-15A', nome: 'Switch 15A 4-Way (Decora)', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Switches', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'OUT-15A-WHT', nome: 'Outlet 15A Duplex (TR) White', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Receptacles', unidade: 'EA', estoqueMinimo: 30, pontoReposicao: 60 },
    { codigo: 'OUT-20A-WHT', nome: 'Outlet 20A Duplex (TR) White', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Receptacles', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'GFCI-15A-WHT', nome: 'GFCI 15A White', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > GFCI', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'GFCI-20A-WHT', nome: 'GFCI 20A White', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > GFCI', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'PLATE-1G-DEC', nome: 'Wall Plate 1-Gang Decora', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Wall Plates', unidade: 'EA', estoqueMinimo: 20, pontoReposicao: 40 },
    { codigo: 'PLATE-2G-DEC', nome: 'Wall Plate 2-Gang Decora', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Wall Plates', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'PLATE-1G-TGL', nome: 'Wall Plate 1-Gang Toggle', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Wall Plates', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'PLATE-BLANK', nome: 'Blank Plate (Cover)', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Wall Plates', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },

    // === LOW VOLTAGE ===
    { codigo: 'CAT6-UTP', nome: 'Cat6 UTP Cable', categoriaPath: 'MATERIAL|Electrical > Low Voltage > Cat6 / Coax / Rings / Keystones', unidade: 'FT', estoqueMinimo: 250, pontoReposicao: 500 },
    { codigo: 'RING-LV-1G', nome: 'Low Voltage Ring 1-Gang', categoriaPath: 'MATERIAL|Electrical > Low Voltage > Cat6 / Coax / Rings / Keystones', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'KEYSTONE-RJ45', nome: 'Keystone RJ45 Cat6', categoriaPath: 'MATERIAL|Electrical > Low Voltage > Cat6 / Coax / Rings / Keystones', unidade: 'EA', estoqueMinimo: 20, pontoReposicao: 40 },

    // === PLUMBING DWV ===
    { codigo: 'DWV-PVC-1.5-10', nome: 'PVC DWV 1-1/2" x 10ft', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'DWV-PVC-2-10', nome: 'PVC DWV 2" x 10ft', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'DWV-PVC-3-10', nome: 'PVC DWV 3" x 10ft', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'DWV-PVC-4-10', nome: 'PVC DWV 4" x 10ft', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 2, pontoReposicao: 5 },
    { codigo: 'DWV-90-2', nome: '2" 90° DWV Elbow', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'DWV-45-2', nome: '2" 45° DWV Elbow', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'DWV-TEE-2', nome: '2" Sanitary Tee', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'DWV-WYE-2', nome: '2" Wye', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'DWV-CO-2', nome: '2" Cleanout Adapter + Plug', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > Cleanouts & Test Caps', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'DWV-TRAPAD-1.5', nome: 'Trap Adapter 1-1/2"', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > Couplings (Fernco) / Trap Adapters', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'DWV-FERNCO-2', nome: 'Fernco Coupling 2"', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > Couplings (Fernco) / Trap Adapters', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },

    // === PLUMBING SUPPLY & SHUTOFFS ===
    { codigo: 'WAX-RING', nome: 'Toilet Wax Ring', categoriaPath: 'MATERIAL|Plumbing > Supply & Shutoffs > Toilet Parts', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'TOIL-BOLT-SET', nome: 'Toilet Bolt Set', categoriaPath: 'MATERIAL|Plumbing > Supply & Shutoffs > Toilet Parts', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'STOP-ANG-1/2x3/8', nome: 'Angle Stop 1/2" x 3/8"', categoriaPath: 'MATERIAL|Plumbing > Supply & Shutoffs > Angle Stops', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'STOP-STR-1/2x3/8', nome: 'Straight Stop 1/2" x 3/8"', categoriaPath: 'MATERIAL|Plumbing > Supply & Shutoffs > Angle Stops', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'SUPPLY-3/8-20', nome: 'Supply Line 3/8" 20"', categoriaPath: 'MATERIAL|Plumbing > Supply & Shutoffs > Supply Lines', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'SUPPLY-3/8-16', nome: 'Supply Line 3/8" 16"', categoriaPath: 'MATERIAL|Plumbing > Supply & Shutoffs > Supply Lines', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },

    // === FIRESTOP & INSULATION ===
    { codigo: 'FIRESTOP-CAULK', nome: 'Intumescent Firestop Caulk', categoriaPath: 'MATERIAL|Firestop & Insulation > Firestop > Intumescent Caulk', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'FIREBLOCK-FOAM', nome: 'Fireblock Foam', categoriaPath: 'MATERIAL|Firestop & Insulation > Firestop > Fireblock Foam', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'MINWOOL-ROXUL', nome: 'Mineral Wool Firestop', categoriaPath: 'MATERIAL|Firestop & Insulation > Firestop > Mineral Wool', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'BATTS-R13', nome: 'Fiberglass Batts R-13', categoriaPath: 'MATERIAL|Firestop & Insulation > Insulation > Fiberglass Batts', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'BATTS-R19', nome: 'Fiberglass Batts R-19', categoriaPath: 'MATERIAL|Firestop & Insulation > Insulation > Fiberglass Batts', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'FOAM-BOARD-1IN', nome: 'Foam Board 1 inch', categoriaPath: 'MATERIAL|Firestop & Insulation > Insulation > Foam Board', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'SPRAYFOAM-GAP', nome: 'Spray Foam Can', categoriaPath: 'MATERIAL|Firestop & Insulation > Insulation > Spray Foam Cans', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },

    // === TILE & WATERPROOFING ===
    { codigo: 'CBU-1/2', nome: 'Cement Board 1/2" 3x5', categoriaPath: 'MATERIAL|Tile & Waterproofing > Cement Board & Fasteners', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'CBU-1/4', nome: 'Cement Board 1/4" 3x5', categoriaPath: 'MATERIAL|Tile & Waterproofing > Cement Board & Fasteners', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'CBU-SCREW', nome: 'Cement Board Screws', categoriaPath: 'MATERIAL|Tile & Waterproofing > Cement Board & Fasteners', unidade: 'EA', estoqueMinimo: 100, pontoReposicao: 200 },
    { codigo: 'THINSET-50', nome: 'Thinset Mortar 50lb', categoriaPath: 'MATERIAL|Tile & Waterproofing > Thinset & Mortar', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'GROUT-25', nome: 'Grout 25lb', categoriaPath: 'MATERIAL|Tile & Waterproofing > Grout', unidade: 'EA', estoqueMinimo: 2, pontoReposicao: 4 },
    { codigo: 'WP-LIQ-1G', nome: 'Waterproofing Liquid 1 Gal', categoriaPath: 'MATERIAL|Tile & Waterproofing > Waterproofing (Liquid/Membrane)', unidade: 'EA', estoqueMinimo: 2, pontoReposicao: 4 },
    { codigo: 'WP-MEMBRANE', nome: 'Waterproofing Membrane Roll', categoriaPath: 'MATERIAL|Tile & Waterproofing > Waterproofing (Liquid/Membrane)', unidade: 'EA', estoqueMinimo: 2, pontoReposicao: 4 },
    { codigo: 'TILE-SPACER', nome: 'Tile Spacers Pack', categoriaPath: 'MATERIAL|Tile & Waterproofing > Tile Accessories (Spacers/Leveling)', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'TILE-LEVEL-CLIP', nome: 'Tile Leveling Clips Pack', categoriaPath: 'MATERIAL|Tile & Waterproofing > Tile Accessories (Spacers/Leveling)', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },

    // === DRYWALL REPAIR & METAL FRAMING ===
    { codigo: 'MUD-20', nome: 'Setting Compound 20 min', categoriaPath: 'MATERIAL|Drywall > Repair & Setting Compounds', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'MUD-45', nome: 'Setting Compound 45 min', categoriaPath: 'MATERIAL|Drywall > Repair & Setting Compounds', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'PATCH-6IN', nome: 'Drywall Patch 6 inch', categoriaPath: 'MATERIAL|Drywall > Repair & Setting Compounds', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'PATCH-12IN', nome: 'Drywall Patch 12 inch', categoriaPath: 'MATERIAL|Drywall > Repair & Setting Compounds', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'MS-STUD-3-5/8-10', nome: 'Metal Stud 3-5/8" 10ft', categoriaPath: 'MATERIAL|Drywall > Metal Stud Framing', unidade: 'EA', estoqueMinimo: 20, pontoReposicao: 40 },
    { codigo: 'MS-TRACK-3-5/8-10', nome: 'Metal Track 3-5/8" 10ft', categoriaPath: 'MATERIAL|Drywall > Metal Stud Framing', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'MS-SCREW-TEK', nome: 'Self-Tapping Screws (TEK)', categoriaPath: 'MATERIAL|Drywall > Metal Stud Framing', unidade: 'EA', estoqueMinimo: 200, pontoReposicao: 400 },
];

// ============================================================================
// EQUIPAMENTOS ADD-ON - usando categorias existentes
// ============================================================================
type EquipmentDef = {
    codigo: string;
    nome: string;
    tipo: 'FERRAMENTA_MANUAL' | 'FERRAMENTA_ELETRICA' | 'EQUIPAMENTO_MEDICAO' | 'EQUIPAMENTO_SEGURANCA' | 'ANDAIME' | 'ESCADA' | 'VEICULO' | 'OUTRO';
    categoriaPath: string; // Usa categorias existentes do seed base
    marca?: string;
    valorAquisicao: number;
};

const ADDON_EQUIPMENTS: EquipmentDef[] = [
    // Electrical Tools (Hand Tools > Electrical Tools)
    { codigo: 'EQ-FISHTAPE-50', nome: 'Fish Tape 50ft', tipo: 'FERRAMENTA_MANUAL', categoriaPath: 'EQUIPAMENTO|Hand Tools > Electrical Tools', marca: 'Klein', valorAquisicao: 29.99 },
    { codigo: 'EQ-BENDER-EMT-1/2', nome: 'EMT Bender 1/2"', tipo: 'FERRAMENTA_MANUAL', categoriaPath: 'EQUIPAMENTO|Hand Tools > Electrical Tools', marca: 'Klein', valorAquisicao: 49.99 },

    // Measurement Equipment > Inspection Tools
    { codigo: 'EQ-CLAMPMETER', nome: 'Clamp Meter', tipo: 'EQUIPAMENTO_MEDICAO', categoriaPath: 'EQUIPAMENTO|Measurement Equipment > Inspection Tools', marca: 'Fluke', valorAquisicao: 79.99 },
    { codigo: 'EQ-MULTIMETER', nome: 'Multimeter', tipo: 'EQUIPAMENTO_MEDICAO', categoriaPath: 'EQUIPAMENTO|Measurement Equipment > Inspection Tools', marca: 'Klein', valorAquisicao: 39.99 },

    // Plumbing Tools (Hand Tools > Plumbing Tools)
    { codigo: 'EQ-DRAIN-SNAKE', nome: 'Drain Snake / Auger', tipo: 'FERRAMENTA_MANUAL', categoriaPath: 'EQUIPAMENTO|Hand Tools > Plumbing Tools', marca: 'Ridgid', valorAquisicao: 89.99 },
    { codigo: 'EQ-MIXER-PADDLE', nome: 'Mixing Paddle (Thinset/Grout)', tipo: 'FERRAMENTA_MANUAL', categoriaPath: 'EQUIPAMENTO|Hand Tools > Plumbing Tools', valorAquisicao: 19.99 },

    // Power Tools > Saws
    { codigo: 'EQ-TILESAW-WET', nome: 'Wet Tile Saw', tipo: 'FERRAMENTA_ELETRICA', categoriaPath: 'EQUIPAMENTO|Power Tools > Saws', marca: 'DeWalt', valorAquisicao: 299.99 },

    // Access Equipment > Lifts
    { codigo: 'EQ-DRYWALL-LIFT', nome: 'Drywall Lift', tipo: 'OUTRO', categoriaPath: 'EQUIPAMENTO|Access Equipment > Lifts', valorAquisicao: 199.99 },
];

// ============================================================================
// FUNÇÕES DE SEED
// ============================================================================

async function getOrCreateCategory(
    nome: string,
    tipo: 'MATERIAL' | 'EQUIPAMENTO',
    paiId: number | null
): Promise<number> {
    const existing = await prisma.categoria.findFirst({
        where: { nome, tipo, paiId },
    });

    if (existing) {
        return existing.id;
    }

    const created = await prisma.categoria.create({
        data: { nome, tipo, paiId },
    });

    return created.id;
}

async function seedAddonCategories(): Promise<{ created: number; map: Map<string, number> }> {
    console.log('📁 Seeding Add-on Categories...');
    let created = 0;
    const map = new Map<string, number>();

    for (const group of ADDON_MATERIAL_CATEGORIES) {
        let parentId: number | null = null;
        let pathPrefix = '';

        // If parentName is specified, find existing category
        if (group.parentName) {
            const parent = await prisma.categoria.findFirst({
                where: { nome: group.parentName, tipo: 'MATERIAL', paiId: null },
            });
            if (parent) {
                parentId = parent.id;
                pathPrefix = group.parentName;
                // Also store parent in map
                map.set(`MATERIAL|${group.parentName}`, parent.id);
            } else {
                console.warn(`   ⚠️ Parent category not found: ${group.parentName}`);
                continue;
            }
        }

        // Recursive function to create categories
        async function createCategories(
            nodes: CategoryNode[],
            paiId: number | null,
            currentPath: string
        ) {
            for (const node of nodes) {
                const fullPath = currentPath ? `${currentPath} > ${node.nome}` : node.nome;
                const mapKey = `${node.tipo}|${fullPath}`;

                const existingCount = await prisma.categoria.count({
                    where: { nome: node.nome, tipo: node.tipo, paiId },
                });

                let catId: number;
                if (existingCount === 0) {
                    const newCat = await prisma.categoria.create({
                        data: { nome: node.nome, tipo: node.tipo, paiId },
                    });
                    catId = newCat.id;
                    created++;
                } else {
                    const existing = await prisma.categoria.findFirst({
                        where: { nome: node.nome, tipo: node.tipo, paiId },
                    });
                    catId = existing!.id;
                }

                map.set(mapKey, catId);

                if (node.filhos && node.filhos.length > 0) {
                    await createCategories(node.filhos, catId, fullPath);
                }
            }
        }

        await createCategories(group.categories, parentId, pathPrefix);
    }

    console.log(`   ✅ Add-on Categories: ${created} created`);
    return { created, map };
}

async function getExistingEquipmentCategories(): Promise<Map<string, number>> {
    const map = new Map<string, number>();

    // Buscar categorias de equipamento existentes
    const categories = await prisma.categoria.findMany({
        where: { tipo: 'EQUIPAMENTO' },
        include: { pai: { include: { pai: true } } },
    });

    for (const cat of categories) {
        let path = cat.nome;
        if (cat.pai) {
            path = `${cat.pai.nome} > ${cat.nome}`;
            if (cat.pai.pai) {
                path = `${cat.pai.pai.nome} > ${cat.pai.nome} > ${cat.nome}`;
            }
        }
        map.set(`EQUIPAMENTO|${path}`, cat.id);
    }

    return map;
}

async function seedAddonMaterials(categoryMap: Map<string, number>): Promise<{ created: number; skipped: number }> {
    console.log('📦 Seeding Add-on Materials...');
    let created = 0;
    let skipped = 0;

    // Get unit map
    const units = await prisma.unidade.findMany();
    const unitMap = new Map<string, number>();
    units.forEach(u => unitMap.set(u.codigo, u.id));

    for (const mat of ADDON_MATERIALS) {
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
                unidadeId,
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

    console.log(`   ✅ Add-on Materials: ${created} created, ${skipped} skipped`);
    return { created, skipped };
}

async function seedAddonEquipments(categoryMap: Map<string, number>): Promise<{ created: number; skipped: number }> {
    console.log('🔨 Seeding Add-on Equipments...');
    let created = 0;
    let skipped = 0;

    for (const eq of ADDON_EQUIPMENTS) {
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
                valorAquisicao: eq.valorAquisicao,
                barcodeInternal: eq.codigo,
                ativo: true,
            },
        });
        created++;
    }

    console.log(`   ✅ Add-on Equipments: ${created} created, ${skipped} skipped`);
    return { created, skipped };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  SEED ADD-ON - Estoque (Reforma, DWV, Tile, Firestop)');
    console.log('  Arquivo separado - não altera seed-estoque.ts');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    try {
        // 1. Seed add-on categories (material)
        const catResult = await seedAddonCategories();

        // 2. Get existing equipment categories
        const eqCatMap = await getExistingEquipmentCategories();

        // 3. Merge all category maps
        const allCategoryMap = new Map<string, number>();
        catResult.map.forEach((id, path) => allCategoryMap.set(path, id));
        eqCatMap.forEach((id, path) => allCategoryMap.set(path, id));

        // 4. Seed materials
        const matResult = await seedAddonMaterials(allCategoryMap);

        // 5. Seed equipments
        const eqResult = await seedAddonEquipments(allCategoryMap);

        // Summary
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`  Categories:   ${catResult.created} created`);
        console.log(`  Materials:    ${matResult.created} created, ${matResult.skipped} skipped`);
        console.log(`  Equipments:   ${eqResult.created} created, ${eqResult.skipped} skipped`);
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
        console.log('✅ Add-on seed completed successfully!');
        console.log('');

    } catch (error) {
        console.error('❌ Seed failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main();
