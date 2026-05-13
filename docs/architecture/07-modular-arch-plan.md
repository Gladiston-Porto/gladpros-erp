# Documentação do Sistema GladPros

## Arquitetura Modular

Este projeto foi refatorado para seguir uma arquitetura modular, permitindo desenvolvimento independente de cada módulo e deploy separado.

### Estrutura de Pastas

```
src/
├── modules/                    # Módulos independentes
│   ├── auth/                   # Autenticação e MFA
│   ├── usuarios/               # Gestão de usuários
│   ├── clientes/               # Gestão de clientes
│   ├── propostas/              # Sistema de propostas
│   └── ...
├── shared/                     # Código compartilhado
│   ├── components/             # Componentes globais (UI)
│   ├── lib/                    # Utilitários globais
│   ├── contexts/               # Contextos React globais
│   └── types/                  # Tipos TypeScript globais
├── app/                        # Rotas Next.js (re-exports)
└── doc/                        # Documentação
```

### Benefícios da Arquitetura

- **Modularidade**: Cada módulo pode ser desenvolvido e testado independentemente
- **Reutilização**: Código compartilhado fica centralizado em `shared/`
- **Manutenibilidade**: Mudanças em um módulo não afetam outros
- **Deploy Independente**: Possibilidade de subir módulos separadamente no Git

### Desenvolvimento

Para adicionar um novo módulo:
1. Criar pasta em `src/modules/novo-modulo/`
2. Estruturar com `pages/`, `components/`, `api/`, `types/`, `utils/`, `tests/`
3. Criar re-export em `src/app/(dashboard)/novo-modulo/page.tsx`
4. Usar tipos e componentes de `shared/`

### Próximos Passos

- [ ] Refatorar módulo clientes
- [ ] Refatorar módulo usuários
- [ ] Refatorar módulo auth
- [ ] Criar testes unitários
- [ ] Documentar APIs