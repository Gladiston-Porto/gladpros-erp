# 🤝 MÓDULO COLABORADORES (TIMESHEET / PJ) - DOCUMENTAÇÃO TÉCNICA

**Data**: 19 de novembro de 2025  
**Status**: ✅ EM DESENVOLVIMENTO / FUNCIONAL  
**Versão**: 1.0.0

---

## 📊 RESUMO EXECUTIVO

O módulo de **Colaboradores** foi projetado para gerenciar a força de trabalho externa e interna que não se enquadra necessariamente no regime CLT tradicional (gerido pelo módulo RH), ou para complementar a gestão de prestadores de serviço (PJ), freelancers e alocação em projetos.

Este módulo foca na flexibilidade de contratos, gestão de habilidades técnicas e dados financeiros específicos para pagamentos por hora, projeto ou mensais.

### Diferença RH vs Colaboradores
- **RH (Funcionários)**: Foco em CLT, legislação trabalhista, férias, benefícios, hierarquia formal.
- **Colaboradores**: Foco em alocação, skills, contratos flexíveis (PJ/Freelancer), timesheets e custo por projeto.

---

## 🗄️ DATABASE SCHEMA

### Modelos Principais

#### 1. `Colaborador`
Entidade principal que representa o prestador de serviço.
- **Campos Chave**: `nomeCompleto`, `emailContato`, `tipoContrato` (CLT, PJ, ESTAGIO, TEMPORARIO).
- **Relações**: 
  - `usuario` (opcional): Link com login do sistema.
  - `financeiro`: Dados bancários e de pagamento.
  - `habilidades`: Lista de skills técnicas.
  - `documentos`: Contratos e certidões.

#### 2. `DadosFinanceiros`
Informações sensíveis de pagamento segregadas.
- **Campos**: `tipoPagamento` (HORA, MENSAL, PROJETO), `valorSalario`, `valorHoraCusto`, `valorHoraVenda`.
- **Bancário**: `bancoNome`, `routingNumber`, `accountNumber`, `taxId` (CPF/CNPJ/SSN).

#### 3. `HabilidadeColaborador`
Gestão de skills para alocação inteligente em projetos.
- **Campos**: `habilidade` (ex: "React", "Node.js"), `nivel` (Júnior, Pleno, Sênior), `certificado` (boolean).

#### 4. `DocumentoColaborador`
Repositório de arquivos do colaborador.
- **Campos**: `nome`, `url`, `tipo`.

### Enums
```prisma
enum TipoContratoColaborador {
  CLT
  PJ
  ESTAGIO
  TEMPORARIO
}

enum TipoPagamentoColaborador {
  HORA
  MENSAL
  PROJETO
}
```

---

## 🚀 APIs REST

### Endpoints Principais (`/api/colaboradores`)

#### `GET /api/colaboradores`
Lista colaboradores com filtros.
- **Query Params**: `search` (nome/email), `status`, `tipoContrato`.
- **Retorno**: Array de colaboradores com dados financeiros e habilidades.

#### `POST /api/colaboradores`
Cria um novo colaborador.
- **Body**: Objeto `CreateColaboradorInput`.
- **Lógica**: 
  - Cria o registro principal.
  - Cria registro `DadosFinanceiros` aninhado.
  - Cria registros `HabilidadeColaborador` aninhados.
  - Converte strings de data para objetos `Date`.

#### `GET /api/colaboradores/[id]`
Obtém detalhes de um colaborador específico.

#### `PUT /api/colaboradores/[id]`
Atualiza dados do colaborador.
- **Lógica**: Atualização parcial (PATCH) suportada. Atualiza relações aninhadas via `upsert` ou `deleteMany` + `create` (para habilidades).

---

## 💻 FRONTEND COMPONENTS

### 1. `ColaboradorList` (`src/components/rh/colaboradores/ColaboradorList.tsx`)
Tabela de listagem de colaboradores.
- **Features**:
  - Busca em tempo real (client-side filtering).
  - Exibição de Avatar, Nome, Cargo, Departamento e Status.
  - Ações: Editar, Visualizar.

### 2. `ColaboradorForm` (`src/components/rh/colaboradores/ColaboradorForm.tsx`)
Formulário unificado para Criação e Edição.
- **Abas**:
  1. **Dados Pessoais**: Nome, contato, endereço.
  2. **Profissional**: Cargo, departamento, tipo de contrato.
  3. **Financeiro**: Dados bancários, valor hora/mês.
- **Integração**: Busca usuários sem colaborador vinculado (`/api/usuarios/sem-colaborador`) para permitir associação de login.

---

## 🔧 SERVIÇOS (`ColaboradorService`)

Localizado em `src/shared/services/colaboradorService.ts`.
Centraliza a lógica de negócios e acesso ao banco de dados (Prisma).

- **Métodos**:
  - `list(filters)`: Busca com `where` dinâmico.
  - `create(data)`: Transação de criação com includes.
  - `update(id, data)`: Atualização complexa com gestão de relacionamentos.
  - `findById(id)`: Busca detalhada.

---

## 📋 PRÓXIMOS PASSOS (ROADMAP)

1. **Alocação em Projetos**: Criar tabela pivot `ColaboradorProjeto` para gerenciar datas e % de alocação.
2. **Timesheet**: Implementar registro de horas trabalhadas por projeto.
3. **Avaliação de Desempenho**: Módulo de feedback por projeto.
4. **Portal do Colaborador**: Área restrita para o próprio colaborador ver seus pagamentos e alocações.

---

**Desenvolvido por**: GladPros Team  
**Tecnologia**: Next.js 15, Prisma, Tailwind CSS, TypeScript.
