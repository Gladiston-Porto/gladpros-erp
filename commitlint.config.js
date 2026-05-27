/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    // Tipos válidos para o GladPros ERP
    'type-enum': [
      2,
      'always',
      [
        'feat', // nova funcionalidade
        'fix', // correção de bug
        'docs', // documentação
        'style', // formatação, sem mudança de lógica
        'refactor', // refatoração sem feat ou fix
        'test', // testes (unitários, E2E, regressão)
        'chore', // tarefas de manutenção (deps, build, config)
        'perf', // melhoria de performance
        'ci', // mudanças em CI/CD
        'revert', // revert de commit anterior
      ],
    ],

    // Escopos recomendados (não obrigatório mas recomendado)
    // Módulos do ERP + infra
    'scope-enum': [
      1,
      'always',
      [
        'usuarios',
        'clientes',
        'propostas',
        'projetos',
        'service-orders',
        'estoque',
        'financeiro',
        'invoices',
        'rh',
        'workforce',
        'reports',
        'analytics',
        'dashboard',
        'auth',
        'portal',
        'configuracoes',
        'deps',
        'ci',
        'build',
        'docs',
        'schema',
        'scripts',
        'meta-qualidade',
        'ui',
      ],
    ],

    'subject-case': [2, 'never', ['upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', ['.']],
    'body-max-line-length': [1, 'always', 200],
    'header-max-length': [2, 'always', 100],
  },

  // Ignorar commits de merge automático
  ignores: [(commit) => commit.startsWith('Merge')],
};
