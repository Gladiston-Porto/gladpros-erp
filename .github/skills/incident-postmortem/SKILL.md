---
name: incident-postmortem
description: "Use quando um bug chegou à produção ou quando uma regressão foi detectada em produção. Cobre o template de postmortem, análise de causa raiz e plano de prevenção."
---

# Skill: Incident Postmortem

## O que é um Postmortem

Um postmortem é uma análise sistemática de **por que um problema ocorreu** e **como evitar que volte**. Não é para culpar — é para aprender e melhorar o sistema.

No GladPros, usamos quando:
- Um bug chegou à produção e afetou dados reais
- Uma regressão foi detectada (bug que voltou)
- Um incidente de segurança ocorreu
- Uma certificação falsa foi emitida

---

## Template de Postmortem

```markdown
# Postmortem: [TÍTULO DO INCIDENTE]

**Data do incidente**: YYYY-MM-DD HH:MM CST
**Duração do impacto**: Xh Ymin
**Severidade**: P1 (Crítico) | P2 (Alto) | P3 (Médio)
**Módulo afetado**: [modulo]
**Bug ID**: [BUG-ID se cadastrado]
**Status**: Em análise | Corrigido | Monitorando

---

## Resumo Executivo

[2-3 frases explicando o que aconteceu, o impacto e a solução]

---

## Linha do Tempo

| Horário (CST) | Evento |
|---------------|--------|
| HH:MM | Incidente iniciado |
| HH:MM | Detectado por [quem/o quê] |
| HH:MM | Análise iniciada |
| HH:MM | Causa raiz identificada |
| HH:MM | Fix deployado |
| HH:MM | Incidente resolvido |

---

## Impacto

- **Usuários afetados**: N
- **Dados afetados**: [descrição]
- **Operações afetadas**: [o que não funcionou]
- **Potencial de impacto fiscal/financeiro**: Sim/Não — [descrição]

---

## Causa Raiz (5 Porquês)

**Por que o bug existia?**
→ [Resposta]

**Por que não foi detectado no desenvolvimento?**
→ [Resposta]

**Por que não foi detectado na auditoria?**
→ [Resposta]

**Por que não foi detectado no CI/CD?**
→ [Resposta]

**Por que chegou à produção?**
→ [Resposta]

---

## Falhas no Sistema de Qualidade

| Camada Swiss Cheese | Falhou? | Por quê? |
|--------------------|---------|----------|
| 1. known-bugs.json | ✅/❌ | |
| 2. Semgrep | ✅/❌ | |
| 3. Pre-commit | ✅/❌ | |
| 4. ESLint | ✅/❌ | |
| 5. Health Check | ✅/❌ | |
| 6. CI quality-gate | ✅/❌ | |
| 7. certify-module | ✅/❌ | |

---

## Fix Aplicado

**Arquivo(s)**: 
**Linha(s)**:
**Mudança**:
```diff
- código antes
+ código depois
```

**Commit**: [hash]
**Deploy**: [data/hora]

---

## Ações Preventivas

| Ação | Responsável | Prazo | Status |
|------|-------------|-------|--------|
| Criar teste de regressão | Agente | Imediato | [ ] |
| Criar regra Semgrep | Agente | Imediato | [ ] |
| Atualizar known-bugs.json | Agente | Imediato | [ ] |
| Re-auditar módulo afetado | Agente | Esta semana | [ ] |
| Atualizar DoD se necessário | Agente | Este sprint | [ ] |
| Documentar em AGENTS.md | Agente | Este sprint | [ ] |

---

## Lições Aprendidas

1. [Lição mais importante]
2. [Segunda lição]
3. [Terceira lição]

---

## Assinatura

**Análise feita por**: [agente/pessoa]
**Data do postmortem**: YYYY-MM-DD
**Revisado por**: [se aplicável]
```

---

## Quando Criar um Postmortem

### Obrigatório (P1/P2)
- Bug de segurança chegou à produção (auth bypass, IDOR, token inválido)
- Dados financeiros corrompidos ou expostos
- Usuário conseguiu ação que não deveria ter permissão
- Sistema ficou indisponível por >5 minutos

### Recomendado (P3 grave ou regressão)
- Bug P3 com impacto em múltiplos usuários
- Qualquer regressão (bug que voltou após fix)
- Certificação falsa emitida para um módulo
- Quality gate passou mas bug chegou mesmo assim

---

## Onde Salvar

```
docs/postmortems/YYYY-MM-DD-[titulo-kebab].md
```

Exemplo:
```
docs/postmortems/2026-05-21-usuarios-p2-003-delete-sem-tokenversion.md
```

---

## Regra de Cultura

> Postmortems **não são para culpa**. São para o sistema aprender.
> Se o sistema falhou, o sistema precisa ser melhorado.
> Se um agente deixou passar, a camada que deveria ter detectado precisa ser reforçada.
> 
> A pergunta não é "quem errou?" — é "por que o processo não pegou?"
