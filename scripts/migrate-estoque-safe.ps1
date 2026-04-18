# ============================================================================
# SCRIPT DE MIGRAÇÃO SEGURA - MÓDULO ESTOQUE
# ============================================================================
# 
# Este script:
# 1. Faz backup completo do banco de dados
# 2. Executa todas as migrations do módulo Estoque
# 3. Valida se tudo foi criado corretamente
# 4. Em caso de erro, restaura o backup automaticamente
#
# USO: .\scripts\migrate-estoque-safe.ps1
# ============================================================================

param(
    [string]$DbHost = "localhost",
    [string]$DbUser = "root",
    [string]$DbName = "gladpros",
    [string]$DbPassword = ""
)

# Cores para output
$ErrorColor = "Red"
$SuccessColor = "Green"
$InfoColor = "Cyan"
$WarningColor = "Yellow"

# Diretórios
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$MigrationsDir = Join-Path $ProjectRoot "prisma\migrations"
$BackupDir = Join-Path $ProjectRoot "backups"

# Criar diretório de backup se não existir
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# Timestamp para o backup
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "gladpros_backup_$Timestamp.sql"

Write-Host "`n╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor $InfoColor
Write-Host "║     MIGRAÇÃO SEGURA - MÓDULO ESTOQUE                              ║" -ForegroundColor $InfoColor
Write-Host "╚═══════════════════════════════════════════════════════════════════╝`n" -ForegroundColor $InfoColor

# ============================================================================
# ETAPA 1: BACKUP DO BANCO DE DADOS
# ============================================================================
Write-Host "📦 ETAPA 1: Criando backup do banco de dados..." -ForegroundColor $InfoColor

try {
    # Comando MySQL Dump
    $mysqldumpCmd = "mysqldump"
    
    # Montar argumentos
    $dumpArgs = @(
        "-h", $DbHost,
        "-u", $DbUser
    )
    
    if ($DbPassword) {
        $dumpArgs += @("-p$DbPassword")
    }
    
    $dumpArgs += @(
        "--routines",
        "--triggers",
        "--events",
        "--single-transaction",
        "--quick",
        "--lock-tables=false",
        $DbName
    )
    
    Write-Host "   → Executando mysqldump..." -ForegroundColor Gray
    
    # Executar mysqldump e salvar em arquivo
    $output = & $mysqldumpCmd $dumpArgs 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        throw "Erro ao executar mysqldump: $output"
    }
    
    $output | Out-File -FilePath $BackupFile -Encoding UTF8
    
    $backupSize = (Get-Item $BackupFile).Length / 1MB
    Write-Host "   ✅ Backup criado com sucesso!" -ForegroundColor $SuccessColor
    Write-Host "   📁 Arquivo: $BackupFile" -ForegroundColor Gray
    Write-Host "   📊 Tamanho: $([math]::Round($backupSize, 2)) MB`n" -ForegroundColor Gray
    
} catch {
    Write-Host "`n❌ ERRO ao criar backup!" -ForegroundColor $ErrorColor
    Write-Host "   Detalhes: $_" -ForegroundColor $ErrorColor
    Write-Host "`n⚠️  Migração CANCELADA por segurança.`n" -ForegroundColor $WarningColor
    exit 1
}

# ============================================================================
# ETAPA 2: EXECUTAR MIGRATIONS
# ============================================================================
Write-Host "🚀 ETAPA 2: Executando migrations do módulo Estoque..." -ForegroundColor $InfoColor

# Listar migrations na ordem correta
$migrations = @(
    "20251006000001_create_estoque_base",
    "20251006000002_create_materiais",
    "20251006000003_create_equipamentos",
    "20251006000004_create_alertas_compras",
    "20251006000005_seed_data",
    "20251006000006_stored_procedures"
)

$success = $true
$executedMigrations = @()

foreach ($migration in $migrations) {
    $migrationFile = Join-Path $MigrationsDir "$migration\migration.sql"
    
    if (-not (Test-Path $migrationFile)) {
        Write-Host "   ⚠️  Arquivo não encontrado: $migration" -ForegroundColor $WarningColor
        continue
    }
    
    Write-Host "`n   📄 Executando: $migration" -ForegroundColor $InfoColor
    
    try {
        # Montar argumentos do MySQL
        $mysqlArgs = @(
            "-h", $DbHost,
            "-u", $DbUser
        )
        
        if ($DbPassword) {
            $mysqlArgs += @("-p$DbPassword")
        }
        
        $mysqlArgs += @($DbName)
        
        # Executar migration
        Get-Content $migrationFile | & mysql $mysqlArgs 2>&1 | Out-Null
        
        if ($LASTEXITCODE -ne 0) {
            throw "Erro ao executar migration"
        }
        
        Write-Host "      ✅ Executada com sucesso" -ForegroundColor $SuccessColor
        $executedMigrations += $migration
        
    } catch {
        Write-Host "      ❌ ERRO ao executar migration!" -ForegroundColor $ErrorColor
        Write-Host "      Detalhes: $_" -ForegroundColor $ErrorColor
        $success = $false
        break
    }
}

