#!/usr/bin/env pwsh
# ============================================================================
# GladPros ERP - Criar Pacote Portátil
# ============================================================================
# Cria uma pasta completa com tudo necessário para configurar o sistema
# em outro computador (pen drive, nuvem, etc.)
#
# Uso: .\scripts\create-portable.ps1
#   ou: .\scripts\create-portable.ps1 -Destino "D:\meu-pendrive\gladpros"
# ============================================================================

param(
    [string]$Destino = "$PSScriptRoot\..\..\gladpros-portable"
)

$ErrorActionPreference = "Stop"
$Raiz = (Resolve-Path "$PSScriptRoot\..").Path
$Destino = [IO.Path]::GetFullPath($Destino)

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  GladPros ERP - Pacote Portável" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Origem:  $Raiz"
Write-Host "  Destino: $Destino"
Write-Host ""

# ── 1. Preparar pasta destino ────────────────────────────────────────────────
if (Test-Path $Destino) {
    Write-Host "[!] Pasta destino já existe. Deseja substituir? (S/N)" -ForegroundColor Yellow
    $resp = Read-Host
    if ($resp -notin @('S','s','Y','y')) {
        Write-Host "Cancelado." -ForegroundColor Red
        exit 0
    }
    Remove-Item $Destino -Recurse -Force
}
New-Item -ItemType Directory -Path $Destino -Force | Out-Null

# ── 2. Copiar código-fonte (excluindo diretórios pesados) ───────────────────
Write-Host "[1/5] Copiando código-fonte..." -ForegroundColor Green

$excludeDirs = @(
    'node_modules', '.next', 'dist', 'build', 'coverage',
    'playwright-report', 'test-results', '.turbo', '.cache', '.swc',
    '.git'
)

