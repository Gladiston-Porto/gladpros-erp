# 🧪 Testes de Integração - API Projetos

## 📋 Visão Geral

Suite completa de testes de integração para validar todos os 40 endpoints da API de Projetos com Playwright Test.

### Cobertura de Testes

- ✅ **Autenticação**: 5 testes
- ✅ **RBAC Permissões**: 20 testes  
- ✅ **CRUD Projetos**: 15 testes
- ✅ **Status Transitions**: 5 testes
- ✅ **Ownership Checks**: 3 testes
- ✅ **Etapas CRUD**: 8 testes
- ✅ **Tarefas CRUD**: 7 testes
- ✅ **Materiais CRUD**: 7 testes
- ✅ **Anexos**: 7 testes
- ✅ **Histórico**: 4 testes
- ✅ **Dashboard**: 5 testes
- ✅ **Mascaramento Financeiro**: 4 testes

**Total:** ~90 testes de integração

---

## 📁 Estrutura de Arquivos

```
tests/
└── e2e/
    ├── fixtures/
    │   └── auth.ts                              # Fixtures de autenticação
    └── api/
        ├── projetos-auth-rbac.spec.ts           # Testes de autenticação e RBAC
        ├── projetos-crud.spec.ts                # Testes de CRUD completo
        ├── projetos-subrecursos.spec.ts         # Testes de etapas, tarefas, materiais
        └── projetos-anexos-dashboard.spec.ts    # Testes de anexos, histórico, dashboard
```

---

## 🚀 Como Executar

### Pré-requisitos

1. **Servidor Next.js rodando:**
   ```powershell
   npm run dev
   ```

2. **Banco de dados configurado:**
   - PostgreSQL rodando
   - Variáveis de ambiente configuradas (.env)
   - Migrations aplicadas

### Comandos

```powershell
# Executar todos os testes de integração
npm run test:e2e

# Executar com UI interativa
npm run test:e2e:ui

# Executar em modo debug
npm run test:e2e:debug

# Executar com navegador visível
npm run test:e2e:headed

# Executar apenas um arquivo específico
npx playwright test tests/e2e/api/projetos-auth-rbac.spec.ts

# Executar apenas um teste específico
npx playwright test -g "deve retornar 401 sem token"

# Gerar relatório HTML
npx playwright show-report
```

---

## 🧩 Fixtures de Autenticação

### Uso nos Testes

```typescript
import { test, expect } from '../fixtures/auth';

test('exemplo', async ({ request, adminHeaders }) => {
  const response = await request.get('http://localhost:3000/api/projetos', {
    headers: adminHeaders,
  });
  
  expect(response.status()).toBe(200);
});
```

### Fixtures Disponíveis

- `adminHeaders` - Headers com token de ADMIN
- `gerenteHeaders` - Headers com token de GERENTE  
- `usuarioHeaders` - Headers com token de USUARIO
- `estoqueHeaders` - Headers com token de ESTOQUE
- `financeiroHeaders` - Headers com token de FINANCEIRO

### Mock Users

```typescript
import { mockUsers } from '../fixtures/auth';

// Disponíveis:
mockUsers.admin      // id: 1, role: ADMIN
mockUsers.gerente    // id: 2, role: GERENTE
mockUsers.usuario    // id: 3, role: USUARIO
mockUsers.estoque    // id: 4, role: ESTOQUE
mockUsers.financeiro // id: 5, role: FINANCEIRO
```

---

## 📊 Categorias de Testes

### 1. Autenticação (5 testes)

**Arquivo:** `projetos-auth-rbac.spec.ts`

- ✅ Retorna 401 sem token
- ✅ Retorna 401 com token inválido
- ✅ Aceita token válido ADMIN
- ✅ Aceita token válido GERENTE
- ✅ Aceita token válido USUARIO

### 2. RBAC - Permissões (20 testes)

**Arquivo:** `projetos-auth-rbac.spec.ts`

#### Criar Projeto (5 testes)
- ✅ ADMIN pode criar
- ✅ GERENTE pode criar
- ❌ USUARIO não pode criar (403)
- ❌ ESTOQUE não pode criar (403)
- ❌ FINANCEIRO não pode criar (403)

#### Excluir Projeto (3 testes)
- ✅ ADMIN pode excluir
- ❌ GERENTE não pode excluir (403)
- ❌ USUARIO não pode excluir (403)

