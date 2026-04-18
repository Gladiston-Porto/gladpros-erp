# ============================================
# SCRIPT DE MIGRACAO - REPOSITORIOS SEPARADOS
# ============================================
# Data: 09/11/2025
# Objetivo: Migrar modulos do monorepo para repos separados

param(
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

# Configuracoes
$OWNER = "Gladiston-Porto"
$BASE_DIR = "C:\Users\gladi\Documents"
$MONOREPO = "$BASE_DIR\gladpros-nextjs"
$NEW_REPOS_DIR = "$BASE_DIR\GladPros-Modules"

# Modulos a migrar
$MODULES_TO_MIGRATE = @(
    @{ Name = "GladPros-Auth"; Priority = "CRITICA" },
    @{ Name = "GladPros-Estoque"; Priority = "ALTA" },
    @{ Name = "GladPros-Financeiro"; Priority = "ALTA" }
)

# Modulos existentes
$EXISTING_MODULES = @(
    "GladPros-UI",
    "GladPros-Clients",
    "GladPros-Proposals",
    "GladPros-Dashboard"
)

# ============================================
# FUNCOES
# ============================================

function Write-Step {
    param([string]$Message)
    Write-Host "`n============================================================" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor White
    Write-Host "============================================================`n" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[AVISO] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERRO] $Message" -ForegroundColor Red
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
    
    Write-Host "Criando repositorio: $RepoName..."
    
    if ($DryRun) {
        Write-Warning "[DRY RUN] Simulando criacao de: $OWNER/$RepoName"
        return $true
    }
    
    try {
        $result = gh repo create "$OWNER/$RepoName" --private --confirm 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Repositorio criado: https://github.com/$OWNER/$RepoName"
            return $true
        } else {
            Write-Warning "Repositorio ja existe ou erro: $result"
            return $false
        }
    } catch {
        Write-Error "Falha ao criar repositorio: $_"
        return $false
    }
}

function Extract-ModuleHistory {
    param(
        [string]$ModuleName,
        [string]$MonorepoPath,
        [bool]$DryRun
    )
    
    Write-Host "Extraindo historico do modulo: $ModuleName..."
    
    Push-Location $MonorepoPath
    
    try {
        if ($DryRun) {
            Write-Warning "[DRY RUN] Simulando extracao de historico"
            Pop-Location
            return "dry-run-branch"
        }
        
        # Criar branch temporaria com historico do modulo
        $branchName = "$($ModuleName.ToLower())-module"
        
        Write-Host "   Criando branch: $branchName..."
        git subtree split -P $ModuleName -b $branchName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Historico extraido em branch: $branchName"
            Pop-Location
            return $branchName
        } else {
            Write-Error "Falha ao extrair historico"
            Pop-Location
            return $null
        }
    } catch {
        Write-Error "Erro na extracao: $_"
        Pop-Location
        return $null
    }
}

function Push-ModuleToRepo {
    param(
        [string]$ModuleName,
        [string]$BranchName,
        [string]$MonorepoPath,
        [bool]$DryRun
    )
    
    Write-Host "Enviando modulo para repositorio remoto..."
    
    Push-Location $MonorepoPath
    
    try {
        if ($DryRun) {
            Write-Warning "[DRY RUN] Simulando push para: https://github.com/$OWNER/$ModuleName.git"
            Pop-Location
            return $true
        }
        
        $repoUrl = "https://github.com/$OWNER/$ModuleName.git"
        
        Write-Host "   Pushing para: $repoUrl..."
        git push $repoUrl "${BranchName}:main"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Modulo enviado com sucesso!"
            Pop-Location
            return $true
        } else {
            Write-Error "Falha no push"
            Pop-Location
            return $false
        }
    } catch {
        Write-Error "Erro no push: $_"
        Pop-Location
        return $false
    }
}

