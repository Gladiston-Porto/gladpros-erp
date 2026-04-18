---
description: "Template para iniciar qualquer feature nova — força o fluxo Plan → Implement → Test → Audit"
agent: "agent"
---

# Nova Feature — GladPros ERP

Use este prompt para iniciar qualquer funcionalidade nova de forma estruturada e segura.

**Informe o que você quer construir:**

> Exemplo: "Quero adicionar a possibilidade de anexar fotos a uma Service Order"

---

## Etapa 1 — Plan (obrigatória antes de qualquer código)

Antes de escrever uma linha, analise e responda:

### 1.1 Contexto de negócio
- Qual problema real da GladPros essa feature resolve?
- Qual módulo é o dono principal? (auth, clientes, propostas, projetos, estoque, financeiro, invoices, rh, service-orders, usuarios)
- Quais outros módulos são afetados?

### 1.2 Impacto técnico
- É necessário alterar o schema Prisma? Se sim, quais models?
- Quantas novas rotas de API serão criadas?
- Quantas pages/componentes novos serão criados?
- Há alteração em fluxo existente (máquina de estados, permissões, validações)?

### 1.3 Permissões RBAC
Mapeie quem pode fazer o quê na nova feature:

| Ação | ADMIN | GERENTE | FINANCEIRO | ESTOQUE | USUARIO | CLIENTE |
|------|-------|---------|------------|---------|---------|---------|
| [ação 1] | | | | | | |
| [ação 2] | | | | | | |

### 1.4 Riscos identificados
- [ ] Há risco de regressão em módulo próximo?
- [ ] A feature toca dados sensíveis (documentos fiscais, financeiro, auth)?
- [ ] Há dependência de feature ainda não implementada?
- [ ] A mudança de schema é reversível?

### 1.5 Plano de implementação (etapas ordenadas)
Liste as etapas na ordem segura de execução:
1. [ex: Migration do schema]
2. [ex: Rota de API GET]
3. [ex: Rota de API POST/PATCH]
4. [ex: Componente de listagem]
5. [ex: Formulário de criação]
6. [ex: Testes]

**Confirme o plano antes de avançar para a Etapa 2.**

---

## Etapa 2 — Implement

Execute **uma etapa por vez** do plano acima.

### Checklist de cada entrega parcial

**Backend (API routes):**
- [ ] `requireUser()` no início da rota
- [ ] `can()` RBAC verificado
- [ ] Body validado com Zod
- [ ] Resposta no formato `{ data, success }` ou `{ error, message, success }`
- [ ] Import do Prisma: `import { prisma } from "@/lib/prisma"`
- [ ] Listagens têm paginação (`take`, `skip`, `total`)
- [ ] Queries independentes em `Promise.all`
- [ ] Sem `await` dentro de `.map()`

**Frontend (pages e componentes):**
- [ ] Sem cores hardcoded — usar tokens do design system (`bg-card`, `text-foreground`, etc.)
- [ ] Estados de loading, empty e error definidos
- [ ] Responsivo com `md:` e `lg:`
- [ ] Touch targets mínimos de 48px
- [ ] Dark mode funcional (CSS variables, não hardcode)
- [ ] `empresaId = 1` respeitado em todas as queries

**Schema (se aplicável):**
- [ ] Campos filtráveis têm `@@index`
- [ ] Relações têm `onDelete` definido
- [ ] Migration testada localmente antes de aplicar

---

## Etapa 3 — Test

Após implementar, gere:

### 3.1 Checklist manual
Liste os cenários que devem ser testados manualmente no browser:
- [ ] Fluxo feliz: [descrever]
- [ ] Fluxo de erro: [descrever]
- [ ] Permissões: testar com role USUARIO (mais restrito)
- [ ] Permissões: testar com role ADMIN (mais permissivo)
- [ ] Responsividade: verificar em tablet (768px)

### 3.2 Testes automatizados (Playwright / Jest)
- [ ] Teste de rota de API (happy path + 401 + 403 + 400)
- [ ] Teste E2E do fluxo principal (Playwright)
- [ ] Caso de borda: campo vazio, valor inválido, duplicata

### 3.3 Regressão
- [ ] Módulos vizinhos afetados ainda funcionam?
- [ ] Build sem erros: `npx next build`
- [ ] TypeScript sem erros: `npx tsc --noEmit`

---

## Etapa 4 — Audit

Revisão final antes de considerar a feature pronta:

### 4.1 Segurança
- [ ] Nenhum endpoint retorna dados além do permitido pelo role?
- [ ] Dados sensíveis estão mascarados ou criptografados?
- [ ] Não há `console.log` com payload sensível?
- [ ] Rate limiting aplicado onde necessário?

### 4.2 Consistência com o projeto
- [ ] O visual segue o padrão das outras páginas do sistema?
- [ ] Os estados de status seguem o mesmo padrão visual (badges, cores)?
- [ ] As mensagens de erro são úteis e consistentes com o restante?
- [ ] O `AuditLog` foi gerado para ações críticas?

### 4.3 Performance
- [ ] Sem N+1 queries?
- [ ] Campos filtráveis têm `@@index` no schema?
- [ ] Dados estáticos têm `unstable_cache` quando aplicável?

---

## Resposta final esperada do agente

Ao concluir todas as etapas, responder com:

1. **O que foi implementado** — resumo objetivo
2. **Arquivos criados ou modificados** — caminhos completos
3. **O que foi testado** — checklist executado
4. **Riscos ou pontos de atenção** — o que ainda merece observação em produção
