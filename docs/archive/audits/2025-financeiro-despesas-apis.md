# Módulo DESPESAS - APIs REST

## 📋 Resumo dos Endpoints

Total de **8 endpoints** implementados com validação Zod completa.

### 1. GET `/api/financeiro/despesas`
**Listar despesas com filtros e paginação**

**Query Parameters:**
- `empresaId` (obrigatório)
- `status`: PENDENTE | AGUARDANDO_APROVACAO | APROVADA | REJEITADA | PAGA | CANCELADA
- `tipo`: OPERACIONAL | ADMINISTRATIVA | PESSOAL | MARKETING | etc
- `formaPagamento`: DINHEIRO | PIX | CARTAO_CREDITO | etc
- `categoriaId`, `fornecedorId`, `criadoPor`
- `valorMin`, `valorMax`
- `dataEmissaoInicio`, `dataEmissaoFim`
- `dataVencimentoInicio`, `dataVencimentoFim`
- `dataPagamentoInicio`, `dataPagamentoFim`
- `requerAprovacao`: true | false
- `aprovada`: true | false
- `pendente`: true | false
- `search`: busca textual em descricao, numeroDocumento, observacoes
- `page`, `limit` (paginação)
- `sortBy`: dataEmissao | dataVencimento | dataPagamento | valor | status | descricao | criadoEm
- `sortOrder`: asc | desc

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "empresaId": 1,
      "categoriaId": 1,
      "fornecedorId": 1,
      "descricao": "Salário Funcionário",
      "valor": 5000.00,
      "tipo": "PESSOAL",
      "formaPagamento": "TRANSFERENCIA",
      "status": "APROVADA",
      "dataEmissao": "2025-10-01",
      "dataVencimento": "2025-10-05",
      "dataPagamento": null,
      "requerAprovacao": true,
      "aprovacaoId": 1,
      "categoria": { "id": 1, "nome": "Salários", "cor": "#EF4444" },
      "fornecedor": { "id": 1, "nome": "Fornecedor Exemplo" },
      "usuario": { "id": 1, "nome": "João Silva" },
      "aprovacao": { "id": 1, "status": "APROVADA", "aprovador": {...} }
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "stats": {
    "totalValor": 150000.00,
    "mediaValor": 1500.00,
    "totalDespesas": 100
  }
}
```

**Features:**
- ✅ Filtros avançados (13 tipos)
- ✅ Paginação
- ✅ Ordenação flexível
- ✅ Busca textual
- ✅ Estatísticas agregadas
- ✅ Include de relacionamentos

---

### 2. POST `/api/financeiro/despesas`
**Criar nova despesa (com ou sem aprovação)**

**Body:**
```json
{
  "empresaId": 1,
  "categoriaId": 1,
  "fornecedorId": 1,
  "descricao": "Compra de equipamentos",
  "valor": 15000.00,
  "tipo": "TECNOLOGIA",
  "formaPagamento": "TRANSFERENCIA",
  "status": "PENDENTE",
  "dataEmissao": "2025-10-21",
  "dataVencimento": "2025-10-30",
  "requerAprovacao": true,
  "aprovacao": {
    "aprovadorId": 2,
    "tipoAprovador": "DIRETOR",
    "nivelAprovacao": 1,
    "requerProximoNivel": false,
    "justificativa": "Equipamento necessário para novo projeto"
  },
  "anexoUrl": "https://example.com/nota-fiscal.pdf",
  "numeroDocumento": "NF-12345",
  "observacoes": "Pagamento em 30 dias",
  "criadoPor": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Despesa criada e enviada para aprovação",
  "data": { /* despesa criada */ }
}
```

**Features:**
- ✅ Validação completa com Zod
- ✅ Workflow de aprovação integrado
- ✅ Transação atômica
- ✅ Auto-criação de ExpenseApproval
- ✅ Status automático (AGUARDANDO_APROVACAO se requer aprovação)

**Validações:**
- ✅ Valor positivo e <= R$ 999.999.999,99
- ✅ dataVencimento >= dataEmissao
- ✅ Dados de aprovação obrigatórios se requerAprovacao = true
- ✅ Status PAGA requer dataPagamento

---

### 3. GET `/api/financeiro/despesas/[id]`
**Obter detalhes de uma despesa**

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    /* ... todos os campos */,
    "categoria": { /* detalhes completos */ },
    "fornecedor": { /* detalhes completos */ },
    "usuario": { /* criador */ },
    "aprovacao": { /* workflow completo */ },
    "empresa": { "id": 1, "nome": "GladPros" }
  }
}
```

