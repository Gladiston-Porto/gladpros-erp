# 📚 GUIA DO USUÁRIO - MÓDULO ESTOQUE

**Versão:** 1.0.0  
**Data:** 12 de outubro de 2025  
**Sistema:** GladPros - Gestão Integrada

---

## 📋 ÍNDICE

1. [Introdução](#introdução)
2. [Dashboard](#dashboard)
3. [Materiais](#materiais)
4. [Equipamentos](#equipamentos)
5. [Movimentações](#movimentações)
6. [Alertas](#alertas)
7. [Compras](#compras)
8. [Fluxos de Trabalho](#fluxos-de-trabalho)
9. [Dicas e Boas Práticas](#dicas-e-boas-práticas)

---

## 🎯 INTRODUÇÃO

O módulo de Estoque é o coração do controle de recursos do seu negócio. Aqui você gerencia:

- 📦 **Materiais** - Insumos, produtos, peças
- 🔧 **Equipamentos** - Ferramentas, máquinas, veículos
- 📊 **Movimentações** - Entradas, saídas, transferências
- ⚠️ **Alertas** - Notificações automáticas
- 🛒 **Compras** - Pedidos e recebimentos

### Acesso Rápido

```
/estoque              → Dashboard principal
/estoque/materiais    → Gestão de materiais
/estoque/equipamentos → Gestão de equipamentos
/estoque/movimentacoes → Histórico de movimentações
/estoque/alertas      → Alertas ativos
/estoque/compras      → Pedidos de compra
```

---

## 📊 DASHBOARD

**Rota:** `/estoque`

### O que você vê:

**Métricas Principais:**
- 📦 Total de materiais cadastrados
- 🔧 Total de equipamentos
- ✅ Materiais ativos
- ⚠️ Materiais em alerta
- 🚨 Alertas críticos totais
- 📊 Movimentações (últimos 30 dias)
- 🔧 Equipamentos em uso
- ⚠️ Equipamentos em alerta
- 🛒 Compras pendentes

**Seções:**
1. **Cards de Métricas** - Visão geral numérica
2. **Últimas Movimentações** - 5 mais recentes
3. **Alertas Ativos** - Prioridade ALTA e CRÍTICA

### Como usar:

✅ **Acesse diariamente** para verificar status geral  
✅ **Clique nos cards** para ir direto ao módulo  
✅ **Monitore alertas** em vermelho (críticos)  

---

## 📦 MATERIAIS

**Rota:** `/estoque/materiais`

### Conceitos

**Material** = Qualquer item consumível ou vendável:
- Insumos de produção
- Produtos acabados
- Peças de reposição
- Material de escritório
- Embalagens

### Cadastro de Material

**Rota:** `/estoque/materiais/novo`

#### Informações Básicas ⭐ Obrigatórias

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **Código*** | Identificador único | `MAT-001`, `A-123` |
| **Nome*** | Nome do material | `Parafuso M8`, `Papel A4` |
| Descrição | Detalhes adicionais | `Aço inox, rosca métrica` |
| **Categoria*** | Classificação | `Fixação`, `Escritório` |
| **Unidade*** | Medida | `UN`, `KG`, `M`, `CX` |

#### Especificações Técnicas

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| Fabricante | Marca | `Tramontina`, `Ciser` |
| Modelo | Modelo/Referência | `X-500`, `Premium` |
| NCM | Código fiscal | `73181500` |
| Peso Unitário | Peso (kg) | `0.025` |
| Dimensões | L x A x P (cm) | `10 x 5 x 2` |

#### Controle de Estoque ⚠️ Importante

| Campo | Descrição | Dica |
|-------|-----------|------|
| **Estoque Mínimo*** | Limite inferior | Gera alerta ao atingir |
| Ponto de Reposição | Quando comprar | Geralmente 2x o mínimo |
| Rastreio de Lote | Sim/Não | Para controle fino |
| Possui Validade | Sim/Não | Alimentos, químicos |

#### Custos

| Campo | Descrição | Atualização |
|-------|-----------|-------------|
| Último Custo | Última compra | Automático no recebimento |
| Custo Médio | Média ponderada | Calculado automaticamente |

### Listagem de Materiais

**Funcionalidades:**

🔍 **Busca Rápida**
- Por código
- Por nome
- Busca parcial (ex: "para" encontra "parafuso")

🎛️ **Filtros**
- **Categoria**: Todas, Fixação, Elétrica, etc.
- **Status**: Todos, Ativos, Inativos

📄 **Paginação**
- 20 itens por página
- Navegação: Anterior | Próxima

### Ações no Material

**Visualizar** - Ver todas as informações  
**Editar** - Modificar dados (mantém histórico)  
**Inativar** - Desativar sem excluir  
**Excluir** - Remover permanentemente ⚠️

### Dicas 💡

✅ **Use códigos claros**: `ELE-001` (Elétrica), `FIX-001` (Fixação)  
✅ **Configure estoque mínimo**: Evite faltas  
✅ **Ponto de reposição**: 2x o estoque mínimo é uma boa prática  
✅ **Rastreie lotes**: Para itens críticos ou com validade  
✅ **Fotos ajudam**: Upload de imagem para identificação rápida  

---

## 🔧 EQUIPAMENTOS

**Rota:** `/estoque/equipamentos`

### Conceitos

**Equipamento** = Item durável, alocável, com manutenção:
- Ferramentas (furadeira, serra)
- Equipamentos de medição (paquímetro, multímetro)
- Máquinas
- Veículos
- EPIs duráveis (capacete, óculos)

### Cadastro de Equipamento

**Rota:** `/estoque/equipamentos/novo`

#### Informações Básicas ⭐

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **Código*** | Identificador único | `EQ-001`, `FER-123` |
| **Nome*** | Nome do equipamento | `Furadeira Impact` |
| **Tipo*** | Classificação | Ferramenta Elétrica |
| Categoria | Subcategoria | Ferramentas Rotativas |

**Tipos Disponíveis:**
- Ferramenta Manual
- Ferramenta Elétrica
- Equipamento de Medição
- Equipamento de Segurança
- Andaime
- Escada
- Veículo
- Outro

#### Especificações

| Campo | Descrição |
|-------|-----------|
| Marca | Ex: Bosch, Makita |
| Modelo | Ex: GSB 13 RE |
| Número de Série | Identificação única do fabricante |
| Ano de Fabricação | Ex: 2023 |

#### Aquisição

| Campo | Descrição |
|-------|-----------|
| Data de Aquisição | Quando foi comprado |
| Valor de Aquisição | Preço pago (R$) |
| Fornecedor | Quem vendeu |
| Nota Fiscal | Número da NF |

#### Status e Localização 📍

| Status | Significado | Cor |
|--------|-------------|-----|
| DISPONIVEL | Pronto para uso | 🟢 Verde |
| EM_USO | Alocado em projeto | 🔵 Azul |
| MANUTENCAO | Em conserto | 🟡 Amarelo |
| CALIBRACAO | Sendo calibrado | 🟠 Laranja |
| INATIVO | Fora de operação | ⚫ Cinza |

**Localização Atual**: Texto livre (Ex: "Almoxarifado - Prateleira A3")

#### Calibração 🎯 (Opcional)

Para equipamentos de medição (paquímetro, balança, etc.):

| Campo | Descrição |
|-------|-----------|
| **Requer Calibração** | Sim/Não |
| Periodicidade (dias) | Ex: 365 (anual) |
| Última Calibração | Data |
| **Próxima Calibração** | Calculada automaticamente |

**Alerta Automático:** Sistema gera alerta quando vence.

#### Manutenção 🔧 (Opcional)

Para equipamentos que precisam manutenção periódica:

| Campo | Descrição |
|-------|-----------|
| **Requer Manutenção** | Sim/Não |
| Periodicidade (dias) | Ex: 180 (semestral) |
| Última Manutenção | Data |
| **Próxima Manutenção** | Calculada automaticamente |

**Alerta Automático:** Sistema gera alerta 7 dias antes.

### Listagem de Equipamentos

🔍 **Busca por:**
- Código
- Nome
- Marca
- Modelo
- Número de Série

🎛️ **Filtros:**
- **Categoria**: Todas categorias
- **Tipo**: Todos os tipos
- **Status**: Todos os status
- **Calibração**: Todos, Requer, Não requer

### Ações Especiais

#### 📤 Alocar Equipamento

**Quando:** Equipamento será usado em um projeto

**Como:**
1. Clique no equipamento
2. Clique em "Alocar"
3. Selecione o projeto
4. Confirme

**Resultado:**
- Status → `EM_USO`
- Localização → Atualizada
- Movimentação registrada

#### 📥 Devolver Equipamento

**Quando:** Equipamento volta do projeto

**Como:**
1. Clique no equipamento EM_USO
2. Clique em "Devolver"
3. Informe nova localização
4. Adicione observações (opcional)
5. Confirme

**Resultado:**
- Status → `DISPONIVEL`
- Localização → Atualizada
- Movimentação registrada

### Dicas 💡

✅ **Numere os equipamentos**: Use etiquetas físicas com o código  
✅ **Calibre em dia**: Evite medições incorretas  
✅ **Manutenção preventiva**: Mais barato que corretiva  
✅ **Fotos e manuais**: Upload ajuda na identificação  
✅ **Controle de projeto**: Saiba onde cada equipamento está  

---

## 📊 MOVIMENTAÇÕES

**Rota:** `/estoque/movimentacoes`

### Conceitos

**Movimentação** = Qualquer alteração no estoque:
- Entrada de material
- Saída para projeto
- Ajuste de inventário
- Transferência entre locais
- Devolução

### Tipos de Movimentação

#### 1. ENTRADA ⬆️

**Quando usar:**
- Recebimento de compra
- Devolução de projeto
- Produção interna
- Doação recebida

**Efeito:** Aumenta estoque

**Exemplo:**
```
Material: Parafuso M8
Quantidade: 500 UN
Projeto: (opcional)
Observação: "Recebimento NF 12345"
```

#### 2. SAÍDA ⬇️

**Quando usar:**
- Consumo em projeto
- Venda
- Doação
- Perda/Descarte

**Efeito:** Diminui estoque

**Validação:** ⚠️ Verifica se há saldo suficiente

**Exemplo:**
```
Material: Cimento CP-II
Quantidade: 10 SC
Projeto: Obra ABC
Observação: "Concretagem laje"
```

#### 3. AJUSTE 🔄

**Quando usar:**
- Correção de erro
- Resultado de inventário
- Perda identificada
- Sobra encontrada

**Efeito:** Ajusta para quantidade exata

**Exemplo:**
```
Material: Tinta Branca
Quantidade: 15 LT (quantidade atual após ajuste)
Observação: "Inventário 2025-01 - havia 18 LT"
```

#### 4. TRANSFERÊNCIA 🔀

**Quando usar:**
- Mudança de local
- Entre almoxarifados
- Entre projetos

**Efeito:** Mantém quantidade, muda localização

**Exemplo:**
```
Equipamento: Betoneira 400L
De: Almoxarifado Central
Para: Obra XYZ
Observação: "Transferência para obra"
```

#### 5. DEVOLUÇÃO ↩️

**Quando usar:**
- Retorno de material não usado
- Retorno de equipamento
- Cancelamento de saída

**Efeito:** Retorna ao estoque

**Exemplo:**
```
Material: Cerâmica 30x30
Quantidade: 50 UN
Projeto: Apartamento 101
Observação: "Sobra da instalação"
```

### Registrar Movimentação

**Rota:** `/estoque/movimentacoes/nova`

#### Campos Obrigatórios ⭐

| Campo | Descrição |
|-------|-----------|
| **Tipo*** | ENTRADA, SAIDA, etc. |
| **Material ou Equipamento*** | O que está movimentando |
| **Quantidade*** | Quanto (> 0) |
| Data | Quando ocorreu (padrão: hoje) |
| Projeto | Vinculação (opcional) |
| Observação | Detalhes importantes |

### Histórico de Movimentações

**Visualização:**
- Cards cronológicos (mais recente primeiro)
- Ícone e cor por tipo
- Detalhes completos

**Filtros:**
- **Tipo**: Todas, Entrada, Saída, etc.
- **Material**: Específico ou todos
- **Equipamento**: Específico ou todos
- **Projeto**: Específico ou todos
- **Período**: Data início e fim

### Dicas 💡

✅ **Registre imediatamente**: Não confie na memória  
✅ **Use observações**: Explique o porquê  
✅ **Vincule a projetos**: Rastreabilidade completa  
✅ **Revise ajustes**: Investigue discrepâncias grandes  
✅ **Faça inventários**: Mensalmente ou trimestralmente  

---

## ⚠️ ALERTAS

**Rota:** `/estoque/alertas`

### Conceitos

**Alerta** = Notificação automática gerada pelo sistema quando algo precisa de atenção.

### Tipos de Alerta

#### 1. 🔴 ESTOQUE_MINIMO

**Quando:** Saldo ≤ Estoque Mínimo

**Prioridade:** CRÍTICA

**Ação:** Comprar URGENTE

**Exemplo:**
```
Material: Parafuso 8mm
Saldo Atual: 50 UN
Estoque Mínimo: 100 UN
Ação: Fazer pedido imediato
```

#### 2. 🟠 PONTO_REPOSICAO

**Quando:** Saldo ≤ Ponto de Reposição

**Prioridade:** ALTA

**Ação:** Iniciar processo de compra

**Exemplo:**
```
Material: Cimento
Saldo Atual: 15 SC
Ponto Reposição: 20 SC
Ação: Solicitar cotação
```

#### 3. 🟡 VALIDADE_PROXIMA

**Quando:** Lote vence em ≤ 30 dias

**Prioridade:** MÉDIA

**Ação:** Usar prioritariamente

**Exemplo:**
```
Material: Adesivo PU
Lote: L2024-10
Vencimento: 15/11/2025 (20 dias)
Ação: Usar antes de comprar novo
```

#### 4. 🔴 VALIDADE_VENCIDA

**Quando:** Lote vencido

**Prioridade:** CRÍTICA

**Ação:** Descartar/Devolver

**Exemplo:**
```
Material: Silicone
Lote: L2024-05
Vencimento: 01/10/2025 (vencido)
Ação: Segregar e descartar
```

#### 5. 🟠 CALIBRACAO_VENCIDA

**Quando:** Data de calibração vencida

**Prioridade:** ALTA

**Ação:** Calibrar imediatamente

**Exemplo:**
```
Equipamento: Paquímetro Digital
Última Calibração: 01/10/2024
Próxima: 01/10/2025 (vencida)
Ação: Enviar para calibração
```

#### 6. 🟡 MANUTENCAO_NECESSARIA

**Quando:** Data de manutenção vencida ou próxima (7 dias)

**Prioridade:** MÉDIA

**Ação:** Agendar manutenção

**Exemplo:**
```
Equipamento: Betoneira 400L
Última Manutenção: 15/08/2025
Próxima: 15/10/2025 (em 3 dias)
Ação: Agendar revisão
```

#### 7. 🔵 EQUIPAMENTO_MANUTENCAO

**Quando:** Equipamento em status MANUTENÇÃO

**Prioridade:** BAIXA

**Ação:** Informativo

**Exemplo:**
```
Equipamento: Serra Circular
Status: EM_MANUTENCAO
Ação: Aguardar conclusão do reparo
```

### Prioridades

| Prioridade | Cor | Ícone | Prazo de Ação |
|------------|-----|-------|---------------|
| CRITICA | 🔴 Vermelho | ⚠️ | Imediato (hoje) |
| ALTA | 🟠 Laranja | ⚡ | 1-3 dias |
| MEDIA | 🟡 Amarelo | ℹ️ | 1 semana |
| BAIXA | 🟢 Verde | 📌 | Informativo |

### Gerenciar Alertas

#### Visualizar Alerta

**Rota:** `/estoque/alertas/[id]`

**Informações:**
- Tipo e prioridade
- Título e mensagem
- Material/Equipamento relacionado
- Data do alerta
- Status (visualizado/resolvido)

#### Marcar como Visualizado

**Como:**
1. Abra o alerta
2. Sistema marca automaticamente como visualizado
3. Cor muda para cinza

**Efeito:** Organização visual

#### Resolver Alerta

**Como:**
1. Abra o alerta
2. Clique em "Resolver"
3. Descreva a solução tomada
4. Confirme

**Exemplo de solução:**
```
"Pedido realizado ao fornecedor XYZ - NF aguardada"
"Material descartado conforme procedimento 001"
"Equipamento calibrado - Certificado #12345"
```

**Efeito:**
- Alerta marcado como resolvido
- Não aparece mais na lista ativa
- Histórico mantido

### Filtros de Alertas

🎛️ **Filtrar por:**
- **Tipo**: Todos, Estoque Mínimo, Validade, etc.
- **Prioridade**: Todas, Crítica, Alta, Média, Baixa
- **Status**: Todos, Ativos, Resolvidos, Visualizados
- **Material**: Específico ou todos
- **Equipamento**: Específico ou todos

### Badge de Alertas 🔔

**Onde:** Menu lateral, ícone de Alertas

**Número:** Quantidade de alertas ativos não resolvidos

**Cor:**
- 🔴 Vermelho: Alertas CRÍTICOS
- 🟠 Laranja: Alertas ALTOS
- ⚪ Branco: Outros

### Dicas 💡

✅ **Verifique diariamente**: Alertas críticos exigem ação imediata  
✅ **Documente soluções**: Histórico para auditorias  
✅ **Configure bem os limites**: Evite alertas excessivos ou insuficientes  
✅ **Aja preventivamente**: Alertas ALTOS antes de virarem CRÍTICOS  
✅ **Revise semanalmente**: Alertas BAIXOS e MÉDIOS acumulados  

---

## 🛒 COMPRAS

**Rota:** `/estoque/compras`

### Conceitos

**Compra** = Pedido de materiais/equipamentos a fornecedor

**Composto por:**
- Dados da compra (fornecedor, NF, datas)
- Itens (materiais/equipamentos com quantidades e valores)
- Status (workflow de aprovação)

### Workflow de Status

```
RASCUNHO → PENDENTE → APROVADA → PEDIDA → RECEBIDA
                           ↓
                       CANCELADA
                           ↑
                    (qualquer status)
```

#### 1. 📝 RASCUNHO

**Significado:** Em elaboração  
**Quem pode editar:** Qualquer usuário  
**Próximo passo:** Enviar para aprovação (PENDENTE)

#### 2. ⏳ PENDENTE

**Significado:** Aguardando aprovação  
**Quem pode aprovar:** Gerentes/Administradores  
**Próximo passo:** Aprovar (APROVADA) ou Cancelar

#### 3. ✅ APROVADA

**Significado:** Aprovada, aguardando pedido ao fornecedor  
**Ação:** Gerar pedido oficial  
**Próximo passo:** Realizar pedido (PEDIDA)

#### 4. 📤 PEDIDA

**Significado:** Pedido enviado ao fornecedor  
**Aguardando:** Entrega  
**Próximo passo:** Receber mercadoria (PARCIAL ou RECEBIDA)

#### 5. 📦 PARCIAL

**Significado:** Recebimento parcial realizado  
**Situação:** Alguns itens recebidos, outros pendentes  
**Próximo passo:** Receber restante (RECEBIDA)

#### 6. ✅ RECEBIDA

**Significado:** Todos os itens recebidos  
**Status final:** Compra concluída  
**Efeito:** Estoque atualizado

#### 7. ❌ CANCELADA

**Significado:** Compra cancelada  
**Status final:** Não será processada  
**Motivo:** Sempre informar no histórico

### Criar Compra

**Rota:** `/estoque/compras/nova`

#### Dados da Compra ⭐

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| **Fornecedor** | Quem vende | ✅ Sim |
| Número NF | Nota fiscal | Não |
| **Data da Compra** | Quando pediu | ✅ Sim (padrão: hoje) |
| Data Prevista Entrega | Previsão | Não |
| **Tipo** | Material ou Equipamento | ✅ Sim |
| Projeto | Vinculação | Não |
| Forma de Pagamento | Dinheiro, Cartão, Boleto, etc. | Não |
| Observações | Informações extras | Não |

#### Itens da Compra 📋

**Para cada item:**

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| **Material/Equipamento** | O que comprar | ✅ Sim |
| **Quantidade** | Quanto | ✅ Sim |
| **Valor Unitário** | Preço por unidade (R$) | ✅ Sim |
| **Valor Total** | Calculado automaticamente | Auto |

**Adicionar item:** Clique em "+ Adicionar Item"  
**Remover item:** Clique no ícone 🗑️

#### Valores da Compra 💰

| Campo | Descrição | Cálculo |
|-------|-----------|---------|
| **Subtotal** | Soma dos itens | Automático |
| Desconto | Valor ou % | Manual |
| Frete | Custo de entrega | Manual |
| **TOTAL** | Valor final | Automático |

**Fórmula:**
```
TOTAL = Subtotal - Desconto + Frete
```

### Receber Compra

**Quando:** Mercadoria chegou

**Como:**
1. Abra a compra (status PEDIDA ou PARCIAL)
2. Clique em "Receber"
3. Para cada item:
   - Informe quantidade recebida
   - Quantidade pode ser parcial
4. Confirme

**Efeito Automático:**

✅ **Estoque atualizado:**
- Quantidade adicionada ao saldo

✅ **Movimentação registrada:**
- Tipo: ENTRADA
- Quantidade: recebida
- Observação: "Recebimento Compra #123"

✅ **Custos atualizados:**
- Último Custo = valor unitário desta compra
- Custo Médio = recalculado ponderado

✅ **Status da compra:**
- Todos itens recebidos → RECEBIDA
- Itens parciais → PARCIAL

### Listagem de Compras

**Visualização:** Cards com resumo

**Informações por card:**
- Fornecedor
- Data da compra
- Valor total
- Status (badge colorido)
- Quantidade de itens
- Barra de progresso (recebimento)

**Filtros:**
- **Status**: Todas, Rascunho, Pendente, etc.
- **Tipo**: Todos, Material, Equipamento
- **Fornecedor**: Específico ou todos
- **Projeto**: Específico ou todos

### Dicas 💡

✅ **Use rascunhos**: Monte a compra com calma  
✅ **Anexe orçamentos**: Guarde documentos importantes  
✅ **Vincule a projetos**: Rastreie custos por obra  
✅ **Confira no recebimento**: Quantidade e qualidade  
✅ **Receba parcialmente**: Se necessário  
✅ **Documente cancelamentos**: Sempre informe o motivo  

---

## 🔄 FLUXOS DE TRABALHO

### Fluxo 1: Compra → Recebimento → Uso

**Cenário:** Comprar material e usar em obra

```
1. Criar Compra
   ↓
2. Aprovar (se necessário)
   ↓
3. Realizar Pedido ao fornecedor
   ↓
4. Receber mercadoria
   - Sistema: Adiciona ao estoque
   - Sistema: Registra movimentação ENTRADA
   - Sistema: Atualiza custos
   ↓
5. Usar em projeto
   - Registrar movimentação SAÍDA
   - Vincular ao projeto
   ↓
6. Sistema: Atualiza saldo
   Sistema: Verifica estoque mínimo
   Sistema: Gera alerta se necessário
```

### Fluxo 2: Alerta → Compra → Resolução

**Cenário:** Material em falta

```
1. Sistema detecta: Saldo ≤ Estoque Mínimo
   ↓
2. Sistema GERA ALERTA (CRÍTICO)
   ↓
3. Usuário visualiza alerta
   ↓
4. Usuário cria compra
   - Quantidade = Reposição - Saldo Atual
   ↓
5. Compra é processada
   ↓
6. Mercadoria recebida
   - Estoque atualizado
   ↓
7. Usuário resolve alerta
   - Solução: "Compra #123 recebida"
   ↓
8. Alerta fechado
```

### Fluxo 3: Equipamento → Alocação → Devolução

**Cenário:** Usar equipamento em projeto

```
1. Equipamento status: DISPONIVEL
   ↓
2. Usuário aloca equipamento
   - Seleciona projeto
   - Informa quem levou
   ↓
3. Sistema:
   - Status → EM_USO
   - Localização → Projeto X
   - Registra movimentação
   ↓
4. Uso no projeto
   ↓
5. Usuário devolve equipamento
   - Informa nova localização
   - Adiciona observações
   ↓
6. Sistema:
   - Status → DISPONIVEL
   - Atualiza localização
   - Registra movimentação
```

### Fluxo 4: Calibração/Manutenção

**Cenário:** Controle de equipamento de medição

```
1. Cadastrar equipamento
   - Requer Calibração: SIM
   - Periodicidade: 365 dias
   - Última Calibração: 01/01/2025
   ↓
2. Sistema calcula:
   - Próxima Calibração: 01/01/2026
   ↓
3. Sistema monitora diariamente
   ↓
4. 01/01/2026: Data vencida
   ↓
5. Sistema GERA ALERTA (ALTA)
   - Tipo: CALIBRACAO_VENCIDA
   ↓
6. Usuário visualiza alerta
   ↓
7. Usuário envia para calibração
   - Muda status → CALIBRACAO
   ↓
8. Equipamento volta calibrado
   - Atualiza datas
   - Última: 10/01/2026
   - Próxima: 10/01/2027 (auto)
   - Status → DISPONIVEL
   ↓
9. Usuário resolve alerta
   - Solução: "Calibrado - Cert. #12345"
```

### Fluxo 5: Inventário Físico

**Cenário:** Ajustar estoque após contagem

```
1. Realizar contagem física
   - Material X: 150 UN (sistema diz 200)
   ↓
2. Registrar movimentação AJUSTE
   - Tipo: AJUSTE
   - Material: X
   - Quantidade: 150 (quantidade correta)
   - Obs: "Inventário 2025-10"
   ↓
3. Sistema:
   - Calcula diferença: 150 - 200 = -50
   - Ajusta saldo para 150
   - Registra movimentação
   ↓
4. Investigar discrepância
   - Perda? Roubo? Erro de registro?
   ↓
5. Tomar ações corretivas
   - Melhorar controle
   - Treinar equipe
   - Revisar processos
```

---

## 💡 DICAS E BOAS PRÁTICAS

### Geral

✅ **Padronize códigos**: Defina um padrão e siga  
✅ **Use categorias**: Facilita organização e relatórios  
✅ **Documente observações**: Seu futuro eu agradece  
✅ **Vincule a projetos**: Rastreabilidade total  
✅ **Treine a equipe**: Todos devem saber usar  

### Materiais

✅ **Configure limites**: Estoque mínimo e ponto de reposição  
✅ **Rastreie lotes críticos**: Produtos químicos, alimentos  
✅ **Atualize custos**: Após cada recebimento  
✅ **Faça inventários**: Mensalmente ou trimestralmente  
✅ **Use fotos**: Facilita identificação  

### Equipamentos

✅ **Numere fisicamente**: Etiquetas com código  
✅ **Controle calibração**: Equipamentos de medição  
✅ **Manutenção preventiva**: Mais barato que corretiva  
✅ **Registre danos**: Histórico de problemas  
✅ **Fotografe antes e depois**: Documentação de uso  

### Movimentações

✅ **Registre imediatamente**: Não confie na memória  
✅ **Seja específico**: Observações claras  
✅ **Revise diariamente**: Corrija erros rapidamente  
✅ **Valide quantidades**: Confira antes de confirmar  
✅ **Use projetos**: Sempre vincule quando aplicável  

### Alertas

✅ **Verifique diariamente**: Alertas críticos são urgentes  
✅ **Aja preventivamente**: Não espere virar crítico  
✅ **Documente soluções**: Transparência e auditoria  
✅ **Revise configurações**: Ajuste limites se alertas excessivos  
✅ **Resolva rapidamente**: Não deixe acumular  

### Compras

✅ **Cotação em 3 fornecedores**: Melhores preços  
✅ **Negocie prazos**: Entrega e pagamento  
✅ **Confira no recebimento**: Quantidade e qualidade  
✅ **Guarde documentos**: NF, certificados, garantias  
✅ **Avalie fornecedores**: Pontualidade e qualidade  

---

## ❓ PERGUNTAS FREQUENTES

### 1. Posso excluir um material?

**Sim**, mas com cuidado. Se o material tiver movimentações, recomendamos **inativar** ao invés de excluir. Isso preserva o histórico.

### 2. Como fazer inventário físico?

Use movimentações do tipo **AJUSTE**. Informe a quantidade correta após contagem, e o sistema ajusta automaticamente.

### 3. Equipamento em manutenção pode ser usado?

**Não**. Quando status é MANUTENÇÃO, o equipamento não deve ser alocado. Só após voltar para DISPONÍVEL.

### 4. Como funciona o custo médio?

É uma **média ponderada**. Cada recebimento atualiza o custo médio considerando a quantidade e valor recebidos.

**Fórmula:**
```
Custo Médio = (Saldo Anterior × Custo Médio Anterior + Qtd Recebida × Custo Novo) / (Saldo Anterior + Qtd Recebida)
```

### 5. Posso receber uma compra parcialmente?

**Sim**! No recebimento, informe quantidade recebida para cada item. Pode ser menor que a quantidade comprada. Status vai para PARCIAL e você pode receber o restante depois.

### 6. Como saber quem fez uma movimentação?

O sistema registra automaticamente o usuário que criou cada movimentação. Veja nos detalhes da movimentação: "Criado por".

### 7. Alertas antigos atrapalham?

Não. Use os filtros para ver apenas **alertas ativos**. Resolva os que foram tratados para manter a lista limpa.

### 8. Posso ter dois materiais com mesmo código?

**Não**. Códigos são únicos por tipo (materiais e equipamentos separados).

### 9. Como desfazer uma movimentação?

Registre uma **movimentação inversa**. Se foi SAÍDA, registre ENTRADA da mesma quantidade. Adicione observação explicando.

### 10. Quem pode aprovar compras?

Depende das permissões configuradas. Geralmente: **Gerentes** e **Administradores**.

---

## 🆘 SUPORTE

### Contato

📧 **Email:** suporte@gladpros.com  
📞 **Telefone:** (XX) XXXX-XXXX  
💬 **Chat:** Disponível no sistema (canto inferior direito)

### Horário de Atendimento

- Segunda a Sexta: 8h às 18h
- Sábado: 8h às 12h
- Domingo e Feriados: Apenas emergências

### Tutoriais em Vídeo

🎥 Acesse nossa **Central de Ajuda**: [https://ajuda.gladpros.com](https://ajuda.gladpros.com)

- Cadastro de Materiais (5min)
- Gestão de Equipamentos (8min)
- Registro de Movimentações (6min)
- Gerenciamento de Alertas (4min)
- Fluxo Completo de Compras (12min)

---

## 📝 NOTAS DE VERSÃO

### v1.0.0 - 12/10/2025

**Lançamento Inicial** 🎉

✨ **Novidades:**
- Módulo completo de Estoque
- 6 submódulos integrados
- Sistema inteligente de alertas
- Workflow de compras
- Dashboard com métricas em tempo real

---

**Desenvolvido com ❤️ pela equipe GladPros**  
**Versão:** 1.0.0  
**Data:** 12 de outubro de 2025
