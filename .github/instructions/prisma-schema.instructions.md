---
description: "Use when creating or modifying Prisma schema files. Covers naming conventions, index rules, relation patterns, enum definitions, and migration safety for the GladPros ERP."
applyTo: "prisma/**/*.prisma"
---

# Prisma Schema Standards

## Naming Conventions

```prisma
// Models: PascalCase singular
model Cliente { }
model OrdemServico { }
model ProjetoMaterialEstoque { }

// Fields: camelCase
id          Int      @id @default(autoincrement())
criadoEm    DateTime @default(now())
atualizadoEm DateTime @updatedAt
empresaId   Int

// Enums: PascalCase name, UPPER_SNAKE_CASE values
enum StatusProposta {
  RASCUNHO
  ENVIADA
  APROVADA
  CANCELADA
}

// Relations: camelCase, named to avoid ambiguity
projeto    Projeto  @relation("ProjetoExpenses", fields: [projetoId], references: [id])
projetoId  Int
```

---

## Campos Obrigatórios em Todo Model

```prisma
model ExempModel {
  id          Int      @id @default(autoincrement())
  empresaId   Int                                    // sempre 1 (single-tenant)
  criadoEm    DateTime @default(now())
  atualizadoEm DateTime @updatedAt

  @@index([empresaId])   // index obrigatório
}
```

---

## Índices — Regras Obrigatórias

```prisma
// 1. Todo FK deve ter @@index
model Invoice {
  clienteId  Int
  projetoId  Int?

  @@index([clienteId])
  @@index([projetoId])
}

// 2. Campos usados em WHERE frequente devem ter @@index
model OrdemServico {
  status   String
  techId   Int?

  @@index([status])
  @@index([techId, status])    // índice composto quando filtrados juntos
  @@index([criadoEm])          // se ordenado por data com frequência
}

// 3. Campos únicos — usar @unique ou @@unique
model Usuario {
  email String @unique

  @@unique([empresaId, email])  // unicidade por empresa
}
```

---

## Relações — Padrões

```prisma
// 1-N: FK fica no lado "muitos"
model Projeto {
  id        Int
  clienteId Int
  cliente   Cliente @relation(fields: [clienteId], references: [id])

  @@index([clienteId])
}

// N-M: usar tabela join explícita (não @relation many-to-many implícito)
model ProjetoTag {
  projetoId Int
  tagId     Int
  projeto   Projeto @relation(fields: [projetoId], references: [id])
  tag       Tag     @relation(fields: [tagId], references: [id])

  @@id([projetoId, tagId])   // PK composta
  @@index([tagId])
}

// Self-referencing (hierarquia)
model Categoria {
  id       Int        @id @default(autoincrement())
  parentId Int?
  parent   Categoria? @relation("CategoriaHierarquia", fields: [parentId], references: [id])
  children Categoria[] @relation("CategoriaHierarquia")
}
```

---

## Tipos de Campo

```prisma
// Valores monetários — sempre Decimal, nunca Float
valor     Decimal  @db.Decimal(10, 2)
preco     Decimal  @db.Decimal(10, 2)

// Texto longo — Text (sem limite) vs String (255 default)
descricao String   @db.Text
notas     String?  @db.Text
nome      String                        // 191 chars max no MySQL utf8mb4

// JSON — para dados semi-estruturados
metadata  Json?

// Status como String vs Enum — prefira Enum para status machine
// Enum: quando os valores são fixos e conhecidos
// String: quando os valores podem crescer dinamicamente
```

---

## Soft Delete

```prisma
// Padrão de soft delete quando necessário
deletadoEm  DateTime?
deletadoPor Int?

// Nas queries — filtrar sempre
prisma.model.findMany({ where: { deletadoEm: null } })
```

---

## Migrations — Regras de Segurança

```bash
# SEMPRE testar em staging antes de produção
npx prisma migrate dev --name "descricao_clara_da_mudanca"

# NUNCA usar --force em produção
# NUNCA fazer DROP sem backup confirmado

# Para renomear campo (não use @map diretamente):
# 1. Criar campo novo
# 2. Migrar dados: UPDATE table SET novo = antigo
# 3. Remover campo antigo em migration separada
```

**Migrations Destrutivas — Requerem Aprovação:**
- `DROP TABLE`
- `DROP COLUMN`
- `ALTER COLUMN` (mudança de tipo)
- Remover `@unique` ou `@@unique` de campo com dados

---

## Anti-patterns

```prisma
// ❌ Float para dinheiro (imprecisão)
valor  Float

// ❌ FK sem índice
clienteId  Int  // sem @@index([clienteId])

// ❌ Relation name duplicado (causa erro de Prisma)
proposta Proposta @relation(fields: [propostaId], references: [id])
// outro model com mesma relation sem nome explícito

// ❌ Status como String sem enum quando os valores são fixos
status String  // use enum StatusProposta

// ❌ Model sem empresaId em sistema single-tenant
// (mesmo sendo single-tenant, manter para integridade)
```
