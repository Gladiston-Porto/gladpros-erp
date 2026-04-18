# 📋 MATRIZ DE PERMISSÕES - SISTEMA GLADPROS

## 🎯 VISÃO GERAL

Este documento consolida as regras de negócio e permissões implementadas no sistema GladPros, baseado na análise do código fonte existente.

## 👥 HIERARQUIA DE USUÁRIOS

O sistema implementa uma hierarquia de 6 níveis de acesso:

```
ADMIN → GERENTE → FINANCEIRO → ESTOQUE → USUARIO → CLIENTE
```

### 📊 DESCRIÇÃO DOS NÍVEIS

| Nível | Descrição | Responsabilidades |
|-------|-----------|------------------|
| **ADMIN** | Administrador do Sistema | Controle total do sistema, gestão de usuários, configurações globais |
| **GERENTE** | Gerente Geral | Supervisão de operações, gestão de equipe, aprovações |
| **FINANCEIRO** | Responsável Financeiro | Gestão financeira, relatórios financeiros, controle de custos |
| **ESTOQUE** | Responsável por Estoque | Controle de inventário, materiais, almoxarifado |
| **USUARIO** | Usuário de Campo | Operações diárias, atendimento a clientes, projetos |
| **CLIENTE** | Cliente Externo | Acesso limitado a propostas e projetos próprios |

---

## 🔐 MATRIZ DE PERMISSÕES POR MÓDULO

### 📁 Módulo: USUÁRIOS (`usuarios`)

| Ação | ADMIN | GERENTE | FINANCEIRO | ESTOQUE | USUARIO | CLIENTE |
|------|-------|---------|------------|---------|---------|---------|
| **Listar** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Criar** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Editar** | ✅ | ✅ (subordinados) | ❌ | ❌ | ❌ | ❌ |
| **Alterar Status** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Ver Detalhes** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Exportar** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

**Regras Específicas:**
- GERENTE pode gerenciar apenas: USUARIO, FINANCEIRO, ESTOQUE
- FINANCEIRO e ESTOQUE não podem gerenciar usuários
- USUARIO pode ver/editar apenas seu próprio perfil

### 📁 Módulo: CLIENTES (`clientes`)

| Ação | ADMIN | GERENTE | FINANCEIRO | ESTOQUE | USUARIO | CLIENTE |
|------|-------|---------|------------|---------|---------|---------|
| **Listar** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Criar** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Editar** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Excluir** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Ver Documentos** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

**Regras Específicas:**
- Todos os níveis internos têm acesso total aos clientes
- Apenas ADMIN pode excluir clientes
- Apenas ADMIN e GERENTE podem ver documentos descriptografados

### 📁 Módulo: PROJETOS (`projetos`)

| Ação | ADMIN | GERENTE | FINANCEIRO | ESTOQUE | USUARIO | CLIENTE |
|------|-------|---------|------------|---------|---------|---------|
| **Listar** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Criar** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Editar** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Excluir** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Ver Detalhes** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (próprios) |

**Regras Específicas:**
- Todos os níveis internos têm acesso total
- CLIENTE pode ver apenas projetos relacionados a ele

### 📁 Módulo: PROPOSTAS (`propostas`)

| Ação | ADMIN | GERENTE | FINANCEIRO | ESTOQUE | USUARIO | CLIENTE |
|------|-------|---------|------------|---------|---------|---------|
| **Listar** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Criar** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Editar** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Excluir** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Ver Detalhes** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

**Regras Específicas:**
- ESTOQUE, USUARIO e CLIENTE não têm acesso às propostas
- Apenas níveis superiores (ADMIN, GERENTE, FINANCEIRO) podem gerenciar propostas

### 📁 Módulo: ESTOQUE (`estoque`)

| Ação | ADMIN | GERENTE | FINANCEIRO | ESTOQUE | USUARIO | CLIENTE |
|------|-------|---------|------------|---------|---------|---------|
| **Listar** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Criar** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Editar** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Excluir** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Ver Detalhes** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

**Regras Específicas:**
- Apenas ADMIN e ESTOQUE podem modificar itens
- GERENTE, FINANCEIRO e USUARIO têm acesso apenas de leitura

