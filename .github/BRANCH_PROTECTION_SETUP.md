# 🔒 Configuração de Branch Protection - Repositórios GladPros

## ⚠️ Limitação Atual

Branch Protection Rules avançadas para repositórios **privados** requerem **GitHub Pro** ou superior.

**Planos GitHub:**
- ✅ Free: Branch protection básica em repos públicos
- ✅ Pro ($4/mês): Branch protection completa em repos privados
- ✅ Team/Enterprise: Recursos adicionais

---

## 🎯 Opções Disponíveis

### Opção 1: Upgrade para GitHub Pro (Recomendado)
- Custo: $4/mês por usuário
- Benefícios:
  - Branch protection completa
  - 3000 minutos de Actions (vs 2000 free)
  - 2GB de Packages storage (vs 500MB free)
  - Wikis privados
  - Múltiplos reviewers obrigatórios

### Opção 2: Tornar Repos Públicos (Não Recomendado)
- ❌ **NÃO RECOMENDADO** para código comercial
- Expõe lógica de negócio
- Riscos de segurança

### Opção 3: Branch Protection Básica (Atual)
- ✅ Disponível em FREE para repos privados
- Configuração manual via GitHub UI

---

## 🛠️ Configuração Manual (GitHub Free)

### Para Cada Repositório:

1. **Acesse Settings**
   - Vá em: `https://github.com/Gladiston-Porto/{repo-name}/settings`

2. **Navegue para Branches**
   - Menu lateral → "Branches"
   - Seção "Branch protection rules"

3. **Adicione Regra para `main`**
   - Clique "Add branch protection rule"
   - Branch name pattern: `main`

4. **Configure Proteções Disponíveis (FREE):**

   ✅ **Require a pull request before merging**
   - Require approvals: 1 (se múltiplos colaboradores)
   - Dismiss stale pull request approvals when new commits are pushed

   ✅ **Require status checks to pass before merging**
   - Require branches to be up to date before merging
   - Status checks obrigatórios:
     - `Lint`
     - `TypeScript Type Check`
     - `Test`
     - `Build`

   ✅ **Do not allow bypassing the above settings**

   ✅ **Restrict who can push to matching branches**
   - Limitar apenas a administradores (se necessário)

   ✅ **Allow force pushes**
   - **Desmarcar** (impedir force push)

   ✅ **Allow deletions**
   - **Desmarcar** (impedir deleção da branch)

---

## 📋 Checklist de Configuração

### GladPros-Auth
- [ ] Branch protection rule criada para `main`
- [ ] Pull request obrigatório
- [ ] Status checks configurados (4 checks)
- [ ] Force push bloqueado
- [ ] Deleção bloqueada

### GladPros-Estoque
- [ ] Branch protection rule criada para `main`
- [ ] Pull request obrigatório
- [ ] Status checks configurados (4 checks)
- [ ] Force push bloqueado
- [ ] Deleção bloqueada

### GladPros-Financeiro
- [ ] Branch protection rule criada para `main`
- [ ] Pull request obrigatório
- [ ] Status checks configurados (4 checks)
- [ ] Force push bloqueado
- [ ] Deleção bloqueada

### GladPros-UI
- [ ] Branch protection rule criada para `main`
- [ ] Pull request obrigatório
- [ ] Status checks configurados
- [ ] Force push bloqueado
- [ ] Deleção bloqueada

### GladPros-Clients
- [ ] Branch protection rule criada para `main`
- [ ] Pull request obrigatório
- [ ] Status checks configurados
- [ ] Force push bloqueado
- [ ] Deleção bloqueada

### GladPros-Dashboard
- [ ] Branch protection rule criada para `main`
- [ ] Pull request obrigatório
- [ ] Status checks configurados
- [ ] Force push bloqueado
- [ ] Deleção bloqueada

### GladPros-Proposals
- [ ] Branch protection rule criada para `main`
- [ ] Pull request obrigatório
- [ ] Status checks configurados
- [ ] Force push bloqueado
- [ ] Deleção bloqueada

---

## 🤖 Script Automatizado (Requer GitHub Pro)

Se você fizer upgrade para GitHub Pro, pode usar este script PowerShell:

```powershell
# Script de configuração automática de branch protection
# REQUER: GitHub Pro ou superior

$repos = @(
    "GladPros-Auth",
    "GladPros-Estoque",
    "GladPros-Financeiro",
    "GladPros-UI",
    "GladPros-Clients",
    "GladPros-Dashboard",
    "GladPros-Proposals"
)

$protection = @'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Lint", "TypeScript Type Check", "Test", "Build"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
'@

foreach ($repo in $repos) {
    Write-Host "Configurando branch protection para $repo..." -ForegroundColor Cyan
    
    echo $protection | gh api "repos/Gladiston-Porto/$repo/branches/main/protection" `
        -X PUT --input -
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $repo configurado com sucesso" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao configurar $repo" -ForegroundColor Red
    }
}

Write-Host "`n✅ Configuração concluída!" -ForegroundColor Green
```

---

## 📊 Status Atual

**Configuração Automática:** ❌ Bloqueada (requer GitHub Pro)
**Configuração Manual:** ⚠️ Pendente
**CI/CD Pipelines:** ✅ Configurados e funcionais

---

## 💡 Recomendação

**Para produção comercial**, recomendamos:

1. **Upgrade para GitHub Pro** ($4/mês)
   - Proteção completa de branches
   - Mais minutos de CI/CD
   - Suporte prioritário

2. **OU usar Workflow Rules como alternativa:**
   - Configurar workflow que bloqueia merge se checks falharem
   - Usar CODEOWNERS para revisões obrigatórias
   - Implementar pre-push hooks locais

---

## 🔗 Links Úteis

- [GitHub Pricing](https://github.com/pricing)
- [Branch Protection Docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

---

**Criado em**: 09/11/2025  
**Última atualização**: 09/11/2025