function Clone-SeparateRepo {
    param(
        [string]$ModuleName,
        [string]$DestPath,
        [bool]$DryRun
    )
    
    Write-Host "Clonando repositorio separado..."
    
    $targetPath = Join-Path $DestPath $ModuleName
    
    if (Test-Path $targetPath) {
        Write-Warning "Diretorio ja existe: $targetPath"
        Write-Host "   Atualizando..."
        if (-not $DryRun) {
            Push-Location $targetPath
            git pull
            Pop-Location
        }
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
    
    Write-Host "Configurando package.json..."
    
    if ($DryRun) {
        Write-Warning "[DRY RUN] Simulando configuracao de package.json"
        return $true
    }
    
    Push-Location $ModulePath
    
    try {
        $packageName = "@gladpros/$($ModuleName.Replace('GladPros-', '').ToLower())"
        
        # Verificar se ja tem package.json
        if (Test-Path "package.json") {
            Write-Host "   package.json ja existe, atualizando nome..."
            $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
            $pkg.name = $packageName
            $pkg | ConvertTo-Json -Depth 10 | Set-Content "package.json"
        } else {
            Write-Host "   Criando package.json..."
            npm init -y
            $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
            $pkg.name = $packageName
            $pkg.version = "1.0.0"
            $pkg.private = $true
            $pkg | ConvertTo-Json -Depth 10 | Set-Content "package.json"
        }
        
        Write-Success "Package configurado: $packageName"
        Pop-Location
        return $true
    } catch {
        Write-Error "Erro na configuracao: $_"
        Pop-Location
        return $false
    }
}

# ============================================
# SCRIPT PRINCIPAL
# ============================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   MIGRACAO PARA REPOSITORIOS SEPARADOS" -ForegroundColor Cyan
Write-Host ""
if ($DryRun) {
    Write-Host "   Modo: DRY RUN (Simulacao)" -ForegroundColor Yellow
} else {
    Write-Host "   Modo: EXECUCAO REAL" -ForegroundColor Green
}
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# VERIFICACOES PRE-REQUISITOS
# ============================================

Write-Step "VERIFICANDO PRE-REQUISITOS"

# Verificar GitHub CLI
if (-not (Test-GitHubCLI)) {
    Write-Error "GitHub CLI (gh) nao encontrado!"
    Write-Host "Instale com: winget install GitHub.cli"
    exit 1
}
Write-Success "GitHub CLI instalado"

# Verificar autenticacao
try {
    gh auth status 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Autenticado no GitHub"
    } else {
        Write-Warning "Faca login com: gh auth login"
        exit 1
    }
} catch {
    Write-Error "Nao autenticado no GitHub"
    Write-Host "Execute: gh auth login"
    exit 1
}

# Verificar monorepo
if (-not (Test-Path $MONOREPO)) {
    Write-Error "Monorepo nao encontrado: $MONOREPO"
    exit 1
}
Write-Success "Monorepo encontrado: $MONOREPO"

# Verificar se e repositorio git
if (-not (Test-GitRepository $MONOREPO)) {
    Write-Error "Nao e um repositorio git: $MONOREPO"
    exit 1
}
Write-Success "Repositorio git valido"

# ============================================
# FASE 1: CRIAR REPOSITORIOS
# ============================================

Write-Step "FASE 1: CRIANDO REPOSITORIOS NO GITHUB"

foreach ($module in $MODULES_TO_MIGRATE) {
    $moduleName = $module.Name
    $priority = $module.Priority
    
    Write-Host "`nModulo: $moduleName (Prioridade: $priority)" -ForegroundColor Yellow
    
    $created = Create-GitHubRepo -RepoName $moduleName -DryRun $DryRun
    
    if (-not $created -and -not $DryRun) {
        Write-Warning "Repositorio ja existe ou erro na criacao. Continuando..."
    }
    
    Start-Sleep -Seconds 2
}

# ============================================
# FASE 2: MIGRAR MODULOS
# ============================================

Write-Step "FASE 2: MIGRANDO MODULOS DO MONOREPO"

# Criar diretorio para novos repos
if (-not (Test-Path $NEW_REPOS_DIR)) {
    if (-not $DryRun) {
        New-Item -ItemType Directory -Path $NEW_REPOS_DIR -Force | Out-Null
    }
    Write-Success "Diretorio criado: $NEW_REPOS_DIR"
}

