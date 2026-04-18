---
name: quality-playbook
description: "Use when setting up a quality system, generating functional tests from specifications, auditing code against specs, or creating a quality constitution for any module. Triggers on: 'generate quality playbook', 'create functional tests', 'spec audit', 'quality system', 'review module quality'. Produces: QUALITY.md (constitution), functional tests, code review protocol, integration test protocol, spec audit (Council of Three), and AGENTS.md bootstrap."
---

# Quality Playbook Generator

> Crédito original: Andrew Stellman — github.com/andrewstellman (adaptado para GladPros)

Gera um sistema de qualidade completo para qualquer módulo do GladPros, baseado na exploração real do código.

---

## O que este Skill Produz

| Arquivo | Propósito |
|---------|-----------|
| `quality/QUALITY.md` | Constituição de qualidade — o que "correto" significa neste módulo |
| `quality/functional.test.ts` | Testes automatizados derivados das especificações |
| `quality/RUN_CODE_REVIEW.md` | Protocolo de revisão de código com guardrails |
| `quality/RUN_INTEGRATION_TESTS.md` | Protocolo de testes end-to-end |
| `quality/RUN_SPEC_AUDIT.md` | Auditoria multi-modelo (Council of Three) |
| `AGENTS.md` | Bootstrap context para qualquer sessão de AI |

---

## Como Usar

```
Gere um quality playbook para o módulo de propostas.
```
```
Atualize os testes funcionais — o quality playbook já existe.
```
```
Execute o protocolo de auditoria de spec.
```

---

## Fase 1: Explorar o Código (Não Escrever Ainda)

Antes de gerar qualquer coisa, entender o módulo completamente.

### Passo 0: Perguntar sobre Histórico

Perguntar ao usuário:
> "Você tem histórico de conversas de AI sobre este módulo (exports do Claude, ChatGPT, etc.)? Se sim, indique a pasta. As decisões de design e incidentes documentados lá tornarão o playbook muito mais preciso."

### Passo 1: Identificar Domínio, Stack e Especificações

Ler: README, docs existentes, `package.json`, arquivos Zod (`src/lib/validators/`, `src/app/api/`).

Para o GladPros, responder:
- Qual módulo? (propostas, projetos, estoque, financeiro, service-orders)
- Quais models Prisma ele usa?
- Quais routes de API existem?
- Quais componentes de UI estão envolvidos?
- Quais fluxos de status (state machines) existem?

### Passo 2: Mapear a Arquitetura

Listar: diretórios, entry points, fluxo de dados principal.

Para APIs do GladPros, o fluxo típico é:
```
Request → middleware.ts → API Route → requireUser/requireServerUser
  → Zod validation → Prisma query → Response { data, success }
```

### Passo 3: Ler os Testes Existentes

Verificar `tests/`, `src/**/*.test.ts`, `jest.config.js`.
Registrar: padrão de import, como o projeto configura fixtures.

### Passo 4: Ler as Especificações

Para o GladPros:
- `.github/skills/business-logic-validator/SKILL.md` — state machines e fluxos
- `.github/skills/erp-data-flow/SKILL.md` — relações entre módulos
- `.github/instructions/api-routes.instructions.md` — padrões de API
- `prisma/schema.prisma` — fonte de verdade dos models

### Passo 5: Encontrar os Padrões Defensivos

Procurar por: `try/catch`, null checks, validações Zod, guards de RBAC, verificações de status antes de ações.

Cada padrão defensivo = evidência de uma falha passada ou risco conhecido.

#### 5a: Rastrear State Machines

O GladPros tem várias state machines. Para cada uma, verificar:
1. Todos os estados possíveis estão nos enums?
2. Cada consumer (UI, API, componente) trata todos os estados?
3. Existem estados que pode entrar mas nunca sair?
4. Status guards estão presentes antes de cada transição?

State machines conhecidas:
- `Proposta`: RASCUNHO → ENVIADA → ASSINADA → APROVADA | CANCELADA
- `Projeto`: PLANEJADO → EM_EXECUCAO → EM_INSPECAO → CONCLUIDO → ARQUIVADO
- `Invoice`: DRAFT → SENT → VIEWED → APPROVED → PARTIALLY_PAID → PAID | DISPUTED | CANCELLED | WRITTEN_OFF
- `ServiceOrder`: DRAFT → SCHEDULED → IN_PROGRESS → COMPLETED → CLOSED | CANCELLED | WRITTEN_OFF
- `Material (estoque)`: RESERVADA → UTILIZADA | DEVOLVIDA

#### 5b: Mapear Schemas

Para cada campo com padrão defensivo, registrar o que o schema Zod aceita vs. rejeita.

### Passo 6: Identificar Riscos de Qualidade

Perguntas específicas para o GladPros:

- O que significa "silenciosamente errado" neste módulo?
  - Ex: Material consumido sem `MaterialMovimentacao` = estoque inconsistente
- O que falha a 10x de carga que não falha a 1x?
  - Ex: Múltiplos usuários aprovando a mesma Proposta simultaneamente
- O que acontece se o processo terminar no meio?
  - Ex: Invoice criada mas `ledgerTransactionId` não vinculado
- Existe alguma operação irreversível sem confirmação?
  - Ex: CANCELADA é estado terminal — sem aviso ao usuário?

---

## Fase 2: Gerar o Quality Playbook

### Arquivo 1: `quality/QUALITY.md` — Constituição

Seções obrigatórias:

