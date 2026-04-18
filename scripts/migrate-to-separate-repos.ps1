# ============================================
# SCRIPT DE MIGRAÇÃO - REPOSITÓRIOS SEPARADOS
# ============================================
# Data: 09/11/2025
# Autor: GitHub Copilot
# Objetivo: Migrar módulos do monorepo para repos separados

param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

# Configurações
$OWNER = "Gladiston-Porto"
$BASE_DIR = "C:\Users\gladi\Documents"
$MONOREPO = "$BASE_DIR\gladpros-nextjs"
$NEW_REPOS_DIR = "$BASE_DIR\GladPros-Modules"

# Módulos a migrar
$MODULES_TO_MIGRATE = @(
    @{ Name = "GladPros-Auth"; Priority = "CRÍTICA"; HasGit = $false },
    @{ Name = "GladPros-Estoque"; Priority = "ALTA"; HasGit = $false },
    @{ Name = "GladPros-Financeiro"; Priority = "ALTA"; HasGit = $false }
)

# Módulos existentes
$EXISTING_MODULES = @(
    "GladPros-UI",
    "GladPros-Clients",
    "GladPros-Proposals",
    "GladPros-Dashboard"
)

# ============================================
# FUNÇÕES
# ============================================

function Write-Step {
    param([string]$Message)
    Write-Host "`n$('='*60)" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor White
    Write-Host "$('='*60)`n" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Test-GitHubCLI {
    try {
        gh --version | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Test-GitRepository {
    param([string]$Path)
    Test-Path "$Path\.git"
}

function Create-GitHubRepo {
    param(
        [string]$RepoName,
        [bool]$DryRun
    )
    
    Write-Host "📦 Criando repositório: $RepoName..."
    
    if ($DryRun) {
        Write-Warning "[DRY RUN] Simulando criação de: $OWNER/$RepoName"
        return $true
    }
    
    try {
        $result = gh repo create "$OWNER/$RepoName" --private --confirm 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Repositório criado: https://github.com/$OWNER/$RepoName"
            return $true
        } else {
            Write-Warning "Repositório já existe ou erro: $result"
            return $false
        }
    } catch {
        Write-Error "Falha ao criar repositório: $_"
        return $false
    }
}

function Extract-ModuleHistory {
    param(
        [string]$ModuleName,
        [string]$MonorepoPath,
        [bool]$DryRun
    )
    
    Write-Host "🔍 Extraindo histórico do módulo: $ModuleName..."
    
    Push-Location $MonorepoPath
    
    try {
        if ($DryRun) {
            Write-Warning "[DRY RUN] Simulando extração de histórico"
            return $true
        }
        
        # Criar branch temporária com histórico do módulo
        $branchName = "$($ModuleName.ToLower())-module"
        
        Write-Host "   Criando branch: $branchName..."
        git subtree split -P $ModuleName -b $branchName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Histórico extraído em branch: $branchName"
            return $branchName
        } else {
            Write-Error "Falha ao extrair histórico"
            return $null
        }
    } catch {
        Write-Error "Erro na extração: $_"
        return $null
    } finally {
        Pop-Location
    }
}

function Push-ModuleToRepo {
    param(
        [string]$ModuleName,
        [string]$BranchName,
        [string]$MonorepoPath,
        [bool]$DryRun
    )
    
    Write-Host "📤 Enviando módulo para repositório remoto..."
    
    Push-Location $MonorepoPath
    
    try {
        if ($DryRun) {
            Write-Warning "[DRY RUN] Simulando push para: https://github.com/$OWNER/$ModuleName.git"
            return $true
        }
        
        $repoUrl = "https://github.com/$OWNER/$ModuleName.git"
        
        Write-Host "   Pushing para: $repoUrl..."
        git push $repoUrl "${BranchName}:main"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Módulo enviado com sucesso!"
            return $true
        } else {
            Write-Error "Falha no push"
            return $false
        }
    } catch {
        Write-Error "Erro no push: $_"
        return $false
    } finally {
        Pop-Location
    }
}

