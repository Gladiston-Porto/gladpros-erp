# Módulo Usuários — Validação Operacional, Smoke, Regression e MCP

**Status:** Ativo  
**Base de evidência:** suíte Playwright do módulo usuários em `tests/e2e/usuarios/`  
**Última atualização:** 2026-04-23

---

## 1. Objetivo

Este documento transforma a suíte E2E já existente do módulo usuários em um protocolo de execução simples para uso diário.

Ele responde a três perguntas operacionais:

1. O que precisa rodar sempre que houver mudança no módulo?
2. O que precisa rodar antes de merge ou deploy?
3. Onde o Playwright MCP entra como validação guiada por navegador?

---

## 2. Critério de Entrada

Antes de executar a validação do módulo usuários:

1. O ambiente deve usar a configuração Playwright atual do projeto.
2. O banco de teste precisa estar acessível para os seeds do módulo.
3. A base URL padrão esperada é `http://127.0.0.1:3007`.
4. O fluxo built/E2E do projeto deve continuar sendo o padrão de confiança.

Comandos-base já existentes no repositório:

```bash
npm run test:e2e -- --project=chromium tests/e2e/usuarios
```

```bash
npx playwright test tests/e2e/usuarios --project=chromium --reporter=line
```

---

## 3. Smoke Suite

Executar smoke quando houver alteração pequena, correção localizada, ajuste de UI do módulo ou mudança de rota/API diretamente ligada a usuários.

Arquivo principal:

- `tests/e2e/usuarios/usuarios-smoke.spec.ts`

Objetivo do smoke:

1. Confirmar que auth obrigatória continua funcionando.
2. Confirmar que os endpoints essenciais respondem com shape mínima válida.
3. Confirmar que dados sensíveis não vazam.
4. Confirmar que um role sem permissão continua bloqueado.

Checklist smoke recomendado:

| Área | O que validar | Evidência existente |
|------|---------------|---------------------|
| Auth | Rotas principais retornam `401` sem token | `usuarios-smoke.spec.ts` |
| Listagem | `GET /api/usuarios` responde `200` com `items` e `total` | `usuarios-smoke.spec.ts` |
| Paginação | `pageSize=1` limita a resposta | `usuarios-smoke.spec.ts` |
| Contrato | Content-Type JSON continua correto | `usuarios-smoke.spec.ts` |
| Dados sensíveis | `senhaHash`, `senha` não aparecem na listagem | `usuarios-smoke.spec.ts` |
| RBAC mínimo | `CLIENTE` continua recebendo `403` | `usuarios-smoke.spec.ts` |

Quando considerar o smoke suficiente:

1. Mudança visual pequena no drawer, tabela ou formulário.
2. Ajuste simples de validação sem alterar regra de permissão.
3. Correção localizada em serialização, response shape ou paginação.

---

## 4. Regression Suite

Executar regression antes de merge relevante, release interna, refactor do módulo, mudança de RBAC, alteração de Zod, export, sessões ou auditoria.

Arquivos principais:

- `tests/e2e/usuarios/usuarios-regression.spec.ts`
- `tests/e2e/usuarios/01-usuarios-crud.spec.ts`
- `tests/e2e/usuarios/02-usuarios-rbac.spec.ts`
- `tests/e2e/usuarios/03-usuarios-security.spec.ts`
- `tests/e2e/usuarios/04-usuarios-validation.spec.ts`
- `tests/e2e/usuarios/05-usuarios-sessions.spec.ts`
- `tests/e2e/usuarios/06-usuarios-export.spec.ts`
- `tests/e2e/usuarios/07-usuarios-audit.spec.ts`
- `tests/e2e/usuarios/08-usuarios-admin-actions.spec.ts`
- `tests/e2e/usuarios/usuarios-edge-cases.spec.ts`

Matriz de regression:

| Bloco | Risco coberto | Arquivos |
|------|---------------|----------|
| CRUD | criação, leitura, paginação, filtros, sort, soft delete, duplicidade | `01-usuarios-crud.spec.ts` |
| RBAC | matriz por role, limites do gerente, bloqueios de create/delete/export | `02-usuarios-rbac.spec.ts` |
| Segurança | self-edit restrito, último ADMIN, auto-delete, strict mode | `03-usuarios-security.spec.ts`, `usuarios-regression.spec.ts` |
| Validação | telefone, CEP, data, email, enums inválidos, payload estrito | `04-usuarios-validation.spec.ts` |
| Sessões | leitura e revogação de sessões próprias e de terceiros | `05-usuarios-sessions.spec.ts` |
| Export | CSV/PDF, filtros, cabeçalhos, escape e permissões | `06-usuarios-export.spec.ts` |
| Auditoria | create, update, delete, toggle-status e leitura ordenada | `07-usuarios-audit.spec.ts` |
| Admin actions | endpoint `/security`, self-edit permitido e `/status` explícito | `08-usuarios-admin-actions.spec.ts` |
| Edge cases | payload extremo, injection guard, paginação fora da faixa, XSS | `usuarios-edge-cases.spec.ts` |
| Guards P1/P2 | regressões já corrigidas no módulo | `usuarios-regression.spec.ts` |

