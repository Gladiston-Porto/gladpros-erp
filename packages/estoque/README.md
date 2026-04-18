# GladPros Estoque Module

Módulo separado de Gerenciamento de Estoque do GladPros.

## Estrutura

```
src/
├── app/               # Rotas/páginas do estoque
├── api/               # Endpoints API
├── components/        # Componentes React
├── lib/               # Lógica compartilhada
└── __tests__/         # Testes
```

## Funcionalidades

- ✅ Gerenciamento de Materiais
- ✅ Gerenciamento de Equipamentos
- ✅ Movimentações de Estoque
- ✅ Alertas e Notificações
- ✅ Compras e Fornecedores
- ✅ Relatórios e Análises

## Desenvolvimento

```bash
# Testes
npm test

# Build
npm run build

# Desenvolvimento
npm run dev
```

## Testes

Todos os 50+ testes devem passar:

```bash
npm test
```

Esperado: ✅ 50/50 tests passing

## Integração

Este módulo é integrado no projeto principal via `package.json` workspace.
