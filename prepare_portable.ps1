# Script para criar uma versão portátil do projeto
# Copia tudo para ../gladpros-portable exceto node_modules, .next, etc.

$source = Get-Location
$destination = "$source-portable"

Write-Host "Iniciando cópia de:"
Write-Host "  Origem: $source"
Write-Host "  Destino: $destination"
Write-Host "----------------------------------------"

# Robocopy command
# /MIR :: Espelha a árvore de diretórios (copia subdiretórios, inclusive vazios, e exclui arquivos/diretórios que não existem mais na origem).
# /XD :: Exclui diretórios correspondentes aos nomes e caminhos fornecidos.
# /XF :: Exclui arquivos correspondentes aos nomes e caminhos fornecidos.
# /R:0 :: Número de tentativas em cópias com falha
# /W:0 :: Tempo de espera entre tentativas

robocopy $source $destination /MIR `
    /XD `
    node_modules `
    .next `
    dist `
    build `
    coverage `
    playwright-report `
    test-results `
    .turbo `
    .cache `
    .swc `
    `
    /XF `
    *.log `
    repomix-output.xml `
    .DS_Store `
    /R:0 /W:0

Write-Host "----------------------------------------"
if ($LASTEXITCODE -lt 8) {
    Write-Host "Cópia concluída com sucesso! (Código: $LASTEXITCODE)" -ForegroundColor Green
    Write-Host "Sua pasta portátil está em: $destination"
} else {
    Write-Host "Houve alguns erros durante a cópia. (Código: $LASTEXITCODE)" -ForegroundColor Yellow
}

Write-Host "`nPara usar este projeto em outro lugar:"
Write-Host "1. Copie a pasta '$destination' para o seu SSD."
Write-Host "2. No novo computador, abra a pasta."
Write-Host "3. Execute 'npm install' para baixar as dependências."
Write-Host "4. Execute 'npm run dev' para iniciar."

# Pause para o usuário ler se clicar duas vezes
Read-Host -Prompt "Pressione Enter para sair"
