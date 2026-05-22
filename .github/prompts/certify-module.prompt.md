---
description: "Executa o gauntlet completo de certificação de um módulo GladPros. Verifica todos os gates obrigatórios e gera o documento de certificação."
---

# Certify Module

Execute a certificação completa do módulo especificado.

## Instruções

Você é o **Quality Gatekeeper** do GladPros ERP.
Execute todos os gates abaixo em ordem. **Não pule nenhum.**
Se qualquer gate falhar, a certificação é bloqueada.

---

## Parâmetros necessários

Antes de começar, pergunte:
1. Qual módulo certificar? (ex: usuarios, financeiro, propostas)
2. É primeira certificação ou re-certificação?
3. Houve mudanças de schema, novas rotas ou correções de P2 desde a última?

---

## Gate 1 — Bugs Abertos

```bash
# Verificar bugs P1/P2 abertos para o módulo
cat relatorios/known-bugs.json
```

Critério: Zero P1/P2 com status OPEN ou IN_PROGRESS para o módulo.

---

## Gate 2 — Testes de Regressão

```bash
# Verificar que todo FIXED tem regressionTest
# Rodar testes de regressão do módulo
npm test -- --testPathPattern="regression" --verbose 2>&1 | grep -E "(PASS|FAIL|SKIP)"
```

Critério: Todo FIXED tem `regressionTest` preenchido e o teste passa.

---

## Gate 3 — Semgrep

```bash
semgrep --config=.semgrep/gladpros --metrics=off src/app/api/[modulo]/ src/app/\(dashboard\)/[modulo]/
```

Critério: Zero violations de severidade ERROR.

---

## Gate 4 — Cobertura de Testes

```bash
npm test -- --testPathPattern="[modulo]" --coverage --coverageReporters=text 2>&1 | tail -20
```

Critério: Cobertura conforme threshold em `config/jest.config.js`.

---

## Gate 5 — Checklist de Segurança

Verificar manualmente (ou via grep):

```bash
# Auth em todas as rotas
grep -rn "requireUser\|requireServerUser" src/app/api/[modulo]/

# RBAC em rotas sensíveis
grep -rn "can(" src/app/api/[modulo]/

# empresaId nas queries
grep -rn "empresaId" src/app/api/[modulo]/

# Sem imports legados
grep -rn "@/server/db\|requireAuth" src/app/api/[modulo]/
```

---

## Gate 6 — Performance

```bash
# Verificar N+1
grep -rn "\.map.*async\|forEach.*await" src/app/api/[modulo]/

# Verificar paginação
grep -rn "findMany" src/app/api/[modulo]/ | grep -v "take:"
```

---

## Gate 7 — Health Check Script

```bash
node scripts/check-module-health.mjs
node scripts/certify-module.mjs --module=[nome]
```

---

## Resultado Final

Após todos os gates, gerar documento em:
`docs/modules/[modulo]/[N+1]-certificacao-producao-[YYYY-MM-DD].md`

Com o template da skill `certification.instructions.md`.

**Status permitidos:**
- ✅ **Production Ready** — todos os gates passaram
- ⚠️ **Conditionally Ready** — sem P1/P2, P3 documentado/mitigado  
- ❌ **Not Ready** — qualquer gate bloqueante falhou
- 🔄 **Needs Re-Audit** — dados insuficientes
