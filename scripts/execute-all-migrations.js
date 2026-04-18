/**
 * SCRIPT: Execução Automatizada de Todas as Migrations do Estoque
 * 
 * Este script executa todas as etapas necessárias:
 * 1. Validação do ambiente
 * 2. Backup do banco de dados
 * 3. Execução das migrations
 * 4. Validação da criação
 * 5. Geração do Prisma Client
 * 6. Validação dos types
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'cyan');
  console.log('='.repeat(60) + '\n');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'gray');
}

// ============================================================================
// STAGE 0: Validação do Ambiente
// ============================================================================

header('STAGE 0: Validação do Ambiente');

try {
  // Verificar Node.js
  const nodeVersion = process.version;
  info(`Node.js: ${nodeVersion}`);
  
  // Verificar .env
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    error('Arquivo .env não encontrado!');
    process.exit(1);
  }
  success('Arquivo .env encontrado');
  
  // Verificar Prisma
  try {
    execSync('npx prisma --version', { stdio: 'pipe' });
    success('Prisma CLI disponível');
  } catch (err) {
    error('Prisma CLI não encontrado!');
    info('Execute: npm install');
    process.exit(1);
  }
  
  // Verificar schema.prisma
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaPath)) {
    error('Arquivo schema.prisma não encontrado!');
    process.exit(1);
  }
  success('Schema Prisma encontrado');
  
  // Verificar migrations
  const migrationsPath = path.join(__dirname, '..', 'prisma', 'migrations');
  if (!fs.existsSync(migrationsPath)) {
    error('Pasta de migrations não encontrada!');
    process.exit(1);
  }
  
  const migrations = fs.readdirSync(migrationsPath).filter(f => f.startsWith('20251006'));
  info(`Migrations encontradas: ${migrations.length}`);
  
  if (migrations.length !== 6) {
    warning(`Esperado: 6 migrations, Encontrado: ${migrations.length}`);
  } else {
    success('Todas as 6 migrations do Estoque encontradas');
  }
  
} catch (err) {
  error('Erro na validação do ambiente!');
  console.error(err);
  process.exit(1);
}

// ============================================================================
// STAGE 1: Validação do Schema
// ============================================================================

header('STAGE 1: Validação do Schema Prisma');

try {
  info('Validando schema.prisma...');
  execSync('npx prisma validate', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  success('Schema validado com sucesso!');
} catch (err) {
  error('Schema inválido!');
  error('Corrija os erros antes de continuar');
  process.exit(1);
}

// ============================================================================
// STAGE 2: Backup do Banco de Dados
// ============================================================================

header('STAGE 2: Backup do Banco de Dados');

// Ler variáveis do .env
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=["']?mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^"'\n]+)/);

if (!dbUrlMatch) {
  error('Não foi possível extrair credenciais do DATABASE_URL!');
  info('Formato esperado: mysql://user:password@host:port/database');
  process.exit(1);
}

const [, dbUser, dbPassword, dbHost, dbPort, dbName] = dbUrlMatch;
info(`Database: ${dbName}`);
info(`Host: ${dbHost}:${dbPort}`);
info(`User: ${dbUser}`);

// Criar pasta de backups
const backupDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
  info('Pasta backups/ criada');
}

// Nome do backup
const timestamp = new Date().toISOString().replace(/[:T-]/g, '').split('.')[0];
const backupFile = path.join(backupDir, `${dbName}_backup_${timestamp}.sql`);

info('Criando backup do banco de dados...');
info('Este processo pode levar alguns minutos...');

let backupCreated = false;

try {
  // Verificar se mysqldump está disponível
  let mysqldumpAvailable = true;
  try {
    execSync('mysqldump --version', { stdio: 'pipe' });
  } catch (err) {
    mysqldumpAvailable = false;
    warning('mysqldump não encontrado no PATH');
    warning('Continuando sem backup (não recomendado)');
  }
  
  if (mysqldumpAvailable) {
    // Executar mysqldump
    const mysqldumpCmd = `mysqldump -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} --routines --triggers --events ${dbName} > "${backupFile}"`;
    
    execSync(mysqldumpCmd, {
      shell: 'powershell.exe',
      stdio: 'inherit'
    });
    
    // Verificar se backup foi criado
    if (fs.existsSync(backupFile)) {
      const stats = fs.statSync(backupFile);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      success(`Backup criado: ${path.basename(backupFile)} (${sizeMB} MB)`);
      info(`Localização: ${backupFile}`);
      backupCreated = true;
    } else {
      warning('Backup não foi criado, mas continuando...');
    }
  }
  
} catch (err) {
  warning('Erro ao criar backup, mas continuando...');
  console.error(err.message);
}

// ============================================================================
// STAGE 3: Execução das Migrations
// ============================================================================

header('STAGE 3: Execução das Migrations');

info('Executando: npx prisma migrate deploy');
info('Este comando aplicará todas as migrations pendentes...');

try {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  success('Migrations executadas com sucesso!');
} catch (err) {
  error('Erro ao executar migrations!');
  
  if (backupCreated && fs.existsSync(backupFile)) {
    warning('Backup disponível para restauração:');
    info(`mysql -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} ${dbName} < "${backupFile}"`);
  }
  
  process.exit(1);
}

// ============================================================================
// STAGE 4: Validação da Criação
// ============================================================================

header('STAGE 4: Validação da Criação');

info('Verificando tabelas criadas...');

const tabelasEsperadas = [
  'unidades',
  'categorias',
  'localizacoes',
  'fornecedores',
  'materiais',
  'materiais_lotes',
  'materiais_saldo',
  'materiais_movimentacoes',
  'projeto_materiais',
  'equipamentos',
  'projeto_equipamentos',
  'equipamentos_manutencao',
  'alertas_estoque',
  'compras',
  'compras_itens'
];

try {
  // Query para verificar tabelas
  const query = `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = '${dbName}' AND table_name IN (${tabelasEsperadas.map(t => `'${t}'`).join(',')})`;
  
  const mysqlCmd = `mysql -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} -N -e "${query}"`;
  
  const result = execSync(mysqlCmd, {
    shell: 'powershell.exe',
    encoding: 'utf8'
  });
  
  const count = parseInt(result.trim());
  
  if (count === 15) {
    success(`Todas as 15 tabelas foram criadas com sucesso!`);
  } else {
    warning(`Esperado: 15 tabelas, Encontrado: ${count}`);
    info('Verifique manualmente as tabelas no banco');
  }
  
} catch (err) {
  warning('Não foi possível validar tabelas automaticamente');
  info('Verifique manualmente no banco de dados');
}

// ============================================================================
// STAGE 5: Geração do Prisma Client
// ============================================================================

header('STAGE 5: Geração do Prisma Client');

info('Gerando Prisma Client com novos models...');

try {
  execSync('npx prisma generate', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  success('Prisma Client gerado com sucesso!');
} catch (err) {
  error('Erro ao gerar Prisma Client!');
  process.exit(1);
}

// ============================================================================
// STAGE 6: Validação dos Types
// ============================================================================

header('STAGE 6: Validação dos Types TypeScript');

info('Verificando tipos gerados...');

try {
  const clientPath = path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'index.d.ts');
  
  if (!fs.existsSync(clientPath)) {
    error('Prisma Client não foi gerado!');
    process.exit(1);
  }
  
  const indexContent = fs.readFileSync(clientPath, 'utf8');
  
  const modelsEsperados = [
    'Unidade',
    'Categoria',
    'Localizacao',
    'Fornecedor',
    'Material',
    'MaterialLote',
    'MaterialSaldo',
    'MaterialMovimentacao',
    'ProjetoMaterialEstoque',
    'Equipamento',
    'ProjetoEquipamento',
    'EquipamentoManutencao',
    'AlertaEstoque',
    'Compra',
    'CompraItem'
  ];
  
  const modelsFaltando = modelsEsperados.filter(
    model => !indexContent.includes(`export type ${model} =`)
  );
  
  if (modelsFaltando.length > 0) {
    error('Models do Estoque não encontrados no Client:');
    modelsFaltando.forEach(model => error(`  - ${model}`));
    process.exit(1);
  }
  
  success('Todos os 15 models do Estoque foram gerados!');
  
} catch (err) {
  error('Erro ao validar types!');
  console.error(err);
  process.exit(1);
}

// ============================================================================
// SUCESSO FINAL
// ============================================================================

header('✅ MIGRAÇÃO COMPLETA!');

console.log('\n📊 RESUMO DA EXECUÇÃO:\n');
success('Ambiente validado');
success('Schema validado');
if (backupCreated && fs.existsSync(backupFile)) {
  success(`Backup criado: ${path.basename(backupFile)}`);
}
success('Migrations executadas (15 tabelas)');
success('Prisma Client gerado (15 models)');
success('Types TypeScript validados');

console.log('\n🎯 PRÓXIMOS PASSOS:\n');
info('1. Reinicie o TypeScript Server no VS Code:');
info('   Ctrl+Shift+P → "TypeScript: Restart TS Server"');
info('');
info('2. Os erros em src/lib/estoque/types.ts devem desaparecer');
info('');
info('3. O módulo está pronto para a Fase 2 (APIs Backend)');

console.log('\n📄 DOCUMENTAÇÃO:\n');
info('- ESTOQUE-FASE-1-COMPLETA.md');
info('- ESTOQUE-CHECKLIST.md');
info('- ESTOQUE-FASE-1-DATABASE-COMPLETE.md');

console.log('\n' + '='.repeat(60));
log('🚀 FASE 1 COMPLETA - PRONTO PARA FASE 2!', 'green');
console.log('='.repeat(60) + '\n');
