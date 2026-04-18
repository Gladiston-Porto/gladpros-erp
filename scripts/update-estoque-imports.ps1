# Script para atualizar imports de estoque
# Padrão: @/components/estoque → @gladpros/estoque/components
#         @/lib/estoque → @gladpros/estoque/lib
#         @/api/estoque → @gladpros/estoque/api

$filesChanged = 0
$filesScanned = 0

Write-Host "🔍 Iniciando atualização de imports..." -ForegroundColor Cyan

# Padrões de substituição
$patterns = @(
  @{ Pattern = '@/components/estoque/'; Replacement = '@gladpros/estoque/components/'; },
  @{ Pattern = '@/lib/estoque/'; Replacement = '@gladpros/estoque/lib/'; },
  @{ Pattern = '@/api/estoque/'; Replacement = '@gladpros/estoque/api/'; }
)

# Encontrar todos os arquivos .ts e .tsx
$files = Get-ChildItem -Path "GladPros-Estoque/src" -Include "*.tsx", "*.ts" -Recurse

foreach ($file in $files) {
  $filesScanned++
  $content = Get-Content $file.FullName -Raw
  $originalContent = $content
  
  # Aplicar todas as substituições
  foreach ($pattern in $patterns) {
    $content = $content -replace [regex]::Escape($pattern.Pattern), $pattern.Replacement
  }
  
  # Se conteúdo mudou, salvar arquivo
  if ($content -ne $originalContent) {
    $filesChanged++
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
    Write-Host "✏️  Atualizado: $($file.Name)" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "📊 RESULTADO:" -ForegroundColor Yellow
Write-Host "✅ Arquivos scaneados: $filesScanned"
Write-Host "✏️  Arquivos modificados: $filesChanged"
Write-Host ""
Write-Host "🎉 Atualização de imports concluída!" -ForegroundColor Green
