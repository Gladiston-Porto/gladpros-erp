# Arquivo Temporário — Branch Protection Test

> **Este arquivo pode ser removido após configuração da branch protection.**

Propósito: acionar o GitHub Actions `quality-gate` pela primeira vez,
para que o status check apareça nas configurações de proteção da branch `main`.

## Checklist de configuração (após PR fechar)

- [ ] Branch `main` com PR obrigatório
- [ ] Status check `quality-gate` obrigatório
- [ ] `Do not allow bypassing the above settings` marcado
- [ ] `Require linear history` marcado
- [ ] Force push desabilitado
- [ ] Deletions desabilitadas
