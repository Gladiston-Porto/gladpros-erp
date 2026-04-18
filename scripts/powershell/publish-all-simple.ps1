# Script para publicar todos os pacotes automaticamente
Write-Host "🚀 Iniciando publicação automática de todos os pacotes..." -ForegroundColor Green
Write-Host ""

$repos = @("temp-ui-repo", "temp-auth-repo", "temp-proposals-repo", "temp-clients-repo", "temp-dashboard-repo")

foreach ($repo in $repos) {
    Write-Host "📦 Publicando $repo..." -ForegroundColor Blue
    Set-Location "C:\Users\gladi\Documents\gladpros-nextjs\$repo"
    git add .
    git commit -m "chore: primeira publicação automática"
    git push origin main
    Write-Host "✅ $repo enviado com sucesso!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "🎉 Todos os repositórios foram enviados!" -ForegroundColor Green
Write-Host "⏳ Aguardando os workflows do GitHub Actions publicarem no NPM..." -ForegroundColor Yellow