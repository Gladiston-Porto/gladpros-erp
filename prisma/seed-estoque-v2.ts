/**
 * SEED v2 INCREMENTAL - Estoque (Kit de Obra Completo)
 * 
 * ARQUIVO NOVO - NÃO MODIFICA seeds anteriores
 * 
 * Adiciona apenas itens que FALTAM:
 * - Toggle switches (15A/20A)
 * - Decora 20A variants
 * - DWV fittings extras (3", 4")
 * - Hot mud 90, Supply 12"
 * - Tile accessories (silicone, backer rod, seam tape)
 * - Primer/Cement clear variants
 * 
 * IDEMPOTENTE: Pode rodar múltiplas vezes sem duplicar dados.
 * 
 * Comando: npx tsx prisma/seed-estoque-v2.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// NOVAS CATEGORIAS (se não existirem)
// ============================================================================
type CategoryNode = {
    nome: string;
    tipo: 'MATERIAL' | 'EQUIPAMENTO';
    filhos?: CategoryNode[];
};

const NEW_CATEGORIES: { parentPath: string | null; categories: CategoryNode[] }[] = [
    // Adicionar subcategoria para acessórios elétricos se não existir
    {
        parentPath: 'Electrical > Devices & Wiring',
        categories: [
            { nome: 'Wiring Accessories', tipo: 'MATERIAL' },
        ],
    },
    // Adicionar categoria Site Equipment > Misc se não existir
    {
        parentPath: 'Site Equipment',
        categories: [
            { nome: 'Misc', tipo: 'EQUIPAMENTO' },
        ],
    },
];

// ============================================================================
// NOVOS MATERIAIS v2
// ============================================================================
type MaterialDef = {
    codigo: string;
    nome: string;
    categoriaPath: string;
    unidade: string;
    estoqueMinimo?: number;
    pontoReposicao?: number;
};

const NEW_MATERIALS: MaterialDef[] = [
    // =========================================================================
    // ELECTRICAL - Toggle Switches (que faltam)
    // =========================================================================
    { codigo: 'SW-TGL-1P-15A', nome: 'Switch Toggle 15A Single Pole', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Switches', unidade: 'EA', estoqueMinimo: 20, pontoReposicao: 40 },
    { codigo: 'SW-TGL-1P-20A', nome: 'Switch Toggle 20A Single Pole', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Switches', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'SW-TGL-3W-15A', nome: 'Switch Toggle 15A 3-Way', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Switches', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'SW-TGL-3W-20A', nome: 'Switch Toggle 20A 3-Way', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Switches', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'SW-TGL-4W-15A', nome: 'Switch Toggle 15A 4-Way', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Switches', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'SW-TGL-4W-20A', nome: 'Switch Toggle 20A 4-Way', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Switches', unidade: 'EA', estoqueMinimo: 2, pontoReposicao: 5 },

    // Decora 20A (que faltam)
    { codigo: 'SW-DEC-1P-20A', nome: 'Switch Decora 20A Single Pole', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Switches', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'SW-DEC-3W-20A', nome: 'Switch Decora 20A 3-Way', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Switches', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'SW-DEC-4W-20A', nome: 'Switch Decora 20A 4-Way', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Switches', unidade: 'EA', estoqueMinimo: 2, pontoReposicao: 5 },

    // Wall Plate Toggle 2-Gang (falta)
    { codigo: 'PLATE-2G-TGL', nome: 'Wall Plate 2-Gang Toggle', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Wall Plates', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },

    // Wiring Accessories
    { codigo: 'ELEC-GND-SCREW', nome: 'Ground Screw Green', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Wiring Accessories', unidade: 'EA', estoqueMinimo: 50, pontoReposicao: 100 },
    { codigo: 'PIGTAIL-14AWG', nome: 'Pigtail 14AWG 6" Green', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Wiring Accessories', unidade: 'EA', estoqueMinimo: 25, pontoReposicao: 50 },
    { codigo: 'PIGTAIL-12AWG', nome: 'Pigtail 12AWG 6" Green', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Wiring Accessories', unidade: 'EA', estoqueMinimo: 25, pontoReposicao: 50 },
    { codigo: 'CABLE-CLAMP-NM', nome: 'Cable Clamp NM Connector', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Wiring Accessories', unidade: 'EA', estoqueMinimo: 50, pontoReposicao: 100 },
    { codigo: 'MUDRING-1G', nome: 'Mud Ring 1-Gang 1/2"', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Wiring Accessories', unidade: 'EA', estoqueMinimo: 20, pontoReposicao: 40 },
    { codigo: 'MUDRING-2G', nome: 'Mud Ring 2-Gang 1/2"', categoriaPath: 'MATERIAL|Electrical > Devices & Wiring > Wiring Accessories', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },

    // =========================================================================
    // DWV - Fittings extras (1-1/2", 3", 4")
    // =========================================================================
    { codigo: 'DWV-90-1.5', nome: '1-1/2" 90° DWV Elbow', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'DWV-45-1.5', nome: '1-1/2" 45° DWV Elbow', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'DWV-SANTEE-1.5', nome: '1-1/2" Sanitary Tee', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'DWV-COMBO-2', nome: '2" Combo Wye', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'DWV-CPL-2', nome: '2" DWV Coupling', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'DWV-CAP-2', nome: '2" DWV Cap', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },

    // 3" fittings
    { codigo: 'DWV-90-3', nome: '3" 90° DWV Elbow', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'DWV-45-3', nome: '3" 45° DWV Elbow', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'DWV-SANTEE-3', nome: '3" Sanitary Tee', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'DWV-WYE-3', nome: '3" Wye', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'DWV-CO-3', nome: '3" Cleanout Adapter + Plug', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > Cleanouts & Test Caps', unidade: 'EA', estoqueMinimo: 2, pontoReposicao: 5 },

    // 4" fittings
    { codigo: 'DWV-90-4', nome: '4" 90° DWV Elbow', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'DWV-45-4', nome: '4" 45° DWV Elbow', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'DWV-SANTEE-4', nome: '4" Sanitary Tee', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > PVC DWV Pipe & Fittings', unidade: 'EA', estoqueMinimo: 2, pontoReposicao: 5 },
    { codigo: 'DWV-CO-4', nome: '4" Cleanout Adapter + Plug', categoriaPath: 'MATERIAL|Plumbing > DWV (Drain/Waste/Vent) > Cleanouts & Test Caps', unidade: 'EA', estoqueMinimo: 2, pontoReposicao: 5 },

    // =========================================================================
    // PLUMBING - Supply Line 12" + Primer/Cement Clear
    // =========================================================================
    { codigo: 'SUPPLY-3/8-12', nome: 'Supply Line 3/8" 12"', categoriaPath: 'MATERIAL|Plumbing > Supply & Shutoffs > Supply Lines', unidade: 'EA', estoqueMinimo: 10, pontoReposicao: 20 },
    { codigo: 'PRIM-CLEAR-8', nome: 'PVC Primer Clear 8oz', categoriaPath: 'MATERIAL|Plumbing > Adhesives & Primers', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'CEMENT-CLEAR-8', nome: 'PVC Cement Clear Medium 8oz', categoriaPath: 'MATERIAL|Plumbing > Adhesives & Primers', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'CEMENT-HEAVY-16', nome: 'PVC Cement Heavy Body Gray 16oz', categoriaPath: 'MATERIAL|Plumbing > Adhesives & Primers', unidade: 'EA', estoqueMinimo: 2, pontoReposicao: 5 },

    // =========================================================================
    // DRYWALL - Hot Mud 90
    // =========================================================================
    { codigo: 'MUD-90', nome: 'Setting Compound 90 min', categoriaPath: 'MATERIAL|Drywall > Repair & Setting Compounds', unidade: 'EA', estoqueMinimo: 2, pontoReposicao: 5 },

    // =========================================================================
    // TILE & WATERPROOFING - Extras
    // =========================================================================
    { codigo: 'CBU-1/2-4x8', nome: 'Cement Board 1/2" 4x8', categoriaPath: 'MATERIAL|Tile & Waterproofing > Cement Board & Fasteners', unidade: 'EA', estoqueMinimo: 5, pontoReposicao: 10 },
    { codigo: 'THINSET-UNMOD-50', nome: 'Thinset Unmodified 50lb', categoriaPath: 'MATERIAL|Tile & Waterproofing > Thinset & Mortar', unidade: 'EA', estoqueMinimo: 2, pontoReposicao: 5 },
    { codigo: 'WP-LIQ-3.5G', nome: 'Waterproofing Liquid 3.5 Gal', categoriaPath: 'MATERIAL|Tile & Waterproofing > Waterproofing (Liquid/Membrane)', unidade: 'EA', estoqueMinimo: 1, pontoReposicao: 3 },
    { codigo: 'WP-SEAM-TAPE', nome: 'Waterproofing Seam Tape 4"', categoriaPath: 'MATERIAL|Tile & Waterproofing > Waterproofing (Liquid/Membrane)', unidade: 'EA', estoqueMinimo: 3, pontoReposicao: 6 },
    { codigo: 'SILICONE-WHT', nome: 'Silicone 100% White 10.1oz', categoriaPath: 'MATERIAL|Paint & Finishes > Caulks & Sealants', unidade: 'EA', estoqueMinimo: 6, pontoReposicao: 12 },
    { codigo: 'SILICONE-CLR', nome: 'Silicone 100% Clear 10.1oz', categoriaPath: 'MATERIAL|Paint & Finishes > Caulks & Sealants', unidade: 'EA', estoqueMinimo: 6, pontoReposicao: 12 },
    { codigo: 'BACKER-ROD-3/8', nome: 'Backer Rod 3/8"', categoriaPath: 'MATERIAL|Paint & Finishes > Caulks & Sealants', unidade: 'FT', estoqueMinimo: 50, pontoReposicao: 100 },
    { codigo: 'BACKER-ROD-1/2', nome: 'Backer Rod 1/2"', categoriaPath: 'MATERIAL|Paint & Finishes > Caulks & Sealants', unidade: 'FT', estoqueMinimo: 50, pontoReposicao: 100 },
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function findCategoryByPath(path: string): Promise<number | null> {
    // Path format: "MATERIAL|Electrical > Devices & Wiring > Switches"
    const [tipo, pathStr] = path.split('|');
    const parts = pathStr.split(' > ').map(p => p.trim());

    let parentId: number | null = null;
    let catId: number | null = null;

    for (const nome of parts) {
        const cat = await prisma.categoria.findFirst({
            where: { nome, tipo: tipo as 'MATERIAL' | 'EQUIPAMENTO', paiId: parentId },
        });
        if (cat) {
            catId = cat.id;
            parentId = cat.id;
        } else {
            return null; // Category not found
        }
    }

    return catId;
}

async function getOrCreateCategory(
    nome: string,
    tipo: 'MATERIAL' | 'EQUIPAMENTO',
    paiId: number | null
): Promise<{ id: number; created: boolean }> {
    const existing = await prisma.categoria.findFirst({
        where: { nome, tipo, paiId },
    });

    if (existing) {
        return { id: existing.id, created: false };
    }

    const created = await prisma.categoria.create({
        data: { nome, tipo, paiId },
    });

    return { id: created.id, created: true };
}

async function seedNewCategories(): Promise<number> {
    console.log('📁 Checking/Adding new categories...');
    let created = 0;

    for (const group of NEW_CATEGORIES) {
        let parentId: number | null = null;

        if (group.parentPath) {
            // Find parent by path
            const pathParts = group.parentPath.split(' > ').map(p => p.trim());
            for (const nome of pathParts) {
                const tipo = group.categories[0]?.tipo || 'MATERIAL';
                const cat = await prisma.categoria.findFirst({
                    where: { nome, tipo, paiId: parentId },
                });
                if (cat) {
                    parentId = cat.id;
                } else {
                    console.warn(`   ⚠️ Parent not found: ${nome}`);
                    break;
                }
            }
        }

        for (const cat of group.categories) {
            const result = await getOrCreateCategory(cat.nome, cat.tipo, parentId);
            if (result.created) {
                created++;
                console.log(`   ✅ Created: ${cat.nome}`);
            }
        }
    }

    console.log(`   📊 Categories: ${created} new`);
    return created;
}

async function buildCategoryMap(): Promise<Map<string, number>> {
    const map = new Map<string, number>();

    const categories = await prisma.categoria.findMany({
        include: { pai: { include: { pai: { include: { pai: true } } } } },
    });

    for (const cat of categories) {
        let path = cat.nome;
        if (cat.pai) {
            path = `${cat.pai.nome} > ${cat.nome}`;
            if (cat.pai.pai) {
                path = `${cat.pai.pai.nome} > ${cat.pai.nome} > ${cat.nome}`;
                if (cat.pai.pai.pai) {
                    path = `${cat.pai.pai.pai.nome} > ${cat.pai.pai.nome} > ${cat.pai.nome} > ${cat.nome}`;
                }
            }
        }
        map.set(`${cat.tipo}|${path}`, cat.id);
    }

    return map;
}

async function seedNewMaterials(categoryMap: Map<string, number>): Promise<{ created: number; skipped: number }> {
    console.log('📦 Adding new materials...');
    let created = 0;
    let skipped = 0;

    const units = await prisma.unidade.findMany();
    const unitMap = new Map<string, number>();
    units.forEach(u => unitMap.set(u.codigo, u.id));

    for (const mat of NEW_MATERIALS) {
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

    console.log(`   ✅ Materials: ${created} created, ${skipped} skipped (already exist)`);
    return { created, skipped };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  SEED v2 INCREMENTAL - Kit de Obra Completo');
    console.log('  Adiciona apenas itens que faltam (Toggle, DWV 3/4", etc)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    try {
        // 1. Add new categories if needed
        const catsCreated = await seedNewCategories();

        // 2. Build category map
        const categoryMap = await buildCategoryMap();

        // 3. Add new materials
        const matResult = await seedNewMaterials(categoryMap);

        // Summary
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`  New Categories: ${catsCreated}`);
        console.log(`  New Materials:  ${matResult.created}`);
        console.log(`  Skipped:        ${matResult.skipped} (already exist)`);
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
