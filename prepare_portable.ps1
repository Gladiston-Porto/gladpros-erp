<#
.SYNOPSIS
    Cria uma versão portátil do projeto GladPros (Windows e macOS/Linux).

.DESCRIPTION
    Detecta automaticamente o sistema operacional e usa a ferramenta correta:
    - Windows  → robocopy
    - macOS / Linux → rsync

    Exclui pastas e arquivos que podem ser regenerados (node_modules, .next, etc.)
    e copia tudo o mais para uma pasta "<projeto>-portable" no mesmo nível.

═══════════════════════════════════════════════════════════════════════════════
  TUTORIAL COMPLETO — COMO USAR ESTE SCRIPT
═══════════════════════════════════════════════════════════════════════════════

──────────────────────────────────────────────────────────────────────────────
  macOS
──────────────────────────────────────────────────────────────────────────────

  PASSO 1 — Instalar o PowerShell Core (só na primeira vez)
  ─────────────────────────────────────────────────────────
  O macOS não vem com PowerShell. Instale via Homebrew:

    brew install powershell

  Para verificar se instalou corretamente:
    pwsh --version
    → deve retornar algo como: PowerShell 7.x.x

  Se ainda não tiver o Homebrew instalado:
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"


  PASSO 2 — Navegar até a pasta do projeto
  ─────────────────────────────────────────
    cd /Users/gladistonporto/dev-root/gladpros-portable/projeto


  PASSO 3 — Executar o script
  ────────────────────────────
    pwsh ./prepare_portable.ps1


  PASSO 3A — (alternativa) Destino personalizado
  ────────────────────────────────────────────────
    # Backup na mesma pasta (pasta irmã):
    pwsh ./prepare_portable.ps1
    → selecione opção [1] no menu

    # Backup em SSD externo:
    pwsh ./prepare_portable.ps1 -Destination "/Volumes/NOME-DO-SSD/gladpros-backup"

    # Backup na área de trabalho:
    pwsh ./prepare_portable.ps1 -Destination "~/Desktop/gladpros-backup"

    # Backup em pasta específica:
    pwsh ./prepare_portable.ps1 -Destination "/caminho/completo/da/pasta"


  ERRO: zsh: permission denied: ./prepare_portable.ps1
  ──────────────────────────────────────────────────────
    chmod +x ./prepare_portable.ps1
    pwsh ./prepare_portable.ps1


──────────────────────────────────────────────────────────────────────────────
  Windows
──────────────────────────────────────────────────────────────────────────────

  PASSO 1 — Verificar se o PowerShell está disponível
  ────────────────────────────────────────────────────
  O Windows já vem com PowerShell 5.1. Para verificar:
    powershell -command "$PSVersionTable.PSVersion"

  Para instalar a versão mais recente (PowerShell 7+), opcional:
    winget install --id Microsoft.PowerShell


  PASSO 2 — Abrir o PowerShell na pasta do projeto
  ─────────────────────────────────────────────────
  Opção A — Via Explorador de Arquivos:
    1. Abra a pasta do projeto no Explorador
    2. Clique na barra de endereço, digite "powershell" e pressione Enter
    3. O PowerShell abrirá já na pasta correta

  Opção B — Via terminal:
    cd C:\caminho\do\projeto


  PASSO 3 — Executar o script
  ────────────────────────────
    .\prepare_portable.ps1


  ERRO: "não pode ser carregado porque a execução de scripts foi desabilitada"
  ─────────────────────────────────────────────────────────────────────────────
  Solução A — Bypass por uma vez (mais seguro):
    powershell -ExecutionPolicy Bypass -File .\prepare_portable.ps1

  Solução B — Liberar permanentemente para o usuário atual:
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    .\prepare_portable.ps1


  PASSO 3A — (alternativa) Destino personalizado
  ────────────────────────────────────────────────
    # Backup na mesma pasta (pasta irmã):
    .\prepare_portable.ps1
    → selecione opção [1] no menu

    # Backup em SSD externo (ex: drive D:):
    .\prepare_portable.ps1 -Destination "D:\gladpros-backup"

    # Backup na área de trabalho:
    .\prepare_portable.ps1 -Destination "$env:USERPROFILE\Desktop\gladpros-backup"


──────────────────────────────────────────────────────────────────────────────
  Usando o backup em outro computador
