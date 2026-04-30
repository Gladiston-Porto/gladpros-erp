import type { TradeConfig } from '@/components/propostas/estimador/types'

/**
 * Trade configurations for the Smart Cost Estimator Wizard.
 * Each trade defines the questions shown in Step 2 of the wizard.
 * Pricing formulas and templates are in src/config/estimador/templates/
 *
 * Dallas, TX 2025 pricing basis:
 * - Electrical residential: $4–10/sqft (basic $4-5, standard $7-8, premium $9-10)
 * - Commercial electrical: $6–14/sqft
 * - Panel upgrade: $1,200–$3,500 (100A→200A) | $3,500–$6,500 (200A→400A)
 * - EV Charging: $500–$1,800 (Level 2) | $2,500–$8,000 (DC Fast)
 * - Bathroom remodel: $7,500–$18,000 (moderate) | $18,000–$35,000 (high-end)
 * - Kitchen remodel: $12,000–$35,000 (moderate) | $35,000–$75,000 (high-end)
 * - Water heater (tank): $800–$1,600 installed
 * - Tankless: $1,800–$4,500 installed
 */
export const TRADES: TradeConfig[] = [
  // ─── ELECTRICAL ────────────────────────────────────────────────────────────
  {
    id: 'electrical-residential',
    label: 'Elétrica Residencial',
    icon: '⚡',
    category: 'electrical',
    description: 'Fiação completa ou parcial de residência — outlets, switches, luminárias, painéis.',
    questions: [
      {
        id: 'sqft',
        label: 'Área total da casa (square feet)',
        type: 'sqft',
        required: true,
        min: 200,
        max: 10000,
        placeholder: 'Ex: 1800',
        unit: 'sqft',
      },
      {
        id: 'scope',
        label: 'Tipo de trabalho',
        type: 'select',
        required: true,
        options: [
          { value: 'full-rewire', label: 'Fiação completa (full rewire)' },
          { value: 'partial', label: 'Fiação parcial (cômodos específicos)' },
          { value: 'outlets-switches', label: 'Outlets e switches apenas' },
          { value: 'service-upgrade', label: 'Atualização de serviço + fiação' },
        ],
      },
      {
        id: 'complexity',
        label: 'Nível de complexidade',
        type: 'select',
        required: true,
        options: [
          { value: 'basic', label: 'Básico — poucos circuits, sem 3-way' },
          { value: 'standard', label: 'Padrão — 3-way switches, algumas luzes especiais' },
          { value: 'premium', label: 'Premium — múltiplos 3-way, smart switches, appliances grandes' },
        ],
      },
      {
        id: 'has_appliances',
        label: 'Tem appliances de alta tensão? (range/oven, HVAC, dryer, EV)',
        type: 'boolean',
        required: false,
      },
      {
        id: 'appliances_count',
        label: 'Quantos circuits dedicados para appliances?',
        type: 'number',
        required: false,
        min: 0,
        max: 20,
        dependsOn: { questionId: 'has_appliances', value: true },
      },
      {
        id: 'has_permit',
        label: 'Precisa de permit elétrico?',
        type: 'boolean',
        required: true,
      },
    ],
  },

  {
    id: 'electrical-commercial',
    label: 'Elétrica Comercial',
    icon: '🏢',
    category: 'electrical',
    description: 'Instalação ou renovação elétrica em espaço comercial, escritório ou loja.',
    questions: [
      {
        id: 'sqft',
        label: 'Área do espaço comercial (square feet)',
        type: 'sqft',
        required: true,
        min: 200,
        max: 50000,
        unit: 'sqft',
      },
      {
        id: 'scope',
        label: 'Tipo de trabalho',
        type: 'select',
        required: true,
        options: [
          { value: 'full-install', label: 'Instalação completa (espaço novo)' },
          { value: 'renovation', label: 'Renovação / retrofit' },
          { value: 'tenant-improvement', label: 'Tenant improvement (TI)' },
          { value: 'panel-circuits', label: 'Painel + circuitos principais' },
        ],
      },
      {
        id: 'panel_size',
        label: 'Tamanho do painel necessário',
        type: 'select',
        required: true,
        options: [
          { value: '200a', label: '200A (pequeno comércio)' },
          { value: '400a', label: '400A (médio porte)' },
          { value: '600a+', label: '600A+ (grande porte)' },
        ],
      },
      {
        id: 'conduit',
        label: 'Requer conduit (EMT/rigid)?',
        type: 'boolean',
        required: true,
      },
      {
        id: 'has_permit',
        label: 'Precisa de permit elétrico comercial?',
        type: 'boolean',
        required: true,
      },
    ],
  },

  {
    id: 'ev-charging',
    label: 'EV Charging Point',
    icon: '🔌',
    category: 'electrical',
    description: 'Instalação de ponto de carregamento para veículo elétrico — Level 1, 2 ou DCFC.',
    questions: [
      {
        id: 'level',
        label: 'Nível do carregador',
        type: 'select',
        required: true,
        options: [
          { value: 'level1', label: 'Level 1 — 120V/20A (lento, pré-existente)' },
          { value: 'level2-30a', label: 'Level 2 — 240V/30A (padrão residencial)' },
          { value: 'level2-50a', label: 'Level 2 — 240V/50A (carregamento rápido)' },
          { value: 'dcfc', label: 'DC Fast Charge — comercial' },
        ],
      },
      {
        id: 'distance_from_panel',
        label: 'Distância do painel até o ponto de instalação (feet)',
        type: 'number',
        required: true,
        min: 5,
        max: 300,
        unit: 'ft',
      },
      {
        id: 'indoor_outdoor',
        label: 'Local de instalação',
        type: 'select',
        required: true,
        options: [
          { value: 'garage-indoor', label: 'Garagem interna' },
          { value: 'garage-outdoor', label: 'Garagem externa / carport' },
          { value: 'wall-outdoor', label: 'Parede externa' },
          { value: 'commercial', label: 'Comercial / parking lot' },
        ],
      },
      {
        id: 'panel_capacity',
        label: 'O painel atual tem capacidade (espaço para breaker)?',
        type: 'boolean',
        required: true,
      },
      {
        id: 'charger_supplied',
        label: 'O cliente já tem o equipamento (EVSE)?',
        type: 'boolean',
        required: false,
      },
    ],
  },

  {
    id: 'panel-upgrade',
    label: 'Atualização de Painel (Panel Upgrade)',
    icon: '🔧',
    category: 'electrical',
    description: 'Troca ou upgrade do painel elétrico principal (breaker box).',
    questions: [
      {
        id: 'from_amperage',
        label: 'Amperagem atual',
        type: 'select',
        required: true,
        options: [
          { value: '60a', label: '60A (muito antigo)' },
          { value: '100a', label: '100A' },
          { value: '150a', label: '150A' },
          { value: '200a', label: '200A' },
        ],
      },
      {
        id: 'to_amperage',
        label: 'Amperagem desejada',
        type: 'select',
        required: true,
        options: [
          { value: '100a', label: '100A' },
          { value: '200a', label: '200A (padrão residencial)' },
          { value: '400a', label: '400A (grande residência / comercial)' },
        ],
      },
      {
        id: 'is_main_service',
        label: 'Inclui troca do serviço (weatherhead/riser/meter socket)?',
        type: 'boolean',
        required: true,
      },
      {
        id: 'subpanel',
        label: 'Precisa de subpainel?',
        type: 'boolean',
        required: false,
      },
      {
        id: 'grounding',
        label: 'Inclui aterramento (grounding rod + wire)?',
        type: 'boolean',
        required: true,
      },
    ],
  },

  {
    id: 'service-installation',
    label: 'Service Installation',
    icon: '🏠',
    category: 'electrical',
    description: 'Instalação completa do serviço elétrico: meter socket, painel e estrutura pronta para a concessionária.',
    questions: [
      {
        id: 'amperage',
        label: 'Amperagem do serviço',
        type: 'select',
        required: true,
        options: [
          { value: '100a', label: '100A' },
          { value: '200a', label: '200A' },
          { value: '400a', label: '400A' },
        ],
      },
      {
        id: 'meter_type',
        label: 'Tipo de meter socket',
        type: 'select',
        required: true,
        options: [
          { value: 'overhead', label: 'Overhead (aéreo)' },
          { value: 'underground', label: 'Underground (subterrâneo)' },
        ],
      },
      {
        id: 'new_construction',
        label: 'Construção nova (sem estrutura prévia)?',
        type: 'boolean',
        required: true,
      },
      {
        id: 'distance_to_pole',
        label: 'Distância estimada até o poste ou ponto da concessionária (feet)',
        type: 'number',
        required: false,
        min: 0,
        max: 500,
        unit: 'ft',
        dependsOn: { questionId: 'meter_type', value: 'overhead' },
      },
    ],
  },

  {
    id: 'light-installation',
    label: 'Instalação de Luzes',
    icon: '💡',
    category: 'electrical',
    description: 'Instalação de luminárias, recessed lights, ceiling fans, pendant lights.',
    questions: [
      {
        id: 'light_type',
        label: 'Tipo principal de luminária',
        type: 'select',
        required: true,
        options: [
          { value: 'recessed', label: 'Recessed lights (can lights / pot lights)' },
          { value: 'ceiling-fan', label: 'Ceiling fans' },
          { value: 'pendant', label: 'Pendant / chandelier' },
          { value: 'under-cabinet', label: 'Under cabinet / strip LED' },
          { value: 'mixed', label: 'Misto (vários tipos)' },
        ],
      },
      {
        id: 'quantity',
        label: 'Quantidade de pontos/luminárias',
        type: 'number',
        required: true,
        min: 1,
        max: 200,
        unit: 'un',
      },
      {
        id: 'new_wiring',
        label: 'Precisa puxar fiação nova (sem circuit existente)?',
        type: 'boolean',
        required: true,
      },
      {
        id: 'drywall_repair',
        label: 'Inclui reparo de drywall após instalação?',
        type: 'boolean',
        required: false,
      },
      {
        id: 'fixtures_supplied',
        label: 'O cliente já tem as luminárias?',
        type: 'boolean',
        required: false,
      },
    ],
  },

  // ─── PLUMBING ──────────────────────────────────────────────────────────────
  {
    id: 'plumbing-residential',
    label: 'Encanamento Residencial',
    icon: '🚿',
    category: 'plumbing',
    description: 'Reparos, instalações ou substituição de linhas de água e drenagem em residência.',
    questions: [
      {
        id: 'scope',
        label: 'Tipo de trabalho',
        type: 'select',
        required: true,
        options: [
          { value: 'repair', label: 'Reparo de vazamento / emergência' },
          { value: 'replace-supply', label: 'Substituição de linhas de abastecimento' },
          { value: 'replace-drain', label: 'Substituição de drenagem' },
          { value: 'full-repipe', label: 'Repipe completo' },
          { value: 'fixture-install', label: 'Instalação de fixtures (faucet, toilet, sink)' },
        ],
      },
      {
        id: 'pipe_material',
        label: 'Material da tubulação atual (se substituição)',
        type: 'select',
        required: false,
        options: [
          { value: 'copper', label: 'Copper (cobre)' },
          { value: 'galvanized', label: 'Galvanizado (antigo)' },
          { value: 'pvc', label: 'PVC' },
          { value: 'pex', label: 'PEX (moderno)' },
          { value: 'unknown', label: 'Não sei' },
        ],
      },
      {
        id: 'bathrooms',
        label: 'Número de banheiros envolvidos',
        type: 'number',
        required: true,
        min: 1,
        max: 10,
        unit: 'ban',
      },
      {
        id: 'open_walls',
        label: 'Precisa abrir paredes/piso?',
        type: 'boolean',
        required: true,
      },
    ],
  },

  {
    id: 'bathroom-remodel',
    label: 'Reforma de Banheiro',
    icon: '🛁',
    category: 'remodel',
    description: 'Reforma completa ou parcial de banheiro — tub to shower, tile, fixtures, plumbing.',
    questions: [
      {
        id: 'scope',
        label: 'Nível da reforma',
        type: 'select',
        required: true,
        options: [
          { value: 'cosmetic', label: 'Cosmética — fixtures, paint, accessories' },
          { value: 'partial', label: 'Parcial — tile + fixtures (sem mover plumbing)' },
          { value: 'full', label: 'Completa — tudo (tile, plumbing, fixtures, drywall)' },
          { value: 'tub-to-shower', label: 'Tub to Shower conversion' },
        ],
      },
      {
        id: 'bath_size',
        label: 'Tamanho do banheiro',
        type: 'select',
        required: true,
        options: [
          { value: 'half-bath', label: 'Half bath (sem chuveiro)' },
          { value: 'standard', label: 'Padrão (50–70 sqft)' },
          { value: 'master', label: 'Master bath (70–120 sqft)' },
          { value: 'large', label: 'Grande (120+ sqft)' },
        ],
      },
      {
        id: 'move_plumbing',
        label: 'Mover posição da plumbing (drain, supply)?',
        type: 'boolean',
        required: true,
      },
      {
        id: 'tile_type',
        label: 'Tipo de tile desejado',
        type: 'select',
        required: false,
        options: [
          { value: 'standard', label: 'Padrão — ceramic/porcelain básico' },
          { value: 'mid-range', label: 'Intermediário — porcelain 12x24' },
          { value: 'premium', label: 'Premium — large format, natural stone' },
        ],
      },
      {
        id: 'glass_shower',
        label: 'Inclui porta de vidro (frameless/semi-frameless)?',
        type: 'boolean',
        required: false,
      },
      {
        id: 'vanity',
        label: 'Inclui vanity/gabinete novo?',
        type: 'boolean',
        required: false,
      },
      {
        id: 'electrical',
        label: 'Precisa de elétrica (GFCI, exaustor, luzes)?',
        type: 'boolean',
        required: false,
      },
    ],
  },

  {
    id: 'water-heater-tank',
    label: 'Instalação de Water Heater (Tank)',
    icon: '🌡️',
    category: 'plumbing',
    description: 'Substituição ou nova instalação de water heater a tanque (tank-style).',
    questions: [
      {
        id: 'capacity',
        label: 'Capacidade do tanque',
        type: 'select',
        required: true,
        options: [
          { value: '30gal', label: '30 galões (1-2 pessoas)' },
          { value: '40gal', label: '40 galões (2-3 pessoas)' },
          { value: '50gal', label: '50 galões (3-4 pessoas)' },
          { value: '75gal+', label: '75+ galões (família grande)' },
        ],
      },
      {
        id: 'fuel_type',
        label: 'Tipo de energia',
        type: 'select',
        required: true,
        options: [
          { value: 'gas', label: 'Gás natural' },
          { value: 'electric', label: 'Elétrico' },
          { value: 'propane', label: 'Propane (gás de botijão)' },
        ],
      },
      {
        id: 'replacement',
        label: 'É substituição (tem water heater atual)?',
        type: 'boolean',
        required: true,
      },
      {
        id: 'disposal',
        label: 'Inclui descarte do equipamento antigo?',
        type: 'boolean',
        required: false,
        dependsOn: { questionId: 'replacement', value: true },
      },
      {
        id: 'code_upgrade',
        label: 'Precisa de upgrade para code (expansion tank, T&P valve, pan)?',
        type: 'boolean',
        required: false,
      },
    ],
  },

  {
    id: 'tankless-water-heater',
    label: 'Instalação de Tankless Water Heater',
    icon: '♨️',
    category: 'plumbing',
    description: 'Instalação de water heater sem tanque (on-demand / instant hot water).',
    questions: [
      {
        id: 'fuel_type',
        label: 'Tipo de energia',
        type: 'select',
        required: true,
        options: [
          { value: 'gas', label: 'Gás natural (requer linha de gás adequada)' },
          { value: 'electric', label: 'Elétrico (requer circuit dedicado 240V/50A+)' },
          { value: 'propane', label: 'Propane' },
        ],
      },
      {
        id: 'replacing_tank',
        label: 'Está substituindo um tanque existente?',
        type: 'boolean',
        required: true,
      },
      {
        id: 'gas_line_upgrade',
        label: 'Precisa de upgrade na linha de gás (gas line size)?',
        type: 'boolean',
        required: false,
        dependsOn: { questionId: 'fuel_type', value: 'gas' },
      },
      {
        id: 'electrical_upgrade',
        label: 'Precisa de upgrade elétrico (novo circuit dedicado)?',
        type: 'boolean',
        required: false,
        dependsOn: { questionId: 'fuel_type', value: 'electric' },
      },
      {
        id: 'venting',
        label: 'Tipo de ventilação (gas)',
        type: 'select',
        required: false,
        options: [
          { value: 'direct-vent', label: 'Direct vent (pipe pelo exterior)' },
          { value: 'indoor-vent', label: 'Indoor vent (ducto existente)' },
          { value: 'condensing', label: 'Condensing (alta eficiência)' },
        ],
        dependsOn: { questionId: 'fuel_type', value: 'gas' },
      },
    ],
  },

  {
    id: 'move-plumbing',
    label: 'Mover Drenagem / Linhas de Água',
    icon: '🔩',
    category: 'plumbing',
    description: 'Reposicionamento de drain, supply lines ou ambos para reforma ou layout novo.',
    questions: [
      {
        id: 'what_to_move',
        label: 'O que precisa ser movido?',
        type: 'select',
        required: true,
        options: [
          { value: 'drain-only', label: 'Somente drenagem (drain)' },
          { value: 'supply-only', label: 'Somente linhas de abastecimento (supply)' },
          { value: 'both', label: 'Ambos (drain + supply)' },
        ],
      },
      {
        id: 'distance',
        label: 'Distância do deslocamento (inches)',
        type: 'number',
        required: true,
        min: 6,
        max: 240,
        unit: 'in',
      },
      {
        id: 'floor_type',
        label: 'Tipo de piso/estrutura',
        type: 'select',
        required: true,
        options: [
          { value: 'slab', label: 'Slab (concreto — corte necessário)' },
          { value: 'wood-frame', label: 'Wood frame (assoalho de madeira)' },
          { value: 'second-floor', label: 'Segundo andar (acesso pelo teto abaixo)' },
        ],
      },
      {
        id: 'restore_floor',
        label: 'Inclui restauração do piso/teto após obra?',
        type: 'boolean',
        required: false,
      },
    ],
  },

  {
    id: 'kitchen-remodel',
    label: 'Reforma de Cozinha',
    icon: '🍳',
    category: 'remodel',
    description: 'Reforma completa ou parcial de cozinha — gabinetes, countertop, elétrica, plumbing.',
    questions: [
      {
        id: 'scope',
        label: 'Nível da reforma',
        type: 'select',
        required: true,
        options: [
          { value: 'cosmetic', label: 'Cosmética — paint, hardware, faucet' },
          { value: 'mid-range', label: 'Intermediária — countertop + backsplash + appliances' },
          { value: 'full', label: 'Completa — gabinetes novos + tudo' },
          { value: 'gut', label: 'Demolição total (gut renovation)' },
        ],
      },
      {
        id: 'kitchen_sqft',
        label: 'Tamanho da cozinha (square feet)',
        type: 'sqft',
        required: true,
        min: 50,
        max: 800,
        unit: 'sqft',
      },
      {
        id: 'cabinets',
        label: 'Tipo de gabinetes',
        type: 'select',
        required: false,
        options: [
          { value: 'stock', label: 'Stock (pré-fabricado, básico)' },
          { value: 'semi-custom', label: 'Semi-custom' },
          { value: 'custom', label: 'Custom (sob medida)' },
          { value: 'keep-existing', label: 'Manter gabinetes existentes' },
        ],
      },
      {
        id: 'countertop',
        label: 'Material do countertop',
        type: 'select',
        required: false,
        options: [
          { value: 'laminate', label: 'Laminate (básico)' },
          { value: 'granite', label: 'Granite' },
          { value: 'quartz', label: 'Quartz (engineered)' },
          { value: 'marble', label: 'Marble / natural stone' },
          { value: 'keep', label: 'Manter existente' },
        ],
      },
      {
        id: 'electrical',
        label: 'Precisa de elétrica (island circuit, under-cabinet lights, GFCIs)?',
        type: 'boolean',
        required: false,
      },
      {
        id: 'plumbing',
        label: 'Precisa de plumbing (mover sink, dishwasher, ice maker)?',
        type: 'boolean',
        required: false,
      },
      {
        id: 'island',
        label: 'Inclui island nova?',
        type: 'boolean',
        required: false,
      },
    ],
  },
]

export const TRADES_BY_ID = Object.fromEntries(TRADES.map((t) => [t.id, t]))
