---
applyTo: "docs/modules/**/*.md,relatorios/known-bugs.json,scripts/certify-module.mjs"
---

# Instruções para Certificação de Módulos

Quando certificar (ou re-certificar) um módulo como Production Ready, seguir este protocolo obrigatório.

## Regra Absoluta

> **Um módulo só pode ser declarado Production Ready quando `node scripts/certify-module.mjs --module=[nome]` retornar exit code 0.**

Declarações manuais de certificação sem este script são inválidas.

## Pré-requisitos para Certificar

### P1/P2 — todos fechados
```bash
cat relatorios/known-bugs.json | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const modulo = process.argv[1];
const open = d.bugs.filter(b => b.module === modulo && (b.status === 'OPEN' || b.status === 'IN_PROGRESS'));
if (open.length > 0) {
  console.error('BLOQUEADO: ' + open.length + ' bug(s) abertos');
  process.exit(1);
}
" -- [modulo]
```

### FIXED com regressionTest
```bash
cat relatorios/known-bugs.json | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const sem_teste = d.bugs.filter(b => b.status === 'FIXED' && !b.regressionTest);
sem_teste.forEach(b => console.warn('⚠️ FIXED sem teste:', b.id));
"
```

### Semgrep limpo
```bash
semgrep --config=.semgrep/gladpros --metrics=off --error src/app/api/[modulo]/
```

### Testes passando
```bash
npm test -- --testPathPattern="[modulo]" --coverage
```

## Como Executar a Certificação

```bash
node scripts/certify-module.mjs --module=[nome-do-modulo]
```

Exit codes:
- `0` = Production Ready ✅
- `1` = Not Ready ❌ (P1/P2 aberto ou teste faltando)
- `2` = Conditionally Ready ⚠️ (P3 aberto sem mitigação)
- `3` = Needs Re-Audit 🔄 (dados insuficientes)

## Formato do Documento de Certificação

```markdown
# Certificação: [Módulo] — v[N.0]
**Data**: YYYY-MM-DD
**Status**: ✅ Production Ready | ⚠️ Conditionally Ready | ❌ Not Ready
**Certify-module output**: exit code [0|1|2|3]
**Commit**: [hash]

## Gates Executados

### Gate 1 — Segurança
- [ ] Todas as rotas têm `requireUser()`
- [ ] Todas rotas sensíveis têm `can()`
- [ ] Sem IDOR (empresaId em todas as queries)
- [ ] Dados sensíveis protegidos

### Gate 2 — Testes
- [ ] Cobertura ≥ threshold
- [ ] Todo FIXED tem regressionTest
- [ ] Testes E2E happy path

### Gate 3 — Performance
- [ ] Sem N+1
- [ ] Listagens paginadas
- [ ] Índices nos campos filtráveis

### Gate 4 — UX
- [ ] Loading/empty/error states
- [ ] Dark mode funcional
- [ ] Acessibilidade básica

## Evidências

### Semgrep
\`\`\`
[output do semgrep]
\`\`\`

### Testes
\`\`\`
[output do npm test com cobertura]
\`\`\`

### known-bugs.json (módulo)
| Bug ID | Status | Teste de Regressão |
|--------|--------|--------------------|

## Limitações / Condições (se Conditionally Ready)
[Lista de P3 abertos com mitigação]

## Próxima Re-auditoria recomendada
[Data ou trigger: após X mudanças, ou em Y meses]
```

## Quando Re-Certificar

Re-certificação obrigatória quando:
- [ ] Nova rota de API adicionada ao módulo
- [ ] Schema Prisma alterado para o módulo
- [ ] Lógica de RBAC modificada
- [ ] Correção de P2 ou P1 aplicada
- [ ] >90 dias desde última certificação
- [ ] Módulo referenciado em postmortem

## Anti-patterns de Certificação

- ❌ Certificar baseado em "build passou"
- ❌ Certificar baseado em teste manual sem automação
- ❌ Re-usar certificação de ciclo anterior sem re-executar gates
- ❌ Declarar Production Ready com P2 "mitigado" — P2 de segurança é bloqueante
- ❌ Declarar Production Ready sem rodar `certify-module.mjs`
- ❌ Certificar módulo após mudanças sem re-auditoria do escopo impactado