──────────────────────────────────────────────────────────────────────────────

  Após copiar a pasta portátil para o novo computador:

    1. Abra a pasta no terminal
    2. Instale as dependências:
         npm install
    3. Configure as variáveis de ambiente:
         cp .env.example .env   (macOS/Linux)
         copy .env.example .env (Windows)
         → Edite o .env com os dados do novo ambiente (banco, JWT secret, etc.)
    4. Sincronize o banco de dados:
         npx prisma db push
    5. Inicie o projeto:
         npm run dev


──────────────────────────────────────────────────────────────────────────────
  O que o backup inclui / exclui
──────────────────────────────────────────────────────────────────────────────

  INCLUI (copiado):
    ✔ Código-fonte completo (src/)
    ✔ Configurações (next.config.ts, tsconfig.json, tailwind.config.ts, etc.)
    ✔ Schema do banco (prisma/)
    ✔ Pacotes internos (packages/)
    ✔ Arquivos de ambiente (.env) — cuidado ao compartilhar!
    ✔ Scripts e documentação

  NÃO inclui (excluído para economizar espaço):
    ✘ node_modules     → regenerar com: npm install
    ✘ .next            → regenerar com: npm run build
    ✘ dist / build     → regenerar com: npm run build
    ✘ coverage         → regenerar com: npm test
    ✘ playwright-report / test-results
    ✘ .turbo / .cache / .swc
    ✘ Arquivos .log e .DS_Store

═══════════════════════════════════════════════════════════════════════════════

.EXAMPLE
    # macOS / Linux — execução padrão:
    pwsh ./prepare_portable.ps1

    # Windows — execução padrão:
    .\prepare_portable.ps1

    # Qualquer SO — destino personalizado:
    pwsh ./prepare_portable.ps1 -Destination "/Volumes/SSD/gladpros-backup"

    # Windows — bypass de política (primeira vez):
    powershell -ExecutionPolicy Bypass -File .\prepare_portable.ps1

.NOTES
    REQUISITOS:
    - macOS/Linux: PowerShell Core 7+  →  brew install powershell
    - Windows: PowerShell 5.1+ (nativo) ou PowerShell Core 7+
    - macOS/Linux: rsync (pré-instalado no macOS)
    - Windows: robocopy (disponível desde o Windows 7)

    Para verificar sua versão do PowerShell: $PSVersionTable.PSVersion
#>

param(
    [string]$Destination = ""
)

# ── Resolve caminhos ────────────────────────────────────────────────────────
$source = (Get-Location).Path
$defaultLocal = "$source-portable"

if ($Destination -eq "") {
    # Menu interativo de destino
    Write-Host ""
    Write-Host "  Onde deseja salvar o backup?" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  [1]  Mesma pasta (pasta irmã)       →  $defaultLocal"
    Write-Host "  [2]  Informar um caminho manualmente"
    Write-Host ""

    $escolha = Read-Host "  Escolha [1/2]"

    switch ($escolha.Trim()) {
        "1" {
            $Destination = $defaultLocal
        }
        "2" {
            Write-Host ""
            Write-Host "  Exemplos:" -ForegroundColor DarkGray
            if ($IsMacOS -or $IsLinux) {
                Write-Host "    /Volumes/SSD-Externo/gladpros-backup" -ForegroundColor DarkGray
                Write-Host "    ~/Desktop/gladpros-backup" -ForegroundColor DarkGray
                Write-Host "    /tmp/gladpros-backup" -ForegroundColor DarkGray
            } else {
                Write-Host "    D:\Backup\gladpros" -ForegroundColor DarkGray
                Write-Host "    C:\Users\gladiston\Desktop\gladpros-backup" -ForegroundColor DarkGray
            }
            Write-Host ""
            $inputPath = Read-Host "  Digite o caminho completo do destino"
            $inputPath = $inputPath.Trim().Trim('"').Trim("'")

            if ($inputPath -eq "") {
                Write-Host "Nenhum caminho informado. Usando destino padrão." -ForegroundColor Yellow
                $Destination = $defaultLocal
            } else {
                # Expande ~ para o diretório home no macOS/Linux
                if ($inputPath.StartsWith("~")) {
                    $inputPath = $inputPath -replace "^~", $HOME
                }
                $Destination = $inputPath
            }
        }
        default {
            Write-Host "Opção inválida. Usando destino padrão." -ForegroundColor Yellow
            $Destination = $defaultLocal
        }
    }
}

