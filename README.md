GladPros - Sistema de Gestão Empresarial

GladPros é um sistema modular, bilíngue e seguro para gestão de clientes, propostas, projetos, estoque, almoxarifado e financeiro. Conta com autenticação por MFA, tokens de acesso, e um dashboard inteligente adaptado ao nível de acesso do usuário.

🧰 Stack Utilizada

Next.js + TypeScript + TailwindCSS

Prisma com MariaDB

Docker para orquestração local

Autenticação com JWT, Refresh Token e MFA

## 🚀 Quick Start

```bash
# 1. Clonar e entrar no projeto
git clone https://github.com/Gladiston-Porto/gladpros-refatorado.git
cd gladpros-refatorado

# 2. Configurar ambiente
cp .env.example .env
# Edite .env com suas credenciais (DATABASE_URL, JWT_SECRET, etc.)

# 3. Subir banco de dados
docker-compose up -d

# 4. Instalar dependências e gerar Prisma Client
npm install
npm run db:generate

# 5. Rodar migrations
npx prisma migrate dev

# 6. Iniciar servidor de desenvolvimento
npm run dev
```

## 📜 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run verify:smoke` | Validação completa: install + generate + build |
| `npm run clean` | Limpar artefatos (.next, node_modules, coverage, etc.) |
| `npm run db:generate` | Gerar Prisma Client |
| `npm run db:push` | Push schema para banco |
| `npm test` | Rodar testes unitários |
| `npm run quality:lint` | Lint (ESLint) |
| `npm run quality:types` | Type-check (TypeScript) |
| `npm run quality:test` | Testes em modo CI |

📁 Estrutura da Arquitetura

### Monorepo Principal (gladpros-nextjs)
```
src/
├── app/              # Rotas App Router do Next.js
├── modules/          # Módulos do sistema
│   ├── clientes/     # Gestão de clientes
│   ├── propostas/    # Gestão de propostas
│   ├── usuarios/     # Gestão de usuários
│   ├── dashboard/    # Dashboard e analytics
│   ├── aprovacoes/   # Sistema de aprovações
│   ├── financeiro/   # Gestão financeira
│   ├── projetos/     # Gestão de projetos
│   └── estoque/      # Controle de estoque
├── components/       # Componentes reutilizáveis
├── shared/           # Componentes e utilitários compartilhados
├── services/         # Serviços da aplicação
├── config/           # Configurações (Axios, auth, i18n)
├── middleware/       # Middlewares do Next.js
├── styles/           # Estilos globais
└── tests/            # Testes automatizados

packages/             # Pacotes compartilhados
├── auth/            # Autenticação e segurança
├── clients/         # Lógica de clientes
├── dashboard/       # Componentes do dashboard
├── proposals/       # Lógica de propostas
├── ui/              # Componentes UI compartilhados
└── utils/           # Utilitários comuns

prisma/              # Schema e migrações do banco
docs/                # Documentação completa
scripts/             # Scripts de automação
```

### Repositórios Git Separados
- **gladpros-auth**: Autenticação e segurança
- **gladpros-clients**: Gestão de clientes
- **gladpros-dashboard**: Dashboard e analytics
- **gladpros-proposals**: Gestão de propostas
- **gladpros-ui**: Componentes UI compartilhados

### Arquitetura Modular
- ✅ **Separação por domínio**: Cada módulo é independente
- ✅ **Reutilização**: Componentes compartilhados em `shared/`
- ✅ **Escalabilidade**: Fácil adição de novos módulos
- ✅ **Manutenibilidade**: Código organizado e testável
- ✅ **Type Safety**: TypeScript em toda aplicação

📖 Documentação

> **Status de produção:** qualquer declaração antiga de "100% pronto para produção" deve ser revalidada pelo gate atual em `docs/architecture/06-production-readiness.md`.
> Auditoria anterior não é certificação permanente.