robocopy $Raiz "$Destino\projeto" /MIR `
    /XD $excludeDirs `
    /XF *.log repomix-output.xml .DS_Store `
    /R:0 /W:0 /NJH /NJS /NDL /NC /NS /NP | Out-Null

Write-Host "   Código copiado." -ForegroundColor DarkGreen

# ── 3. Copiar arquivos de ambiente (não estão no git) ────────────────────────
Write-Host "[2/5] Copiando arquivos de configuração..." -ForegroundColor Green

$envDir = "$Destino\config-secrets"
New-Item -ItemType Directory -Path $envDir -Force | Out-Null

# Copiar todos os .env* (exceto .env.example que já está no repo)
Get-ChildItem "$Raiz\.env*" -File | ForEach-Object {
    Copy-Item $_.FullName "$envDir\$($_.Name)"
    Write-Host "   -> $($_.Name)" -ForegroundColor DarkGreen
}

# Copiar .env.local especificamente (principal)
if (Test-Path "$Raiz\.env.local") {
    Copy-Item "$Raiz\.env.local" "$Destino\projeto\.env.local"
    Write-Host "   -> .env.local copiado para projeto\" -ForegroundColor DarkGreen
}

# ── 4. Exportar banco de dados ───────────────────────────────────────────────
Write-Host "[3/5] Exportando banco de dados..." -ForegroundColor Green

$dumpFile = "$Destino\database\gladpros-dump.sql"
New-Item -ItemType Directory -Path "$Destino\database" -Force | Out-Null

$containerName = "gladpros-nextjs-db-1"
$containerRunning = docker ps --format "{{.Names}}" 2>$null | Select-String $containerName

if ($containerRunning) {
    docker exec $containerName mysqldump -u root -proot `
        --databases gladpros `
        --add-drop-database `
        --routines --triggers `
        --single-transaction 2>$null > $dumpFile

    $size = [math]::Round((Get-Item $dumpFile).Length / 1KB)
    Write-Host "   Dump criado: $size KB" -ForegroundColor DarkGreen
} else {
    Write-Host "   [AVISO] Container MariaDB não está rodando. Dump não criado." -ForegroundColor Yellow
    Write-Host "   Você pode importar depois usando: docker exec -i <container> mysql -u root -proot < gladpros-dump.sql" -ForegroundColor Yellow
    
    # Copiar um dump existente se houver
    if (Test-Path "c:\dev-root\gladpros-portable-db-dump.sql") {
        Copy-Item "c:\dev-root\gladpros-portable-db-dump.sql" $dumpFile
        Write-Host "   Dump anterior encontrado e copiado." -ForegroundColor DarkGreen
    }
}

# ── 5. Criar README de setup ────────────────────────────────────────────────
Write-Host "[4/5] Gerando instruções de setup..." -ForegroundColor Green

$nodeVersion = node -v 2>$null
$npmVersion = npm -v 2>$null
$dataHoje = Get-Date -Format "dd/MM/yyyy HH:mm"

$readme = @"
# GladPros ERP - Pacote Portátil
**Gerado em:** $dataHoje
**Node.js:** $nodeVersion | **npm:** $npmVersion

---

## Estrutura do Pacote

```
gladpros-portable/
├── projeto/              ← Código-fonte completo (sem node_modules)
│   ├── .env.local        ← Configuração com segredos (já copiado)
│   ├── prisma/            ← Schema do banco + seeds
│   ├── src/               ← Código Next.js
│   └── docker-compose.yml ← Banco MariaDB
├── config-secrets/       ← Cópia de segurança de todos os .env
│   ├── .env
│   ├── .env.local
│   ├── .env.e2e
│   └── .env.test
├── database/
│   └── gladpros-dump.sql ← Dump completo do banco com dados
├── SETUP.md              ← Este arquivo
└── setup.ps1             ← Script automático de instalação
```

---

## Pré-requisitos no Novo Computador

1. **Node.js 20+** → https://nodejs.org/ (LTS)
2. **Docker Desktop** → https://www.docker.com/products/docker-desktop/
3. **Git** (opcional) → https://git-scm.com/
4. **VS Code** → https://code.visualstudio.com/

---

## Setup Rápido (Automático)

Abra o PowerShell na pasta portable e execute:

```powershell
.\setup.ps1
```

O script faz tudo automaticamente.

---

## Setup Manual (Passo a Passo)

### 1. Copiar o projeto
```powershell
# Copie a pasta 'projeto' para onde quiser trabalhar, ex:
Copy-Item -Recurse .\projeto C:\dev-root\gladpros-nextjs
cd C:\dev-root\gladpros-nextjs
```

### 2. Subir o banco de dados
```powershell
docker compose up -d
# Aguarde ~10 segundos para o MariaDB iniciar
Start-Sleep -Seconds 10
```

### 3. Importar os dados do banco
```powershell
# Copie o dump para dentro do container e importe
docker cp ..\database\gladpros-dump.sql gladpros-nextjs-db-1:/tmp/dump.sql
docker exec gladpros-nextjs-db-1 bash -c "mysql -u root -proot < /tmp/dump.sql"
```

### 4. Instalar dependências
```powershell
npm install
```

### 5. Sincronizar schema Prisma
```powershell
npx prisma generate
npx prisma db push --accept-data-loss
```

### 6. Verificar .env.local
Confirme que existe o arquivo `.env.local` na raiz com:
- `DATABASE_URL="mysql://dev:dev123@127.0.0.1:3306/gladpros"`
- `JWT_SECRET="..."`
- `SMTP_*` configurado

### 7. Rodar o servidor
```powershell
npm run dev
```

Acesse: **http://localhost:3000**

---

## Credenciais de Acesso

| Usuário | Email | Senha |
|---|---|---|
| Admin principal | gladiston.porto@gladpros.com | 030919@Gladpros |
| Admin E2E (testes) | admin@gladpros.com | Admin123!@# |

**Nota:** O login usa MFA (código por email). Se o SMTP não funcionar,
em modo dev o código aparece automaticamente na tela de MFA.

---

## Comandos Úteis

| Comando | Descrição |
|---|---|
| ``npm run dev`` | Servidor de desenvolvimento |
| ``npm run build`` | Build de produção |
| ``npm test`` | Rodar testes Jest |
| ``npx prisma studio`` | UI visual do banco de dados |
| ``npx prisma db seed`` | Popular banco com dados iniciais |
| ``docker compose up -d`` | Subir banco MariaDB |
| ``docker compose down`` | Parar banco |
| ``docker compose logs db`` | Ver logs do banco |

---

## Solução de Problemas

### "Cannot connect to database"
→ Verifique se Docker está rodando: ``docker ps``
→ Suba o banco: ``docker compose up -d``

### "Port 3306 already in use"
→ Outro MySQL/MariaDB está rodando. Pare-o ou mude a porta no docker-compose.yml

### "SMTP email não envia"
→ Em dev, o código MFA é preenchido automaticamente na tela
→ Para produção, configure SMTP no ``hPanel → Email Accounts``

### Erro de permissão no Windows
→ Execute PowerShell como Administrador
→ Ou use: ``Set-ExecutionPolicy -Scope CurrentUser RemoteSigned``
"@

Set-Content -Path "$Destino\SETUP.md" -Value $readme -Encoding UTF8
Write-Host "   SETUP.md criado." -ForegroundColor DarkGreen

# ── 6. Criar script de instalação automática ────────────────────────────────
Write-Host "[5/5] Criando script de instalação automática..." -ForegroundColor Green

$setupScript = @'
#!/usr/bin/env pwsh
# ============================================================================
# GladPros ERP - Setup Automático
# ============================================================================
# Execute este script no novo computador para configurar tudo automaticamente.
# Pré-requisitos: Node.js 20+, Docker Desktop
# ============================================================================

$ErrorActionPreference = "Stop"
$PortableDir = $PSScriptRoot
$ProjetoOrigem = "$PortableDir\projeto"
$DumpFile = "$PortableDir\database\gladpros-dump.sql"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  GladPros ERP - Setup Automático" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ── Verificar pré-requisitos ─────────────────────────────────────────────────
Write-Host "[Verificando pré-requisitos]" -ForegroundColor Yellow

$nodeOk = $false
try {
    $nv = node -v 2>$null
    if ($nv -match 'v(\d+)' -and [int]$Matches[1] -ge 18) {
        Write-Host "  Node.js: $nv" -ForegroundColor Green
        $nodeOk = $true
    } else {
        Write-Host "  Node.js $nv muito antigo. Instale v20+" -ForegroundColor Red
    }
} catch {
    Write-Host "  Node.js NÃO encontrado. Instale: https://nodejs.org/" -ForegroundColor Red
}

$dockerOk = $false
try {
    $dv = docker --version 2>$null
    Write-Host "  Docker: $dv" -ForegroundColor Green
    $dockerOk = $true
} catch {
    Write-Host "  Docker NÃO encontrado. Instale: https://docker.com/" -ForegroundColor Red
}

if (-not $nodeOk -or -not $dockerOk) {
    Write-Host ""
    Write-Host "Instale os pré-requisitos faltantes e execute novamente." -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

# ── Escolher destino ─────────────────────────────────────────────────────────
Write-Host ""
$defaultDest = "C:\dev-root\gladpros-nextjs"
$destino = Read-Host "Onde instalar o projeto? [$defaultDest]"
if ([string]::IsNullOrWhiteSpace($destino)) { $destino = $defaultDest }

# ── Copiar projeto ───────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[1/5] Copiando projeto para $destino..." -ForegroundColor Green

if (Test-Path $destino) {
    Write-Host "  Pasta já existe. Sobrescrever? (S/N)" -ForegroundColor Yellow
    $resp = Read-Host
    if ($resp -notin @('S','s','Y','y')) {
        Write-Host "Usando pasta existente." -ForegroundColor Yellow
    } else {
        Remove-Item $destino -Recurse -Force
        Copy-Item -Recurse $ProjetoOrigem $destino
    }
} else {
    Copy-Item -Recurse $ProjetoOrigem $destino
}
Write-Host "  Projeto copiado." -ForegroundColor DarkGreen

# ── Subir banco ──────────────────────────────────────────────────────────────
Write-Host "[2/5] Subindo banco de dados MariaDB..." -ForegroundColor Green
Push-Location $destino
docker compose up -d 2>$null
Write-Host "  Aguardando MariaDB iniciar (15s)..." -ForegroundColor DarkGreen
Start-Sleep -Seconds 15

# Verificar se o banco está pronto
$dbReady = $false
for ($i = 0; $i -lt 10; $i++) {
    $check = docker exec gladpros-nextjs-db-1 mysqladmin ping -u root -proot 2>$null
    if ($check -match "alive") {
        $dbReady = $true
        break
    }
    Start-Sleep -Seconds 3
}

if ($dbReady) {
    Write-Host "  MariaDB está pronto." -ForegroundColor DarkGreen
} else {
    Write-Host "  [AVISO] MariaDB pode não estar pronto ainda. Continue manualmente se necessário." -ForegroundColor Yellow
}

# ── Importar dump do banco ───────────────────────────────────────────────────
Write-Host "[3/5] Importando dados do banco..." -ForegroundColor Green

if (Test-Path $DumpFile) {
    docker cp $DumpFile gladpros-nextjs-db-1:/tmp/dump.sql
    docker exec gladpros-nextjs-db-1 bash -c "mysql -u root -proot < /tmp/dump.sql" 2>$null
    Write-Host "  Dados importados com sucesso." -ForegroundColor DarkGreen
} else {
    Write-Host "  [AVISO] Dump não encontrado. Executando migrations + seed..." -ForegroundColor Yellow
    npx prisma migrate deploy
    npx prisma db seed
}

# ── Instalar dependências ────────────────────────────────────────────────────
Write-Host "[4/5] Instalando dependências npm..." -ForegroundColor Green
npm install 2>$null
Write-Host "  Dependências instaladas." -ForegroundColor DarkGreen

# ── Gerar Prisma Client ─────────────────────────────────────────────────────
Write-Host "[5/5] Gerando Prisma Client..." -ForegroundColor Green
npx prisma generate 2>$null
Write-Host "  Prisma Client gerado." -ForegroundColor DarkGreen

Pop-Location

# ── Concluído ────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Setup concluído com sucesso!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Para iniciar o servidor:" -ForegroundColor Cyan
Write-Host "    cd $destino" -ForegroundColor White
Write-Host "    npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  Acesse: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Login: gladiston.porto@gladpros.com" -ForegroundColor White
Write-Host "  Senha: 030919@Gladpros" -ForegroundColor White
Write-Host ""
Read-Host "Pressione Enter para sair"
'@

Set-Content -Path "$Destino\setup.ps1" -Value $setupScript -Encoding UTF8
Write-Host "   setup.ps1 criado." -ForegroundColor DarkGreen

# ── Resumo final ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Pacote portátil criado com sucesso!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

$totalSize = (Get-ChildItem $Destino -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
$totalSize = [math]::Round($totalSize, 1)
Write-Host "  Pasta: $Destino"
Write-Host "  Tamanho: $totalSize MB"
Write-Host ""
Write-Host "  Conteúdo:" -ForegroundColor Cyan
Write-Host "    projeto/         ← Código-fonte + .env.local"
Write-Host "    config-secrets/  ← Backup de todos os .env"
Write-Host "    database/        ← Dump do banco MariaDB"
Write-Host "    SETUP.md         ← Instruções completas"
Write-Host "    setup.ps1        ← Instalação automática"
Write-Host ""
Write-Host "  Copie a pasta '$Destino' para pen-drive ou nuvem." -ForegroundColor Yellow
Write-Host "  No novo PC, execute: .\setup.ps1" -ForegroundColor Yellow
Write-Host ""
Read-Host "Pressione Enter para sair"
