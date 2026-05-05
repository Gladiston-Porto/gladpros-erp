import {
  calcularHealthScore,
  calcularProgresso,
  type EtapaHealthData,
} from '@/domains/projects/utils/projectHealth';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeEtapa(overrides: Partial<EtapaHealthData> = {}): EtapaHealthData {
  return {
    status: 'pendente',
    porcentagem: 0,
    fimPrevisto: null,
    ...overrides,
  };
}

const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();   // 7 days ago
const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead

// ─── calcularProgresso ────────────────────────────────────────────────────────

describe('calcularProgresso', () => {
  it('returns 100 for concluido regardless of etapas', () => {
    expect(calcularProgresso([], 'concluido')).toBe(100);
  });

  it('returns 0 for cancelado', () => {
    expect(calcularProgresso([makeEtapa({ porcentagem: 80 })], 'cancelado')).toBe(0);
  });

  it('returns 0 for planejado', () => {
    expect(calcularProgresso([makeEtapa({ porcentagem: 50 })], 'planejado')).toBe(0);
  });

  it('returns 0 when no etapas', () => {
    expect(calcularProgresso([], 'em_execucao')).toBe(0);
  });

  it('averages porcentagem across all etapas', () => {
    const etapas = [
      makeEtapa({ porcentagem: 100 }),
      makeEtapa({ porcentagem: 50 }),
      makeEtapa({ porcentagem: 0 }),
    ];
    expect(calcularProgresso(etapas, 'em_execucao')).toBe(50);
  });

  it('treats null porcentagem as 0', () => {
    const etapas = [makeEtapa({ porcentagem: null }), makeEtapa({ porcentagem: 60 })];
    expect(calcularProgresso(etapas, 'em_execucao')).toBe(30);
  });
});

// ─── calcularHealthScore ──────────────────────────────────────────────────────

describe('calcularHealthScore', () => {
  describe('terminal statuses', () => {
    it('returns null for cancelado', () => {
      expect(calcularHealthScore({ status: 'cancelado' }, [])).toBeNull();
    });

    it('returns 100/verde for concluido', () => {
      const result = calcularHealthScore(
        { status: 'concluido' },
        [makeEtapa({ status: 'concluida', porcentagem: 100 })]
      );
      expect(result).not.toBeNull();
      expect(result!.score).toBe(100);
      expect(result!.label).toBe('verde');
      expect(result!.progresso).toBe(100);
      expect(result!.etapasConcluidas).toBe(1);
      expect(result!.etapasAtrasadas).toBe(0);
    });
  });

  describe('healthy project (no data to penalize)', () => {
    it('returns 100 when no etapas and no budget data', () => {
      const result = calcularHealthScore({ status: 'em_execucao' }, []);
      expect(result!.score).toBe(100);
      expect(result!.label).toBe('verde');
    });
  });

  describe('progress component (40 pts)', () => {
    it('awards 40 pts for 100% stage progress', () => {
      const etapas = [makeEtapa({ porcentagem: 100 }), makeEtapa({ porcentagem: 100 })];
      const result = calcularHealthScore({ status: 'em_execucao' }, etapas);
      // 40 (progress) + 40 (schedule, no dates) + 20 (budget, no data) = 100
      expect(result!.score).toBe(100);
    });

    it('awards 0 pts for 0% stage progress', () => {
      const etapas = [makeEtapa({ porcentagem: 0 }), makeEtapa({ porcentagem: 0 })];
      const result = calcularHealthScore({ status: 'em_execucao' }, etapas);
      // 0 (progress) + 40 (schedule, no dates) + 20 (budget, no data) = 60
      expect(result!.score).toBe(60);
      expect(result!.label).toBe('amarelo');
    });
  });

  describe('schedule component (40 pts)', () => {
    it('gives full pts when no stages have deadlines', () => {
      const etapas = [makeEtapa({ fimPrevisto: null })];
      const result = calcularHealthScore({ status: 'em_execucao' }, etapas);
      expect(result!.etapasAtrasadas).toBe(0);
    });

    it('counts late stage correctly', () => {
      const etapas = [
        makeEtapa({ fimPrevisto: past, status: 'em_andamento', porcentagem: 100 }),   // late
        makeEtapa({ fimPrevisto: future, status: 'em_andamento', porcentagem: 100 }), // on time
      ];
      const result = calcularHealthScore({ status: 'em_execucao' }, etapas);
      expect(result!.etapasAtrasadas).toBe(1);
      // 40 (progress=100%) + 20 (1 of 2 late = 50% penalty → 40*0.5=20) + 20 (budget) = 80
      expect(result!.score).toBe(80);
    });

    it('does NOT count concluded stage as late even if past deadline', () => {
      const etapas = [
        makeEtapa({ fimPrevisto: past, status: 'concluida' }), // concluded, not late
        makeEtapa({ fimPrevisto: past, status: 'em_andamento' }), // late
      ];
      const result = calcularHealthScore({ status: 'em_execucao' }, etapas);
      expect(result!.etapasAtrasadas).toBe(1);
    });

    it('does NOT count cancelled stage as late', () => {
      const etapas = [makeEtapa({ fimPrevisto: past, status: 'cancelada' })];
      const result = calcularHealthScore({ status: 'em_execucao' }, etapas);
      expect(result!.etapasAtrasadas).toBe(0);
    });
  });

  describe('budget component (20 pts)', () => {
    it('awards 20 pts when no budget data', () => {
      const result = calcularHealthScore(
        { status: 'em_execucao', custoPrevisto: null, custoReal: null },
        []
      );
      // 40 + 40 + 20 = 100
      expect(result!.score).toBe(100);
    });

    it('awards 20 pts when custoReal <= custoPrevisto', () => {
      const result = calcularHealthScore(
        { status: 'em_execucao', custoPrevisto: 10000, custoReal: 9000 },
        []
      );
      expect(result!.score).toBe(100);
    });

    it('awards 15 pts when 1% to 10% over budget', () => {
      const result = calcularHealthScore(
        { status: 'em_execucao', custoPrevisto: 10000, custoReal: 10800 },
        []
      );
      // 40 + 40 + 15 = 95
      expect(result!.score).toBe(95);
      expect(result!.label).toBe('verde');
    });

    it('awards 0 pts when >50% over budget', () => {
      const result = calcularHealthScore(
        { status: 'em_execucao', custoPrevisto: 10000, custoReal: 16000 },
        []
      );
      // 40 + 40 + 0 = 80
      expect(result!.score).toBe(80);
    });
  });

  describe('label thresholds', () => {
    it('verde at score >= 75', () => {
      const result = calcularHealthScore({ status: 'em_execucao' }, []);
      expect(result!.score).toBe(100);
      expect(result!.label).toBe('verde');
    });

    it('amarelo at score 50-74', () => {
      // 0% progress (0 pts) + 40 (schedule) + 20 (budget) = 60 → amarelo
      const etapas = [makeEtapa({ porcentagem: 0 })];
      const result = calcularHealthScore({ status: 'em_execucao' }, etapas);
      expect(result!.score).toBe(60);
      expect(result!.label).toBe('amarelo');
    });

    it('vermelho at score < 50', () => {
      // 0% progress (0 pts) + 0 schedule (all late) + 0 budget (>150%) = 0 → vermelho
      const etapas = [makeEtapa({ porcentagem: 0, fimPrevisto: past, status: 'em_andamento' })];
      const result = calcularHealthScore(
        { status: 'em_execucao', custoPrevisto: 10000, custoReal: 20000 },
        etapas
      );
      expect(result!.score).toBe(0);
      expect(result!.label).toBe('vermelho');
    });
  });
});