Comando recomendado para regression completa:

```bash
npx playwright test tests/e2e/usuarios --project=chromium --reporter=line
```

Gate mínimo para considerar o módulo usuários validado:

1. Smoke verde.
2. Regression verde no Chromium.
3. Nenhuma quebra em RBAC, auditoria, export ou self-edit.

---

## 5. Roteiro MCP

O Playwright MCP não substitui a suíte Playwright do repositório.

Ele deve ser usado como camada complementar para:

1. validar comportamento visual;
2. reproduzir fluxo operacional rapidamente;
3. inspecionar estados de interface antes de formalizar ou atualizar testes.

Configuração do workspace:

- `.vscode/mcp.json`
- `.vscode/extensions.json`

Fluxos prioritários para MCP no módulo usuários:

### 5.1 Lista de usuários

Objetivo:

1. abrir a tela do módulo;
2. validar carregamento da listagem;
3. conferir busca, filtros e paginação visível;
4. verificar se ações disponíveis batem com o role autenticado.

O que observar no navegador:

1. estado inicial da tabela;
2. resposta visual para busca e filtros;
3. presença ou ausência de ações administrativas.

### 5.2 Drawer de visualização

Objetivo:

1. abrir um usuário pela listagem;
2. validar campos principais no drawer;
3. conferir fechamento e retorno de foco;
4. verificar consistência em viewport de tablet.

### 5.3 Criação de usuário

Objetivo:

1. abrir a tela de novo usuário;
2. preencher payload válido;
3. validar mensagens inline em campos inválidos;
4. submeter e confirmar feedback visual.

### 5.4 Edição de usuário

Objetivo:

1. abrir um usuário existente;
2. alterar campos permitidos;
3. salvar;
4. confirmar persistência visual e ausência de regressão nos campos bloqueados.

### 5.5 RBAC visual

Objetivo:

1. comparar ADMIN, GERENTE e USUARIO;
2. confirmar diferenças em botões, ações e navegação;
3. verificar se o frontend não oferece ação que o backend negará.

---

## 6. Ordem Recomendada de Execução

### Mudança pequena

1. `usuarios-smoke.spec.ts`
2. fluxo MCP correspondente ao ponto alterado

### Mudança média

1. `usuarios-smoke.spec.ts`
2. arquivo temático relacionado ao risco alterado
3. fluxo MCP do caso principal

Exemplos:

- mudança em export: rodar `06-usuarios-export.spec.ts`
- mudança em regras de role: rodar `02-usuarios-rbac.spec.ts` e `usuarios-regression.spec.ts`
- mudança em self-edit: rodar `03-usuarios-security.spec.ts` e `08-usuarios-admin-actions.spec.ts`

### Mudança crítica

1. smoke
2. regression completa de `tests/e2e/usuarios`
3. roteiro MCP dos 5 fluxos prioritários

Mudanças críticas incluem:

1. alteração em `src/app/api/usuarios/**`
2. mudança de schema/validação do módulo
3. alteração em auditoria, sessões, export ou RBAC
4. refactor estrutural da UI do módulo

---

## 7. Critérios de Aprovação

O módulo usuários pode ser considerado validado quando:

1. a suíte definida para o risco da mudança estiver verde;
2. o fluxo MCP equivalente não mostrar divergência visual ou de navegação;
3. nenhuma ação sensível estiver exposta para role indevido;
4. create, edit, toggle-status, export e auditoria permanecerem coerentes.

Sinais de bloqueio para merge:

1. `401/403` divergente do esperado em endpoints protegidos;
2. vazamento de campo sensível;
3. auto-elevação de role ou mutação indevida em self-edit;
4. quebra de export ou auditoria;
5. regressão na proteção do último ADMIN.

---

## 8. Uso Prático no Dia a Dia

Resumo objetivo:

1. Use smoke para confirmar que o módulo ainda está vivo e protegido.
2. Use regression para qualquer mudança com impacto em regra de negócio.
3. Use MCP para enxergar o comportamento visual e operacional da UI.
4. Não substitua a suíte Playwright existente por MCP.

Este é o fluxo recomendado para o módulo usuários no GladPros hoje.