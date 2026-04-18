# Módulo Service Orders (Ordens de Serviço) — Documentação Técnica

**Status:** ✅ Produção  
**Última atualização:** 2026-04-18  

---

## 1. Visão Geral

O módulo de Ordens de Serviço (OS) é o núcleo operacional do GladPros ERP. Gerencia o ciclo completo de execução de serviços: criação, agendamento, execução em campo, coleta de materiais, controle de técnicos, assinatura do cliente e geração de invoice.

Integra-se com: Clientes, Projetos, Estoque (materiais), Financeiro (despesas e invoices), Workforce (técnicos), Warranty Tickets e Purchase Orders.

---

## 2. Arquitetura (estrutura de pastas real)

```
src/app/(dashboard)/ordens-servico/
├── page.tsx                          # Lista principal de OS
├── layout.tsx
├── loading.tsx
├── lista/
│   └── page.tsx                      # Vista de lista alternativa
├── nova/
│   ├── page.tsx                      # Criação de nova OS
│   └── _components/
│       ├── ServiceOrderClientSection.tsx
│       ├── ServiceOrderMaterialsSection.tsx
│       ├── ServiceOrderScheduleSection.tsx
│       ├── ServiceOrderScopeSection.tsx
│       └── types.ts
└── [id]/
    ├── page.tsx                      # Detalhe da OS
    └── _components/
        ├── ServiceOrderDetailModals.tsx
        └── ServiceOrderSidebar.tsx

src/app/api/service-orders/
├── route.ts                          # GET (lista) / POST (criar)
├── warranty-tickets/
│   ├── route.ts                      # GET / POST warranty tickets
│   └── [id]/route.ts                 # GET / PATCH / DELETE ticket
└── [id]/
    ├── route.ts                      # GET / PATCH / DELETE
    ├── status/route.ts               # PATCH — transição de status
    ├── attachments/route.ts          # GET / POST anexos
    ├── generate-invoice/route.ts     # POST — gerar invoice da OS
    ├── history/route.ts              # GET histórico de status
    ├── signature/route.ts            # POST — salvar assinatura do cliente
    ├── materials/
    │   ├── route.ts                  # GET / POST materiais
    │   ├── consume/route.ts          # POST — baixar material do estoque
    │   ├── reserve/route.ts          # POST — reservar material
    │   ├── return/route.ts           # POST — devolver material ao estoque
    │   └── [materialId]/
    │       ├── route.ts              # PATCH / DELETE material
    │       ├── approve-purchase/route.ts
    │       └── reject-purchase/route.ts
    ├── scope-items/
    │   ├── route.ts                  # GET / POST itens de escopo
    │   └── [itemId]/route.ts         # PATCH / DELETE item
    ├── technicians/
    │   ├── route.ts                  # GET / POST técnicos atribuídos
    │   └── [workerId]/route.ts       # DELETE técnico
    └── work-entries/
        ├── route.ts                  # GET / POST apontamentos de horas
        └── recalculate/route.ts      # POST — recalcular totais
```

---

## 3. Modelo de Dados (campos Prisma reais)

### ServiceOrder (`@@map("service_orders")`)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `Int` | PK autoincrement |
| `ticketNumber` | `String @unique` | Número legível (ex: SO-2025-001) |
| `clienteId` | `Int` | FK → Cliente |
| `title` | `String` | Título do serviço |
| `description` | `String?` | Descrição detalhada |
| `status` | `ServiceOrderStatus` | Estado atual (ver máquina de estados) |
| `priority` | `ServiceOrderPriority?` | LOW / MEDIUM / HIGH / EMERGENCY |
| `scheduleType` | `ScheduleType` | FIXED ou FLEXIBLE |
| `scheduledDate` | `DateTime?` | Data agendada (FIXED) |
| `scheduleDateStart/End` | `DateTime?` | Janela (FLEXIBLE) |
| `materialSupply` | `MaterialSupplyType` | CLIENT_PROVIDES ou COMPANY_PROVIDES |
| `assignedWorkerId` | `Int?` | FK → Worker principal |
| `projetoId` | `Int?` | FK → Projeto (opcional) |
| `invoiceId` | `Int? @unique` | FK → Invoice gerada |
| `total` | `Decimal(12,2)` | Total calculado |
| `laborTotal` | `Decimal(12,2)` | Total mão de obra |
| `materialTotal` | `Decimal(12,2)` | Total materiais |
| `estimatedHours` | `Decimal(5,2)?` | Horas estimadas |
| `hourlyRate` | `Decimal(10,2)?` | Taxa por hora |
| `clientSignatureUrl` | `String?` | URL da assinatura capturada |
| `techNotes` | `String?` | Notas internas do técnico |
| `clientNotes` | `String?` | Notas visíveis ao cliente |
| `serviceAddressLine1/2` | `String?` | Endereço do serviço (se diferente do cliente) |
| `sameClientAddress` | `Boolean` | Usa endereço do cliente? |
| `createdAt / updatedAt` | `DateTime` | Timestamps |
| `startedAt / completedAt / closedAt` | `DateTime?` | Timestamps de transições |

### Modelos relacionados

- **ServiceOrderMaterial** — materiais alocados (status: PENDING / NEEDS_PURCHASE / RESERVED / CONSUMED / RETURNED)
- **ServiceOrderTechnician** — técnicos adicionais além do assigned worker
- **ServiceOrderScopeItem** — itens de escopo (checklist de trabalho)
- **ServiceOrderHistory** — log de todas as transições de status
- **ServiceOrderAttachment** — arquivos e fotos anexados
- **WorkEntry** — apontamentos de horas por técnico
- **WarrantyTicket** — chamados de garantia originados de uma OS

---

## 4. API REST (endpoints reais)

