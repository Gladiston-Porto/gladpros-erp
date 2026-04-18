# Verificar pacotes publicados no NPM
Write-Host "Verificando pacotes publicados no NPM..."

$packages = @(
    "@gladpros/ui",
    "@gladpros/auth",
    "@gladpros/proposals",
    "@gladpros/clients",
    "@gladpros/dashboard"
)

foreach ($package in $packages) {
    Write-Host "Verificando $package..."
    npm view $package version
    Write-Host ""
}

Write-Host "Links para verificar manualmente:"
Write-Host "https://www.npmjs.com/package/@gladpros/ui"
Write-Host "https://www.npmjs.com/package/@gladpros/auth"
Write-Host "https://www.npmjs.com/package/@gladpros/proposals"
Write-Host "https://www.npmjs.com/package/@gladpros/clients"
Write-Host "https://www.npmjs.com/package/@gladpros/dashboard"