### 📁 Módulo: FINANCEIRO (`financeiro`)

| Ação | ADMIN | GERENTE | FINANCEIRO | ESTOQUE | USUARIO | CLIENTE |
|------|-------|---------|------------|---------|---------|---------|
| **Listar** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Criar** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Editar** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Excluir** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Ver Detalhes** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |

**Regras Específicas:**
- Apenas ADMIN e FINANCEIRO têm acesso ao módulo financeiro
- GERENTE não tem acesso direto ao financeiro

---

## 🔒 REGRAS DE NEGÓCIO GERAIS

### 📝 Validações de Usuário

1. **Idade Mínima**: Usuário deve ter pelo menos 18 anos
2. **Email**: Formato válido obrigatório
3. **Telefone**: Formato americano (XXX)XXX-XXXX obrigatório
4. **CEP**: Formato americano XXXXX ou XXXXX-XXXX

### 🔐 Autenticação e Segurança

1. **MFA**: Obrigatório para todos os usuários
2. **Bloqueio**: Conta bloqueada após múltiplas tentativas falhidas
3. **Sessões**: Controle de sessões ativas por usuário
4. **Logs**: Auditoria completa de todas as ações

### 📊 Relatórios e Exportações

1. **ADMIN/GERENTE**: Podem exportar dados de todos os módulos
2. **Outros níveis**: Acesso limitado aos próprios dados
3. **Formatos**: PDF e CSV disponíveis

---

## 🚀 IMPLEMENTAÇÃO TÉCNICA

### 📂 Arquivos Principais

- `src/shared/lib/rbac-core.ts`: Matriz de permissões central
- `src/shared/lib/rbac.ts`: Funções de verificação de permissões
- `src/modules/usuarios/middleware/userPermissions.ts`: Regras específicas de usuários
- `src/shared/lib/validation.ts`: Validações de negócio

### 🔧 Middleware de Segurança

- Verificação de permissões em todas as rotas API
- Sanitização de dados de entrada
- Controle de acesso baseado em roles
- Logs de auditoria automáticos

---

## � PLANO DE IMPLEMENTAÇÃO RBAC V1.1

### 🎯 Contexto e Decisões Tomadas
Após análise detalhada do sistema atual e discussão sobre melhores práticas, decidimos:
- **Esperar finalização dos módulos**: Propostas, projetos e financeiro devem estar prontos antes de implementar RBAC v1.1 completo, para evitar quebras de API.
- **Melhores práticas para acesso a módulos**: Opção 2 recomendada - módulos sem permissão não aparecem no sidebar/menu. Tentativas de acesso direto são bloqueadas com página de erro.
- **Hierarquia confirmada**: ADMIN → GERENTE → FINANCEIRO → ESTOQUE → USUARIO → CLIENTE.

### 📅 Plano em 5 Etapas (para quando módulos estiverem prontos)
1. **Preparação e Política Básica**: Criar `src/policies/rbac-v11.json` e middlewares básicos (`requireRole`, `requirePermission`).
2. **Integração Backend em Módulos Estáveis**: Aplicar em usuários/clientes com field-level security e ABAC.
3. **Expansão para Módulos Pendentes**: Integrar propostas/projetos/financeiro com SoD e validações.
4. **Frontend e Auditoria**: Provider de sessão, menus dinâmicos e logs de auditoria.
5. **Validação Final**: Testes, deploy incremental e monitoramento.

---

## 🔐 DOCUMENTO RBAC V1.1 COMPLETO

### Princípios
- Menor privilégio + Segregação de Funções (SoD).
- Field-level security: valores ($) e documentos sensíveis só para ADMIN/FINANCEIRO.
- ABAC quando necessário (ex.: portal do cliente por ownerId).

