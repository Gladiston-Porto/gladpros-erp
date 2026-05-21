## Descrição

<!-- O que este PR faz? Contexto necessário para review. -->

## Tipo de mudança

- [ ] 🐛 Bug fix (correção de bug existente)
- [ ] ✨ Nova feature
- [ ] ♻️ Refatoração (sem mudança de comportamento)
- [ ] 📐 Infra / CI / configuração
- [ ] 📚 Documentação

## Bug(s) corrigido(s)

<!--
Se este PR corrige um bug do known-bugs.json, preencha abaixo.
CADA bug corrigido DEVE ter um teste de regressão com tag @bug:ID.
-->

| Bug ID | Arquivo corrigido | Teste de regressão |
|--------|-------------------|--------------------|
| MODULO-P?-??? | `path/to/file.ts` | `path/to/test.ts` |

## Checklist — OBRIGATÓRIO antes de solicitar review

### Segurança e auth
- [ ] Todas as rotas novas/modificadas chamam `requireUser()` como primeira operação
- [ ] RBAC verificado com `can(role, module, action)` em create/update/delete
- [ ] Body validado com Zod
- [ ] `empresaId` vem do user context (não hardcoded)
- [ ] Dados sensíveis protegidos (SSN/EIN criptografados, tokens em httpOnly)

### Performance
- [ ] Sem `await` dentro de `.map()` (N+1 proibido)
- [ ] Queries independentes usando `Promise.all`
- [ ] `findMany` com `take` + `skip` (paginação)
- [ ] Campos filtráveis têm `@@index` no schema

### Qualidade
- [ ] `npm run known-bugs:validate` passou ✅
- [ ] `npm run semgrep` passou ✅ (sem novos findings)
- [ ] `npm run lint` passou ✅
- [ ] `npm run type-check` passou ✅
- [ ] `npm test` passou ✅
- [ ] Bug corrigido tem teste com `// @bug:ID` tagueado
- [ ] Bug no `known-bugs.json` atualizado para FIXED com `fixCommit`, `fixedAt`, `regressionTest`

### UX
- [ ] Sem cores hardcoded (`bg-white` → `bg-card`)
- [ ] Datas exibem em `America/Chicago`
- [ ] Dark mode funcional
- [ ] Estados loading/empty/error cobertos

## Impacto nos outros módulos

<!-- Lista de módulos que podem ser afetados por esta mudança -->

- [ ] Sem impacto cross-módulo
- [ ] Impacto em: `_______________` (descrever)