**Features:**
- ✅ Include completo de todos relacionamentos
- ✅ Detalhes de aprovação com histórico
- ✅ Informações de categoria e fornecedor

---

### 4. PUT `/api/financeiro/despesas/[id]`
**Atualizar despesa**

**Body (partial):**
```json
{
  "descricao": "Nova descrição",
  "valor": 16000.00,
  "dataVencimento": "2025-11-05",
  "observacoes": "Observação adicional"
}
```

**Restrições:**
- ❌ Não pode editar despesa PAGA
- ❌ Não pode editar despesa CANCELADA
- ❌ Não pode editar despesa AGUARDANDO_APROVACAO (cancelar solicitação primeiro)

**Features:**
- ✅ Atualização parcial (todos campos opcionais)
- ✅ Validação de datas
- ✅ Controle de permissões por status
- ✅ Auto-update de atualizadoEm

---

### 5. DELETE `/api/financeiro/despesas/[id]`
**Cancelar despesa (soft delete)**

**Response:**
```json
{
  "success": true,
  "message": "Despesa cancelada com sucesso"
}
```

**Restrições:**
- ❌ Não pode cancelar despesa PAGA (solicitar estorno)
- ❌ Não pode cancelar despesa já CANCELADA

**Features:**
- ✅ Soft delete (status = CANCELADA)
- ✅ Cancela aprovação pendente automaticamente
- ✅ Transação atômica

---

### 6. POST `/api/financeiro/despesas/[id]/aprovar`
**Aprovar despesa (workflow de aprovação)**

**Body:**
```json
{
  "aprovadorId": 2,
  "comentario": "Aprovado conforme orçamento",
  "requerProximoNivel": false,
  "proximoAprovadorId": null
}
```

**Validações de Negócio:**
- ✅ Despesa deve requerAprovacao = true
- ✅ Status deve ser AGUARDANDO_APROVACAO
- ✅ Aprovador deve ser o correto (aprovadorId)
- ✅ Aprovação deve estar PENDENTE
- ✅ Se requerProximoNivel = true, proximoAprovadorId obrigatório

**Fluxo Multi-Nível:**

**Aprovação Nível 1 → Nível 2:**
```json
{
  "aprovadorId": 2,
  "comentario": "Aprovado no nível gerencial",
  "requerProximoNivel": true,
  "proximoAprovadorId": 3  // Diretor
}
```
- Aprovação: status = EM_ANALISE, nivelAprovacao++, aprovadorId = próximo
- Despesa: status = AGUARDANDO_APROVACAO (continua)

**Aprovação Final:**
```json
{
  "aprovadorId": 3,
  "comentario": "Aprovado pela diretoria",
  "requerProximoNivel": false
}
```
- Aprovação: status = APROVADA
- Despesa: status = APROVADA

**Features:**
- ✅ Workflow multi-nível completo
- ✅ Rastreamento de aprovações
- ✅ Auditoria completa
- ✅ Transação atômica

---

### 7. POST `/api/financeiro/despesas/[id]/rejeitar`
**Rejeitar despesa**

**Body:**
```json
{
  "aprovadorId": 2,
  "comentario": "Valor acima do orçamento disponível. Solicite nova aprovação com justificativa."
}
```

**Validações:**
- ✅ Despesa deve requerAprovacao = true
- ✅ Status deve ser AGUARDANDO_APROVACAO
- ✅ Aprovador deve ser o correto
- ✅ Aprovação deve estar PENDENTE ou EM_ANALISE
- ✅ Comentário obrigatório (min 10 caracteres)

