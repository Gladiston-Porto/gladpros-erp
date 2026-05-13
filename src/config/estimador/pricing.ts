import type {
  EstimadorRespostas,
  EstimadorResult,
  EstimadorEtapa,
  EstimadorMaterial,
} from '@/components/propostas/estimador/types'

// Dallas TX 2025 labor rates
const LABOR = {
  electrician_master: 95,  // $/hr
  electrician_journeyman: 75,
  plumber_master: 95,
  plumber_journeyman: 75,
  remodel_crew: 65,        // $/hr (2-person crew average per person)
  painter: 55,             // $/hr painting crew
}

function r(val: number): number {
  return Math.round(val / 50) * 50 // round to nearest $50
}

// ──────────────────────────────────────────────────────────────────────────────
// ELECTRICAL RESIDENTIAL
// ──────────────────────────────────────────────────────────────────────────────
export function calcElectricalResidential(respostas: EstimadorRespostas): EstimadorResult {
  const sqft = Number(respostas.sqft) || 1500
  const scope = String(respostas.scope || 'full-rewire')
  const complexity = String(respostas.complexity || 'standard')
  const hasAppliances = Boolean(respostas.has_appliances)
  const appliancesCount = Number(respostas.appliances_count || 0)
  const hasPermit = Boolean(respostas.has_permit)

  // Base $/sqft by complexity
  const rateMap: Record<string, [number, number]> = {
    basic:    [4.0, 5.5],
    standard: [6.5, 8.5],
    premium:  [8.5, 11.0],
  }
  const [lowRate, highRate] = rateMap[complexity] || rateMap.standard

  // Scope multiplier
  const scopeMultiplier: Record<string, number> = {
    'full-rewire': 1.0,
    'partial': 0.55,
    'outlets-switches': 0.35,
    'service-upgrade': 0.6,
  }
  const mult = scopeMultiplier[scope] || 1.0

  let low = sqft * lowRate * mult
  let high = sqft * highRate * mult

  // Appliances add $400-700 each
  if (hasAppliances && appliancesCount > 0) {
    low += appliancesCount * 350
    high += appliancesCount * 650
  }

  // Permit
  if (hasPermit) {
    low += 350
    high += 650
  }

  const mat = r((low + high) / 2 * 0.35)
  const mo = r((low + high) / 2 * 0.55)

  const etapas: EstimadorEtapa[] = [
    { servico: 'Inspeção e planejamento', descricao: 'Avaliação da estrutura elétrica existente, mapeamento de circuits e planejamento da instalação.', quantidade: 1, unidade: 'serviço', duracaoHoras: 4, custoMO: r(4 * LABOR.electrician_master), status: 'planejada' },
    ...(hasPermit ? [{ servico: 'Permit elétrico', descricao: 'Solicitação e acompanhamento do permit elétrico junto à cidade.', quantidade: 1, unidade: 'serviço', duracaoHoras: 2, custoMO: r(350), status: 'planejada' as const }] : []),
    { servico: 'Instalação de fiação', descricao: `Puxar cabos ${complexity === 'premium' ? '12/14 AWG e cabos especiais 6/8 AWG para appliances' : '14/12 AWG'} em toda a área.`, quantidade: sqft, unidade: 'sqft', duracaoHoras: r(sqft / 100), custoMO: r(sqft * 0.4), status: 'planejada' },
    { servico: 'Instalação de outlets e switches', descricao: 'Fixação de caixas, outlets (20A/15A), switches e tampas.', quantidade: Math.ceil(sqft / 100), unidade: 'un', duracaoHoras: Math.ceil(sqft / 150), custoMO: r(Math.ceil(sqft / 100) * 35), status: 'planejada' },
    ...(hasAppliances && appliancesCount > 0 ? [{ servico: 'Circuits dedicados para appliances', descricao: 'Instalação de circuits 240V dedicados para range/oven, HVAC, dryer, EV charger.', quantidade: appliancesCount, unidade: 'circuit', duracaoHoras: appliancesCount * 3, custoMO: r(appliancesCount * LABOR.electrician_master * 3), status: 'planejada' as const }] : []),
    { servico: 'Instalação de breaker panel', descricao: 'Organização e label de todos os breakers no painel.', quantidade: 1, unidade: 'serviço', duracaoHoras: 4, custoMO: r(4 * LABOR.electrician_journeyman), status: 'planejada' },
    { servico: 'Teste e inspeção final', descricao: 'Teste de todos os circuits, GFCI e AFCIs. Acompanhamento da inspeção da cidade.', quantidade: 1, unidade: 'serviço', duracaoHoras: 3, custoMO: r(3 * LABOR.electrician_master), status: 'planejada' },
  ]

  const materiais: EstimadorMaterial[] = [
    { codigo: 'CABO-14AWG', nome: 'Cabo NM-B 14/2 AWG', quantidade: Math.ceil(sqft * 0.8), unidade: 'ft', preco: 0.45, status: 'necessario' },
    { codigo: 'CABO-12AWG', nome: 'Cabo NM-B 12/2 AWG', quantidade: Math.ceil(sqft * 0.3), unidade: 'ft', preco: 0.65, status: 'necessario' },
    ...(hasAppliances && appliancesCount > 0 ? [{ codigo: 'CABO-8AWG', nome: 'Cabo 8/3 AWG (appliances)', quantidade: appliancesCount * 40, unidade: 'ft', preco: 2.20, status: 'necessario' as const }] : []),
    { codigo: 'OUTLET-20A', nome: 'Outlet 20A (Tamper Resistant)', quantidade: Math.ceil(sqft / 80), unidade: 'un', preco: 4.50, status: 'necessario' },
    { codigo: 'SWITCH-1WAY', nome: 'Switch 15A single-pole', quantidade: Math.ceil(sqft / 200), unidade: 'un', preco: 3.50, status: 'necessario' },
    { codigo: 'GFCI-20A', nome: 'GFCI outlet 20A (kitchen/bath)', quantidade: Math.ceil(sqft / 400) + 2, unidade: 'un', preco: 18.00, status: 'necessario' },
    { codigo: 'AFCI-BR', nome: 'AFCI breaker 20A', quantidade: Math.ceil(sqft / 400) + 2, unidade: 'un', preco: 45.00, status: 'necessario' },
    { codigo: 'CAIXA-4', nome: 'Caixa elétrica 4" single gang', quantidade: Math.ceil(sqft / 50), unidade: 'un', preco: 1.80, status: 'necessario' },
    { codigo: 'WIRE-STAPLE', nome: 'Wire staples (bag 100)', quantidade: Math.ceil(sqft / 200), unidade: 'bag', preco: 5.00, status: 'necessario' },
  ]

  const scope_label = { 'full-rewire': 'Fiação completa residencial', 'partial': 'Fiação parcial', 'outlets-switches': 'Outlets e switches', 'service-upgrade': 'Service upgrade + fiação' }[scope] || 'Instalação elétrica'

  return {
    tradeId: 'electrical-residential',
    tradeLabel: 'Elétrica Residencial',
    escopoTexto: `${scope_label} para residência de ${sqft.toLocaleString()} sqft, nível ${complexity}. Inclui fiação NM-B, outlets, switches, GFCI, AFCI conforme NEC 2020.${hasPermit ? ' Inclui permit elétrico e inspeção.' : ''}${hasAppliances ? ` Inclui ${appliancesCount} circuit(s) dedicado(s) para appliances.` : ''}`,
    etapas,
    materiais,
    estimativaBaixa: r(low),
    estimativaAlta: r(high),
    estimativaMedia: r((low + high) / 2),
    custoMO: mo,
    custoMaterial: mat,
    fonte: 'internal',
    notas: ['Preços estimados para Dallas, TX 2025.', 'Valor final depende de condições específicas do imóvel.', 'Permit fees podem variar por cidade/município.'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// ELECTRICAL COMMERCIAL
// ──────────────────────────────────────────────────────────────────────────────
export function calcElectricalCommercial(respostas: EstimadorRespostas): EstimadorResult {
  const sqft = Number(respostas.sqft) || 2000
  const scope = String(respostas.scope || 'renovation')
  const panelSize = String(respostas.panel_size || '200a')
  const conduit = Boolean(respostas.conduit)
  const hasPermit = Boolean(respostas.has_permit)

  const rateMap: Record<string, [number, number]> = {
    'full-install':        [9.0, 14.0],
    'renovation':          [6.0, 10.0],
    'tenant-improvement':  [5.0, 9.0],
    'panel-circuits':      [3.0, 6.0],
  }
  const [low_rate, high_rate] = rateMap[scope] || rateMap.renovation

  const conduitAdder = conduit ? 0.8 : 0

  let low = sqft * (low_rate + conduitAdder)
  let high = sqft * (high_rate + conduitAdder)

  const panelAdder: Record<string, number> = { '200a': 1800, '400a': 4500, '600a+': 9000 }
  low += panelAdder[panelSize] || 1800
  high += (panelAdder[panelSize] || 1800) * 1.4

  if (hasPermit) { low += 500; high += 1200 }

  const mat = r((low + high) / 2 * 0.40)
  const mo = r((low + high) / 2 * 0.50)

  return {
    tradeId: 'electrical-commercial',
    tradeLabel: 'Elétrica Comercial',
    escopoTexto: `Instalação elétrica comercial — ${scope} em espaço de ${sqft.toLocaleString()} sqft. Painel ${panelSize.toUpperCase()}.${conduit ? ' Inclui conduit EMT.' : ''}${hasPermit ? ' Inclui permit comercial.' : ''}`,
    etapas: [
      { servico: 'Planejamento e load calculation', descricao: 'Cálculo de carga, single-line diagram, layout de panels e circuits.', quantidade: 1, unidade: 'serviço', duracaoHoras: 8, custoMO: r(8 * LABOR.electrician_master), status: 'planejada' },
      { servico: 'Instalação do painel principal', descricao: `Instalação e configuração de painel ${panelSize.toUpperCase()}.`, quantidade: 1, unidade: 'serviço', duracaoHoras: 12, custoMO: r(12 * LABOR.electrician_master), status: 'planejada' },
      ...(conduit ? [{ servico: 'Instalação de conduit', descricao: 'Passagem de conduit EMT conforme layout aprovado.', quantidade: Math.ceil(sqft / 50), unidade: 'ft', duracaoHoras: Math.ceil(sqft / 100), custoMO: r(Math.ceil(sqft / 100) * LABOR.electrician_journeyman), status: 'planejada' as const }] : []),
      { servico: 'Fiação e circuits', descricao: 'Instalação de fiação THHN, circuits de iluminação e tomadas.', quantidade: sqft, unidade: 'sqft', duracaoHoras: Math.ceil(sqft / 80), custoMO: r(Math.ceil(sqft / 80) * LABOR.electrician_journeyman), status: 'planejada' },
      { servico: 'Lighting e outlets comerciais', descricao: 'Instalação de luminárias comerciais, outlets e switchgear.', quantidade: Math.ceil(sqft / 100), unidade: 'un', duracaoHoras: Math.ceil(sqft / 120), custoMO: r(Math.ceil(sqft / 120) * LABOR.electrician_journeyman), status: 'planejada' },
      { servico: 'Inspeção e comissionamento', descricao: 'Teste de todos os circuits, termografia, acompanhamento da inspeção.', quantidade: 1, unidade: 'serviço', duracaoHoras: 8, custoMO: r(8 * LABOR.electrician_master), status: 'planejada' },
    ],
    materiais: [
      { codigo: 'THHN-12', nome: 'Cabo THHN 12 AWG (spool 500ft)', quantidade: Math.ceil(sqft / 300), unidade: 'spool', preco: 120, status: 'necessario' },
      { codigo: 'THHN-10', nome: 'Cabo THHN 10 AWG', quantidade: Math.ceil(sqft / 500), unidade: 'spool', preco: 180, status: 'necessario' },
      ...(conduit ? [{ codigo: 'EMT-3/4', nome: 'Conduit EMT 3/4"', quantidade: Math.ceil(sqft / 20), unidade: 'ft', preco: 2.80, status: 'necessario' as const }] : []),
      { codigo: 'PANEL-COM', nome: `Panel elétrico comercial ${panelSize.toUpperCase()}`, quantidade: 1, unidade: 'un', preco: panelAdder[panelSize] || 1800, status: 'necessario' },
      { codigo: 'OUTLET-COM', nome: 'Outlet comercial 20A', quantidade: Math.ceil(sqft / 60), unidade: 'un', preco: 6.50, status: 'necessario' },
    ],
    estimativaBaixa: r(low),
    estimativaAlta: r(high),
    estimativaMedia: r((low + high) / 2),
    custoMO: mo,
    custoMaterial: mat,
    fonte: 'internal',
    notas: ['Preços estimados Dallas TX 2025 para serviços comerciais.', 'Valor pode variar por tipo de ocupação e requirements do código local.'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// EV CHARGING
// ──────────────────────────────────────────────────────────────────────────────
export function calcEVCharging(respostas: EstimadorRespostas): EstimadorResult {
  const level = String(respostas.level || 'level2-30a')
  const distance = Number(respostas.distance_from_panel || 30)
  const location = String(respostas.indoor_outdoor || 'garage-indoor')
  const panelCapacity = Boolean(respostas.panel_capacity)
  const chargerSupplied = Boolean(respostas.charger_supplied)

  const baseByLevel: Record<string, [number, number]> = {
    level1:       [150, 400],
    'level2-30a': [500, 900],
    'level2-50a': [700, 1400],
    dcfc:         [3000, 8000],
  }
  const [base_low, base_high] = baseByLevel[level] || baseByLevel['level2-30a']

  const distanceAdder = Math.max(0, (distance - 20)) * 8
  const outdoorAdder = location.includes('outdoor') ? 200 : 0
  const panelAdder = panelCapacity ? 0 : 800
  const chargerCost = chargerSupplied ? 0 : (level === 'level2-50a' ? 550 : level === 'level2-30a' ? 350 : 0)

  const low = base_low + distanceAdder + outdoorAdder + panelAdder
  const high = base_high + distanceAdder * 1.3 + outdoorAdder + panelAdder * 1.2 + chargerCost

  const mat = r((low + high) / 2 * 0.45)
  const mo = r((low + high) / 2 * 0.45)

  const levelLabel = { level1: '120V Level 1', 'level2-30a': '240V/30A Level 2', 'level2-50a': '240V/50A Level 2', dcfc: 'DC Fast Charge' }[level] || 'Level 2'

  return {
    tradeId: 'ev-charging',
    tradeLabel: 'EV Charging Point',
    escopoTexto: `Instalação de ponto de carregamento ${levelLabel} para veículo elétrico. Distância do painel: ~${distance}ft. Local: ${location}.${panelCapacity ? '' : ' Inclui upgrade de painel.'}${chargerSupplied ? ' Equipamento (EVSE) fornecido pelo cliente.' : ''}`,
    etapas: [
      { servico: 'Avaliação do painel elétrico', descricao: 'Verificação de capacidade disponível e definição do circuit dedicado necessário.', quantidade: 1, unidade: 'serviço', duracaoHoras: 1, custoMO: r(LABOR.electrician_master), status: 'planejada' },
      ...(!panelCapacity ? [{ servico: 'Adição de breaker dedicado', descricao: 'Instalação de breaker 2-pole no painel para o circuit do EV charger.', quantidade: 1, unidade: 'serviço', duracaoHoras: 2, custoMO: r(2 * LABOR.electrician_master), status: 'planejada' as const }] : []),
      { servico: 'Puxar cabo dedicado', descricao: `Instalação de cabo ${level === 'level2-50a' ? '6 AWG' : '10 AWG'} desde o painel até o ponto de instalação (~${distance}ft).`, quantidade: distance + 10, unidade: 'ft', duracaoHoras: Math.ceil(distance / 30) + 2, custoMO: r((Math.ceil(distance / 30) + 2) * LABOR.electrician_journeyman), status: 'planejada' },
      { servico: 'Instalação do EVSE', descricao: `Montagem e conexão do charger ${levelLabel}. Inclui outlet ou hardwire conforme modelo.`, quantidade: 1, unidade: 'serviço', duracaoHoras: 2, custoMO: r(2 * LABOR.electrician_journeyman), status: 'planejada' },
      { servico: 'Teste e comissionamento', descricao: 'Teste de carga, verificação de funcionamento completo e orientação ao cliente.', quantidade: 1, unidade: 'serviço', duracaoHoras: 1, custoMO: r(LABOR.electrician_master), status: 'planejada' },
    ],
    materiais: [
      { codigo: 'CABO-10AWG', nome: `Cabo NM-B ${level === 'level2-50a' ? '6/3' : '10/3'} AWG`, quantidade: distance + 15, unidade: 'ft', preco: level === 'level2-50a' ? 3.20 : 1.80, status: 'necessario' },
      { codigo: 'BREAKER-2P', nome: `Breaker 2-pole ${level === 'level2-50a' ? '50A' : '30A'}`, quantidade: 1, unidade: 'un', preco: level === 'level2-50a' ? 38 : 28, status: 'necessario' },
      ...(!chargerSupplied ? [{ codigo: 'EVSE', nome: `EVSE ${levelLabel}`, quantidade: 1, unidade: 'un', preco: chargerCost, status: 'necessario' as const }] : []),
      { codigo: 'JUNCTION-BOX', nome: 'Junction box + cover (outdoor rated)', quantidade: 1, unidade: 'un', preco: 22, status: 'necessario' },
    ],
    estimativaBaixa: r(low),
    estimativaAlta: r(high),
    estimativaMedia: r((low + high) / 2),
    custoMO: mo,
    custoMaterial: mat,
    fonte: 'internal',
    notas: ['Inclui circuit dedicado conforme NEC 625.', 'Level 2 (240V) recomendado para uso diário.'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PANEL UPGRADE
// ──────────────────────────────────────────────────────────────────────────────
export function calcPanelUpgrade(respostas: EstimadorRespostas): EstimadorResult {
  const fromAmp = String(respostas.from_amperage || '100a')
  const toAmp = String(respostas.to_amperage || '200a')
  const isMainService = Boolean(respostas.is_main_service)
  const subpanel = Boolean(respostas.subpanel)
  const grounding = Boolean(respostas.grounding)

  const baseCost: Record<string, [number, number]> = {
    '100a-to-200a':   [1400, 2800],
    '60a-to-200a':    [1800, 3500],
    '150a-to-200a':   [1200, 2400],
    '200a-to-400a':   [3800, 6500],
    '100a-to-400a':   [4500, 7500],
    default:          [1500, 3000],
  }
  const key = `${fromAmp}-to-${toAmp}`
  const [base_low, base_high] = baseCost[key] || baseCost.default

  let low = base_low
  let high = base_high
  if (isMainService) { low += 800; high += 1800 }
  if (subpanel) { low += 900; high += 1800 }
  if (grounding) { low += 250; high += 500 }

  const mat = r((low + high) / 2 * 0.40)
  const mo = r((low + high) / 2 * 0.50)

  return {
    tradeId: 'panel-upgrade',
    tradeLabel: 'Atualização de Painel',
    escopoTexto: `Upgrade do painel elétrico de ${fromAmp.toUpperCase()} para ${toAmp.toUpperCase()}.${isMainService ? ' Inclui substituição do serviço (meter socket, weatherhead/riser).' : ''}${subpanel ? ' Inclui instalação de subpainel.' : ''}${grounding ? ' Inclui sistema de aterramento (grounding rod + ground wire).' : ''} Inclui transferência de todos os circuits e labeling.`,
    etapas: [
      { servico: 'Remoção do painel antigo', descricao: `Desligamento do serviço e remoção segura do painel ${fromAmp.toUpperCase()} existente.`, quantidade: 1, unidade: 'serviço', duracaoHoras: 3, custoMO: r(3 * LABOR.electrician_master), status: 'planejada' },
      ...(isMainService ? [{ servico: 'Troca do serviço (meter socket / riser)', descricao: 'Substituição do meter socket, weatherhead, riser e conductor principal.', quantidade: 1, unidade: 'serviço', duracaoHoras: 6, custoMO: r(6 * LABOR.electrician_master), status: 'planejada' as const }] : []),
      { servico: `Instalação do painel ${toAmp.toUpperCase()}`, descricao: `Instalação do novo painel principal, transferência de todos os breakers e circuits.`, quantidade: 1, unidade: 'serviço', duracaoHoras: 8, custoMO: r(8 * LABOR.electrician_master), status: 'planejada' },
      ...(subpanel ? [{ servico: 'Instalação de subpainel', descricao: 'Instalação de subpainel e feeder cable do painel principal.', quantidade: 1, unidade: 'serviço', duracaoHoras: 5, custoMO: r(5 * LABOR.electrician_master), status: 'planejada' as const }] : []),
      ...(grounding ? [{ servico: 'Sistema de aterramento', descricao: 'Instalação de grounding rod, ground wire e conexão ao painel conforme NEC.', quantidade: 1, unidade: 'serviço', duracaoHoras: 3, custoMO: r(3 * LABOR.electrician_journeyman), status: 'planejada' as const }] : []),
      { servico: 'Inspeção e energização', descricao: 'Acompanhamento da inspeção pela cidade, re-energização e teste completo.', quantidade: 1, unidade: 'serviço', duracaoHoras: 4, custoMO: r(4 * LABOR.electrician_master), status: 'planejada' },
    ],
    materiais: [
      { codigo: 'PANEL-MAIN', nome: `Painel principal ${toAmp.toUpperCase()} (Square D / Eaton)`, quantidade: 1, unidade: 'un', preco: toAmp === '200a' ? 250 : toAmp === '400a' ? 750 : 180, status: 'necessario' },
      ...(isMainService ? [{ codigo: 'METER-SOCKET', nome: `Meter socket + base ${toAmp.toUpperCase()}`, quantidade: 1, unidade: 'un', preco: 180, status: 'necessario' as const }] : []),
      { codigo: 'CONDUCTOR-MAIN', nome: 'Conductor principal (Al SER)', quantidade: 25, unidade: 'ft', preco: toAmp === '400a' ? 12 : 6, status: 'necessario' },
      ...(grounding ? [{ codigo: 'GROUND-ROD', nome: 'Grounding rod 5/8" × 8ft + clamp', quantidade: 2, unidade: 'un', preco: 28, status: 'necessario' as const }] : []),
      { codigo: 'WIRE-LABELS', nome: 'Circuit labels + directory', quantidade: 1, unidade: 'kit', preco: 15, status: 'necessario' },
    ],
    estimativaBaixa: r(low),
    estimativaAlta: r(high),
    estimativaMedia: r((low + high) / 2),
    custoMO: mo,
    custoMaterial: mat,
    fonte: 'internal',
    notas: ['Inclui permit elétrico e inspeção (recomendado em Dallas/Frisco/Allen).', 'Preço pode variar se o meter for da ONCOR (utilidade).'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// SERVICE INSTALLATION
// ──────────────────────────────────────────────────────────────────────────────
export function calcServiceInstallation(respostas: EstimadorRespostas): EstimadorResult {
  const amperage = String(respostas.amperage || '200a')
  const meterType = String(respostas.meter_type || 'overhead')
  const newConstruction = Boolean(respostas.new_construction)
  const distanceToPole = Number(respostas.distance_to_pole || 50)

  const baseMap: Record<string, [number, number]> = {
    '100a': [2000, 3800],
    '200a': [2800, 5200],
    '400a': [5500, 9500],
  }
  const [base_low, base_high] = baseMap[amperage] || baseMap['200a']

  let low = base_low
  let high = base_high
  if (meterType === 'underground') { low += 1200; high += 2800 }
  if (newConstruction) { low += 500; high += 1200 }
  if (meterType === 'overhead' && distanceToPole > 50) {
    const extra = (distanceToPole - 50) * 10
    low += extra; high += extra * 1.4
  }

  const mat = r((low + high) / 2 * 0.45)
  const mo = r((low + high) / 2 * 0.45)

  return {
    tradeId: 'service-installation',
    tradeLabel: 'Service Installation',
    escopoTexto: `Instalação completa do serviço elétrico ${amperage.toUpperCase()} — meter socket, painel principal e toda estrutura pronta para conexão da concessionária (${meterType === 'overhead' ? 'serviço aéreo' : 'serviço subterrâneo'}).${newConstruction ? ' Construção nova.' : ''}`,
    etapas: [
      { servico: 'Instalação do meter socket', descricao: `Montagem do meter socket ${amperage.toUpperCase()} e base conforme specs da ONCOR.`, quantidade: 1, unidade: 'serviço', duracaoHoras: 4, custoMO: r(4 * LABOR.electrician_master), status: 'planejada' },
      { servico: meterType === 'overhead' ? 'Instalação do weatherhead e riser' : 'Instalação do conduit subterrâneo', descricao: meterType === 'overhead' ? 'Weatherhead, riser pipe e conductor de entrada.' : `Escavação e instalação de conduit subterrâneo (~${distanceToPole}ft).`, quantidade: 1, unidade: 'serviço', duracaoHoras: 6, custoMO: r(6 * LABOR.electrician_master), status: 'planejada' },
      { servico: `Instalação do painel principal ${amperage.toUpperCase()}`, descricao: 'Painel, breakers principais e feeder cables.', quantidade: 1, unidade: 'serviço', duracaoHoras: 8, custoMO: r(8 * LABOR.electrician_master), status: 'planejada' },
      { servico: 'Sistema de aterramento completo', descricao: 'Grounding rods, ground wire, bonding conforme NEC 250.', quantidade: 1, unidade: 'serviço', duracaoHoras: 3, custoMO: r(3 * LABOR.electrician_journeyman), status: 'planejada' },
      { servico: 'Permit + inspeção + release para a concessionária', descricao: 'Obtição de permit, inspeção da cidade e submission para ONCOR conectar o serviço.', quantidade: 1, unidade: 'serviço', duracaoHoras: 4, custoMO: r(4 * LABOR.electrician_master), status: 'planejada' },
    ],
    materiais: [
      { codigo: 'METER-BASE', nome: `Meter socket base + enclosure ${amperage.toUpperCase()}`, quantidade: 1, unidade: 'un', preco: amperage === '400a' ? 380 : 220, status: 'necessario' },
      { codigo: 'PANEL-MAIN', nome: `Painel principal ${amperage.toUpperCase()}`, quantidade: 1, unidade: 'un', preco: amperage === '400a' ? 750 : 280, status: 'necessario' },
      { codigo: 'SER-CABLE', nome: 'SER service entrance cable', quantidade: 20, unidade: 'ft', preco: amperage === '400a' ? 15 : 8, status: 'necessario' },
      ...(meterType === 'overhead' ? [{ codigo: 'WEATHERHEAD', nome: 'Weatherhead + mast (2" rigid conduit)', quantidade: 1, unidade: 'un', preco: 85, status: 'necessario' as const }] : [{ codigo: 'CONDUIT-PVC', nome: 'Conduit PVC schedule 80 (underground)', quantidade: distanceToPole + 10, unidade: 'ft', preco: 3.20, status: 'necessario' as const }]),
      { codigo: 'GROUND-ROD', nome: 'Grounding rods + clamps', quantidade: 2, unidade: 'set', preco: 55, status: 'necessario' },
    ],
    estimativaBaixa: r(low),
    estimativaAlta: r(high),
    estimativaMedia: r((low + high) / 2),
    custoMO: mo,
    custoMaterial: mat,
    fonte: 'internal',
    notas: ['Inclui permit + release para ONCOR.', 'Timeline: 2–4 semanas (inclui agendamento com a concessionária).'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// LIGHT INSTALLATION
// ──────────────────────────────────────────────────────────────────────────────
export function calcLightInstallation(respostas: EstimadorRespostas): EstimadorResult {
  const lightType = String(respostas.light_type || 'recessed')
  const quantity = Number(respostas.quantity || 6)
  const newWiring = Boolean(respostas.new_wiring)
  const drywallRepair = Boolean(respostas.drywall_repair)
  const fixturesSupplied = Boolean(respostas.fixtures_supplied)

  const costPerUnit: Record<string, [number, number]> = {
    recessed:       [85, 160],
    'ceiling-fan':  [180, 350],
    pendant:        [150, 350],
    'under-cabinet': [35, 75],
    mixed:          [120, 220],
  }
  const [unit_low, unit_high] = costPerUnit[lightType] || costPerUnit.mixed

  let low = unit_low * quantity
  let high = unit_high * quantity

  if (newWiring) { low += quantity * 60; high += quantity * 120 }
  if (drywallRepair) { low += quantity * 35; high += quantity * 75 }

  const fixtureUnitCost: Record<string, number> = { recessed: 25, 'ceiling-fan': 120, pendant: 200, 'under-cabinet': 45, mixed: 80 }
  const fixtureTotalCost = fixturesSupplied ? 0 : quantity * fixtureUnitCost[lightType]
  if (!fixturesSupplied) { low += fixtureTotalCost * 0.6; high += fixtureTotalCost * 1.2 }

  const mat = r((low + high) / 2 * 0.35)
  const mo = r((low + high) / 2 * 0.55)

  const typeLabel: Record<string, string> = { recessed: 'Recessed lights (can lights)', 'ceiling-fan': 'Ceiling fans', pendant: 'Pendant/chandelier', 'under-cabinet': 'Under cabinet LED strips', mixed: 'Misto de luminárias' }

  return {
    tradeId: 'light-installation',
    tradeLabel: 'Instalação de Luzes',
    escopoTexto: `Instalação de ${quantity} ${typeLabel[lightType] || 'luminárias'}.${newWiring ? ' Inclui fiação nova (circuit).' : ' Usa circuits existentes.'}${drywallRepair ? ' Inclui reparo de drywall.' : ''}${fixturesSupplied ? ' Luminárias fornecidas pelo cliente.' : ''}`,
    etapas: [
      ...(newWiring ? [{ servico: 'Puxar fiação e circuits', descricao: 'Instalação de fiação 14/12 AWG desde o circuit breaker até os pontos.', quantidade: quantity, unidade: 'pontos', duracaoHoras: Math.ceil(quantity * 0.8), custoMO: r(Math.ceil(quantity * 0.8) * LABOR.electrician_journeyman), status: 'planejada' as const }] : []),
      { servico: `Instalação das ${typeLabel[lightType] || 'luminárias'}`, descricao: `Fixação, conexão e teste de ${quantity} ${typeLabel[lightType] || 'luminárias'}.`, quantidade: quantity, unidade: 'un', duracaoHoras: Math.ceil(quantity * 0.5), custoMO: r(Math.ceil(quantity * 0.5) * LABOR.electrician_journeyman), status: 'planejada' },
      ...(drywallRepair ? [{ servico: 'Reparo de drywall', descricao: 'Patching e finishing do drywall nos pontos de instalação.', quantidade: quantity, unidade: 'pontos', duracaoHoras: Math.ceil(quantity * 0.3), custoMO: r(Math.ceil(quantity * 0.3) * LABOR.remodel_crew), status: 'planejada' as const }] : []),
      { servico: 'Teste e ajuste final', descricao: 'Teste de funcionamento de todas as luminárias, ajuste de dimmer se aplicável.', quantidade: 1, unidade: 'serviço', duracaoHoras: 1, custoMO: r(LABOR.electrician_journeyman), status: 'planejada' },
    ],
    materiais: [
      ...(!fixturesSupplied ? [{ codigo: 'FIXTURE', nome: `${typeLabel[lightType] || 'Luminária'} (unidade)`, quantidade: quantity, unidade: 'un', preco: fixtureUnitCost[lightType] || 80, status: 'necessario' as const }] : []),
      ...(newWiring ? [{ codigo: 'CABO-14AWG', nome: 'Cabo NM-B 14/2 AWG', quantidade: quantity * 20, unidade: 'ft', preco: 0.45, status: 'necessario' as const }] : []),
      { codigo: 'WIRE-NUTS', nome: 'Wire nuts + electrical tape', quantidade: Math.ceil(quantity / 3), unidade: 'bag', preco: 5, status: 'necessario' },
      ...(drywallRepair ? [{ codigo: 'DRYWALL-PATCH', nome: 'Drywall patch compound + tape', quantidade: 1, unidade: 'kit', preco: 25, status: 'necessario' as const }] : []),
    ],
    estimativaBaixa: r(low),
    estimativaAlta: r(high),
    estimativaMedia: r((low + high) / 2),
    custoMO: mo,
    custoMaterial: mat,
    fonte: 'internal',
    notas: ['Preço de mão de obra por ponto varia com altura do teto e acessibilidade.'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// BATHROOM REMODEL
// ──────────────────────────────────────────────────────────────────────────────
export function calcBathroomRemodel(respostas: EstimadorRespostas): EstimadorResult {
  const scope = String(respostas.scope || 'full')
  const bathSize = String(respostas.bath_size || 'standard')
  const movePlumbing = Boolean(respostas.move_plumbing)
  const tileType = String(respostas.tile_type || 'mid-range')
  const glassShower = Boolean(respostas.glass_shower)
  const vanity = Boolean(respostas.vanity)
  const electrical = Boolean(respostas.electrical)

  const scopeBase: Record<string, Record<string, [number, number]>> = {
    cosmetic:      { 'half-bath': [1500, 3000], standard: [2500, 5000], master: [3500, 7000], large: [5000, 9000] },
    partial:       { 'half-bath': [3000, 6000], standard: [6000, 12000], master: [9000, 18000], large: [12000, 22000] },
    full:          { 'half-bath': [5000, 10000], standard: [9500, 18000], master: [15000, 28000], large: [20000, 38000] },
    'tub-to-shower': { standard: [7500, 14000], master: [10000, 18000], large: [12000, 22000], 'half-bath': [6000, 11000] },
  }

  const [base_low, base_high] = (scopeBase[scope]?.[bathSize]) || [9500, 18000]
  const tileAdder: Record<string, number> = { standard: 0, 'mid-range': 800, premium: 2500 }
  let low = base_low + (tileAdder[tileType] || 0)
  let high = base_high + (tileAdder[tileType] || 0) * 1.5
  if (movePlumbing) { low += 2000; high += 4000 }
  if (glassShower) { low += 1200; high += 3200 }
  if (vanity) { low += 800; high += 2500 }
  if (electrical) { low += 600; high += 1500 }

  const mat = r((low + high) / 2 * 0.40)
  const mo = r((low + high) / 2 * 0.50)

  const scopeLabel = { cosmetic: 'Cosmética', partial: 'Parcial', full: 'Completa', 'tub-to-shower': 'Tub to Shower' }[scope] || 'Completa'

  return {
    tradeId: 'bathroom-remodel',
    tradeLabel: 'Reforma de Banheiro',
    escopoTexto: `Reforma ${scopeLabel} de banheiro (${bathSize === 'half-bath' ? 'half bath' : bathSize === 'master' ? 'master bath' : bathSize === 'large' ? 'grande' : 'padrão'}).${movePlumbing ? ' Inclui mudança de posição da plumbing (drain + supply).' : ''}${glassShower ? ' Inclui porta de vidro frameless.' : ''}${vanity ? ' Inclui novo vanity/gabinete.' : ''}${electrical ? ' Inclui elétrica (GFCI, exaustor, luzes).' : ''}`,
    etapas: [
      { servico: 'Demolição completa', descricao: 'Remoção de tile, drywall (onde necessário), fixtures e tub/shower existente. Descarte incluso.', quantidade: 1, unidade: 'serviço', duracaoHoras: 8, custoMO: r(8 * LABOR.remodel_crew), status: 'planejada' },
      ...(movePlumbing ? [
        { servico: 'Mudança de posição da plumbing', descricao: 'Reposicionamento do drain e supply lines conforme novo layout.', quantidade: 1, unidade: 'serviço', duracaoHoras: 12, custoMO: r(12 * LABOR.plumber_master), status: 'planejada' as const },
        { servico: 'Shower pan e flood test', descricao: 'Instalação do shower pan (mortar bed ou prefab), flood test por 24h.', quantidade: 1, unidade: 'serviço', duracaoHoras: 8, custoMO: r(8 * LABOR.plumber_journeyman), status: 'planejada' as const },
      ] : [
        { servico: 'Instalação do shower pan', descricao: 'Shower pan (mortar bed ou prefab) + flood test.', quantidade: 1, unidade: 'serviço', duracaoHoras: 6, custoMO: r(6 * LABOR.plumber_journeyman), status: 'planejada' as const },
      ]),
      { servico: 'Impermeabilização (RedGard)', descricao: 'Aplicação de membrana impermeabilizante RedGard nas paredes e piso da shower.', quantidade: 1, unidade: 'serviço', duracaoHoras: 4, custoMO: r(4 * LABOR.remodel_crew), status: 'planejada' },
      { servico: 'Instalação de Sheetrock / Hardiback', descricao: 'Instalação de cement board (shower) e sheetrock moisture-resistant (áreas secas).', quantidade: 1, unidade: 'serviço', duracaoHoras: 6, custoMO: r(6 * LABOR.remodel_crew), status: 'planejada' },
      { servico: 'Assentamento de tile — paredes', descricao: `Tile ${tileType === 'premium' ? 'premium (large format)' : 'porcelain/ceramic'} nas paredes da shower e banheiro.`, quantidade: 1, unidade: 'serviço', duracaoHoras: 16, custoMO: r(16 * LABOR.remodel_crew), status: 'planejada' },
      { servico: 'Assentamento de tile — piso', descricao: 'Tile de piso, grouting e rejunte.', quantidade: 1, unidade: 'serviço', duracaoHoras: 8, custoMO: r(8 * LABOR.remodel_crew), status: 'planejada' },
      ...(vanity ? [{ servico: 'Instalação de vanity', descricao: 'Montagem e instalação do gabinete, countertop e faucet.', quantidade: 1, unidade: 'serviço', duracaoHoras: 6, custoMO: r(6 * LABOR.remodel_crew), status: 'planejada' as const }] : []),
      { servico: 'Instalação de fixtures', descricao: 'Faucet, shower valve, toilet, mirror, accessories, towel bars.', quantidade: 1, unidade: 'serviço', duracaoHoras: 6, custoMO: r(6 * LABOR.plumber_journeyman), status: 'planejada' },
      ...(glassShower ? [{ servico: 'Instalação de porta de vidro', descricao: 'Porta frameless ou semi-frameless + hardware.', quantidade: 1, unidade: 'serviço', duracaoHoras: 4, custoMO: r(4 * LABOR.remodel_crew), status: 'planejada' as const }] : []),
      ...(electrical ? [{ servico: 'Elétrica do banheiro', descricao: 'GFCI, exaustor, luzes (recessed + vanity light), dimmer.', quantidade: 1, unidade: 'serviço', duracaoHoras: 6, custoMO: r(6 * LABOR.electrician_journeyman), status: 'planejada' as const }] : []),
      { servico: 'Pintura e acabamentos finais', descricao: 'Pintura das paredes, silicone nas juntas, limpeza final.', quantidade: 1, unidade: 'serviço', duracaoHoras: 6, custoMO: r(6 * LABOR.remodel_crew), status: 'planejada' },
    ],
    materiais: [
      { codigo: 'TILE-WALL', nome: `Tile parede ${tileType} (per sqft)`, quantidade: bathSize === 'master' ? 120 : bathSize === 'large' ? 160 : bathSize === 'half-bath' ? 40 : 80, unidade: 'sqft', preco: tileType === 'premium' ? 8.50 : tileType === 'mid-range' ? 4.50 : 2.80, status: 'necessario' },
      { codigo: 'TILE-FLOOR', nome: 'Tile piso (anti-slip)', quantidade: bathSize === 'master' ? 80 : bathSize === 'large' ? 110 : bathSize === 'half-bath' ? 30 : 55, unidade: 'sqft', preco: tileType === 'premium' ? 7.00 : 3.50, status: 'necessario' },
      { codigo: 'HARDIBACK', nome: 'Cement board 1/2" (Hardiback)', quantidade: bathSize === 'master' ? 8 : 5, unidade: 'sheet', preco: 18, status: 'necessario' },
      { codigo: 'REDGARD', nome: 'RedGard waterproofing membrane (1gal)', quantidade: 2, unidade: 'gal', preco: 55, status: 'necessario' },
      { codigo: 'SHOWER-PAN', nome: 'Shower pan / mortar mix', quantidade: 1, unidade: 'kit', preco: 180, status: 'necessario' },
      { codigo: 'GROUT', nome: 'Grout + tile adhesive (box)', quantidade: Math.ceil((bathSize === 'master' ? 200 : 135) / 50), unidade: 'box', preco: 42, status: 'necessario' },
      ...(vanity ? [{ codigo: 'VANITY', nome: `Vanity ${tileType === 'premium' ? '36" custom' : '30" stock'} + countertop`, quantidade: 1, unidade: 'un', preco: tileType === 'premium' ? 1200 : 450, status: 'necessario' as const }] : []),
      ...(glassShower ? [{ codigo: 'GLASS-DOOR', nome: 'Porta shower vidro frameless 3/8"', quantidade: 1, unidade: 'un', preco: 900, status: 'necessario' as const }] : []),
      { codigo: 'FIXTURE-SET', nome: 'Fixtures set (faucet, shower, toilet, accessories)', quantidade: 1, unidade: 'set', preco: 650, status: 'necessario' },
    ],
    estimativaBaixa: r(low),
    estimativaAlta: r(high),
    estimativaMedia: r((low + high) / 2),
    custoMO: mo,
    custoMaterial: mat,
    fonte: 'internal',
    notas: ['Dallas TX 2025. Reforma completa inclui permit de plumbing.', 'Glassdoor frameless pode variar com tamanho exato da abertura.', 'Tile premium aumenta significativamente o custo de mão de obra.'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// WATER HEATER (TANK)
// ──────────────────────────────────────────────────────────────────────────────
export function calcWaterHeaterTank(respostas: EstimadorRespostas): EstimadorResult {
  const capacity = String(respostas.capacity || '40gal')
  const fuelType = String(respostas.fuel_type || 'gas')
  const replacement = Boolean(respostas.replacement)
  const disposal = Boolean(respostas.disposal)
  const codeUpgrade = Boolean(respostas.code_upgrade)

  const baseCost: Record<string, Record<string, [number, number]>> = {
    gas:      { '30gal': [700, 1100], '40gal': [850, 1400], '50gal': [1000, 1700], '75gal+': [1400, 2400] },
    electric: { '30gal': [600, 950], '40gal': [750, 1200], '50gal': [900, 1500], '75gal+': [1200, 2100] },
    propane:  { '30gal': [750, 1200], '40gal': [900, 1500], '50gal': [1050, 1800], '75gal+': [1500, 2600] },
  }
  let [low, high] = (baseCost[fuelType]?.[capacity]) || [850, 1400]
  if (disposal) { low += 80; high += 150 }
  if (codeUpgrade) { low += 200; high += 450 }

  const mat = r((low + high) / 2 * 0.55)
  const mo = r((low + high) / 2 * 0.35)

  return {
    tradeId: 'water-heater-tank',
    tradeLabel: 'Water Heater (Tank)',
    escopoTexto: `${replacement ? 'Substituição' : 'Nova instalação'} de water heater a tanque — ${capacity} ${fuelType === 'gas' ? 'a gás natural' : fuelType === 'electric' ? 'elétrico' : 'a propane'}.${disposal ? ' Inclui descarte do equipamento antigo.' : ''}${codeUpgrade ? ' Inclui upgrades de code (expansion tank, T&P valve, drip pan).' : ''}`,
    etapas: [
      ...(replacement ? [{ servico: 'Remoção e descarte do equipamento antigo', descricao: 'Desconexão e remoção do water heater existente.', quantidade: 1, unidade: 'serviço', duracaoHoras: 1, custoMO: r(LABOR.plumber_journeyman), status: 'planejada' as const }] : []),
      { servico: 'Instalação do water heater', descricao: `Conexão ${fuelType === 'gas' ? 'da linha de gás e' : fuelType === 'electric' ? 'do circuit elétrico e' : 'do propane e'} das linhas de água quente/fria.`, quantidade: 1, unidade: 'serviço', duracaoHoras: 3, custoMO: r(3 * LABOR.plumber_master), status: 'planejada' },
      ...(codeUpgrade ? [{ servico: 'Code upgrades', descricao: 'Instalação de expansion tank, T&P valve, drip pan e flex connectors conforme código.', quantidade: 1, unidade: 'serviço', duracaoHoras: 2, custoMO: r(2 * LABOR.plumber_journeyman), status: 'planejada' as const }] : []),
      { servico: 'Teste e comissionamento', descricao: 'Teste de pressão, temperatura e verificação de vazamentos.', quantidade: 1, unidade: 'serviço', duracaoHoras: 1, custoMO: r(LABOR.plumber_master), status: 'planejada' },
    ],
    materiais: [
      { codigo: 'WH-TANK', nome: `Water heater ${capacity} ${fuelType} (Rheem / AO Smith)`, quantidade: 1, unidade: 'un', preco: mat * 0.7, status: 'necessario' },
      ...(codeUpgrade ? [{ codigo: 'EXPANSION-TANK', nome: 'Expansion tank (Watts)', quantidade: 1, unidade: 'un', preco: 55, status: 'necessario' as const }] : []),
      { codigo: 'FLEX-CONN', nome: 'Flex connectors (water + gas)', quantidade: 2, unidade: 'set', preco: 22, status: 'necessario' },
      ...(codeUpgrade ? [{ codigo: 'DRIP-PAN', nome: 'Drip pan + drain line', quantidade: 1, unidade: 'un', preco: 28, status: 'necessario' as const }] : []),
    ],
    estimativaBaixa: r(low),
    estimativaAlta: r(high),
    estimativaMedia: r((low + high) / 2),
    custoMO: mo,
    custoMaterial: mat,
    fonte: 'internal',
    notas: ['Dallas TX 2025. Inclui labor + unidade.', 'Rheem ou AO Smith recomendados pela confiabilidade e disponibilidade de peças em Dallas.'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// TANKLESS WATER HEATER
// ──────────────────────────────────────────────────────────────────────────────
export function calcTankless(respostas: EstimadorRespostas): EstimadorResult {
  const fuelType    = String(respostas.fuel_type     || 'gas')
  const replacingTank = Boolean(respostas.replacing_tank)
  const tanksQty    = Math.max(1, Number(respostas.tanks_quantity || 1))  // how many tanks being removed
  const gasLineUpgrade    = Boolean(respostas.gas_line_upgrade)
  const electricalUpgrade = Boolean(respostas.electrical_upgrade)
  const venting     = String(respostas.venting || 'direct-vent')
  const bypassReconfig    = Boolean(respostas.bypass_reconfig)
  const addSedimentFilter = Boolean(respostas.sediment_filter)

  // Equipment prices — Dallas TX 2025 (contractor cost + 15% markup)
  // Navien NPE-240A2 (11 GPM gas) wholesale ~$1,400 + markup = $1,590
  const equipmentPrice: Record<string, number> = {
    gas:      1590,  // Navien/Rinnai 9–11 GPM gas (most common in Dallas)
    electric:  950,  // Electric tankless 27–36 kW
    propane:  1690,  // Propane 11 GPM (same unit, different valve)
  }
  const equipPrice = equipmentPrice[fuelType] ?? 1590

  // Base labor: 6h master plumber (mount, connect water, gas/electric, test)
  const laborHours = 6
  let laborCost  = laborHours * LABOR.plumber_master

  // Misc materials: flex connectors, shutoff valves, misc fittings
  let miscMat = 185

  // Permit (Dallas): $175–225
  const permitCost = 200

  // Add-ons
  let addLow = 0
  let addHigh = 0

  if (replacingTank) {
    const extra = tanksQty - 1  // extra tanks beyond the first
    laborCost += tanksQty * LABOR.plumber_journeyman          // 1h/tank for removal
    addLow  += tanksQty * 100
    addHigh += tanksQty * 200
    if (extra > 0) {
      addLow  += extra * 200   // bypass reconfiguration becomes more complex
      addHigh += extra * 400
    }
  }

  if (bypassReconfig) {
    // Re-piping bypass when removing tandem tank setup
    laborCost += 3 * LABOR.plumber_master
    miscMat   += 120  // tee fittings, copper/PEX
    addLow  += 400
    addHigh += 700
  }

  if (gasLineUpgrade) {
    laborCost += 4 * LABOR.plumber_master
    addLow  += 350
    addHigh += 800
  }

  if (electricalUpgrade) {
    laborCost += 4 * LABOR.electrician_journeyman
    addLow  += 450
    addHigh += 900
  }

  if (fuelType === 'gas' && venting === 'direct-vent') {
    miscMat += 280  // SS vent pipe + termination cap
    addLow  += 250
    addHigh += 500
  }

  if (addSedimentFilter) {
    // Whole-house 10" sediment filter + isolation valves + 1.5h labor
    laborCost += 1.5 * LABOR.plumber_master
    miscMat   += 130  // filter housing + element + valves
    addLow  += 350
    addHigh += 650
  }

  const baseCost = equipPrice + laborCost + miscMat + permitCost
  const low  = r(baseCost + addLow  * 0.6)
  const high = r(baseCost + addHigh)
  const med  = r((low + high) / 2)
  const mo   = r(laborCost)
  const mat  = r(equipPrice + miscMat)

  const scopeParts = [
    `Instalação de water heater tankless ${fuelType === 'gas' ? 'a gás natural' : fuelType === 'electric' ? 'elétrico' : 'a propane'} (Navien / Rinnai).`,
    replacingTank ? `Remoção de ${tanksQty} tanque${tanksQty > 1 ? 's' : ''} existente${tanksQty > 1 ? 's' : ''}.` : '',
    bypassReconfig ? 'Reconfiguração do bypass (re-pipe das linhas de água).' : '',
    gasLineUpgrade ? 'Upgrade da linha de gás (diâmetro maior para suportar BTU do tankless).' : '',
    electricalUpgrade ? 'Instalação de circuit elétrico dedicado 240V/50A+.' : '',
    fuelType === 'gas' ? `Ventilação: ${venting === 'direct-vent' ? 'direct vent pelo exterior' : venting}.` : '',
    addSedimentFilter ? 'Instalação de filtro de sedimento whole-house na linha de entrada.' : '',
  ].filter(Boolean).join(' ')

  return {
    tradeId: 'tankless-water-heater',
    tradeLabel: 'Tankless Water Heater',
    escopoTexto: scopeParts,
    etapas: [
      ...(replacingTank ? [{
        servico: `Remoção de ${tanksQty} water heater${tanksQty > 1 ? 's' : ''} a tanque`,
        descricao: `Desconexão das linhas de água, gás e ventilação. Remoção e descarte ${tanksQty > 1 ? 'dos tanques' : 'do tanque'}.`,
        quantidade: tanksQty, unidade: 'un', duracaoHoras: tanksQty,
        custoMO: r(tanksQty * LABOR.plumber_journeyman), status: 'planejada' as const,
      }] : []),
      ...(bypassReconfig ? [{
        servico: 'Reconfiguração do bypass',
        descricao: 'Re-pipe das linhas de abastecimento para eliminar o sistema bypass de múltiplos tanques.',
        quantidade: 1, unidade: 'serviço', duracaoHoras: 3,
        custoMO: r(3 * LABOR.plumber_master), status: 'planejada' as const,
      }] : []),
      ...(gasLineUpgrade ? [{
        servico: 'Upgrade da linha de gás',
        descricao: 'Substituição da linha de gás por diâmetro maior (3/4" → 1") para suportar o BTU requerido pelo tankless.',
        quantidade: 1, unidade: 'serviço', duracaoHoras: 4,
        custoMO: r(4 * LABOR.plumber_master), status: 'planejada' as const,
      }] : []),
      ...(electricalUpgrade ? [{
        servico: 'Circuit elétrico dedicado',
        descricao: 'Instalação de circuit 240V/50A+ dedicado para o tankless elétrico.',
        quantidade: 1, unidade: 'serviço', duracaoHoras: 4,
        custoMO: r(4 * LABOR.electrician_journeyman), status: 'planejada' as const,
      }] : []),
      {
        servico: 'Instalação do tankless water heater',
        descricao: `Montagem na parede, conexão das linhas de água, ${fuelType === 'gas' ? 'linha de gás' : 'circuit elétrico'} e ${fuelType === 'gas' ? 'sistema de ventilação' : 'proteção térmica'}.`,
        quantidade: 1, unidade: 'serviço', duracaoHoras: 5,
        custoMO: r(5 * LABOR.plumber_master), status: 'planejada',
      },
      ...(addSedimentFilter ? [{
        servico: 'Instalação do filtro de sedimento',
        descricao: 'Instalação de filtro whole-house 10" na linha de entrada principal, antes do tankless. Inclui válvulas de isolamento.',
        quantidade: 1, unidade: 'serviço', duracaoHoras: 2,
        custoMO: r(2 * LABOR.plumber_master), status: 'planejada' as const,
      }] : []),
      {
        servico: 'Teste e comissionamento',
        descricao: 'Teste de funcionamento, verificação de pressão, ajuste de temperatura (120°F), purge do ar e orientação ao cliente.',
        quantidade: 1, unidade: 'serviço', duracaoHoras: 1,
        custoMO: r(LABOR.plumber_master), status: 'planejada',
      },
    ],
    materiais: [
      {
        codigo: 'TANKLESS-UNIT',
        nome: `Tankless water heater ${fuelType === 'gas' ? 'gás natural' : fuelType === 'electric' ? 'elétrico' : 'propane'} (Navien / Rinnai)`,
        quantidade: 1, unidade: 'un', preco: equipPrice, status: 'necessario',
        obs: fuelType === 'gas' ? 'Navien NPE-240A2 ou Rinnai RUC98iN — confirmar GPM com cliente' : undefined,
      },
      ...(fuelType === 'gas' && venting === 'direct-vent' ? [{
        codigo: 'VENT-KIT', nome: 'Direct vent kit (SS pipe + elbow + termination cap)',
        quantidade: 1, unidade: 'kit', preco: 280, status: 'necessario' as const,
      }] : []),
      ...(gasLineUpgrade ? [{
        codigo: 'GAS-PIPE-3-4',
        nome: 'Black iron pipe 3/4" + fittings (gas line upgrade)',
        quantidade: 25, unidade: 'ft', preco: 5.50, status: 'necessario' as const,
      }] : []),
      ...(addSedimentFilter ? [{
        codigo: 'SEDIMENT-FILTER',
        nome: 'Filtro sedimento whole-house 10" housing + cartucho 5 micron',
        quantidade: 1, unidade: 'kit', preco: 95, status: 'necessario' as const,
        obs: 'Pentek ou equiv. — inclui suporte de parede e wrench',
      }] : []),
      { codigo: 'FLEX-CONN', nome: 'Flex connectors água (hot + cold)', quantidade: 2, unidade: 'set', preco: 28, status: 'necessario' },
      { codigo: 'SHUTOFF-VALVES', nome: 'Shutoff valves (hot + cold + gás)', quantidade: 3, unidade: 'un', preco: 22, status: 'necessario' },
      { codigo: 'MISC-FITTINGS', nome: 'Fittings, thread seal, misc consumíveis', quantidade: 1, unidade: 'lote', preco: 45, status: 'necessario' },
    ],
    estimativaBaixa: low,
    estimativaAlta: high,
    estimativaMedia: med,
    custoMO: mo,
    custoMaterial: mat,
    fonte: 'internal',
    notas: [
      'Navien e Rinnai são as marcas mais confiáveis para gás em Dallas TX.',
      tanksQty > 1 ? `Remoção de ${tanksQty} tanques + reconfiguração do bypass incluídos.` : '',
      gasLineUpgrade ? 'Upgrade da linha de gás é necessário para tankless de alta BTU (199k+ BTU).' : '',
      addSedimentFilter ? 'Filtro de sedimento protege o tankless de detritos e prolonga a vida útil.' : '',
      'Permit elétrico/gás incluído no estimado.',
    ].filter(Boolean),
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// MOVE PLUMBING
// ──────────────────────────────────────────────────────────────────────────────
export function calcMovePlumbing(respostas: EstimadorRespostas): EstimadorResult {
  const whatToMove = String(respostas.what_to_move || 'both')
  const distance = Number(respostas.distance || 24)
  const floorType = String(respostas.floor_type || 'slab')
  const restoreFloor = Boolean(respostas.restore_floor)

  const baseByFloor: Record<string, [number, number]> = {
    slab:         [2500, 5000],
    'wood-frame': [1200, 2800],
    'second-floor': [1500, 3200],
  }
  let [low, high] = baseByFloor[floorType] || baseByFloor.slab

  const multiplierByScope: Record<string, number> = {
    'drain-only': 0.7,
    'supply-only': 0.55,
    both: 1.0,
  }
  const m = multiplierByScope[whatToMove] || 1.0
  low *= m; high *= m

  // Distance scaling (beyond 12")
  if (distance > 12) {
    const extra = (distance - 12) * 50
    low += extra; high += extra * 1.5
  }
  if (restoreFloor) {
    const restoreCost = floorType === 'slab' ? 1500 : 600
    low += restoreCost; high += restoreCost * 1.5
  }

  const mat = r((low + high) / 2 * 0.30)
  const mo = r((low + high) / 2 * 0.60)

  const floorLabel = { slab: 'concreto (slab)', 'wood-frame': 'assoalho de madeira', 'second-floor': '2º andar' }[floorType] || 'slab'

  return {
    tradeId: 'move-plumbing',
    tradeLabel: 'Mover Drenagem/Linhas de Água',
    escopoTexto: `Reposicionamento de ${whatToMove === 'both' ? 'drain + supply lines' : whatToMove === 'drain-only' ? 'drenagem (drain)' : 'linhas de abastecimento (supply)'} — deslocamento de ~${distance}". Piso: ${floorLabel}.${restoreFloor ? ' Inclui restauração do piso/teto.' : ''}`,
    etapas: [
      ...(floorType === 'slab' ? [{ servico: 'Corte e quebra do concreto (slab)', descricao: 'Corte com disco diamantado e remoção do concreto para acesso à plumbing.', quantidade: 1, unidade: 'serviço', duracaoHoras: 6, custoMO: r(6 * LABOR.plumber_master), status: 'planejada' as const }] : [{ servico: 'Abertura do piso/teto', descricao: 'Remoção de assoalho ou abertura do teto para acesso à plumbing.', quantidade: 1, unidade: 'serviço', duracaoHoras: 3, custoMO: r(3 * LABOR.remodel_crew), status: 'planejada' as const }]),
      ...(whatToMove !== 'supply-only' ? [{ servico: 'Relocação do drain', descricao: `Corte e reposicionamento do drain ${distance}" do ponto atual. Novo conexão ao main drain.`, quantidade: 1, unidade: 'serviço', duracaoHoras: 8, custoMO: r(8 * LABOR.plumber_master), status: 'planejada' as const }] : []),
      ...(whatToMove !== 'drain-only' ? [{ servico: 'Relocação das supply lines', descricao: `Novo routing das linhas de água quente/fria para o novo ponto.`, quantidade: 1, unidade: 'serviço', duracaoHoras: 5, custoMO: r(5 * LABOR.plumber_journeyman), status: 'planejada' as const }] : []),
      { servico: 'Teste de pressão e vazamentos', descricao: 'Pressure test em todas as conexões novas antes de fechar.', quantidade: 1, unidade: 'serviço', duracaoHoras: 2, custoMO: r(2 * LABOR.plumber_master), status: 'planejada' },
      ...(restoreFloor ? [{ servico: 'Restauração do piso/teto', descricao: floorType === 'slab' ? 'Preenchimento com concreto, nivelar e curar.' : 'Reinstalação do assoalho ou reparo do teto.', quantidade: 1, unidade: 'serviço', duracaoHoras: 8, custoMO: r(8 * LABOR.remodel_crew), status: 'planejada' as const }] : []),
    ],
    materiais: [
      { codigo: 'PVC-DRAIN', nome: 'PVC drain pipe 4" / 3" (ft)', quantidade: Math.ceil(distance / 4) + 6, unidade: 'ft', preco: 3.50, status: 'necessario' },
      { codigo: 'PEX-SUPPLY', nome: 'PEX-A supply line 1/2" (ft)', quantidade: Math.ceil(distance / 4) + 10, unidade: 'ft', preco: 0.80, status: 'necessario' },
      { codigo: 'FITTINGS-SET', nome: 'PVC fittings + PEX fittings (set)', quantidade: 1, unidade: 'set', preco: 85, status: 'necessario' },
      ...(restoreFloor && floorType === 'slab' ? [{ codigo: 'CONCRETE-MIX', nome: 'Quick-set concrete mix (60lb bag)', quantidade: 4, unidade: 'bag', preco: 12, status: 'necessario' as const }] : []),
    ],
    estimativaBaixa: r(low),
    estimativaAlta: r(high),
    estimativaMedia: r((low + high) / 2),
    custoMO: mo,
    custoMaterial: mat,
    fonte: 'internal',
    notas: ['Slab work requer equipamento de corte e é o mais trabalhoso.', 'Sempre fazer pressure test antes de tampar o acesso.'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// KITCHEN REMODEL
// ──────────────────────────────────────────────────────────────────────────────
export function calcKitchenRemodel(respostas: EstimadorRespostas): EstimadorResult {
  const scope = String(respostas.scope || 'mid-range')
  const kitchenSqft = Number(respostas.kitchen_sqft || 150)
  const cabinets = String(respostas.cabinets || 'semi-custom')
  const countertop = String(respostas.countertop || 'granite')
  const electrical = Boolean(respostas.electrical)
  const plumbing = Boolean(respostas.plumbing)
  const island = Boolean(respostas.island)

  const scopeBase: Record<string, [number, number]> = {
    cosmetic:   [3000, 8000],
    'mid-range': [15000, 35000],
    full:        [30000, 65000],
    gut:         [45000, 80000],
  }
  let [low, high] = scopeBase[scope] || scopeBase['mid-range']

  // Scale by sqft (base = 150 sqft)
  const sqftFactor = Math.max(0.6, Math.min(2.5, kitchenSqft / 150))
  low *= sqftFactor; high *= sqftFactor

  // Cabinet type add
  const cabinetAdder: Record<string, number> = { stock: 0, 'semi-custom': 2000, custom: 8000, 'keep-existing': -2000 }
  low += cabinetAdder[cabinets] || 0; high += (cabinetAdder[cabinets] || 0) * 1.3

  // Countertop add
  const ctAdder: Record<string, number> = { laminate: -500, granite: 1000, quartz: 1500, marble: 3000, keep: -800 }
  low += ctAdder[countertop] || 0; high += (ctAdder[countertop] || 0) * 1.3

  if (electrical) { low += 1500; high += 3000 }
  if (plumbing) { low += 1000; high += 2500 }
  if (island) { low += 3000; high += 8000 }

  const mat = r((low + high) / 2 * 0.45)
  const mo = r((low + high) / 2 * 0.45)

  const scopeLabel = { cosmetic: 'Cosmética', 'mid-range': 'Intermediária', full: 'Completa', gut: 'Demolição Total' }[scope] || 'Intermediária'

  return {
    tradeId: 'kitchen-remodel',
    tradeLabel: 'Reforma de Cozinha',
    escopoTexto: `Reforma de cozinha ${scopeLabel} — área: ~${kitchenSqft} sqft. Gabinetes: ${cabinets}. Countertop: ${countertop}.${electrical ? ' Inclui elétrica.' : ''}${plumbing ? ' Inclui plumbing.' : ''}${island ? ' Inclui island nova.' : ''}`,
    etapas: [
      ...(scope === 'gut' || scope === 'full' ? [{ servico: 'Demolição completa', descricao: 'Remoção de gabinetes, countertop, backsplash, appliances e descarte.', quantidade: 1, unidade: 'serviço', duracaoHoras: 12, custoMO: r(12 * LABOR.remodel_crew), status: 'planejada' as const }] : []),
      ...(cabinets !== 'keep-existing' ? [
        { servico: 'Instalação de gabinetes', descricao: `Instalação dos gabinetes ${cabinets} (lower + upper + pantry conforme layout).`, quantidade: 1, unidade: 'serviço', duracaoHoras: 16, custoMO: r(16 * LABOR.remodel_crew), status: 'planejada' as const },
        { servico: `Instalação de countertop (${countertop})`, descricao: 'Template, corte, polish de bordas e instalação do countertop.', quantidade: kitchenSqft / 5, unidade: 'sqft', duracaoHoras: 8, custoMO: r(8 * LABOR.remodel_crew), status: 'planejada' as const },
      ] : []),
      { servico: 'Backsplash e tile', descricao: 'Assentamento e grouting de tile no backsplash.', quantidade: Math.ceil(kitchenSqft * 0.3), unidade: 'sqft', duracaoHoras: 8, custoMO: r(8 * LABOR.remodel_crew), status: 'planejada' },
      ...(electrical ? [{ servico: 'Elétrica da cozinha', descricao: 'Circuits dedicados (refrigerator, dishwasher, island, under-cabinet lights, GFCIs).', quantidade: 1, unidade: 'serviço', duracaoHoras: 10, custoMO: r(10 * LABOR.electrician_journeyman), status: 'planejada' as const }] : []),
      ...(plumbing ? [{ servico: 'Plumbing da cozinha', descricao: 'Instalação/relocação do sink, dishwasher e ice maker connections.', quantidade: 1, unidade: 'serviço', duracaoHoras: 6, custoMO: r(6 * LABOR.plumber_journeyman), status: 'planejada' as const }] : []),
      ...(island ? [{ servico: 'Instalação de island', descricao: 'Construção, instalação de island com countertop, incluindo circuit dedicado.', quantidade: 1, unidade: 'serviço', duracaoHoras: 12, custoMO: r(12 * LABOR.remodel_crew), status: 'planejada' as const }] : []),
      { servico: 'Instalação de appliances e acabamentos', descricao: 'Conexão de appliances, hardware, sink + faucet, pintura e limpeza final.', quantidade: 1, unidade: 'serviço', duracaoHoras: 8, custoMO: r(8 * LABOR.remodel_crew), status: 'planejada' },
    ],
    materiais: [
      ...(cabinets !== 'keep-existing' ? [{ codigo: 'CABINETS', nome: `Gabinetes ${cabinets} (set completo)`, quantidade: 1, unidade: 'set', preco: cabinets === 'custom' ? 12000 : cabinets === 'semi-custom' ? 5000 : 2800, status: 'necessario' as const }] : []),
      ...(countertop !== 'keep' ? [{ codigo: 'COUNTERTOP', nome: `Countertop ${countertop} (per sqft)`, quantidade: Math.ceil(kitchenSqft / 5), unidade: 'sqft', preco: countertop === 'marble' ? 85 : countertop === 'quartz' ? 60 : countertop === 'granite' ? 45 : 12, status: 'necessario' as const }] : []),
      { codigo: 'BACKSPLASH-TILE', nome: 'Backsplash tile (subway / mosaic)', quantidade: Math.ceil(kitchenSqft * 0.3), unidade: 'sqft', preco: 5.50, status: 'necessario' },
      { codigo: 'SINK-FAUCET', nome: 'Kitchen sink + faucet set', quantidade: 1, unidade: 'un', preco: 380, status: 'necessario' },
      { codigo: 'HARDWARE', nome: 'Cabinet hardware (knobs + pulls)', quantidade: 1, unidade: 'set', preco: 180, status: 'necessario' },
      ...(island ? [{ codigo: 'ISLAND-TOP', nome: `Island countertop ${countertop}`, quantidade: 20, unidade: 'sqft', preco: countertop === 'quartz' ? 60 : 45, status: 'necessario' as const }] : []),
    ],
    estimativaBaixa: r(low),
    estimativaAlta: r(high),
    estimativaMedia: r((low + high) / 2),
    custoMO: mo,
    custoMaterial: mat,
    fonte: 'internal',
    notas: ['Dallas TX 2025. Reforma completa pode requerer permit de plumbing e elétrico.', 'Custom cabinets têm lead time de 6–12 semanas.', 'Appliances vendidos separadamente (GladPros instala mas não fornece).'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PLUMBING RESIDENTIAL
// ──────────────────────────────────────────────────────────────────────────────
export function calcPlumbingResidential(respostas: EstimadorRespostas): EstimadorResult {
  const scope = String(respostas.scope || 'repair')
  const bathrooms = Number(respostas.bathrooms || 1)
  const openWalls = Boolean(respostas.open_walls)
  const pipeMaterial = String(respostas.pipe_material || 'unknown')

  const baseCost: Record<string, [number, number]> = {
    repair:          [200, 600],
    'replace-supply': [1500 * bathrooms, 3500 * bathrooms],
    'replace-drain':  [1200 * bathrooms, 3000 * bathrooms],
    'full-repipe':    [3500 * bathrooms, 7000 * bathrooms],
    'fixture-install': [250 * bathrooms, 550 * bathrooms],
  }
  let [low, high] = baseCost[scope] || baseCost.repair
  if (openWalls) { low += 500 * bathrooms; high += 1200 * bathrooms }
  if (scope === 'full-repipe' && pipeMaterial === 'galvanized') { low += 1000; high += 2500 } // galvanized adds complexity

  const mat = r((low + high) / 2 * 0.35)
  const mo = r((low + high) / 2 * 0.55)

  const scopeLabel = {
    repair: 'Reparo de vazamento',
    'replace-supply': 'Substituição de supply lines',
    'replace-drain': 'Substituição de drenagem',
    'full-repipe': 'Repipe completo',
    'fixture-install': 'Instalação de fixtures',
  }[scope] || 'Serviço de plumbing'

  return {
    tradeId: 'plumbing-residential',
    tradeLabel: 'Encanamento Residencial',
    escopoTexto: `${scopeLabel} em ${bathrooms} banheiro(s).${openWalls ? ' Inclui abertura e fechamento de paredes.' : ''} Material atual: ${pipeMaterial}.`,
    etapas: [
      { servico: 'Diagnóstico e avaliação', descricao: 'Inspeção visual e com câmera (se aplicável) para mapear a extensão do problema.', quantidade: 1, unidade: 'serviço', duracaoHoras: 1, custoMO: r(LABOR.plumber_master), status: 'planejada' },
      ...(openWalls ? [{ servico: 'Abertura de paredes/piso', descricao: 'Abertura pontual para acesso às tubulações. Lona de proteção inclusa.', quantidade: bathrooms, unidade: 'pontos', duracaoHoras: bathrooms * 3, custoMO: r(bathrooms * 3 * LABOR.remodel_crew), status: 'planejada' as const }] : []),
      { servico: scope === 'full-repipe' ? 'Repipe completo' : scopeLabel, descricao: `Serviço principal: ${scopeLabel}. Uso de PEX-A para supply e PVC schedule 40 para drain.`, quantidade: bathrooms, unidade: 'banheiro', duracaoHoras: scope === 'full-repipe' ? bathrooms * 8 : bathrooms * 4, custoMO: r(scope === 'full-repipe' ? bathrooms * 8 * LABOR.plumber_master : bathrooms * 4 * LABOR.plumber_journeyman), status: 'planejada' },
      { servico: 'Teste de pressão e verificação', descricao: 'Pressure test e verificação completa de todos os pontos trabalhados.', quantidade: 1, unidade: 'serviço', duracaoHoras: 1, custoMO: r(LABOR.plumber_master), status: 'planejada' },
      ...(openWalls ? [{ servico: 'Fechamento de paredes/piso', descricao: 'Instalação de drywall/tile/assoalho para fechar os acessos.', quantidade: bathrooms, unidade: 'pontos', duracaoHoras: bathrooms * 4, custoMO: r(bathrooms * 4 * LABOR.remodel_crew), status: 'planejada' as const }] : []),
    ],
    materiais: [
      { codigo: 'PEX-A-1/2', nome: 'PEX-A 1/2" supply line (ft)', quantidade: bathrooms * 30, unidade: 'ft', preco: 0.80, status: 'necessario' },
      { codigo: 'PVC-DRAIN', nome: 'PVC schedule 40 drain 2"/3" (ft)', quantidade: bathrooms * 20, unidade: 'ft', preco: 2.50, status: 'necessario' },
      { codigo: 'FITTINGS', nome: 'Fittings set (PEX + PVC)', quantidade: bathrooms, unidade: 'set', preco: 65, status: 'necessario' },
      { codigo: 'SHUTOFF-VALVES', nome: 'Shutoff valves (angle stop)', quantidade: bathrooms * 2, unidade: 'un', preco: 12, status: 'necessario' },
    ],
    estimativaBaixa: r(low),
    estimativaAlta: r(high),
    estimativaMedia: r((low + high) / 2),
    custoMO: mo,
    custoMaterial: mat,
    fonte: 'internal',
    notas: ['Galvanized pipe adiciona complexidade e pode exigir remoção completa.', 'PEX-A recomendado por durabilidade e facilidade de trabalho em Dallas TX.'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// WATER TREATMENT
// ──────────────────────────────────────────────────────────────────────────────
export function calcWaterTreatment(respostas: EstimadorRespostas): EstimadorResult {
  const filterType    = String(respostas.filter_type || 'sediment')   // sediment | carbon | softener | ro
  const wholeHouse    = Boolean(respostas.whole_house)
  const brandSupplied = Boolean(respostas.brand_supplied)  // customer provides unit

  type FilterSpec = { name: string; equipLow: number; equipHigh: number; laborH: number; matMisc: number }
  const specs: Record<string, FilterSpec> = {
    sediment: {
      name: 'Filtro sedimento whole-house 10"',
      equipLow: 85, equipHigh: 130, laborH: 1.5, matMisc: 80,
    },
    carbon: {
      name: 'Filtro carvão ativado whole-house',
      equipLow: 180, equipHigh: 320, laborH: 2, matMisc: 95,
    },
    softener: {
      name: 'Water softener (resina + bypass valve)',
      equipLow: 620, equipHigh: 1200, laborH: 4, matMisc: 150,
    },
    ro: {
      name: 'Sistema RO under-sink (5 stages)',
      equipLow: 180, equipHigh: 380, laborH: 2, matMisc: 60,
    },
  }
  const spec = specs[filterType] || specs.sediment

  const equipBase = brandSupplied ? 0 : r((spec.equipLow + spec.equipHigh) / 2)
  const laborCost  = r(spec.laborH * LABOR.plumber_master)
  const mat        = r(equipBase + spec.matMisc)
  const mo         = laborCost

  const extra = wholeHouse && filterType !== 'ro' ? { costLow: 80, costHigh: 200 } : { costLow: 0, costHigh: 0 }

  const low  = r(mat + mo + extra.costLow)
  const high = r((brandSupplied ? 0 : spec.equipHigh) + spec.matMisc + spec.laborH * LABOR.plumber_master * 1.2 + extra.costHigh)
  const med  = r((low + high) / 2)

  return {
    tradeId: 'water-treatment',
    tradeLabel: 'Tratamento de Água',
    escopoTexto: `Instalação de ${spec.name}${wholeHouse ? ' na linha principal (whole-house)' : ' ponto de uso'}.${brandSupplied ? ' Equipamento fornecido pelo cliente.' : ''}`,
    etapas: [
      {
        servico: `Instalação de ${spec.name}`,
        descricao: `Instalação na linha ${filterType === 'ro' ? 'under-sink' : 'principal de entrada'}. Inclui válvulas de isolamento, conexões e teste de pressão.`,
        quantidade: 1, unidade: 'serviço', duracaoHoras: spec.laborH,
        custoMO: laborCost, status: 'planejada',
      },
    ],
    materiais: [
      ...(brandSupplied ? [] : [{
        codigo: `FILTER-${filterType.toUpperCase()}`,
        nome: spec.name,
        quantidade: 1, unidade: 'un', preco: r((spec.equipLow + spec.equipHigh) / 2),
        status: 'necessario' as const,
      }]),
      { codigo: 'SHUTOFF-ISO', nome: 'Shutoff valves de isolamento (x2)', quantidade: 2, unidade: 'un', preco: 28, status: 'necessario' },
      { codigo: 'FITTINGS-WTR', nome: 'Fittings, thread seal, misc', quantidade: 1, unidade: 'lote', preco: 35, status: 'necessario' },
    ],
    estimativaBaixa: low,
    estimativaAlta: high,
    estimativaMedia: med,
    custoMO: mo,
    custoMaterial: mat,
    fonte: 'internal',
    notas: [
      filterType === 'softener' ? 'Water softener requer manutenção anual (regeneração de resina + sal).' : '',
      filterType === 'ro' ? 'Sistema RO: cartuchos de pré-filtro devem ser trocados a cada 6–12 meses.' : '',
      brandSupplied ? 'Equipamento fornecido pelo cliente — verificar compatibilidade antes da instalação.' : '',
    ].filter(Boolean),
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PAINTING — INTERIOR
// ──────────────────────────────────────────────────────────────────────────────
export function calcPaintingInterior(respostas: EstimadorRespostas): EstimadorResult {
  const sqftFloor   = Number(respostas.sqft || 0)
  const rooms       = Number(respostas.rooms || 1)
  const ceiling     = Boolean(respostas.include_ceiling)
  const quality     = String(respostas.paint_quality || 'mid')   // basic | mid | premium
  const prepWork    = Boolean(respostas.prep_work)

  // Wall area ≈ 2.8× floor sqft for 9ft ceilings + ceiling if selected
  const wallArea = r(sqftFloor * 2.8)
  const ceilArea = ceiling ? sqftFloor : 0
  const totalArea = wallArea + ceilArea

  // $/sqft wall area (labor + paint combined)
  const rateMap: Record<string, [number, number]> = {
    basic:   [1.50, 2.20],
    mid:     [2.00, 3.00],
    premium: [2.80, 4.00],
  }
  const [rLow, rHigh] = rateMap[quality] || rateMap.mid
  const paintPrice: Record<string, number> = { basic: 35, mid: 55, premium: 85 }  // $/gallon

   
  const _gallons   = Math.ceil(totalArea / 350)  // ~350 sqft/gallon, 2 coats = ÷ 175
  const galFinal  = Math.ceil(totalArea / 175)   // 2 coats
  const paintCost = r(galFinal * paintPrice[quality])
   
  const _laborCost = r(totalArea * ((rLow + rHigh) / 2 - paintCost / totalArea))
  const prepCost  = prepWork ? r(rooms * 150 + sqftFloor * 0.30) : 0

  const low  = r(totalArea * rLow + prepCost * 0.7)
  const high = r(totalArea * rHigh + prepCost * 1.3)
  const med  = r((low + high) / 2)
  const mo   = r(med - paintCost)
  const mat  = r(paintCost + (prepWork ? rooms * 40 : 0))  // paint + prep supplies

  return {
    tradeId: 'painting-interior',
    tradeLabel: 'Pintura Interior',
    escopoTexto: `Pintura interna de ${rooms} cômodo${rooms > 1 ? 's' : ''} (~${sqftFloor} sqft total). Qualidade: ${quality === 'basic' ? 'básica' : quality === 'mid' ? 'intermediária' : 'premium'}.${ceiling ? ' Inclui teto.' : ''}${prepWork ? ' Inclui preparação de superfície (spackle, lixamento, primer).' : ''}`,
    etapas: [
      ...(prepWork ? [{
        servico: 'Preparação de superfície',
        descricao: 'Limpeza, spackle em imperfeições, lixamento, fita e plástico de proteção.',
        quantidade: rooms, unidade: 'cômodos', duracaoHoras: r(rooms * 1.5),
        custoMO: prepCost, status: 'planejada' as const,
      }] : []),
      {
        servico: `Aplicação de tinta (${quality === 'basic' ? 'básica' : quality === 'mid' ? 'intermediária' : 'premium'})`,
        descricao: `2 demãos nas paredes (${wallArea} sqft)${ceiling ? ` + teto (${sqftFloor} sqft)` : ''}. Total: ${totalArea} sqft.`,
        quantidade: totalArea, unidade: 'sqft', duracaoHoras: r(totalArea / 150),
        custoMO: r(totalArea * (rLow + rHigh) / 2 * 0.65), status: 'planejada',
      },
    ],
    materiais: [
      { codigo: 'PAINT-INT', nome: `Tinta interior ${quality === 'premium' ? 'Sherwin-Williams Emerald' : quality === 'mid' ? 'S-W Duration' : 'S-W Harmony'} (${quality})`, quantidade: galFinal, unidade: 'gal', preco: paintPrice[quality], status: 'necessario' },
      { codigo: 'PRIMER-INT', nome: 'Primer interior (se necessário)', quantidade: Math.ceil(galFinal * 0.5), unidade: 'gal', preco: 30, status: 'condicional' },
      { codigo: 'SUPPLIES-INT', nome: 'Rolos, pincéis, fita, plástico, bandejas', quantidade: 1, unidade: 'lote', preco: r(rooms * 25), status: 'necessario' },
    ],
    estimativaBaixa: low,
    estimativaAlta: high,
    estimativaMedia: med,
    custoMO: mo,
    custoMaterial: mat,
    fonte: 'internal',
    notas: [
      `Área de parede estimada: ${wallArea} sqft (calculada a partir dos ${sqftFloor} sqft de piso).`,
      `Tinta necessária (~2 demãos): ${galFinal} galões de ${quality === 'premium' ? 'Sherwin-Williams Emerald' : quality === 'mid' ? 'S-W Duration' : 'S-W Harmony'}.`,
      'Cores escuras ou mudança drástica de cor podem exigir 3ª demão (+10–15% no custo).',
    ],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PAINTING — EXTERIOR
// ──────────────────────────────────────────────────────────────────────────────
export function calcPaintingExterior(respostas: EstimadorRespostas): EstimadorResult {
  const sqftFacade  = Number(respostas.sqft_facade || 0)
  const stories     = Number(respostas.stories || 1)
  const includeTrim = Boolean(respostas.include_trim)
  const pressureWash = Boolean(respostas.pressure_wash)
  const quality     = String(respostas.paint_quality || 'mid')

  const rateMap: Record<string, [number, number]> = {
    basic:   [1.80, 2.80],
    mid:     [2.40, 3.60],
    premium: [3.20, 4.80],
  }
  const [rLow, rHigh] = rateMap[quality] || rateMap.mid
  const paintPrice: Record<string, number> = { basic: 45, mid: 65, premium: 95 }

   
  const _gallons   = Math.ceil(sqftFacade / 150)   // exterior uses more (rougher)
  const galFinal  = Math.ceil(sqftFacade / 150)
  const paintCost = r(galFinal * paintPrice[quality])
  const pwCost    = pressureWash ? r(sqftFacade * 0.20 + 150) : 0
  const trimCost  = includeTrim  ? r(sqftFacade * 0.15 + stories * 200) : 0

  // Scaffolding or ladder kit for multi-story
  const scaffoldCost = stories > 1 ? r((stories - 1) * 400) : 0

  const low  = r(sqftFacade * rLow + pwCost * 0.8 + trimCost * 0.8 + scaffoldCost)
  const high = r(sqftFacade * rHigh + pwCost * 1.2 + trimCost * 1.2 + scaffoldCost * 1.3)
  const med  = r((low + high) / 2)
  const mo   = r(med - paintCost - pwCost * 0.5)
  const mat  = r(paintCost + pwCost * 0.5 + (includeTrim ? 80 : 0))

  return {
    tradeId: 'painting-exterior',
    tradeLabel: 'Pintura Exterior',
    escopoTexto: `Pintura exterior de ${sqftFacade} sqft de fachada, ${stories} andar${stories > 1 ? 'es' : ''}. Qualidade: ${quality}.${pressureWash ? ' Inclui lavagem de pressão.' : ''}${includeTrim ? ' Inclui trim/molduras.' : ''}`,
    etapas: [
      ...(pressureWash ? [{
        servico: 'Pressure wash da fachada',
        descricao: 'Lavagem de alta pressão para remover sujeira, mofo e tinta solta.',
        quantidade: sqftFacade, unidade: 'sqft', duracaoHoras: r(sqftFacade / 400),
        custoMO: pwCost, status: 'planejada' as const,
      }] : []),
      {
        servico: 'Preparação e caulking',
        descricao: 'Caulking em juntas, janelas e molduras. Proteção de janelas e superfícies.',
        quantidade: 1, unidade: 'serviço', duracaoHoras: r(sqftFacade / 500 + stories),
        custoMO: r(sqftFacade * 0.25), status: 'planejada',
      },
      {
        servico: 'Aplicação de tinta exterior',
        descricao: `2 demãos de tinta exterior premium. ${sqftFacade} sqft.${includeTrim ? ' Inclui trim em cor de destaque.' : ''}`,
        quantidade: sqftFacade, unidade: 'sqft', duracaoHoras: r(sqftFacade / 120),
        custoMO: r(sqftFacade * (rLow + rHigh) / 2 * 0.65), status: 'planejada',
      },
    ],
    materiais: [
      { codigo: 'PAINT-EXT', nome: `Tinta exterior ${quality === 'premium' ? 'Sherwin-Williams Emerald Exterior' : quality === 'mid' ? 'S-W Duration Exterior' : 'S-W SuperPaint Exterior'}`, quantidade: galFinal, unidade: 'gal', preco: paintPrice[quality], status: 'necessario' },
      { codigo: 'PRIMER-EXT', nome: 'Primer exterior (1 demão)', quantidade: Math.ceil(galFinal * 0.5), unidade: 'gal', preco: 38, status: 'necessario' },
      { codigo: 'CAULK-EXT', nome: 'Caulking exterior (NPC ou similar)', quantidade: Math.ceil(sqftFacade / 300), unidade: 'tubo', preco: 8, status: 'necessario' },
      { codigo: 'SUPPLIES-EXT', nome: 'Rolos exterior, pincéis, fita, plástico', quantidade: 1, unidade: 'lote', preco: r(sqftFacade * 0.10), status: 'necessario' },
      ...(stories > 1 ? [{ codigo: 'SCAFFOLD', nome: `Aluguel andaime / extensão de escada (${stories} andares)`, quantidade: stories - 1, unidade: 'semana', preco: scaffoldCost / (stories - 1), status: 'necessario' as const }] : []),
    ],
    estimativaBaixa: low,
    estimativaAlta: high,
    estimativaMedia: med,
    custoMO: mo,
    custoMaterial: mat,
    fonte: 'internal',
    notas: [
      'Dallas TX: tinta exterior deve resistir a calor extremo (verão 105°F+) — indicadas tintas elastoméricas ou acrílicas premium.',
      stories > 1 ? 'Casas de 2+ andares exigem andaime ou escadas de extensão (+tempo e custo).' : '',
      pressureWash ? 'Aguardar 24–48h após pressure wash para a superfície secar antes de pintar.' : '',
    ].filter(Boolean),
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PAINTING — FULL (interior + exterior combinado)
// ──────────────────────────────────────────────────────────────────────────────
export function calcPaintingFull(respostas: EstimadorRespostas): EstimadorResult {
  const interior = calcPaintingInterior(respostas)
  const exterior = calcPaintingExterior(respostas)

  // ~10% combo discount on the higher quote (typically interior)
  const discount = r((interior.estimativaMedia + exterior.estimativaMedia) * 0.08)

  const low  = r(interior.estimativaBaixa + exterior.estimativaBaixa - discount)
  const high = r(interior.estimativaAlta  + exterior.estimativaAlta)
  const med  = r((low + high) / 2)
  const mo   = r(interior.custoMO + exterior.custoMO)
  const mat  = r(interior.custoMaterial + exterior.custoMaterial)

  return {
    tradeId: 'painting-full',
    tradeLabel: 'Pintura Completa (Interior + Exterior)',
    escopoTexto: `Projeto completo de pintura: interior + exterior. ${interior.escopoTexto} ${exterior.escopoTexto}`,
    etapas: [...interior.etapas, ...exterior.etapas],
    materiais: [...interior.materiais, ...exterior.materiais],
    estimativaBaixa: low,
    estimativaAlta: high,
    estimativaMedia: med,
    custoMO: mo,
    custoMaterial: mat,
    fonte: 'internal',
    notas: [
      'Desconto de ~8% aplicado por contratar interior + exterior no mesmo projeto.',
      ...(interior.notas ?? []),
      ...(exterior.notas ?? []),
    ],
  }
}


export function calcEstimativa(tradeId: string, respostas: EstimadorRespostas): EstimadorResult {
  switch (tradeId) {
    case 'electrical-residential': return calcElectricalResidential(respostas)
    case 'electrical-commercial':  return calcElectricalCommercial(respostas)
    case 'ev-charging':            return calcEVCharging(respostas)
    case 'panel-upgrade':          return calcPanelUpgrade(respostas)
    case 'service-installation':   return calcServiceInstallation(respostas)
    case 'light-installation':     return calcLightInstallation(respostas)
    case 'plumbing-residential':   return calcPlumbingResidential(respostas)
    case 'bathroom-remodel':       return calcBathroomRemodel(respostas)
    case 'water-heater-tank':      return calcWaterHeaterTank(respostas)
    case 'tankless-water-heater':  return calcTankless(respostas)
    case 'move-plumbing':          return calcMovePlumbing(respostas)
    case 'kitchen-remodel':        return calcKitchenRemodel(respostas)
    case 'water-treatment':        return calcWaterTreatment(respostas)
    case 'painting-interior':      return calcPaintingInterior(respostas)
    case 'painting-exterior':      return calcPaintingExterior(respostas)
    case 'painting-full':          return calcPaintingFull(respostas)
    default:
      throw new Error(`Trade não reconhecido: ${tradeId}`)
  }
}
