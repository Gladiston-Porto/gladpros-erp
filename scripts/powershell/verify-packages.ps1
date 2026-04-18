# Verificar se todos os pacotes estão publicados no NPM
Write-Host "🔍 Verificando pacotes publicados no NPM..." -ForegroundColor Blue
Write-Host ""

$packages = @(
    "@gladpros/ui",
    "@gladpros/auth",
    "@gladpros/proposals",
    "@gladpros/clients",
    "@gladpros/dashboard"
)

foreach ($package in $packages) {
    Write-Host "📦 Verificando $package..." -ForegroundColor Yellow
    try {
        $result = npm view $package version --json 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $package - Versão: $result" -ForegroundColor Green
        } else {
            Write-Host "❌ $package - Não encontrado" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ $package - Erro ao verificar" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "🎯 Links para verificar manualmente:" -ForegroundColor Cyan
Write-Host "https://www.npmjs.com/package/@gladpros/ui" -ForegroundColor White
Write-Host "https://www.npmjs.com/package/@gladpros/auth" -ForegroundColor White
Write-Host "https://www.npmjs.com/package/@gladpros/proposals" -ForegroundColor White
Write-Host "https://www.npmjs.com/package/@gladpros/clients" -ForegroundColor White
Write-Host "https://www.npmjs.com/package/@gladpros/dashboard" -ForegroundColor White