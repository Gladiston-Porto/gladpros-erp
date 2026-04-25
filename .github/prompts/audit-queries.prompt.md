---
description: "Auditoria de performance focada em queries Prisma — detecta N+1, falta de índices, listagens sem paginação, select excessivo, queries sequenciais desnecessárias"
agent: "agent"
---

# Audit Queries — Performance de Banco de Dados

Use este prompt para auditar queries Prisma em um módulo ou arquivo específico.

**Informe o alvo:**

> Exemplo: "Audite as queries de src/app/api/projetos/route.ts e src/app/api/service-orders/route.ts"

---

## O Que Será Analisado

### 🚨 P1 — Proibido em Produção

**N+1 Query (await dentro de .map)**
```typescript
// ❌ DETECTAR E CORRIGIR
const items = await prisma.proposta.findMany()
const result = await Promise.all(items.map(async (item) => {
  const cliente = await prisma.cliente.findUnique({ where: { id: item.clienteId } })
  return { ...item, cliente }
}))

// ✅ CORRETO
const result = await prisma.proposta.findMany({ include: { cliente: true } })
```

**findMany sem paginação em tabela que cresce**
```typescript
// ❌ DETECTAR
const todos = await prisma.ordemServico.findMany()

// ✅ CORRETO
const dados = await prisma.ordemServico.findMany({ take: pageSize, skip: offset })
```

---

### ⚠️ P2 — Otimizações Importantes

**Queries independentes sequenciais (usar Promise.all)**
```typescript
// ❌ DETECTAR
const propostas = await prisma.proposta.findMany(...)
const projetos  = await prisma.projeto.findMany(...)  // podia ser paralelo

// ✅ CORRETO
const [propostas, projetos] = await Promise.all([...])
```

**select excessivo (trazendo colunas desnecessárias)**
```typescript
// ❌ DETECTAR — inclui campos grandes não usados
const users = await prisma.usuario.findMany()

// ✅ CORRETO
const users = await prisma.usuario.findMany({
  select: { id: true, email: true, nomeCompleto: true, nivel: true }
})
```

**count + findMany sequenciais (podia ser paralelo)**
```typescript
// ❌ DETECTAR
const total = await prisma.cliente.count({ where: filtros })
const dados  = await prisma.cliente.findMany({ where: filtros })

// ✅ CORRETO
const [total, dados] = await Promise.all([count, findMany])
```

---

### 📋 P3 — Verificações de Schema

**Campo filtrável sem índice**
```prisma
// ❌ DETECTAR — status usado em WHERE mas sem @@index
model OrdemServico {
  status String
}

// ✅ CORRETO
model OrdemServico {
  status String
  @@index([status])
  @@index([clienteId, status])
}
```

---

## Relatório de Saída

O agente vai gerar:

```markdown
## Query Audit — [arquivo]

### P1 — Críticos (N+1, sem paginação)
- [ ] Linha X: await dentro de .map() — N+1 detectado
      Solução: usar include no findMany

### P2 — Otimizações
- [ ] Linha Y: count + findMany sequenciais
      Solução: Promise.all([count, findMany])

### P3 — Schema
- [ ] Campo `status` em `OrdemServico` não tem @@index
      Solução: adicionar @@index([status]) na migration

### Score de Performance
Queries analisadas: N
P1 encontrados: X
P2 encontrados: Y  
P3 encontrados: Z
```

---

Informe o arquivo ou módulo e eu executo a auditoria.