### Matriz por módulo (consolidada)
Módulo / Ação | ADMIN | GERENTE | USUARIO | FINANCEIRO | ESTOQUE | CLIENTE
---|---|---|---|---|---|---|
Dashboard | RWG | R (operacional, sem $) | R (operacional, sem $) | R (financeiro) | R (estoque) | R (próprio)
Usuários | RWG | – | – | – | – | –
Clientes | RWG | RW | RW | R | R | R (próprio)
Propostas – conteúdo técnico | RWG | RW | R/Comment + rascunho | R | – | R (suas, pós-envio)
Propostas – valores | R | – | – | R | – | R só na janela de assinatura
Projetos – escopo/cronograma | RWG | RW | RW | R | R (itens/baixas) | R (seu)
Projetos – valores | R | – | – | R | – | –
Estoque/Almoxarifado | RWG | R | R | R | RW | –
Empréstimos/Devoluções/Triagem | RWG | R | R | R | RW | –
Financeiro (empresa, fluxo, centros) | RWG | – | – | RW | – | –
Invoices & Pagamentos | RWG | – | – | RW (SoD) | R (logística) | R (próprias)
Relatórios/Analytics | RWG | R (operacional sem $) | R (operacional sem $) | R (financeiros) | R (estoque) | R (próprios)
Auditoria (logs) | RWG | R | R | R | R | –
Configurações | RWG | – | – | – | – | –

### Resumo chave
- USUÁRIO: zero finanças; opera clientes/projetos; em propostas, só rascunho/comentário.
- GERENTE: opera clientes/propostas/projetos sem ver valores.
- ADMIN/FINANCEIRO: únicos com visão de qualquer valor.

### Leitura Modular + Ajustes
1. Usuários: Apenas ADMIN (RWG).
2. Clientes: ADMIN/GERENTE/USUARIO (RW), FINANCEIRO/ESTOQUE (R), CLIENTE (R próprio). Ajuste: documento mascarado.
3. Propostas: ADMIN (RWG), GERENTE (RW + approve_operational), USUARIO (R/Comment), FINANCEIRO (R). Ajuste: separar aprovações operacional vs financeira.
4. Projetos: ADMIN/GERENTE/USUARIO (RW), FINANCEIRO/ESTOQUE (R), CLIENTE (R self). Ajuste: fechamento exige validações.
5. Estoque: ESTOQUE (RW), outros (R). Ajuste: custos sob FINANCEIRO.
6. Empréstimos: ESTOQUE (RW), outros (R). Ajuste: confirmação exclusiva de ESTOQUE.
7. Triagem: ESTOQUE (RW), outros (R). Ajuste: status padronizados.
8. Financeiro: FINANCEIRO (RW), ADMIN (RWG). Ajuste: SoD para invoices/payments.
9. Invoices: FINANCEIRO (RW), ADMIN (RWG), ESTOQUE (R logística), CLIENTE (R próprias). Ajuste: cancelamento com dupla checagem.
10. Relatórios: KPIs segmentados por papel.
11. Auditoria: ADMIN (RWG), outros (R). Ajuste: logs imutáveis.
12. Configurações: Apenas ADMIN (RWG). Ajuste: break-glass temporário.

### Regras de Campo (Field-Level Security)
- Campos monetários: valor_estimado, preco_unitario, subtotal, total, descontos, impostos, budget, custo, margem, lucro.
- Visíveis: ADMIN, FINANCEIRO.
- Documento (SSN/ITIN/EIN): Mascarado para não-ADMIN/FINANCEIRO.

### Rascunho Técnico
- Policy JSON: Define roles com permissões granulares.
- Middlewares: requireRole, requirePermission, stripMoney, maskDocument.
- Auditoria: Logs para aprovações, leituras sensíveis.

---

## 📈 PRÓXIMOS PASSOS ATUALIZADOS

1. **Finalizar módulos pendentes**: Propostas, projetos e financeiro.
2. **Implementar plano RBAC v1.1**: Seguir as 5 etapas quando módulos estiverem prontos.
3. **Criar hierarquia de usuários**: Arquivo `src/shared/lib/user-hierarchy.ts` com níveis e funções.
4. **Testes e auditoria**: Validar permissões e logs.
5. **Documentação técnica**: Atualizar com detalhes de implementação.

---

*Este documento foi gerado automaticamente baseado na análise do código fonte existente. Última atualização: $(date)*