function Clone-SeparateRepo {
    param(
        [string]$ModuleName,
        [string]$DestPath,
        [bool]$DryRun
    )
    
    Write-Host "📥 Clonando repositório separado..."
    
    $targetPath = Join-Path $DestPath $ModuleName
    
    if (Test-Path $targetPath) {
        Write-Warning "Diretório já existe: $targetPath"
        Write-Host "   Atualizando..."
        Push-Location $targetPath
        git pull
        Pop-Location
        return $true
    }
    
    if ($DryRun) {
        Write-Warning "[DRY RUN] Simulando clone em: $targetPath"
        return $true
    }
    
    try {
        git clone "https://github.com/$OWNER/$ModuleName.git" $targetPath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Clonado em: $targetPath"
            return $true
        } else {
            Write-Error "Falha no clone"
            return $false
        }
    } catch {
        Write-Error "Erro no clone: $_"
        return $false
    }
}

function Setup-ModulePackage {
    param(
        [string]$ModulePath,
        [string]$ModuleName,
        [bool]$DryRun
    )
    
    Write-Host "📦 Configurando package.json..."
    
    if ($DryRun) {
        Write-Warning "[DRY RUN] Simulando configuração de package.json"
        return $true
    }
    
    Push-Location $ModulePath
    
    try {
        $packageName = "@gladpros/$($ModuleName.Replace('GladPros-', '').ToLower())"
        
        # Verificar se já tem package.json
        if (Test-Path "package.json") {
            Write-Host "   package.json já existe, atualizando nome..."
            $pkg = Get-Content "package.json" | ConvertFrom-Json
            $pkg.name = $packageName
            $pkg | ConvertTo-Json -Depth 10 | Set-Content "package.json"
        } else {
            Write-Host "   Criando package.json..."
            npm init -y
            $pkg = Get-Content "package.json" | ConvertFrom-Json
            $pkg.name = $packageName
            $pkg.version = "1.0.0"
            $pkg.private = $true
            $pkg | ConvertTo-Json -Depth 10 | Set-Content "package.json"
        }
        
        Write-Success "Package configurado: $packageName"
        return $true
    } catch {
        Write-Error "Erro na configuração: $_"
        return $false
    } finally {
        Pop-Location
    }
}

# ============================================
# SCRIPT PRINCIPAL
# ============================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   🚀 MIGRAÇÃO PARA REPOSITÓRIOS SEPARADOS" -ForegroundColor Cyan
Write-Host ""
if ($DryRun) {
    Write-Host "   Modo: DRY RUN (Simulação)" -ForegroundColor Yellow
} else {
    Write-Host "   Modo: EXECUÇÃO REAL" -ForegroundColor Green
}
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# VERIFICAÇÕES PRÉ-REQUISITOS
# ============================================

Write-Step "VERIFICANDO PRÉ-REQUISITOS"

# Verificar GitHub CLI
if (-not (Test-GitHubCLI)) {
    Write-Error "GitHub CLI (gh) não encontrado!"
    Write-Host "Instale com: winget install GitHub.cli"
    exit 1
}
Write-Success "GitHub CLI instalado"

# Verificar autenticação
try {
    $ghUser = gh auth status 2>&1 | Select-String "Logged in to github.com as (\w+)" | ForEach-Object { $_.Matches.Groups[1].Value }
    if ($ghUser) {
        Write-Success "Autenticado como: $ghUser"
    } else {
        Write-Warning "Faça login com: gh auth login"
        exit 1
    }
} catch {
    Write-Error "Não autenticado no GitHub"
    Write-Host "Execute: gh auth login"
    exit 1
}

# Verificar monorepo
if (-not (Test-Path $MONOREPO)) {
    Write-Error "Monorepo não encontrado: $MONOREPO"
    exit 1
}
Write-Success "Monorepo encontrado: $MONOREPO"

# Verificar se é repositório git
if (-not (Test-GitRepository $MONOREPO)) {
    Write-Error "Não é um repositório git: $MONOREPO"
    exit 1
}
Write-Success "Repositório git válido"

# ============================================
# FASE 1: CRIAR REPOSITÓRIOS
# ============================================

Write-Step "FASE 1: CRIANDO REPOSITÓRIOS NO GITHUB"

foreach ($module in $MODULES_TO_MIGRATE) {
    $moduleName = $module.Name
    $priority = $module.Priority
    
    Write-Host "`n📦 Módulo: $moduleName (Prioridade: $priority)" -ForegroundColor Yellow
    
    $created = Create-GitHubRepo -RepoName $moduleName -DryRun $DryRun
    
    if (-not $created -and -not $DryRun) {
        Write-Warning "Repositório já existe ou erro na criação. Continuando..."
    }
    
    Start-Sleep -Seconds 2
}

