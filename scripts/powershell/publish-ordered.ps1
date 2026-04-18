# Script para publicar pacotes na ordem correta (resolvendo dependências)
Write-Host "🔄 Publicando pacotes na ordem correta para resolver dependências..." -ForegroundColor Green
Write-Host ""

$publishOrder = @(
    @{name="UI"; path="temp-ui-repo"},
    @{name="Auth"; path="temp-auth-repo"},
    @{name="Proposals"; path="temp-proposals-repo"},
    @{name="Clients"; path="temp-clients-repo"},
    @{name="Dashboard"; path="temp-dashboard-repo"}
)

foreach ($package in $publishOrder) {
    Write-Host "📦 Publicando $($package.name)..." -ForegroundColor Blue

    # Navegar para o repositório
    Set-Location "C:\Users\gladi\Documents\gladpros-nextjs\$($package.path)"

    # Gerar package-lock.json se não existir
    if (!(Test-Path "package-lock.json")) {
        Write-Host "🔧 Gerando package-lock.json..." -ForegroundColor Yellow
        npm install
    }

    # Instalar dependências
    Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
    npm ci

    # Fazer build
    Write-Host "🔨 Fazendo build..." -ForegroundColor Yellow
    npm run build

    # Publicar
    Write-Host "🚀 Publicando $($package.name)..." -ForegroundColor Green
    npm publish --access public

    Write-Host "✅ $($package.name) publicado com sucesso!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "🎉 Todos os pacotes foram publicados!" -ForegroundColor Green
Write-Host "⏳ Aguardando alguns minutos para que o NPM processe..." -ForegroundColor Yellow