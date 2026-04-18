# Seed Pack v2 - Estoque (Materiais de Construção Civil)

## Correções da v2 (baseado em feedback de revisão)

| Issue | Correção |
|-------|----------|
| **CategoryMap por nome** colisões possíveis | Usa **path completo**: `MATERIAL\|Electrical > Wire & Cable > NM-B (Romex)` |
| **RL/BX/PK** como unidades base | **Removidas** - usar MaterialEmbalagem para conversões |
| **valorAquisicao** hardcoded | Usa **0.01** como placeholder |
| **EMT/PVC em EA vs FT** | Mantido EA (decisão de negócio, converter via embalagem) |

---

## Conteúdo do Seed

### Unidades de Medida (14 unidades base)
| Código | Descrição |
|--------|-----------|
| FT | Feet |
| IN | Inches |
| EA | Each |
| GAL | Gallon |
| LB | Pound |
| SF | Square Feet |
| LF | Linear Feet |
| SET | Set |
| HR | Hour |

> **NOTA**: RL/BX/PK são unidades de **embalagem**, não de estoque.
> Use `MaterialEmbalagem` para conversões (ex: 1 Roll = 250 FT).

### Categorias (91 total)
- **65 categorias de materiais** (hierárquicas)
- **26 categorias de equipamentos** (hierárquicas)

### Materiais (~70 itens)
Exemplos por categoria:
- **Electrical**: NM-B Romex, THHN, EMT conduit, boxes, wire nuts
- **Plumbing**: PVC pipes, PEX tubing, valves, P-traps, cement
- **Drywall**: Gypsum board, joint compound, tape, corner beads
- **Paint**: Interior/exterior paint, primers, caulks
- **Framing**: 2x4 studs, plywood, OSB
- **Fasteners**: Drywall screws, deck screws, nails, anchors
- **Consumables**: Electrical tape, duct tape, sandpaper
- **Safety**: Gloves, N95 masks, safety glasses

### Equipamentos (30 itens)
- **Power Tools**: Drills, saws, grinders, sanders (DeWalt, Milwaukee, Makita)
- **Hand Tools**: Tape measure, level, hammer, pipe wrench
- **Measurement**: Laser level, distance meter, stud finder
- **Access**: Step ladders, extension ladder
- **Site**: Extension cords, shop vac, blower

---

## Como Executar

```bash
npx tsx prisma/seed-estoque.ts
```

## Características v2

✅ **Idempotente**: Pode executar múltiplas vezes sem duplicar
✅ **CategoryPath**: Usa path completo para evitar colisões de nomes
✅ **Unidades Base**: Sem RL/BX/PK (usar MaterialEmbalagem)
✅ **Placeholder**: valorAquisicao = 0.01 (atualizar após compra real)
✅ **Barcode**: `barcodeInternal` = código SKU

---

## Política de Unidades

| Uso | Unidades Permitidas |
|-----|---------------------|
| Estoque (Material.unidadeId) | FT, EA, GAL, LB, SF, IN, OZ, SET |
| Compras (embalagem) | RL, BX, PK (via MaterialEmbalagem.purchaseUnit) |
| Serviços | HR |

**Exemplo de Conversão:**
```
MaterialEmbalagem:
  - upcEan: "123456789012"
  - packageType: "ROLL"
  - baseQtyPerUnit: 250  (1 roll = 250 FT)
  - purchaseUnit: "RL"
```