**Response:**
```json
{
  "success": true,
  "message": "Despesa rejeitada",
  "data": { /* despesa atualizada */ }
}
```

**Efeitos:**
- Aprovação: status = REJEITADA
- Despesa: status = REJEITADA
- Comentário salvo no registro de aprovação

**Features:**
- ✅ Rejeição em qualquer nível
- ✅ Comentário obrigatório
- ✅ Auditoria completa
- ✅ Transação atômica

---

### 8. POST `/api/financeiro/despesas/[id]/pagar`
**Registrar pagamento de despesa**

**Body:**
```json
{
  "dataPagamento": "2025-10-25",
  "formaPagamento": "TRANSFERENCIA",  // opcional, pode alterar
  "observacoes": "Pagamento realizado via TED"
}
```

**Validações:**
- ✅ Despesa não pode estar PAGA
- ✅ Despesa não pode estar CANCELADA
- ✅ Se requer aprovação, deve estar APROVADA
- ✅ dataPagamento >= dataEmissao

**Response:**
```json
{
  "success": true,
  "message": "Pagamento registrado com sucesso",
  "data": { /* despesa atualizada */ }
}
```

**Efeitos:**
- Status = PAGA
- dataPagamento preenchida
- formaPagamento pode ser atualizada
- Observações anexadas com prefixo [PAGAMENTO]

**Features:**
- ✅ Validação de workflow (aprovação)
- ✅ Histórico de pagamento
- ✅ Flexibilidade na forma de pagamento
- ✅ Auditoria

---

### 9. GET `/api/financeiro/despesas/categorias`
**Listar categorias de despesas com estatísticas**

