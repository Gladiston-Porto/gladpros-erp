# Forçar re-execução dos workflows do GitHub Actions
Write-Host "🔄 Forçando re-execução dos workflows do GitHub Actions..."

$repos = @(
    "temp-ui-repo",
    "temp-auth-repo",
    "temp-proposals-repo",
    "temp-clients-repo",
    "temp-dashboard-repo"
)

foreach ($repo in $repos) {
    Write-Host "📦 Processando $repo..."
    Set-Location "C:\Users\gladi\Documents\gladpros-nextjs\$repo"

    # Fazer um pequeno commit para forçar o workflow
    git add .
    git commit -m "chore: force workflow re-run" --allow-empty
    git push origin main

    Write-Host "✅ $repo - Workflow disparado!"
    Write-Host ""
}

Write-Host "🎉 Todos os workflows foram disparados!"
Write-Host "⏳ Aguardando alguns minutos para que os workflows sejam executados..."
Write-Host ""
Write-Host "📊 Para acompanhar:"
Write-Host "1. Vá para cada repositório no GitHub"
Write-Host "2. Clique na aba 'Actions'"
Write-Host "3. Veja os workflows em execução"