foreach ($module in $MODULES_TO_MIGRATE) {
    $moduleName = $module.Name
    
    Write-Host "`n============================================================" -ForegroundColor Cyan
    Write-Host "  MIGRANDO: $moduleName" -ForegroundColor White
    Write-Host "============================================================" -ForegroundColor Cyan
    
    # 1. Extrair historico
    $branchName = Extract-ModuleHistory -ModuleName $moduleName -MonorepoPath $MONOREPO -DryRun $DryRun
    
    if (-not $branchName) {
        Write-Error "Falha ao extrair historico de: $moduleName"
        continue
    }
    
    # 2. Push para repositorio remoto
    $pushed = Push-ModuleToRepo -ModuleName $moduleName -BranchName $branchName -MonorepoPath $MONOREPO -DryRun $DryRun
    
    if (-not $pushed -and -not $DryRun) {
        Write-Error "Falha no push de: $moduleName"
        continue
    }
    
    # 3. Clonar repositorio separado
    $cloned = Clone-SeparateRepo -ModuleName $moduleName -DestPath $NEW_REPOS_DIR -DryRun $DryRun
    
    if (-not $cloned -and -not $DryRun) {
        Write-Error "Falha ao clonar: $moduleName"
        continue
    }
    
    # 4. Configurar package.json
    $modulePath = Join-Path $NEW_REPOS_DIR $moduleName
    if ((Test-Path $modulePath) -or $DryRun) {
        Setup-ModulePackage -ModulePath $modulePath -ModuleName $moduleName -DryRun $DryRun
    }
    
    Write-Success "Migracao de $moduleName concluida!"
}

# ============================================
# FASE 3: VERIFICAR MODULOS EXISTENTES
# ============================================

Write-Step "FASE 3: VERIFICANDO MODULOS EXISTENTES"

foreach ($moduleName in $EXISTING_MODULES) {
    Write-Host "`nVerificando: $moduleName"
    
    $modulePath = Join-Path $MONOREPO $moduleName
    
    if (Test-Path $modulePath) {
        if (Test-GitRepository $modulePath) {
            Write-Success "$moduleName tem repositorio proprio"
            
            Push-Location $modulePath
            $remote = git remote get-url origin 2>$null
            if ($remote) {
                Write-Host "   Remote: $remote" -ForegroundColor Cyan
            }
            Pop-Location
        } else {
            Write-Warning "$moduleName nao tem .git interno"
        }
    } else {
        Write-Warning "$moduleName nao encontrado no monorepo"
    }
}

# ============================================
# RESUMO FINAL
# ============================================

Write-Step "RESUMO DA MIGRACAO"

Write-Host ""
Write-Host "Repositorios Criados:" -ForegroundColor Green
foreach ($m in $MODULES_TO_MIGRATE) {
    Write-Host "   - $($m.Name)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Repositorios Existentes:" -ForegroundColor Yellow
foreach ($m in $EXISTING_MODULES) {
    Write-Host "   - $m" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Novos Repos em: $NEW_REPOS_DIR" -ForegroundColor Cyan

Write-Host ""
Write-Host "Proximos Passos:" -ForegroundColor Magenta
Write-Host "   1. Verificar cada repositorio no GitHub"
Write-Host "   2. Configurar CI/CD (.github/workflows/ci.yml)"
Write-Host "   3. Configurar branch protection rules"
Write-Host "   4. Adicionar README.md em cada repo"
Write-Host "   5. Configurar dependencias entre modulos"
Write-Host "   6. Atualizar documentacao geral"
Write-Host ""

if ($DryRun) {
    Write-Host "AVISO: ESTE FOI UM DRY RUN - Nenhuma alteracao foi feita" -ForegroundColor Yellow
    Write-Host "Execute sem -DryRun para aplicar as mudancas" -ForegroundColor Yellow
} else {
    Write-Host "Migracao concluida!" -ForegroundColor Green
}

Write-Host ""
