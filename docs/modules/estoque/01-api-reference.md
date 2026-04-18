# 🔌 API REFERENCE - MÓDULO ESTOQUE

**Versão:** 1.0.0  
**Base URL:** `/api/estoque`  
**Autenticação:** Required (JWT Token)

---

## 📋 ÍNDICE

1. [Autenticação](#autenticação)
2. [Dashboard](#dashboard-api)
3. [Materiais](#materiais-api)
4. [Equipamentos](#equipamentos-api)
5. [Movimentações](#movimentações-api)
6. [Alertas](#alertas-api)
7. [Compras](#compras-api)
8. [Relatórios](#relatórios-api)
9. [Códigos de Erro](#códigos-de-erro)
10. [Rate Limiting](#rate-limiting)

---

## 🔐 AUTENTICAÇÃO

Todas as rotas requerem autenticação via JWT Token.

### Headers Obrigatórios

```http
Authorization: Bearer <token>
Content-Type: application/json
```

### Resposta de Erro

```json
{
  "error": "Não autenticado",
  "message": "Token inválido ou expirado"
}
```

**Status Code:** `401 Unauthorized`

---

## 📊 DASHBOARD API

### GET `/api/estoque/dashboard`

Retorna métricas agregadas do estoque.

#### Request

```http
GET /api/estoque/dashboard HTTP/1.1
Authorization: Bearer <token>
```

#### Response `200 OK`

```json
{
  "materiais": {
    "total": 150,
    "ativos": 145,
    "inativos": 5,
    "emAlerta": 12
  },
  "equipamentos": {
    "total": 85,
    "disponiveis": 60,
    "emUso": 20,
    "emManutencao": 3,
    "emCalibracao": 2,
    "emAlerta": 5
  },
  "movimentacoes": {
    "total": 1250,
    "ultimoMes": 89,
    "ultimaSemana": 23
  },
  "alertas": {
    "total": 28,
    "criticos": 3,
    "altos": 8,
    "medios": 12,
    "baixos": 5
  },
  "compras": {
    "pendentes": 5,
    "aprovadas": 2,
    "pedidas": 8,
    "valorTotal": 125000.50
  }
}
```

#### Cache

- **TTL:** 5 minutos
- **Revalidação:** A cada mutação de dados

---

## 📦 MATERIAIS API

### GET `/api/estoque/materiais`

Lista materiais com filtros e paginação.

#### Query Parameters

| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `search` | string | Busca por código/nome | `?search=parafuso` |
| `categoriaId` | number | Filtro por categoria | `?categoriaId=1` |
| `ativo` | boolean | Apenas ativos/inativos | `?ativo=true` |
| `page` | number | Página (padrão: 1) | `?page=2` |
| `pageSize` | number | Itens por página (padrão: 20) | `?pageSize=50` |

#### Request

```http
GET /api/estoque/materiais?search=parafuso&ativo=true&page=1 HTTP/1.1
Authorization: Bearer <token>
```

#### Response `200 OK`

```json
{
  "materiais": [
    {
      "id": "1",
      "codigo": "MAT-001",
      "nome": "Parafuso M8 x 50mm",
      "descricao": "Aço inox, rosca métrica",
      "categoriaId": 1,
      "categoria": {
        "id": 1,
        "nome": "Fixação"
      },
      "unidadeId": 3,
      "unidade": {
        "id": 3,
        "simbolo": "UN"
      },
      "fabricante": "Ciser",
      "modelo": "A2-70",
      "ncm": "73181500",
      "pesoUnitario": 0.025,
      "dimensoes": "8 x 50 mm",
      "fotoUrl": "/uploads/mat-001.jpg",
      "estoqueMinimo": 100,
      "pontoReposicao": 200,
      "rastreioLote": false,
      "possuiValidade": false,
      "ultimoCusto": 0.50,
      "custoMedio": 0.48,
      "ultimaCompraEm": "2025-09-15T10:00:00Z",
      "ativo": true,
      "criadoEm": "2025-01-10T08:30:00Z",
      "atualizadoEm": "2025-10-01T14:20:00Z",
      "saldoAtual": 150,
      "_count": {
        "movimentacoes": 45
      }
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "totalPages": 8
  }
}
```

---

### GET `/api/estoque/materiais/[id]`

Retorna detalhes de um material específico.

#### Request

```http
GET /api/estoque/materiais/1 HTTP/1.1
Authorization: Bearer <token>
```

#### Response `200 OK`

```json
{
  "id": "1",
  "codigo": "MAT-001",
  "nome": "Parafuso M8 x 50mm",
  "descricao": "Aço inox, rosca métrica",
  "categoria": {
    "id": 1,
    "nome": "Fixação",
    "tipo": "MATERIAL"
  },
  "unidade": {
    "id": 3,
    "nome": "Unidade",
    "simbolo": "UN"
  },
  "fabricante": "Ciser",
  "modelo": "A2-70",
  "ncm": "73181500",
  "pesoUnitario": 0.025,
  "dimensoes": "8 x 50 mm",
  "fotoUrl": "/uploads/mat-001.jpg",
  "estoqueMinimo": 100,
  "pontoReposicao": 200,
  "rastreioLote": false,
  "possuiValidade": false,
  "ultimoCusto": 0.50,
  "custoMedio": 0.48,
  "ultimaCompraEm": "2025-09-15T10:00:00Z",
  "ativo": true,
  "criadoEm": "2025-01-10T08:30:00Z",
  "atualizadoEm": "2025-10-01T14:20:00Z",
  "criadoPor": {
    "id": "user-1",
    "nomeCompleto": "João Silva"
  },
  "saldoAtual": 150,
  "movimentacoes": [
    {
      "id": "mov-1",
      "tipo": "ENTRADA",
      "quantidade": 500,
      "dataMovimentacao": "2025-10-01T10:00:00Z",
      "observacao": "Recebimento NF 12345",
      "projeto": {
        "id": "proj-1",
        "numeroProjeto": "2025-001"
      }
    }
  ]
}
```

#### Error `404 Not Found`

```json
{
  "error": "Material não encontrado",
  "message": "Não existe material com ID 1"
}
```

---

### POST `/api/estoque/materiais`

Cria um novo material.

#### Request

```http
POST /api/estoque/materiais HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "codigo": "MAT-002",
  "nome": "Cimento CP-II 50kg",
  "descricao": "Cimento Portland CP-II",
  "categoriaId": 2,
  "unidadeId": 5,
  "fabricante": "Votorantim",
  "modelo": "CP-II-E-32",
  "ncm": "25232910",
  "pesoUnitario": 50,
  "estoqueMinimo": 10,
  "pontoReposicao": 20,
  "rastreioLote": true,
  "possuiValidade": true
}
```

#### Validações

- `codigo`: String única, 2-50 caracteres
- `nome`: String, 3-200 caracteres
- `categoriaId`: Número, categoria deve existir
- `unidadeId`: Número, unidade deve existir
- `estoqueMinimo`: Número >= 0
- `pontoReposicao`: Número >= estoqueMinimo

#### Response `201 Created`

```json
{
  "id": "2",
  "codigo": "MAT-002",
  "nome": "Cimento CP-II 50kg",
  "message": "Material criado com sucesso"
}
```

#### Error `400 Bad Request`

```json
{
  "error": "Validação falhou",
  "message": "Código já existe",
  "field": "codigo"
}
```

---

### PUT `/api/estoque/materiais/[id]`

Atualiza um material existente.

#### Request

```http
PUT /api/estoque/materiais/1 HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "nome": "Parafuso M8 x 50mm - NOVO NOME",
  "estoqueMinimo": 150,
  "pontoReposicao": 300
}
```

**Nota:** Campos não enviados não são alterados (PATCH behavior).

#### Response `200 OK`

```json
{
  "id": "1",
  "message": "Material atualizado com sucesso"
}
```

---

### DELETE `/api/estoque/materiais/[id]`

Exclui um material.

**⚠️ Atenção:** Não pode excluir material com movimentações.

#### Request

```http
DELETE /api/estoque/materiais/1 HTTP/1.1
Authorization: Bearer <token>
```

#### Response `200 OK`

```json
{
  "message": "Material excluído com sucesso"
}
```

#### Error `400 Bad Request`

```json
{
  "error": "Não é possível excluir",
  "message": "Material possui movimentações registradas. Inative ao invés de excluir."
}
```

---

### GET `/api/estoque/materiais/[id]/saldo`

Retorna saldo atual e histórico de movimentações.

#### Request

```http
GET /api/estoque/materiais/1/saldo HTTP/1.1
Authorization: Bearer <token>
```

#### Response `200 OK`

```json
{
  "materialId": "1",
  "codigo": "MAT-001",
  "nome": "Parafuso M8 x 50mm",
  "unidade": "UN",
  "saldoAtual": 150,
  "estoqueMinimo": 100,
  "pontoReposicao": 200,
  "status": "ABAIXO_REPOSICAO",
  "custoMedio": 0.48,
  "valorEmEstoque": 72.00,
  "movimentacoes": {
    "total": 45,
    "entradas": 2500,
    "saidas": 2350,
    "ajustes": 0
  },
  "ultimaMovimentacao": {
    "id": "mov-45",
    "tipo": "SAIDA",
    "quantidade": 50,
    "data": "2025-10-12T09:30:00Z"
  }
}
```

---

## 🔧 EQUIPAMENTOS API

### GET `/api/estoque/equipamentos`

Lista equipamentos com filtros.

#### Query Parameters

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `search` | string | Busca por código/nome/série |
| `tipo` | enum | Tipo de equipamento |
| `status` | enum | Status atual |
| `categoriaId` | number | Filtro por categoria |
| `requerCalibracao` | boolean | Apenas com/sem calibração |
| `page` | number | Página |
| `pageSize` | number | Itens por página |

#### Status Enum

- `DISPONIVEL`
- `EM_USO`
- `MANUTENCAO`
- `CALIBRACAO`
- `INATIVO`

#### Tipo Enum

- `FERRAMENTA_MANUAL`
- `FERRAMENTA_ELETRICA`
- `EQUIPAMENTO_MEDICAO`
- `EQUIPAMENTO_SEGURANCA`
- `ANDAIME`
- `ESCADA`
- `VEICULO`
- `OUTRO`

#### Request

```http
GET /api/estoque/equipamentos?status=DISPONIVEL&tipo=FERRAMENTA_ELETRICA HTTP/1.1
```

#### Response `200 OK`

```json
{
  "equipamentos": [
    {
      "id": "1",
      "codigo": "EQ-001",
      "nome": "Furadeira Impact 750W",
      "tipo": "FERRAMENTA_ELETRICA",
      "marca": "Bosch",
      "modelo": "GSB 16 RE",
      "numeroSerie": "ABC123456",
      "status": "DISPONIVEL",
      "localizacaoAtual": "Almoxarifado - A3",
      "requerCalibracao": false,
      "requerManutencaosPeriodicas": true,
      "proximaManutencao": "2025-12-01",
      "diasParaManutencao": 50,
      "valorAquisicao": 899.90,
      "dataAquisicao": "2024-06-15",
      "fotoUrl": "/uploads/eq-001.jpg"
    }
  ],
  "pagination": {
    "total": 85,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

---

### POST `/api/estoque/equipamentos/[id]/alocar`

Aloca equipamento para um projeto.

#### Request

```http
POST /api/estoque/equipamentos/1/alocar HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "projetoId": "proj-1",
  "responsavel": "João Silva",
  "localizacao": "Obra ABC - Canteiro",
  "observacao": "Levado para furação de laje"
}
```

#### Validações

- Equipamento deve estar `DISPONIVEL`
- Projeto deve existir

#### Response `200 OK`

```json
{
  "id": "1",
  "status": "EM_USO",
  "projetoAtualId": "proj-1",
  "localizacaoAtual": "Obra ABC - Canteiro",
  "message": "Equipamento alocado com sucesso",
  "movimentacaoId": "mov-123"
}
```

#### Error `400 Bad Request`

```json
{
  "error": "Equipamento indisponível",
  "message": "Equipamento está EM_MANUTENCAO e não pode ser alocado"
}
```

---

### POST `/api/estoque/equipamentos/[id]/devolver`

Devolve equipamento de um projeto.

#### Request

```http
POST /api/estoque/equipamentos/1/devolver HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "localizacao": "Almoxarifado - A3",
  "observacao": "Equipamento em perfeito estado"
}
```

#### Validações

- Equipamento deve estar `EM_USO`

#### Response `200 OK`

```json
{
  "id": "1",
  "status": "DISPONIVEL",
  "projetoAtualId": null,
  "localizacaoAtual": "Almoxarifado - A3",
  "message": "Equipamento devolvido com sucesso",
  "movimentacaoId": "mov-124"
}
```

---

## 📊 MOVIMENTAÇÕES API

### GET `/api/estoque/movimentacoes`

Lista movimentações com filtros.

#### Query Parameters

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `tipo` | enum | Tipo de movimentação |
| `materialId` | string | Filtro por material |
| `equipamentoId` | string | Filtro por equipamento |
| `projetoId` | string | Filtro por projeto |
| `dataInicio` | date | Data início (YYYY-MM-DD) |
| `dataFim` | date | Data fim (YYYY-MM-DD) |
| `page` | number | Página |

#### Tipo Enum

- `ENTRADA`
- `SAIDA`
- `AJUSTE`
- `TRANSFERENCIA`
- `DEVOLUCAO`

#### Request

```http
GET /api/estoque/movimentacoes?tipo=SAIDA&projetoId=proj-1&dataInicio=2025-10-01 HTTP/1.1
```

#### Response `200 OK`

```json
{
  "movimentacoes": [
    {
      "id": "mov-1",
      "tipo": "SAIDA",
      "materialId": "1",
      "material": {
        "id": "1",
        "codigo": "MAT-001",
        "nome": "Parafuso M8 x 50mm",
        "unidade": { "simbolo": "UN" }
      },
      "equipamentoId": null,
      "quantidade": 50,
      "projetoId": "proj-1",
      "projeto": {
        "id": "proj-1",
        "numeroProjeto": "2025-001",
        "nome": "Obra ABC"
      },
      "dataMovimentacao": "2025-10-12T09:30:00Z",
      "observacao": "Consumo na furação da laje",
      "criadoEm": "2025-10-12T09:30:00Z",
      "criadoPor": {
        "id": "user-1",
        "nomeCompleto": "João Silva"
      }
    }
  ],
  "pagination": {
    "total": 1250,
    "page": 1,
    "pageSize": 12,
    "totalPages": 105
  }
}
```

---

### POST `/api/estoque/movimentacoes`

Cria uma nova movimentação.

#### Request

```http
POST /api/estoque/movimentacoes HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "tipo": "SAIDA",
  "materialId": "1",
  "quantidade": 50,
  "projetoId": "proj-1",
  "dataMovimentacao": "2025-10-12T09:30:00Z",
  "observacao": "Consumo na furação da laje"
}
```

#### Validações

- `tipo`: Obrigatório
- `materialId` OU `equipamentoId`: Um dos dois obrigatório
- `quantidade`: Número > 0
- **SAIDA**: Verifica saldo suficiente
- Material/Equipamento deve existir e estar ativo

#### Response `201 Created`

```json
{
  "id": "mov-125",
  "tipo": "SAIDA",
  "materialId": "1",
  "quantidade": 50,
  "saldoAnterior": 200,
  "saldoAtual": 150,
  "message": "Movimentação registrada com sucesso"
}
```

#### Error `400 Bad Request`

```json
{
  "error": "Saldo insuficiente",
  "message": "Material possui saldo de 30 UN. Quantidade solicitada: 50 UN",
  "saldoAtual": 30,
  "quantidadeSolicitada": 50
}
```

---

## ⚠️ ALERTAS API

### GET `/api/estoque/alertas`

Lista alertas com filtros.

#### Query Parameters

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `tipo` | enum | Tipo de alerta |
| `prioridade` | enum | Prioridade |
| `status` | enum | Status (ativo/resolvido) |
| `materialId` | string | Filtro por material |
| `equipamentoId` | string | Filtro por equipamento |
| `page` | number | Página |

#### Tipo Enum

- `ESTOQUE_MINIMO`
- `PONTO_REPOSICAO`
- `VALIDADE_PROXIMA`
- `VALIDADE_VENCIDA`
- `CALIBRACAO_VENCIDA`
- `MANUTENCAO_NECESSARIA`
- `EQUIPAMENTO_MANUTENCAO`

#### Prioridade Enum

- `CRITICA` (🔴)
- `ALTA` (🟠)
- `MEDIA` (🟡)
- `BAIXA` (🟢)

#### Request

```http
GET /api/estoque/alertas?prioridade=CRITICA&status=ativo HTTP/1.1
```

#### Response `200 OK`

```json
{
  "alertas": [
    {
      "id": "alert-1",
      "tipo": "ESTOQUE_MINIMO",
      "prioridade": "CRITICA",
      "materialId": "1",
      "material": {
        "id": "1",
        "codigo": "MAT-001",
        "nome": "Parafuso M8 x 50mm",
        "saldoAtual": 50,
        "estoqueMinimo": 100
      },
      "equipamentoId": null,
      "projetoId": null,
      "titulo": "Estoque Mínimo Atingido",
      "mensagem": "Material 'Parafuso M8 x 50mm' atingiu o estoque mínimo. Saldo atual: 50 UN",
      "dataAlerta": "2025-10-12T08:00:00Z",
      "dataVisualizado": "2025-10-12T09:15:00Z",
      "visualizadoPor": "user-1",
      "dataResolvido": null,
      "resolvidoPor": null,
      "solucao": null,
      "ativo": true
    }
  ],
  "pagination": {
    "total": 28,
    "page": 1,
    "pageSize": 20,
    "totalPages": 2
  },
  "stats": {
    "total": 28,
    "criticos": 3,
    "altos": 8,
    "medios": 12,
    "baixos": 5
  }
}
```

---

### POST `/api/estoque/alertas/[id]/visualizar`

Marca alerta como visualizado.

#### Request

```http
POST /api/estoque/alertas/alert-1/visualizar HTTP/1.1
Authorization: Bearer <token>
```

#### Response `200 OK`

```json
{
  "id": "alert-1",
  "dataVisualizado": "2025-10-12T10:30:00Z",
  "visualizadoPor": "user-1",
  "message": "Alerta marcado como visualizado"
}
```

---

### POST `/api/estoque/alertas/[id]/resolver`

Resolve um alerta com solução.

#### Request

```http
POST /api/estoque/alertas/alert-1/resolver HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "solucao": "Pedido realizado ao fornecedor XYZ - Previsão de entrega em 5 dias"
}
```

#### Validações

- `solucao`: String obrigatória, mínimo 10 caracteres

#### Response `200 OK`

```json
{
  "id": "alert-1",
  "dataResolvido": "2025-10-12T10:45:00Z",
  "resolvidoPor": "user-1",
  "solucao": "Pedido realizado ao fornecedor XYZ - Previsão de entrega em 5 dias",
  "ativo": false,
  "message": "Alerta resolvido com sucesso"
}
```

---

## 🛒 COMPRAS API

### GET `/api/estoque/compras`

Lista compras com filtros.

#### Query Parameters

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `status` | enum | Status da compra |
| `tipo` | enum | MATERIAL ou EQUIPAMENTO |
| `fornecedorId` | number | Filtro por fornecedor |
| `projetoId` | string | Filtro por projeto |
| `page` | number | Página |

#### Status Enum

- `RASCUNHO`
- `PENDENTE`
- `APROVADA`
- `PEDIDA`
- `PARCIAL`
- `RECEBIDA`
- `CANCELADA`

#### Request

```http
GET /api/estoque/compras?status=PEDIDA&fornecedorId=1 HTTP/1.1
```

#### Response `200 OK`

```json
{
  "compras": [
    {
      "id": "1",
      "fornecedorId": 1,
      "fornecedor": {
        "id": 1,
        "nome": "Fornecedor ABC Ltda"
      },
      "numeroNf": "12345",
      "dataCompra": "2025-10-10",
      "dataEntrega": "2025-10-15",
      "tipo": "MATERIAL",
      "projetoId": "proj-1",
      "projeto": {
        "id": "proj-1",
        "numeroProjeto": "2025-001"
      },
      "valorTotal": 5250.00,
      "desconto": 250.00,
      "frete": 120.00,
      "formaPagamento": "BOLETO",
      "status": "PEDIDA",
      "observacoes": "Entrega até às 14h",
      "criadoEm": "2025-10-10T08:00:00Z",
      "_count": {
        "itens": 5
      }
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "pageSize": 12,
    "totalPages": 13
  }
}
```

---

### GET `/api/estoque/compras/[id]`

Retorna detalhes completos de uma compra.

#### Request

```http
GET /api/estoque/compras/1 HTTP/1.1
```

#### Response `200 OK`

```json
{
  "id": "1",
  "fornecedorId": 1,
  "fornecedor": {
    "id": 1,
    "nome": "Fornecedor ABC Ltda",
    "cnpj": "12.345.678/0001-90",
    "telefone": "(11) 1234-5678"
  },
  "numeroNf": "12345",
  "dataCompra": "2025-10-10",
  "dataEntrega": "2025-10-15",
  "tipo": "MATERIAL",
  "projetoId": "proj-1",
  "projeto": {
    "id": "proj-1",
    "numeroProjeto": "2025-001",
    "nome": "Obra ABC"
  },
  "valorTotal": 5250.00,
  "desconto": 250.00,
  "frete": 120.00,
  "formaPagamento": "BOLETO",
  "status": "PEDIDA",
  "observacoes": "Entrega até às 14h",
  "criadoEm": "2025-10-10T08:00:00Z",
  "itens": [
    {
      "id": "item-1",
      "compraId": "1",
      "materialId": "1",
      "material": {
        "id": "1",
        "codigo": "MAT-001",
        "nome": "Parafuso M8 x 50mm",
        "unidade": { "simbolo": "UN" }
      },
      "equipamentoId": null,
      "quantidade": 1000,
      "quantidadeRecebida": 0,
      "valorUnitario": 0.50,
      "valorTotal": 500.00,
      "observacao": "Entrega prioritária"
    }
  ]
}
```

---

### POST `/api/estoque/compras`

Cria uma nova compra.

#### Request

```http
POST /api/estoque/compras HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "fornecedorId": 1,
  "numeroNf": "12345",
  "dataCompra": "2025-10-10",
  "dataEntrega": "2025-10-15",
  "tipo": "MATERIAL",
  "projetoId": "proj-1",
  "formaPagamento": "BOLETO",
  "observacoes": "Entrega até às 14h",
  "itens": [
    {
      "materialId": "1",
      "quantidade": 1000,
      "valorUnitario": 0.50
    },
    {
      "materialId": "2",
      "quantidade": 50,
      "valorUnitario": 25.00
    }
  ],
  "desconto": 250.00,
  "frete": 120.00
}
```

#### Validações

- `fornecedorId`: Obrigatório, fornecedor deve existir
- `dataCompra`: Obrigatório
- `tipo`: Obrigatório (MATERIAL ou EQUIPAMENTO)
- `itens`: Array não vazio
- Cada item:
  - `materialId` OU `equipamentoId`: Obrigatório
  - `quantidade`: > 0
  - `valorUnitario`: >= 0

#### Response `201 Created`

```json
{
  "id": "2",
  "status": "RASCUNHO",
  "valorTotal": 1620.00,
  "quantidadeItens": 2,
  "message": "Compra criada com sucesso"
}
```

---

### POST `/api/estoque/compras/[id]/receber`

Registra recebimento de itens da compra.

#### Request

```http
POST /api/estoque/compras/1/receber HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "itens": [
    {
      "itemId": "item-1",
      "quantidadeRecebida": 1000
    },
    {
      "itemId": "item-2",
      "quantidadeRecebida": 30
    }
  ],
  "observacao": "Recebimento conforme NF 12345"
}
```

#### Validações

- Compra deve estar em status `PEDIDA` ou `PARCIAL`
- `quantidadeRecebida` <= (quantidade - quantidadeRecebida anterior)
- `quantidadeRecebida` > 0

#### Response `200 OK`

```json
{
  "id": "1",
  "status": "PARCIAL",
  "itensRecebidos": 2,
  "itensPendentes": 0,
  "movimentacoes": ["mov-126", "mov-127"],
  "message": "Recebimento registrado com sucesso"
}
```

**Efeito Automático:**
- ✅ Estoque atualizado
- ✅ Movimentações do tipo ENTRADA criadas
- ✅ Custos (último custo e custo médio) atualizados
- ✅ Status da compra atualizado (PARCIAL ou RECEBIDA)

---

## 📊 RELATÓRIOS API

### GET `/api/estoque/relatorios/consumo`

Relatório de consumo de materiais por período e projeto.

#### Query Parameters

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `dataInicio` | date | Data início (YYYY-MM-DD) |
| `dataFim` | date | Data fim (YYYY-MM-DD) |
| `projetoId` | string | Filtro por projeto (opcional) |
| `materialId` | string | Filtro por material (opcional) |

#### Request

```http
GET /api/estoque/relatorios/consumo?dataInicio=2025-10-01&dataFim=2025-10-12 HTTP/1.1
```

#### Response `200 OK`

```json
{
  "periodo": {
    "inicio": "2025-10-01",
    "fim": "2025-10-12",
    "dias": 12
  },
  "consumo": [
    {
      "materialId": "1",
      "material": {
        "codigo": "MAT-001",
        "nome": "Parafuso M8 x 50mm",
        "unidade": "UN"
      },
      "quantidadeTotal": 1250,
      "valorTotal": 600.00,
      "custoMedio": 0.48,
      "projetos": [
        {
          "projetoId": "proj-1",
          "projeto": {
            "numeroProjeto": "2025-001",
            "nome": "Obra ABC"
          },
          "quantidade": 800,
          "valor": 384.00
        },
        {
          "projetoId": "proj-2",
          "projeto": {
            "numeroProjeto": "2025-002",
            "nome": "Reforma XYZ"
          },
          "quantidade": 450,
          "valor": 216.00
        }
      ]
    }
  ],
  "totais": {
    "materiaisDistintos": 25,
    "quantidadeTotal": 15780,
    "valorTotal": 35420.50
  }
}
```

---

### GET `/api/estoque/relatorios/inventario`

Relatório de inventário atual.

#### Query Parameters

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `categoriaId` | number | Filtro por categoria |
| `tipo` | enum | MATERIAL ou EQUIPAMENTO |
| `apenasBaixoEstoque` | boolean | Apenas itens abaixo do mínimo |

#### Request

```http
GET /api/estoque/relatorios/inventario?tipo=MATERIAL&apenasBaixoEstoque=true HTTP/1.1
```

#### Response `200 OK`

```json
{
  "dataRelatorio": "2025-10-12T15:30:00Z",
  "tipo": "MATERIAL",
  "filtros": {
    "apenasBaixoEstoque": true
  },
  "itens": [
    {
      "id": "1",
      "codigo": "MAT-001",
      "nome": "Parafuso M8 x 50mm",
      "unidade": "UN",
      "saldoAtual": 50,
      "estoqueMinimo": 100,
      "pontoReposicao": 200,
      "statusEstoque": "CRITICO",
      "custoMedio": 0.48,
      "valorTotal": 24.00,
      "ultimaMovimentacao": "2025-10-12T09:30:00Z"
    }
  ],
  "resumo": {
    "totalItens": 12,
    "itens CRITICOS": 3,
    "itensABaixoReposicao": 5,
    "itensAdequados": 4,
    "valorTotalEstoque": 125430.50
  }
}
```

---

## ⚠️ CÓDIGOS DE ERRO

### Estrutura de Erro

```json
{
  "error": "Código de erro legível",
  "message": "Mensagem detalhada do erro",
  "field": "campo-com-erro",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

| Código | Significado | Quando usar |
|--------|-------------|-------------|
| `200` | OK | Sucesso em GET, PUT, DELETE |
| `201` | Created | Sucesso em POST (recurso criado) |
| `400` | Bad Request | Validação falhou, dados inválidos |
| `401` | Unauthorized | Não autenticado ou token inválido |
| `403` | Forbidden | Autenticado mas sem permissão |
| `404` | Not Found | Recurso não encontrado |
| `409` | Conflict | Conflito (ex: código duplicado) |
| `422` | Unprocessable Entity | Regra de negócio violada |
| `429` | Too Many Requests | Rate limit excedido |
| `500` | Internal Server Error | Erro interno do servidor |

### Códigos Específicos

| Code | Descrição |
|------|-----------|
| `MATERIAL_NOT_FOUND` | Material não existe |
| `MATERIAL_CODE_EXISTS` | Código já cadastrado |
| `INSUFFICIENT_STOCK` | Saldo insuficiente |
| `EQUIPMENT_UNAVAILABLE` | Equipamento não disponível |
| `INVALID_STATUS_TRANSITION` | Transição de status inválida |
| `COMPRA_NAO_PODE_RECEBER` | Status não permite recebimento |
| `ITEM_JA_RECEBIDO` | Item já foi recebido completamente |

---

## 🛡️ RATE LIMITING

### Limites Padrão

| Tipo | Limite | Janela |
|------|--------|--------|
| **Leitura** (GET) | 100 requisições | 1 minuto |
| **Escrita** (POST/PUT/DELETE) | 30 requisições | 1 minuto |
| **Uploads** | 10 requisições | 1 minuto |

### Headers de Rate Limit

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1697123456
```

### Resposta ao Exceder

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
  "error": "Rate limit excedido",
  "message": "Aguarde 60 segundos antes de tentar novamente",
  "retryAfter": 60
}
```

---

## 📝 CHANGELOG

### v1.0.0 - 12/10/2025

**Lançamento Inicial** 🎉

- ✨ APIs completas de todos os módulos
- ✨ Autenticação JWT
- ✨ Filtros e paginação
- ✨ Validações robustas
- ✨ Rate limiting
- ✨ Documentação completa

---

**Desenvolvido com ❤️ pela equipe GladPros**  
**API Version:** 1.0.0  
**Última atualização:** 12 de outubro de 2025