# ============================================
# FASE 2: MIGRAR MÓDULOS
# ============================================

Write-Step "FASE 2: MIGRANDO MÓDULOS DO MONOREPO"

# Criar diretório para novos repos
if (-not (Test-Path $NEW_REPOS_DIR)) {
    New-Item -ItemType Directory -Path $NEW_REPOS_DIR -Force | Out-Null
    Write-Success "Diretório criado: $NEW_REPOS_DIR"
}

foreach ($module in $MODULES_TO_MIGRATE) {
    $moduleName = $module.Name
    
    Write-Host "`n" + "="*60 -ForegroundColor Cyan
    Write-Host "  MIGRANDO: $moduleName" -ForegroundColor White
    Write-Host "="*60 -ForegroundColor Cyan
    
    # 1. Extrair histórico
    $branchName = Extract-ModuleHistory -ModuleName $moduleName -MonorepoPath $MONOREPO -DryRun $DryRun
    
    if (-not $branchName) {
        Write-Error "Falha ao extrair histórico de: $moduleName"
        continue
    }
    
    # 2. Push para repositório remoto
    $pushed = Push-ModuleToRepo -ModuleName $moduleName -BranchName $branchName -MonorepoPath $MONOREPO -DryRun $DryRun
    
    if (-not $pushed -and -not $DryRun) {
        Write-Error "Falha no push de: $moduleName"
        continue
    }
    
    # 3. Clonar repositório separado
    $cloned = Clone-SeparateRepo -ModuleName $moduleName -DestPath $NEW_REPOS_DIR -DryRun $DryRun
    
    if (-not $cloned -and -not $DryRun) {
        Write-Error "Falha ao clonar: $moduleName"
        continue
    }
    
    # 4. Configurar package.json
    $modulePath = Join-Path $NEW_REPOS_DIR $moduleName
    if (Test-Path $modulePath) {
        Setup-ModulePackage -ModulePath $modulePath -ModuleName $moduleName -DryRun $DryRun
    }
    
    Write-Success "Migração de $moduleName concluída!"
}

# ============================================
# FASE 3: VERIFICAR MÓDULOS EXISTENTES
# ============================================

Write-Step "FASE 3: VERIFICANDO MÓDULOS EXISTENTES"

foreach ($moduleName in $EXISTING_MODULES) {
    Write-Host "`n📋 Verificando: $moduleName"
    
    $modulePath = Join-Path $MONOREPO $moduleName
    
    if (Test-Path $modulePath) {
        if (Test-GitRepository $modulePath) {
            Write-Success "$moduleName tem repositório próprio"
            
            Push-Location $modulePath
            $remote = git remote get-url origin 2>$null
            if ($remote) {
                Write-Host "   Remote: $remote" -ForegroundColor Cyan
            }
            Pop-Location
        } else {
            Write-Warning "$moduleName não tem .git interno"
        }
    } else {
        Write-Warning "$moduleName não encontrado no monorepo"
    }
}


# ============================================
# RESUMO FINAL
# ============================================

Write-Step "RESUMO DA MIGRAÇÃO"

Write-Host ""
Write-Host "✅ Repositórios Criados:" -ForegroundColor Green
foreach ($m in $MODULES_TO_MIGRATE) {
    Write-Host "   • $($m.Name)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "📦 Repositórios Existentes:" -ForegroundColor Yellow
foreach ($m in $EXISTING_MODULES) {
    Write-Host "   • $m" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "📁 Novos Repos em: $NEW_REPOS_DIR" -ForegroundColor Cyan

Write-Host ""
Write-Host "🔗 Próximos Passos:" -ForegroundColor Magenta
Write-Host "   1. Verificar cada repositório no GitHub"
Write-Host "   2. Configurar CI/CD (.github/workflows/ci.yml)"
Write-Host "   3. Configurar branch protection rules"
Write-Host "   4. Adicionar README.md em cada repo"
Write-Host "   5. Configurar dependências entre módulos"
Write-Host "   6. Atualizar documentação geral"
Write-Host ""

if ($DryRun) {
    Write-Host "⚠️  ESTE FOI UM DRY RUN - Nenhuma alteração foi feita" -ForegroundColor Yellow
    Write-Host "Execute sem -DryRun para aplicar as mudanças" -ForegroundColor Yellow
} else {
    Write-Host "🎉 Migração concluída!" -ForegroundColor Green
}

Write-Host ""

