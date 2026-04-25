---
description: "Investigação sistemática e correção de bugs — analisa stack trace, identifica causa raiz, propõe patch mínimo e sugere teste de regressão"
agent: "agent"
---

# Fix Bug — GladPros ERP

Use este prompt para investigar e corrigir um bug de forma sistemática.

**Descreva o problema:**

> Exemplo: "Invoice não está sendo marcada como PAID após registrar pagamento. Status fica em PARTIALLY_PAID mesmo com valorPago = valorTotal"

---

## Informações Necessárias

Para investigação eficaz, forneça o máximo possível:

1. **Stack trace ou mensagem de erro** (se disponível)
2. **Módulo / página / API afetada**
3. **Role do usuário** quando o bug ocorre
4. **Passos para reproduzir** (sequência mínima)
5. **Comportamento atual vs esperado**
6. **É 100% reproduzível ou intermitente?**
7. **Surgiu após alguma mudança recente?** (commit, deploy, migration)

---

## Processo de Investigação

O agente vai:

### 1. Análise (sem tocar no código ainda)
- Ler os arquivos afetados
- Traçar o fluxo de execução até o ponto do erro
- Identificar a causa raiz (DATA / LOGIC / RACE / ENV / TYPE / RBAC / SCHEMA)

### 2. Diagnóstico
- Confirmar reprodução mínima
- Verificar se há outros lugares com o mesmo problema
- Avaliar impacto (quantos usuários/dados afetados)

### 3. Correção
- Propor patch **mínimo** — não refatora o que não está quebrado
- Verificar risco de regressão nos módulos próximos
- Aplicar correção após aprovação

### 4. Prevenção
- Sugerir teste para prevenir reincidência
- Documentar a causa raiz como comentário se for complexa

---

## Classificação de Severidade

| P1 — Crítico | P2 — Funcional | P3 — Cosmético |
|-------------|---------------|---------------|
| Perda de dados | Feature quebrada | UI incorreta |
| Auth bypass | Cálculo errado | Texto errado |
| Dados corrompidos | Status incorreto | Layout quebrado |
| Sistema inacessível | Permissão errada | Performance lenta |

---

## Regras

- **Nunca aplicar "patch rápido"** sem entender a causa raiz
- **Nunca modificar dados de produção** sem aprovação explícita
- **Nunca refatorar código funcional** durante a correção do bug
- **Sempre propor antes de aplicar** — confirmar antes de editar arquivos críticos

Descreva o bug e eu inicio a investigação.