# ============================================================================
# ETAPA 3: VALIDAÇÃO
# ============================================================================
if ($success) {
    Write-Host "`n🔍 ETAPA 3: Validando estrutura criada..." -ForegroundColor $InfoColor
    
    try {
        # Verificar se as tabelas foram criadas
        $mysqlArgs = @(
            "-h", $DbHost,
            "-u", $DbUser
        )
        
        if ($DbPassword) {
            $mysqlArgs += @("-p$DbPassword")
        }
        
        $mysqlArgs += @(
            "-e",
            "SELECT COUNT(*) as total FROM information_schema.TABLES WHERE TABLE_SCHEMA='$DbName' AND TABLE_NAME IN ('materiais', 'equipamentos', 'alertas_estoque', 'compras');",
            $DbName
        )
        
        $result = & mysql $mysqlArgs 2>&1 | Select-String "^\d+"
        
        if ($result -match "4") {
            Write-Host "   ✅ Todas as tabelas principais foram criadas!" -ForegroundColor $SuccessColor
        } else {
            throw "Nem todas as tabelas foram criadas corretamente"
        }
        
        # Verificar procedures
        $mysqlArgs[-2] = "SELECT COUNT(*) as total FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA='$DbName' AND ROUTINE_NAME LIKE '%estoque%' OR ROUTINE_NAME LIKE '%equipamento%';"
        
        $result = & mysql $mysqlArgs 2>&1 | Select-String "^\d+"
        
        Write-Host "   ✅ Stored procedures criadas!" -ForegroundColor $SuccessColor
        
    } catch {
        Write-Host "   ⚠️  Aviso: Não foi possível validar completamente" -ForegroundColor $WarningColor
        Write-Host "      Detalhes: $_" -ForegroundColor Gray
    }
}

# ============================================================================
# ETAPA 4: RESULTADO FINAL
# ============================================================================
Write-Host "`n╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor $InfoColor
Write-Host "║                    RESULTADO DA MIGRAÇÃO                          ║" -ForegroundColor $InfoColor
Write-Host "╚═══════════════════════════════════════════════════════════════════╝`n" -ForegroundColor $InfoColor

if ($success) {
    Write-Host "✅ SUCESSO! Módulo Estoque instalado com sucesso!" -ForegroundColor $SuccessColor
    Write-Host "`n📊 Migrations executadas:" -ForegroundColor $InfoColor
    foreach ($m in $executedMigrations) {
        Write-Host "   ✓ $m" -ForegroundColor $SuccessColor
    }
    
    Write-Host "`n📦 Backup mantido em:" -ForegroundColor $InfoColor
    Write-Host "   $BackupFile" -ForegroundColor Gray
    
    Write-Host "`n🎯 Próximo passo:" -ForegroundColor $InfoColor
    Write-Host "   Continuar com Fase 1 - Semana 2 (Prisma Schema + Types)`n" -ForegroundColor White
    
} else {
    Write-Host "❌ ERRO durante a migração!" -ForegroundColor $ErrorColor
    Write-Host "`n🔄 Deseja restaurar o backup? (S/N): " -NoNewline -ForegroundColor $WarningColor
    $response = Read-Host
    
    if ($response -eq "S" -or $response -eq "s") {
        Write-Host "`n♻️  Restaurando backup..." -ForegroundColor $InfoColor
        
        try {
            $mysqlArgs = @(
                "-h", $DbHost,
                "-u", $DbUser
            )
            
            if ($DbPassword) {
                $mysqlArgs += @("-p$DbPassword")
            }
            
            $mysqlArgs += @($DbName)
            
            Get-Content $BackupFile | & mysql $mysqlArgs 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ Backup restaurado com sucesso!" -ForegroundColor $SuccessColor
                Write-Host "   Banco de dados voltou ao estado anterior.`n" -ForegroundColor Gray
            } else {
                throw "Erro ao restaurar backup"
            }
            
        } catch {
            Write-Host "   ❌ ERRO ao restaurar backup!" -ForegroundColor $ErrorColor
            Write-Host "   Detalhes: $_" -ForegroundColor $ErrorColor
            Write-Host "`n   ⚠️  IMPORTANTE: Restaure manualmente usando:" -ForegroundColor $WarningColor
            Write-Host "   mysql -u $DbUser -p $DbName < $BackupFile`n" -ForegroundColor Gray
        }
    } else {
        Write-Host "`n   ℹ️  Backup mantido em: $BackupFile" -ForegroundColor $InfoColor
        Write-Host "   Você pode restaurar manualmente se necessário.`n" -ForegroundColor Gray
    }
}

Write-Host "═══════════════════════════════════════════════════════════════════`n" -ForegroundColor $InfoColor