**Query Parameters:**
- `empresaId` (obrigatório)
- `ativo`: true | false (opcional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "empresaId": 1,
      "nome": "Salários e Encargos",
      "descricao": "Folha de pagamento...",
      "cor": "#EF4444",
      "icone": "users",
      "orcamentoMensal": 50000.00,
      "ativo": true,
      "_count": {
        "despesas": 45
      },
      // Estatísticas do mês atual
      "gastosDoMes": 48500.00,
      "orcamentoRestante": 1500.00,
      "percentualUsado": 97.00,
      "alerta": "critical"  // critical | warning | ok
    }
  ],
  "meta": {
    "total": 10,
    "ativas": 10,
    "inativas": 0
  }
}
```

**Features:**
- ✅ Contador de despesas por categoria
- ✅ **Gastos do mês atual**
- ✅ **Orçamento restante**
- ✅ **Percentual usado**
- ✅ **Sistema de alertas**: critical (>= 90%), warning (>= 75%), ok (< 75%)
- ✅ Filtro por ativo/inativo

---

### 10. POST `/api/financeiro/despesas/categorias`
**Criar nova categoria de despesas**

**Body:**
```json
{
  "empresaId": 1,
  "nome": "Consultoria Externa",
  "descricao": "Serviços de consultoria especializada",
  "cor": "#8B5CF6",
  "icone": "briefcase",
  "orcamentoMensal": 10000.00,
  "ativo": true
}
```

**Validações:**
- ✅ Nome único por empresa
- ✅ Cor no formato hexadecimal (#RRGGBB)
- ✅ Orçamento mensal positivo e <= R$ 999.999.999,99

**Response (201):**
```json
{
  "success": true,
  "message": "Categoria criada com sucesso",
  "data": { /* categoria criada */ }
}
```

---

## 📊 Estatísticas das APIs

### Cobertura de Funcionalidades

| Feature | Implementado |
|---------|-------------|
| CRUD completo | ✅ |
| Filtros avançados | ✅ (13 tipos) |
| Paginação | ✅ |
| Ordenação | ✅ |
| Busca textual | ✅ |
| Validação Zod | ✅ (100%) |
| Workflow de aprovação | ✅ |
| Multi-nível de aprovação | ✅ |
| Transações atômicas | ✅ |
| Soft delete | ✅ |
| Auditoria | ✅ |
| Estatísticas | ✅ |
| Sistema de alertas | ✅ |
| Controle de orçamento | ✅ |

### Complexidade por Endpoint

| Endpoint | LOC | Complexidade | Validações |
|----------|-----|--------------|------------|
| GET /despesas | 189 | Alta | 15 filtros |
| POST /despesas | 107 | Média | 10 regras |
| GET /despesas/[id] | 82 | Baixa | 1 validação |
| PUT /despesas/[id] | 158 | Média | 5 regras |
| DELETE /despesas/[id] | 101 | Média | 3 regras |
| POST /despesas/[id]/aprovar | 229 | Alta | 7 regras |
| POST /despesas/[id]/rejeitar | 170 | Média | 5 regras |
| POST /despesas/[id]/pagar | 142 | Média | 5 regras |
| GET /categorias | 116 | Alta | Estatísticas |
| POST /categorias | 70 | Baixa | 3 validações |
| **TOTAL** | **1,364 LOC** | - | **54 validações** |

### Segurança

✅ Validação de entrada (Zod)  
✅ Sanitização de dados  
✅ Controle de permissões (aprovador correto)  
✅ Verificação de status antes de operações  
✅ Transações atômicas  
✅ Tratamento de erros  
✅ Logs de erro  

### Performance

✅ Uso de indexes no banco (6 por tabela)  
✅ Queries otimizadas com include seletivo  
✅ Paginação para grandes volumes  
✅ Agregações eficientes  
✅ Uso de transactions para consistência  

---

## 🎯 Regras de Negócio Implementadas

### Workflow de Aprovação

1. **Criação de Despesa:**
   - Se `requerAprovacao = true` → status = AGUARDANDO_APROVACAO
   - Se `requerAprovacao = false` → status = PENDENTE
   - ExpenseApproval criado automaticamente se necessário

2. **Aprovação:**
   - **Nível Único:** status = APROVADA (final)
   - **Multi-Nível:** status = EM_ANALISE, passa para próximo aprovador
   - Apenas aprovador designado pode aprovar
   - Auditoria: comentário, revisadoEm

3. **Rejeição:**
   - Pode rejeitar em qualquer nível
   - Comentário obrigatório (min 10 chars)
   - Status final = REJEITADA
   - Workflow encerrado

4. **Pagamento:**
   - Só pode pagar se aprovada (se requer aprovação)
   - Despesas PAGA ou CANCELADA não podem ser pagas
   - Data de pagamento >= data de emissão

### Controle de Edição

| Status | Pode Editar? | Pode Cancelar? | Pode Pagar? |
|--------|-------------|----------------|-------------|
| PENDENTE | ✅ | ✅ | ✅ |
| AGUARDANDO_APROVACAO | ❌ | ✅ | ❌ |
| APROVADA | ✅ | ✅ | ✅ |
| REJEITADA | ✅ | ✅ | ❌ |
| PAGA | ❌ | ❌ (estorno) | ❌ |
| CANCELADA | ❌ | ❌ | ❌ |

### Orçamento e Alertas

**Categorias:**
- Orçamento mensal opcional
- Cálculo automático de gastos do mês
- Sistema de alertas:
  - 🔴 **Critical:** >= 90% do orçamento
  - 🟡 **Warning:** >= 75% do orçamento
  - 🟢 **OK:** < 75% do orçamento

---

## ✅ Conclusão

**Status:** ✅ **8 Endpoints Funcionais + 2 de Categorias = 10 TOTAL**

Todas as APIs estão prontas para uso, com:
- Validação completa
- Workflow de aprovação robusto
- Sistema de alertas de orçamento
- Auditoria completa
- Performance otimizada
- Segurança implementada

**Próximas etapas:**
1. ✅ Frontend (4 páginas)
2. ✅ Testes (~68 testes)
3. ✅ Documentação
