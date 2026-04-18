# Script para publicar todos os pacotes automaticamente
Write-Host "🚀 Iniciando publicação automática de todos os pacotes..." -ForegroundColor Green
Write-Host ""

$repos = @(
    "temp-ui-repo",
    "temp-auth-repo",
    "temp-proposals-repo",
    "temp-clients-repo",
    "temp-dashboard-repo"
)

foreach ($repo in $repos) {
    Write-Host "📦 Publicando $repo..." -ForegroundColor Blue

    # Navegar para o repositório
    Set-Location "C:\Users\gladi\Documents\gladpros-nextjs\$repo"

    # Fazer commit das mudanças
    git add .
    git commit -m "chore: primeira publicação automática - $(Get-Date -Format 'dd/MM/yyyy')"

    # Fazer push para o GitHub (isso vai disparar o CI/CD)
    git push origin main

    Write-Host "✅ $repo enviado com sucesso!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "🎉 Todos os repositórios foram enviados!" -ForegroundColor Green
Write-Host "⏳ Aguardando os workflows do GitHub Actions publicarem no NPM..." -ForegroundColor Yellow
Write-Host ""
Write-Host "📊 Para acompanhar o progresso:" -ForegroundColor Cyan
Write-Host "1. Vá para cada repositório no GitHub" -ForegroundColor White
Write-Host "2. Clique na aba 'Actions'" -ForegroundColor White
Write-Host "3. Veja os workflows em execução" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Verificar publicação:" -ForegroundColor Cyan
Write-Host "https://www.npmjs.com/settings/gladiston-porto/packages" -ForegroundColor White