1. **Propósito** — O que "qualidade" significa para este módulo específico
2. **Alvos de Cobertura** — Tabela de subsistemas com % alvo e justificativa
3. **Prevenção de Coverage Theater** — Exemplos de testes falsos a evitar
4. **Cenários de Fitness-to-Purpose** — Modos de falha realistas com referências de código
5. **Disciplina de Qualidade para Sessões de AI** — Regras para futuras sessões
6. **O Portão Humano** — Coisas que exigem julgamento humano

**Tom dos cenários**: Escrever como vulnerabilidades arquiteturais com quantidades específicas e consequências em cascata. Ex:
> "Porque `ProjetoMaterialEstoque` não tem lock otimista, dois usuários simultâneos podem reservar o último item de estoque — ambas as reservas são salvas mas apenas uma unidade existe. O estoque fica negativo silenciosamente."

### Arquivo 2: `quality/functional.test.ts`

Este é o **entregável mais importante**.

Organizar em três grupos:
- **Spec requirements** — Um teste por seção testável da spec
- **Cenários de fitness** — Um teste por cenário do QUALITY.md (mapeamento 1:1)
- **Boundaries e edge cases** — Um teste por padrão defensivo do Passo 5

Regras:
- Usar o padrão de import exato do projeto (`@/lib/prisma`, `@/shared/lib/rbac`, etc.)
- Ler cada assinatura de função antes de chamar
- Zero testes placeholder (sem `expect(true).toBe(true)`)
- Testar resultados, não mecanismos internos

Contagem de testes esperada = seções testáveis + cenários + padrões defensivos (tipicamente 25-50 para um módulo médio do GladPros)

### Arquivo 3: `quality/RUN_CODE_REVIEW.md`

Protocolo de revisão com guardrails obrigatórios:
- Números de linha são obrigatórios — sem número de linha, sem finding
- Ler o corpo das funções, não apenas as assinaturas
- Se incerto: marcar como QUESTION, não BUG
- Grep antes de afirmar que algo está faltando
- NÃO sugerir mudanças de estilo — apenas problemas incorretos

Após a revisão, gerar testes de regressão em `quality/test_regression.test.ts` para bugs confirmados.

### Arquivo 4: `quality/RUN_INTEGRATION_TESTS.md`

Protocolo que exercita dependências reais (banco de dados MySQL, auth JWT).

Incluir:
- **Restrições de segurança**: nunca rodar contra produção sem confirmação
- **Pre-flight checks**: banco acessível? Migrations aplicadas? `.env` correto?
- **Matriz de testes**: happy path, cross-variant, boundaries
- **UX de execução**: mostrar plano → progresso linha a linha → resumo final
- Usar apenas caminhos relativos nos comandos

### Arquivo 5: `quality/RUN_SPEC_AUDIT.md` — Council of Three

Três modelos de AI independentes auditam o código contra as specs.
Por que três? Cada modelo tem pontos cegos diferentes — três modelos juntos capturam o que qualquer um sozinho perderia.

O protocolo define: prompt de auditoria copiável, áreas de escrutínio específicas do módulo, processo de triagem (merge de findings por nível de confiança).

### Arquivo 6: `AGENTS.md`

Se já existir: **atualizar, não substituir**. Adicionar seção "Quality Docs" apontando para os arquivos gerados.

Se criar do zero: descrição do projeto, comandos de setup, comandos de build/test, visão geral da arquitetura, decisões de design, quirks conhecidos, ponteiros para docs de qualidade.

---

## Fase 3: Verificar

Antes de declarar como pronto, checar:

1. Contagem de testes próxima da meta (seções spec + cenários + padrões)?
2. Cada cenário do QUALITY.md tem um teste correspondente?
3. Todos os testes passam — zero falhas E zero erros?
4. Testes existentes não foram quebrados?
5. Asserções verificam valores, não apenas presença?

Se qualquer verificação falhar: voltar e corrigir antes de prosseguir.

---

## Fase 4: Apresentar e Explorar

Apresentar uma tabela resumo que o usuário pode escanear em 10 segundos:

```
| Arquivo | O que faz | Métrica Chave | Confiança |
|---------|-----------|---------------|-----------|
| QUALITY.md | Constituição | 8 cenários | Alta |
| functional.test.ts | Testes automatizados | 42 passando | Alta |
| RUN_CODE_REVIEW.md | Protocolo de revisão | 6 áreas de foco | Alta |
| RUN_INTEGRATION_TESTS.md | Testes end-to-end | 8 cenários | Média |
| RUN_SPEC_AUDIT.md | Auditoria 3 modelos | 8 áreas escrutínio | Alta |
| AGENTS.md | Bootstrap para AI | Atualizado | Alta |
```

Depois oferecer 3 caminhos de melhoria:
1. Revisar e endurecer itens individualmente
2. Q&A guiado (3-5 perguntas sobre o que não pude inferir do código)
3. Revisar histórico de desenvolvimento (chats exportados)

---

## Terminologia

- **Functional testing**: O código produz o resultado que as specs dizem que deve?
- **Integration testing**: Os componentes funcionam end-to-end com dependências reais?
- **Spec audit**: AI lê código e compara com specs. Sem execução de código.
- **Coverage theater**: Testes com alta cobertura que não capturam bugs reais.
  Ex: `expect(fn).not.toThrow()` sem verificar o resultado.
- **Fitness-to-purpose**: O código faz o que deve em condições reais?

---

## Princípios

1. Fitness-to-purpose acima de percentuais de cobertura
2. Cenários vêm da exploração do código E do conhecimento do domínio
3. Modos de falha concretos tornam os padrões não-negociáveis
4. Guardrails transformam a qualidade de revisões de AI (números de linha, ler corpos de função, grep antes de afirmar)
5. Triagem antes de corrigir — muitos "defeitos" são bugs de spec ou decisões de design