# ── Listas de exclusão ──────────────────────────────────────────────────────
$excludeDirs = @(
    "node_modules", ".next", "dist", "build", "coverage",
    "playwright-report", "test-results", ".turbo", ".cache", ".swc",
    "packages/ui/node_modules", "packages/auth-core/node_modules",
    "packages/proposals-core/node_modules"
)

$excludeFiles = @(
    "*.log", ".DS_Store", "repomix-output.xml", "*.lock.bak"
)

# ── Banner ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          GladPros — Backup Portátil do Projeto               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Sistema : " -NoNewline
if ($IsWindows -or (-not (Get-Variable IsWindows -ErrorAction SilentlyContinue)) -and $env:OS -eq "Windows_NT") {
    Write-Host "Windows" -ForegroundColor Yellow
} elseif ($IsMacOS) {
    Write-Host "macOS" -ForegroundColor Green
} else {
    Write-Host "Linux" -ForegroundColor Blue
}
Write-Host "  Origem  : $source"
Write-Host "  Destino : $Destination"
Write-Host ""

# ── Confirmação ─────────────────────────────────────────────────────────────
$confirm = Read-Host "Continuar? [S/n]"
if ($confirm -match "^[nN]$") {
    Write-Host "Operação cancelada." -ForegroundColor Yellow
    exit 0
}
Write-Host ""

# ── Cópia por SO ─────────────────────────────────────────────────────────────
$success = $false

# Detecta Windows (compatível com PS 5.1 e PS Core)
$onWindows = ($IsWindows) -or
             ((-not (Get-Variable IsWindows -ErrorAction SilentlyContinue)) -and $env:OS -eq "Windows_NT")

if ($onWindows) {
    # ── Windows: robocopy ──────────────────────────────────────────────────
    Write-Host "▶ Usando robocopy (Windows)…" -ForegroundColor Cyan

    $xdArgs = $excludeDirs -join " "
    $xfArgs = $excludeFiles -join " "

    $robocopyArgs = @(
        $source, $Destination, "/MIR",
        "/XD", $excludeDirs,
        "/XF", $excludeFiles,
        "/R:0", "/W:0", "/NP", "/NDL"
    )

    & robocopy @robocopyArgs

    # robocopy: código < 8 = sucesso (0–7 são informativos)
    $success = ($LASTEXITCODE -lt 8)

} else {
    # ── macOS / Linux: rsync ───────────────────────────────────────────────
    Write-Host "▶ Usando rsync (macOS/Linux)…" -ForegroundColor Cyan

    # Verifica se rsync está disponível
    if (-not (Get-Command rsync -ErrorAction SilentlyContinue)) {
        Write-Host "ERRO: rsync não encontrado. Instale com: brew install rsync" -ForegroundColor Red
        exit 1
    }

    # Monta os argumentos de exclusão
    $rsyncExcludes = @()
    foreach ($dir in $excludeDirs) {
        $rsyncExcludes += "--exclude=$dir/"
    }
    foreach ($file in $excludeFiles) {
        $rsyncExcludes += "--exclude=$file"
    }

    # Garante barra no final do source para rsync copiar o conteúdo (não a pasta em si)
    $rsyncSource = $source.TrimEnd("/") + "/"
    $rsyncDest   = $Destination.TrimEnd("/") + "/"

    $rsyncArgs = @("-av", "--progress", "--delete") + $rsyncExcludes + @($rsyncSource, $rsyncDest)

    & rsync @rsyncArgs

    $success = ($LASTEXITCODE -eq 0)
}

# ── Resultado ────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "──────────────────────────────────────────────────────────────" -ForegroundColor DarkGray

if ($success) {
    Write-Host "✔  Cópia concluída com sucesso!" -ForegroundColor Green
    Write-Host "   Portátil em: $Destination" -ForegroundColor Green
} else {
    Write-Host "✖  Houve erros durante a cópia. Verifique os logs acima." -ForegroundColor Red
}

Write-Host ""
Write-Host "Para usar este projeto em outro computador:" -ForegroundColor Cyan
Write-Host "  1. Copie a pasta '$Destination' para o SSD ou novo computador"
Write-Host "  2. Abra a pasta no terminal"
Write-Host "  3. Execute: npm install"
Write-Host "  4. Copie o arquivo .env e ajuste as variáveis"
Write-Host "  5. Execute: npm run dev"
Write-Host ""

Read-Host -Prompt "Pressione Enter para sair"