| Método | Rota | RBAC mínimo | Descrição |
|--------|------|-------------|-----------|
| `GET` | `/api/service-orders` | `service-orders:read` | Listar OS com filtros e paginação |
| `POST` | `/api/service-orders` | `service-orders:create` | Criar nova OS |
| `GET` | `/api/service-orders/:id` | `service-orders:read` | Detalhe da OS |
| `PATCH` | `/api/service-orders/:id` | `service-orders:update` | Editar campos da OS |
| `DELETE` | `/api/service-orders/:id` | `service-orders:delete` | Cancelar/excluir OS |
| `PATCH` | `/api/service-orders/:id/status` | `service-orders:update` | Transição de status |
| `POST` | `/api/service-orders/:id/generate-invoice` | `invoices:create` | Gerar invoice da OS |
| `POST` | `/api/service-orders/:id/signature` | `service-orders:update` | Salvar assinatura |
| `GET` | `/api/service-orders/:id/history` | `service-orders:read` | Histórico de transições |
| `GET/POST` | `/api/service-orders/:id/materials` | `service-orders:read/update` | Materiais da OS |
| `POST` | `/api/service-orders/:id/materials/reserve` | `estoque:update` | Reservar material |
| `POST` | `/api/service-orders/:id/materials/consume` | `estoque:update` | Baixar material |
| `POST` | `/api/service-orders/:id/materials/return` | `estoque:update` | Devolver material |
| `GET/POST` | `/api/service-orders/:id/technicians` | `service-orders:read/update` | Técnicos da OS |
| `GET/POST` | `/api/service-orders/:id/scope-items` | `service-orders:read/update` | Itens de escopo |
| `GET/POST` | `/api/service-orders/:id/work-entries` | `service-orders:read/update` | Apontamentos de horas |
| `POST` | `/api/service-orders/:id/work-entries/recalculate` | `service-orders:update` | Recalcular totais |
| `GET/POST` | `/api/service-orders/warranty-tickets` | `service-orders:read/create` | Warranty tickets |

---

## 5. Regras de Negócio

- **ticketNumber** é gerado automaticamente e único (formato `SO-YYYY-NNN`)
- OS criada a partir de um `Projeto` herda `projetoId`
- OS criada a partir de um `WarrantyTicket` mantém `warrantyTicketId`
- Materiais `COMPANY_PROVIDES`: reservados do estoque (decrement lógico), consumidos ao `COMPLETED`
- Materiais `CLIENT_PROVIDES`: não afetam estoque
- Invoice só pode ser gerada quando status = `COMPLETED` ou `AWAITING_PAYMENT`
- Assinatura do cliente é coletada antes de fechar (status `CLOSED`)
- `writeOffReason` obrigatório ao mover para `WRITE_OFF`
- `cancellationReason` obrigatório ao cancelar
- Totais (`total`, `laborTotal`, `materialTotal`) recalculados via `/work-entries/recalculate`

---

## 6. Segurança & RBAC

| Role | Permissões |
|------|-----------|
| `ADMIN` | CRUD completo |
| `GERENTE` | CRUD completo (ALL) |
| `USUARIO` | Read + Create + Update (RW) — não pode deletar |
| `FINANCEIRO` | Read only |
| `ESTOQUE` | Read only |
| `CLIENTE` | Sem acesso direto |

Verificação no código:
```typescript
if (!can(user.role as Role, "service-orders", "read")) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

---

## 7. Máquina de Estados (ServiceOrderStatus)

```
DRAFT → SCHEDULED → IN_PROGRESS → COMPLETED → AWAITING_PAYMENT → CLOSED
   ↓          ↓           ↓              ↓
CANCELED  CANCELED   CANCELED      WRITE_OFF
```

| Status | Descrição |
|--------|-----------|
| `DRAFT` | Rascunho inicial |
| `SCHEDULED` | Agendada, materiais reservados |
| `IN_PROGRESS` | Técnico executando no campo |
| `COMPLETED` | Serviço concluído, aguardando invoice |
| `AWAITING_PAYMENT` | Invoice gerada, aguardando pagamento |
| `CLOSED` | Pagamento confirmado, OS encerrada |
| `WRITE_OFF` | Perda contábil (serviço não cobrado) |
| `CANCELED` | Cancelada (qualquer estado exceto CLOSED) |

Transições são registradas em `ServiceOrderHistory`.

---

## 8. Integrações

| Módulo | Integração |
|--------|-----------|
| **Estoque** | Reserva e consumo de materiais (`ServiceOrderMaterial`) |
| **Financeiro** | Criação de `Expense` vinculada (`serviceOrderId`) |
| **Invoices** | Geração de `Invoice` via `/generate-invoice` |
| **Projetos** | OS vinculada a projeto via `projetoId` |
| **Workforce** | `ServiceOrderTechnician`, `WorkEntry`, `Assignment` |
| **Purchase Orders** | Compra de materiais faltantes |
| **Change Orders** | Alterações de escopo ou materiais aprovadas |
| **Warranty** | OS pode originar `WarrantyTicket`; ticket pode originar OS |

---

## 9. Problemas Conhecidos

- `relatorios/page.tsx` existe mas a lógica de relatórios por OS pode estar incompleta
- Múltiplos técnicos: `ServiceOrderTechnician` para equipe + `assignedWorkerId` para responsável principal — pode gerar confusão
- Campo `projetoId` opcional: OS sem projeto não aparece em relatórios de projeto

---

## 10. Roadmap Futuro

- [ ] Notificações push ao técnico ao ser atribuído
- [ ] App mobile para registro de horas e fotos em campo
- [ ] QR code na OS para acesso rápido pelo técnico
- [ ] Integração com GPS para registro de localização
- [ ] SLA automático por tipo de serviço e prioridade
- [ ] Relatório de produtividade por técnico
