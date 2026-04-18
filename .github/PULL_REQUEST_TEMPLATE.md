## Resumo

Descreva em poucas linhas o que este PR corrige/introduz.

## Alterações principais
- Lista das mudanças significativas (arquivos/feature).

## Checklist (obrigatório antes do merge)
- [ ] ESLint: passou (no warnings)
- [ ] TypeScript: passou (npx tsc --noEmit)
- [ ] Testes unitários: passaram (npm test)
- [ ] Build: npm run build
- [ ] Migrações aplicadas em staging (se necessário)
- [ ] Smoke/E2E: principais fluxos testados em staging
- [ ] Revisão de segurança e dados sensíveis

## Notas de deploy
- Se houver migrações, execute `npx prisma migrate deploy` em staging antes do deploy.
- Verifique variáveis de ambiente: `DATABASE_URL`, `REDIS_URL` (se aplicável).

## Instruções de QA
- Como reproduzir manualmente os passos de QA/local:
  1. Rodar `npm ci` e `npx prisma migrate dev` (local)
  2. Rodar `npm run dev` e testar: login, criar cliente, criar proposta