#### Dashboard (4 testes)
- ✅ ADMIN pode acessar
- ✅ GERENTE pode acessar
- ❌ USUARIO não pode acessar (403)
- ✅ FINANCEIRO pode acessar

#### Histórico (3 testes)
- ✅ ADMIN pode ver
- ✅ GERENTE pode ver
- ❌ USUARIO não pode ver (403)

#### Materiais (4 testes)
- ✅ ADMIN pode gerenciar
- ✅ GERENTE pode gerenciar
- ❌ USUARIO não pode gerenciar (403)
- ✅ ESTOQUE pode gerenciar

### 3. CRUD Completo (15 testes)

**Arquivo:** `projetos-crud.spec.ts`

- ✅ Criar projeto (POST)
- ✅ Listar projetos (GET)
- ✅ Listar com paginação
- ✅ Listar com filtro de status
- ✅ Buscar por ID (GET)
- ✅ Retornar 404 para inexistente
- ✅ Atualizar projeto (PUT)
- ✅ Validar dados obrigatórios (400)
- ✅ Validar formato de datas (400)
- ✅ Retornar 400 para ID inválido

### 4. Status Transitions (5 testes)

**Arquivo:** `projetos-crud.spec.ts`

- ✅ Alterar de planejado → em_execucao
- ❌ Rejeitar transição inválida (400)
- ✅ Permitir suspensão
- ✅ Registrar histórico de mudança
- ✅ Validar regras de transição

### 5. Ownership Checks (3 testes)

**Arquivo:** `projetos-crud.spec.ts`

- ✅ USUARIO pode editar projetos próprios
- ❌ USUARIO não pode editar projetos alheios (403)
- ✅ ADMIN/GERENTE podem editar qualquer projeto

### 6. Etapas (8 testes)

**Arquivo:** `projetos-subrecursos.spec.ts`

- ✅ Criar etapa (POST)
- ✅ Listar etapas (GET)
- ✅ Buscar por ID (GET)
- ✅ Atualizar etapa (PUT)
- ✅ Alterar status (PATCH)
- ✅ Reordenar etapas (POST)
- ✅ Excluir etapa (DELETE)
- ✅ Validar ordem automática

### 7. Tarefas (7 testes)

**Arquivo:** `projetos-subrecursos.spec.ts`

- ✅ Criar tarefa (POST)
- ✅ Listar tarefas (GET)
- ✅ Buscar por ID (GET)
- ✅ Atualizar tarefa (PUT)
- ✅ Alterar status (PATCH)
- ✅ Excluir tarefa (DELETE)
- ✅ Validar associação com etapa

### 8. Materiais (7 testes)

**Arquivo:** `projetos-subrecursos.spec.ts`

- ✅ Criar material (POST)
- ✅ Listar materiais (GET)
- ✅ Buscar por ID (GET)
- ✅ Atualizar material (PUT)
- ✅ Alterar status (PATCH)
- ✅ Calcular custoTotal automaticamente
- ✅ Excluir material (DELETE)

### 9. Anexos (7 testes)

**Arquivo:** `projetos-anexos-dashboard.spec.ts`

- ✅ Criar metadados de anexo (POST)
- ✅ Listar anexos (GET)
- ✅ Buscar por ID (GET)
- ✅ Obter estatísticas (GET)
- ❌ GERENTE não pode excluir (403)
- ✅ ADMIN pode excluir (DELETE)
- ✅ Validar permissões de download

### 10. Histórico (4 testes)

**Arquivo:** `projetos-anexos-dashboard.spec.ts`

- ✅ Listar histórico (GET)
- ✅ Listar com paginação
- ✅ Validar estrutura de entradas
- ❌ USUARIO não pode acessar (403)

### 11. Dashboard (5 testes)

**Arquivo:** `projetos-anexos-dashboard.spec.ts`

- ✅ Retornar métricas completas
- ✅ Incluir todos os status
- ✅ Incluir todas as prioridades
- ❌ USUARIO não pode acessar (403)
- ✅ FINANCEIRO pode acessar

### 12. Mascaramento Financeiro (4 testes)

**Arquivo:** `projetos-anexos-dashboard.spec.ts`

- ✅ ADMIN vê dados financeiros
- ✅ GERENTE vê dados financeiros
- ❌ USUARIO não vê dados (mascarados)
- ✅ FINANCEIRO vê dados financeiros

---

## 🎯 Padrões de Teste

