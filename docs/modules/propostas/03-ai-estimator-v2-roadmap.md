# AI Estimator v2 — Roadmap de Implementação

**Módulo:** Propostas — Smart Cost Estimator  
**Data do planejamento:** 2026-05-05  
**Status:** Aguardando testes do módulo atual antes de iniciar  
**Documento anterior:** `02-atualizacao-2026-05.md` (estado atual do módulo)

---

## Contexto

O AI Estimator (modo texto livre via GPT-4o) já está funcional no sistema.  
Este documento captura o plano acordado para torná-lo mais rico, mais rápido e com histórico persistente.

### O que existe hoje

- `/api/propostas/estimador/ai-scope` — recebe descrição em texto, chama GPT-4o, retorna JSON estruturado
- `EstimadorWizard` — UI com modo wizard (por trade) e modo IA (texto livre)
- `EstimadorPreview` — exibe valores, materiais e etapas antes de importar
- Importação automática preenche: escopo, materiais, etapas, custoMO, custoMaterial
- Log de custo por token (monitoramento)

### O que está faltando (motivação deste roadmap)

O JSON retornado pela IA hoje **não inclui**:
- Riscos específicos do serviço
- Perguntas pendentes para o cliente
- Itens opcionais / possíveis change orders
- Nível de complexidade do job
- Observação pronta para inserir na proposta
- Range de horas (mínimo/máximo) por tarefa e total

Além disso, estimativas não são salvas — cada resultado se perde ao fechar o wizard.

---

## Fluxo atual vs. fluxo futuro

### Hoje
```
Wizard → texto livre → GPT-4o → Preview (valores + materiais + etapas)
→ Importar → preenche escopo, materiais, etapas, custos
```

### Depois desta implementação
```
Wizard → texto livre → GPT-4o-mini → Preview rico
  ├── aba Resumo    : valor estimado, complexidade, tempo total (min–max horas)
  ├── aba Materiais : igual hoje
  ├── aba Etapas    : igual hoje, com range de horas por tarefa
  ├── aba Riscos    : lista de riscos técnicos e variáveis do job
  ├── aba Perguntas : checklist do que perguntar ao cliente antes de fechar
  └── aba Opcionais : itens adicionais que o cliente pode escolher

→ Importar → preenche automaticamente:
  ├── escopo           ← escopoTexto
  ├── materiais        ← materiaisSugeridos
  ├── etapas           ← etapasExecucao
  ├── custos           ← custoMO + custoMaterial
  ├── riscos/exclusões ← riscos[] → campo "exclusoes" da proposta   ← NOVO
  ├── observações      ← observacaoParaProposta → campo "obsCliente" ← NOVO
  └── salva histórico  ← AiEstimativa no banco                       ← NOVO
```

---

## Fases de implementação

---

### Fase 1 — JSON rico + modelo mais barato

**Objetivo:** IA retorna mais dados úteis; custo de API cai ~80%  
**Risco:** Baixo — sem migration, sem mudança de fluxo  
**Dependências:** Nenhuma

#### Mudanças necessárias

| Arquivo | O que muda |
|---|---|
| `src/components/propostas/estimador/types.ts` | Adicionar campos ao `EstimadorResult` |
| `src/app/api/propostas/estimador/ai-scope/route.ts` | Novo SYSTEM_PROMPT + trocar `gpt-4o` → `gpt-4o-mini` |
| `src/components/propostas/estimador/EstimadorPreview.tsx` | Novas abas: Riscos, Perguntas, Opcionais |
| `src/components/propostas/PropostaForm.tsx` | `handleApplyEstimativa` mapeia novos campos |

#### Novos campos no `EstimadorResult`

```typescript
// Adicionar a EstimadorResult em types.ts
riscos: string[]
itensOpcionais: Array<{
  descricao: string
  condicao: string
}>
perguntasPendentes: string[]
complexidade: 'simples' | 'media' | 'complexa'
observacaoParaProposta: string
tempoEstimado: {
  minHoras: number
  maxHoras: number
}
// Atualizar campo existente:
// etapas[].duracaoHoras → etapas[].minHoras + etapas[].maxHoras
```

#### Novo SYSTEM_PROMPT (pt-BR, campos completos)

