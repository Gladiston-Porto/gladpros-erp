# Forçar re-execução dos workflows
Write-Host "Forçando re-execução dos workflows..."

Set-Location "C:\Users\gladi\Documents\gladpros-nextjs\temp-ui-repo"
git add .
git commit -m "chore: force workflow re-run" --allow-empty
git push origin main
Write-Host "UI - Workflow disparado!"

Set-Location "C:\Users\gladi\Documents\gladpros-nextjs\temp-auth-repo"
git add .
git commit -m "chore: force workflow re-run" --allow-empty
git push origin main
Write-Host "Auth - Workflow disparado!"

Set-Location "C:\Users\gladi\Documents\gladpros-nextjs\temp-proposals-repo"
git add .
git commit -m "chore: force workflow re-run" --allow-empty
git push origin main
Write-Host "Proposals - Workflow disparado!"

Set-Location "C:\Users\gladpros-nextjs\temp-clients-repo"
git add .
git commit -m "chore: force workflow re-run" --allow-empty
git push origin main
Write-Host "Clients - Workflow disparado!"

Set-Location "C:\Users\gladi\Documents\gladpros-nextjs\temp-dashboard-repo"
git add .
git commit -m "chore: force workflow re-run" --allow-empty
git push origin main
Write-Host "Dashboard - Workflow disparado!"

Write-Host "Todos os workflows foram disparados!"