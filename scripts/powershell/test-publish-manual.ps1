# Script para testar publicação manual de um pacote
Write-Host "🧪 Testando publicação manual do pacote UI..." -ForegroundColor Blue

# Navegar para o repositório
Set-Location "C:\Users\gladi\Documents\gladpros-nextjs\temp-ui-repo"

# Instalar dependências
Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
npm ci

# Fazer build
Write-Host "🔨 Fazendo build..." -ForegroundColor Yellow
npm run build

# Tentar publicar (isso vai pedir confirmação)
Write-Host "🚀 Tentando publicar..." -ForegroundColor Green
Write-Host "Nota: Você precisará confirmar a publicação" -ForegroundColor Cyan
npm publish --access public

Write-Host "✅ Teste concluído!" -ForegroundColor Green