```
Você é o assistente estimador técnico da GladPros, empresa de serviços 
elétricos, hidráulicos e remodelação em Dallas, Texas.

Sua função é analisar a descrição de um serviço e gerar um rascunho 
técnico estruturado para criação de proposta.

TAXAS DE MÃO DE OBRA (Dallas TX 2025):
- Master Electrician: $95/h
- Journeyman Electrician: $75/h
- Master Plumber: $95/h
- Journeyman Plumber: $75/h
- Remodeling Crew: $65/h/pessoa
- Painter: $55/h

REGRAS:
- Não invente preço final
- Não diga que algo está garantido se depender de inspeção
- Sempre indique riscos e variáveis
- Sempre gere itens opcionais quando houver incerteza
- Separe materiais, mão de obra, etapas, riscos e perguntas pendentes
- Retorne somente JSON válido
- Considere práticas comuns de instalação residencial/comercial leve no Texas
- A decisão final será feita por um responsável humano

OUTPUT FORMAT (JSON estrito):
{
  "tradeId": "string",
  "tradeLabel": "string em português",
  "escopoTexto": "string — 2 a 4 frases em português",
  "complexidade": "simples | media | complexa",
  "tempoEstimado": { "minHoras": number, "maxHoras": number },
  "materiais": [...],
  "etapas": [
    {
      "servico": "string",
      "descricao": "string",
      "quantidade": number,
      "unidade": "string",
      "minHoras": number,
      "maxHoras": number,
      "custoMO": number,
      "status": "planejada"
    }
  ],
  "riscos": ["string"],
  "itensOpcionais": [
    { "descricao": "string", "condicao": "string" }
  ],
  "perguntasPendentes": ["string"],
  "estimativaBaixa": number,
  "estimativaAlta": number,
  "estimativaMedia": number,
  "custoMO": number,
  "custoMaterial": number,
  "observacaoParaProposta": "string",
  "notas": ["string"]
}
```

#### Mapeamento no import (`handleApplyEstimativa`)

```typescript
// Campos novos a mapear para a proposta:
if (result.riscos?.length) {
  setComerciais(prev => ({
    ...prev,
    exclusoes: result.riscos.join('\n')
  }))
}
if (result.observacaoParaProposta) {
  setObsCliente(result.observacaoParaProposta)
}
```

---

### Fase 2 — Persistência (salvar histórico de estimativas)

**Objetivo:** Estimativas nunca se perdem; base para reuso e analytics  
**Risco:** Baixo — migration simples, additive  
**Dependências:** Fase 1 concluída

#### Schema Prisma (novo modelo)

```prisma
model AiEstimativa {
  id                String    @id @default(cuid())
  empresaId         Int       @default(1)
  criadoPorId       String
  propostaId        String?   // null até ser vinculada a uma proposta
  descricaoOriginal String    @db.Text
  respostaJson      Json      // EstimadorResult completo
  complexidade      String?   // simples | media | complexa
  status            String    @default("rascunho") // rascunho | importada | descartada
  modeloUsado       String    @default("gpt-4o-mini")
  tokensUsados      Int?
  criadoEm          DateTime  @default(now())

  empresa   Empresa   @relation(fields: [empresaId], references: [id])
  criadoPor Usuario   @relation(fields: [criadoPorId], references: [id])
  proposta  Proposta? @relation(fields: [propostaId], references: [id])

  @@index([empresaId, criadoEm])
  @@index([propostaId])
  @@index([criadoPorId])
  @@map("AiEstimativa")
}
```

#### API necessária

```
POST /api/propostas/estimador/salvar
  body: { descricaoOriginal, respostaJson, complexidade, modeloUsado, tokensUsados }
  → cria AiEstimativa com status "rascunho"
  → retorna { id }

PATCH /api/propostas/estimador/salvar/[id]
  body: { status: 'importada' | 'descartada', propostaId? }
  → atualiza status quando usuário importa ou descarta
```

#### Fluxo de salvamento

```
Usuário clica "Importar" no EstimadorWizard
  │
  ├── 1. Chama POST /api/propostas/estimador/salvar → retorna id
  ├── 2. Chama handleApplyEstimativa (preenche proposta, igual hoje)
  ├── 3. Quando proposta é salva → PATCH com propostaId + status 'importada'
  └── 4. Toast: "Estimativa salva no histórico"
```

---

### Fase 3 — Histórico e reuso de estimativas

**Objetivo:** Segunda proposta parecida leva segundos, não minutos  
**Risco:** Zero — feature additive  
**Dependências:** Fase 2 concluída

#### O que adiciona no `EstimadorWizard`

Nova aba no modo IA: **"Estimativas anteriores"**

```
┌─────────────────────────────────────────┐
│  🔍 Buscar por palavras-chave...        │
├─────────────────────────────────────────┤
│  📋 Tankless water heater + filtration  │  ← 2026-05-01
│     complexidade: complexa | $8.200–$11.400    │
│     [Usar como base]                    │
├─────────────────────────────────────────┤
│  📋 Panel upgrade 200A                  │  ← 2026-04-22
│     complexidade: media | $3.200–$5.500        │
│     [Usar como base]                    │
└─────────────────────────────────────────┘
```

- **"Usar como base"** → carrega o JSON salvo no Preview
- Usuário revisa/ajusta valores → importa normalmente
- Estimativa anterior não é modificada (cria nova entrada)

#### API necessária

```
GET /api/propostas/estimador/historico?q=tankless&page=1
  → lista AiEstimativa da empresa, ordenado por criadoEm desc
  → campos retornados: id, descricaoOriginal, complexidade, estimativaBaixa/Alta, criadoEm, status

GET /api/propostas/estimador/historico/[id]
  → retorna AiEstimativa completa com respostaJson
```

---

### Fase 4 — Loop de aprendizado (longo prazo)

**Objetivo:** IA aprende com os dados reais da GladPros ao longo do tempo  
**Risco:** Zero — opcional, não afeta fluxo existente  
**Dependências:** Fase 2 + hábito operacional de registrar custo real

