# Script para atualizar imports do modulo Financeiro
$files = @(Get-ChildItem GladPros-Financeiro/src -Include "*.ts", "*.tsx" -Recurse)
$updated = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $orig = $content
    
    # Atualizar imports
    $content = $content -replace 'from ["|'"'"']@/lib/financeiro', 'from "@gladpros/financeiro/lib'
    $content = $content -replace 'from ["|'"'"']@/components/dashboard/financeiro', 'from "@gladpros/financeiro/components'
    $content = $content -replace 'from ["|'"'"']@/api/financeiro', 'from "@gladpros/financeiro/api'
    $content = $content -replace 'from ["|'"'"']@/app/financeiro', 'from "@gladpros/financeiro/app'
    
    if ($content -ne $orig) {
        Set-Content $file.FullName -Value $content -Encoding UTF8
        $updated++
    }
}

Write-Host "Total arquivos processados: $($files.Count)"
Write-Host "Arquivos atualizados: $updated"