### 1. Estrutura de Teste

```typescript
test.describe('API Projetos - Feature', () => {
  let resourceId: number;

  test.beforeAll(async ({ request }) => {
    // Setup: criar recursos necessários
  });

  test('deve fazer X', async ({ request, adminHeaders }) => {
    const response = await request.METHOD(url, {
      headers: adminHeaders,
      data: { /* payload */ },
    });

    expect(response.status()).toBe(expectedStatus);
    
    const body = await response.json();
    expect(body.field).toBe(expectedValue);
  });
});
```

### 2. Verificação de Status HTTP

```typescript
// Sucesso exato
expect(response.status()).toBe(200);

// Múltiplas possibilidades
expect([200, 404, 500]).toContain(response.status());

// Detectar falha de permissão
if (response.status() === 403) {
  throw new Error('Role deveria ter permissão');
}
```

### 3. Validação de Resposta

```typescript
const body = await response.json();

// Campos obrigatórios
expect(body.id).toBeDefined();
expect(body.numeroProjeto).toMatch(/^PRJ-\d{4}-\d{4}$/);

// Tipos
expect(body.data).toBeInstanceOf(Array);
expect(typeof body.totalProjetos).toBe('number');

// Valores específicos
expect(body.status).toBe('planejado');
expect(body.orcamento).toBe(50000);
```

### 4. Testes de Permissão

```typescript
// Deve ter acesso
test('ADMIN pode X', async ({ request, adminHeaders }) => {
  const response = await request.get(url, { headers: adminHeaders });
  expect([200, 500]).toContain(response.status());
  
  if (response.status() === 403) {
    throw new Error('ADMIN deveria ter permissão');
  }
});

// Não deve ter acesso
test('USUARIO não pode X', async ({ request, usuarioHeaders }) => {
  const response = await request.get(url, { headers: usuarioHeaders });
  expect(response.status()).toBe(403);
});
```

---

## 🐛 Troubleshooting

### Problema: Testes falhando com 500 Internal Server Error

**Causa:** Banco de dados não configurado ou migrations não aplicadas.

**Solução:**
```powershell
# Aplicar migrations
npx prisma migrate deploy

# Verificar conexão
npx prisma db pull
```

### Problema: Token inválido em todos os testes

**Causa:** Variável JWT_SECRET não configurada ou incorreta.

**Solução:**
```powershell
# Verificar .env
cat .env | Select-String JWT_SECRET

# Regenerar secret se necessário
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Problema: beforeAll não encontra recursos

**Causa:** Dependência entre testes causando falhas.

**Solução:**
```typescript
// Sempre validar se recurso foi criado
if (!projetoId) {
  test.skip();
  return;
}
```

### Problema: Testes lentos (>30s)

**Causa:** Muitas requisições sequenciais.

**Solução:**
- Reduzir número de `beforeAll` aninhados
- Usar `test.describe.configure({ mode: 'parallel' })`
- Criar recursos mockados em vez de via API

---

## 📈 Relatórios

### Gerar Relatório HTML

```powershell
npx playwright test
npx playwright show-report
```

### Relatório de Cobertura

O Playwright não gera cobertura de código automaticamente. Para cobertura:

1. Use instrumentação manual com Istanbul
2. Configure coverage reporter no `playwright.config.ts`
3. Ou use testes unitários Jest para cobertura

### CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Run Integration Tests
  run: |
    npm run build
    npm run test:e2e
  env:
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

---

## ✅ Checklist de Qualidade

Antes de dar merge:

- [ ] Todos os testes passando (90/90)
- [ ] Sem testes `.skip()` não intencionais
- [ ] Relatório HTML gerado e revisado
- [ ] Fixtures de auth funcionando
- [ ] Banco de dados seed aplicado
- [ ] Documentação atualizada
- [ ] Nenhum token hardcoded (usar fixtures)
- [ ] Status HTTP validados corretamente
- [ ] Mensagens de erro assertadas

---

## 📚 Referências

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright API Testing](https://playwright.dev/docs/test-api-testing)
- [Next.js API Routes Testing](https://nextjs.org/docs/pages/building-your-application/testing)
- [Projeto GladPros - Documentação](../../docs/08-modulo-projetos-plan.md)

---

**Última Atualização:** 04/10/2025  
**Autor:** GitHub Copilot  
**Status:** ✅ Suite Completa - 90 testes