### Documentação Geral
- **Visão geral**: [docs/01-arquitetura.md](docs/01-arquitetura.md)
- **Módulos e lógica**: [docs/02-logica-sistema.md](docs/02-logica-sistema.md)
- **Autenticação**: [docs/03-fluxo-autenticacao.md](docs/03-fluxo-autenticacao.md)
- **Estrutura do banco**: [docs/04-estrutura-db.md](docs/04-estrutura-db.md)
- **Roadmap atualizado**: [docs/05-roadmap.md](docs/05-roadmap.md) ✅ (Fases 1, 2, 3 e 4 completas)

### 📦 Módulo de Estoque - Documentação Completa ⭐ 9.8/10

O módulo de Estoque foi desenvolvido com qualidade excepcional e conta com documentação completa:

#### Para Desenvolvedores
- 🔧 **[FASE-4-COMPLETA.md](FASE-4-COMPLETA.md)** - Relatório completo da Fase 4 (Testing & Validation)
- 🐛 **[CORRECOES-RUNTIME-ESTOQUE.md](CORRECOES-RUNTIME-ESTOQUE.md)** - Correções técnicas detalhadas (43 correções)
- 📊 **[ANALISE-QUALIDADE-ESTOQUE.md](ANALISE-QUALIDADE-ESTOQUE.md)** - Análise profunda de qualidade (Score: 9.8/10)
- 🔌 **[API-REFERENCE-ESTOQUE.md](API-REFERENCE-ESTOQUE.md)** - Referência completa das APIs REST

#### Para Usuários Finais
- 📖 **[GUIA-USUARIO-ESTOQUE.md](GUIA-USUARIO-ESTOQUE.md)** - Manual completo do usuário (68k caracteres)
  - Dashboard e métricas
  - Materiais: cadastro, uso, dicas
  - Equipamentos: alocação, calibração, manutenção
  - Movimentações: 5 tipos detalhados
  - Alertas: 7 tipos com prioridades
  - Compras: workflow completo
  - 5 fluxos de trabalho práticos
  - 31 dicas e best practices
  - FAQ com 10 perguntas comuns

#### Status histórico do Módulo
- ✅ **18 páginas** funcionais
- ✅ **14 APIs REST** + endpoints extras
- ✅ **0 erros** TypeScript ou runtime
- ✅ **Build de produção** OK (7.6s)
- ✅ **Documentação**: ~210.000 caracteres
- ✅ **Qualidade**: 9.8/10 (melhor módulo do sistema)
- ⚠️ **Status atual**: requer re-auditoria pelo gate `docs/architecture/06-production-readiness.md` antes de ser declarado Production Ready.

## 🛠️ Ambiente de Desenvolvimento

### Configuração Inicial

1. Copie `.env.example` para `.env.local` e preencha os segredos:
   ```bash
   cp .env.example .env.local
   ```

2. **Segredos obrigatórios:**
   - `JWT_SECRET` (≥32 caracteres, base64 ou string aleatória longa)
   - `CLIENT_DOC_ENCRYPTION_KEY_BASE64` (32 bytes em base64)
   - `DATABASE_URL`
   - `SMTP_*` (configurações de email)

3. **Gerar segredos localmente:**
   ```bash
   # JWT Secret
   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

   # Chave de criptografia (32 bytes base64)
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

4. **Seed do admin:**
   ```bash
   node scripts/seed-smoke-user.js
   ```

### ⚠️ Notas de Segurança

- Certifique-se que `.env.local` está no `.gitignore`
- Rode os segredos se foram commitados ou vazaram
- O arquivo `.env` contém apenas placeholders para evitar exposição acidental

### 🔄 Backups de Configuração

Durante a limpeza de segurança, foram criados backups:
- `.env.bak2` - contém o `.env` original
- `.env.local.bak2` - contém o `.env.local` original

Verifique `.env.local` e atualize os valores necessários antes de iniciar o servidor.

✉️ Contato

Gladiston Porto – GladPros.com