> ⚠️ Esta fase só faz sentido quando houver disciplina de registrar custo real após conclusão de jobs.

#### Schema Prisma

```prisma
model AiEstimativaFeedback {
  id                String   @id @default(cuid())
  aiEstimativaId    String
  propostaId        String?
  custoEstimado     Float
  custoReal         Float
  horasEstimadas    Float
  horasReais        Float
  variacaoPercent   Float?   // calculado: (real-estimado)/estimado * 100
  observacoes       String?  @db.Text
  registradoPorId   String
  registradoEm      DateTime @default(now())

  aiEstimativa    AiEstimativa @relation(fields: [aiEstimativaId], references: [id])
  registradoPor   Usuario      @relation(fields: [registradoPorId], references: [id])

  @@index([aiEstimativaId])
  @@map("AiEstimativaFeedback")
}
```

#### Como seria usado

1. Job concluído → no projeto/OS, campo: "Registrar custo real desta estimativa"
2. Usuário preenche: horas reais, custo real de materiais
3. Sistema calcula variação percentual automaticamente
4. Com 20+ feedbacks, SYSTEM_PROMPT pode incluir:
   - "Para tankless installation, GladPros tipicamente usa 22–28 horas reais"
   - "Markup médio da GladPros em plumbing: 42%"

---

## Resumo do fluxo completo (após todas as fases)

```
CRIAÇÃO DE PROPOSTA
━━━━━━━━━━━━━━━━━━
[1] Usuário abre nova proposta → seleciona cliente

[2] Clica em "Estimador" → EstimadorWizard abre

[3] Modo IA → digita descrição do serviço em texto livre
    OU busca em "Estimativas anteriores" por job parecido

[4] GPT-4o-mini processa (~3-8 segundos)
    ↓
    Retorna JSON rico:
    • Materiais com quantidade e preço
    • Etapas com range de horas (min–max)
    • Riscos técnicos do serviço
    • Perguntas para fazer ao cliente ← lê antes de ligar pro cliente
    • Itens opcionais / possíveis add-ons
    • Complexidade + tempo total estimado
    • Observação pronta para a proposta

[5] Usuário lê perguntas → liga para o cliente / faz visita técnica
    Ajusta valores se necessário

[6] Clica "Importar"
    ↓
    Preenche automaticamente na proposta:
    • Escopo
    • Materiais e etapas
    • Custos (MO + material)
    • Riscos/exclusões
    • Observações finais
    
    Salva AiEstimativa no banco (histórico)

[7] Usuário revisa proposta → envia para o cliente via Documenso

━━━━━━━━━━━━━━━━━━━━━━━━━
MESES DEPOIS (Fase 4)
━━━━━━━━━━━━━━━━━━━━━━━━━
Job concluído → registra custo real
→ sistema aprende com dados reais da GladPros
→ estimativas ficam cada vez mais precisas
```

---

## Arquivos que serão modificados por fase

### Fase 1
- `src/components/propostas/estimador/types.ts`
- `src/app/api/propostas/estimador/ai-scope/route.ts`
- `src/components/propostas/estimador/EstimadorPreview.tsx`
- `src/components/propostas/PropostaForm.tsx`

### Fase 2
- `prisma/schema.prisma` (+ migration)
- `src/app/api/propostas/estimador/salvar/route.ts` (novo)
- `src/app/api/propostas/estimador/salvar/[id]/route.ts` (novo)
- `src/components/propostas/estimador/EstimadorWizard.tsx`

### Fase 3
- `src/app/api/propostas/estimador/historico/route.ts` (novo)
- `src/app/api/propostas/estimador/historico/[id]/route.ts` (novo)
- `src/components/propostas/estimador/EstimadorWizard.tsx`
- `src/components/propostas/estimador/EstimadorHistorico.tsx` (novo)

### Fase 4
- `prisma/schema.prisma` (+ migration)
- `src/app/api/propostas/estimador/feedback/route.ts` (novo)
- Integração com módulo de projetos/OS (a definir)

---

## Decisões técnicas já tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Modelo de linguagem | `gpt-4o-mini` | ~80% mais barato que gpt-4o; qualidade equivalente para JSON estruturado |
| Cache de respostas | Por implementar (Fase 2) | Reusar estimativas salvas, sem chamar IA novamente |
| Persistência | Prisma + MySQL | Consistente com o resto do sistema |
| Idioma do prompt | Português (pt-BR) | Contexto operacional da GladPros |
| Fallback sem IA | Wizard por trade (já existe) | Se GPT indisponível, fluxo estruturado continua funcionando |

---

## Pré-requisitos antes de iniciar

- [ ] Testes do módulo atual concluídos e aprovados
- [ ] `OPENAI_API_KEY` configurada no ambiente de produção
- [ ] Validar que `gpt-4o-mini` com `response_format: json_object` retorna JSON válido nos casos de uso reais da GladPros (fazer teste manual antes da Fase 1)

---

*Documento criado em 2026-05-05. Próxima ação: testes do módulo atual pelo usuário.*
