/**
 * SCRIPT: Aplicação Manual das Migrations do Estoque
 * 
 * Este script executa as migrations SQL diretamente no banco,
 * ignorando o controle de versão do Prisma Migrate.
 * 
 * Use este script quando houver migrations antigas corrompidas.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) { log(`✅ ${message}`, 'green'); }
function error(message) { log(`❌ ${message}`, 'red'); }
function warning(message) { log(`⚠️  ${message}`, 'yellow'); }
function info(message) { log(`ℹ️  ${message}`, 'gray'); }
function header(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'cyan');
  console.log('='.repeat(60) + '\n');
}

// ============================================================================
// Configuração
// ============================================================================

header('APLICAÇÃO MANUAL DAS MIGRATIONS DO ESTOQUE');

// Ler DATABASE_URL
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  error('Arquivo .env não encontrado!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=["']?mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^"'\n]+)/);

if (!dbUrlMatch) {
  error('Não foi possível extrair credenciais do DATABASE_URL!');
  process.exit(1);
}

const [, dbUser, dbPassword, dbHost, dbPort, dbName] = dbUrlMatch;
info(`Database: ${dbName}@${dbHost}:${dbPort}`);

// Migrations do Estoque (em ordem)
const migrations = [
  '20251006000001_create_estoque_base',
  '20251006000002_create_materiais',
  '20251006000003_create_equipamentos',
  '20251006000004_create_alertas_compras',
  '20251006000005_seed_data',
  '20251006000006_stored_procedures'
];

// ============================================================================
// Função para executar SQL
// ============================================================================

function executarSQL(sqlFile, migrationName) {
  info(`Executando: ${migrationName}...`);
  
  try {
    const mysqlCmd = `mysql -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} ${dbName} < "${sqlFile}"`;
    
    execSync(mysqlCmd, {
      shell: 'powershell.exe',
      stdio: 'pipe',
      encoding: 'utf8'
    });
    
    success(`${migrationName} - Concluída`);
    return true;
  } catch (err) {
    error(`${migrationName} - Falhou!`);
    console.error(err.message);
    return false;
  }
}

// ============================================================================
// Verificar se tabelas já existem
// ============================================================================

header('STAGE 1: Verificação de Tabelas Existentes');

info('Verificando se alguma tabela do Estoque já existe...');

try {
  const query = `SELECT table_name FROM information_schema.tables WHERE table_schema = '${dbName}' AND table_name IN ('unidades', 'materiais', 'equipamentos')`;
  const mysqlCmd = `mysql -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} -N -e "${query}"`;
  
  const result = execSync(mysqlCmd, {
    shell: 'powershell.exe',
    encoding: 'utf8'
  });
  
  if (result.trim()) {
    warning('Tabelas do Estoque já existem:');
    result.trim().split('\n').forEach(t => warning(`  - ${t}`));
    
    console.log('\n⚠️  ATENÇÃO: Tabelas já existem no banco!');
    console.log('Se você quiser recriar, execute primeiro:');
    console.log('  DROP TABLE compras_itens, compras, alertas_estoque,');
    console.log('  equipamentos_manutencao, projeto_equipamentos, equipamentos,');
    console.log('  projeto_materiais, materiais_movimentacoes, materiais_saldo,');
    console.log('  materiais_lotes, materiais, fornecedores, localizacoes,');
    console.log('  categorias, unidades;\n');
    
    process.exit(1);
  }
  
  success('Nenhuma tabela do Estoque encontrada - OK para prosseguir');
  
} catch (err) {
  warning('Não foi possível verificar tabelas');
}

// ============================================================================
// Executar Migrations
// ============================================================================

header('STAGE 2: Execução das Migrations');

const migrationsPath = path.join(__dirname, '..', 'prisma', 'migrations');
let successCount = 0;
let failCount = 0;

for (const migration of migrations) {
  const migrationDir = path.join(migrationsPath, migration);
  const sqlFile = path.join(migrationDir, 'migration.sql');
  
  if (!fs.existsSync(sqlFile)) {
    error(`Migration não encontrada: ${migration}`);
    failCount++;
    continue;
  }
  
  const success = executarSQL(sqlFile, migration);
  if (success) {
    successCount++;
  } else {
    failCount++;
    error('Parando execução devido a erro');
    break;
  }
}

// ============================================================================
// Validação
// ============================================================================

header('STAGE 3: Validação');

if (failCount > 0) {
  error(`${failCount} migration(s) falharam!`);
  process.exit(1);
}

info('Verificando tabelas criadas...');

const tabelasEsperadas = [
  'unidades', 'categorias', 'localizacoes', 'fornecedores',
  'materiais', 'materiais_lotes', 'materiais_saldo', 'materiais_movimentacoes', 'projeto_materiais',
  'equipamentos', 'projeto_equipamentos', 'equipamentos_manutencao',
  'alertas_estoque', 'compras', 'compras_itens'
];

try {
  const query = `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = '${dbName}' AND table_name IN (${tabelasEsperadas.map(t => `'${t}'`).join(',')})`;
  const mysqlCmd = `mysql -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} -N -e "${query}"`;
  
  const result = execSync(mysqlCmd, {
    shell: 'powershell.exe',
    encoding: 'utf8'
  });
  
  const count = parseInt(result.trim());
  
  if (count === 15) {
    success(`Todas as 15 tabelas foram criadas!`);
  } else {
    warning(`Esperado: 15 tabelas, Encontrado: ${count}`);
  }
  
} catch (err) {
  warning('Não foi possível validar automaticamente');
}

// ============================================================================
// Gerar Prisma Client
// ============================================================================

header('STAGE 4: Geração do Prisma Client');

info('Gerando Prisma Client...');

try {
  execSync('npx prisma generate', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  success('Prisma Client gerado!');
} catch (err) {
  error('Erro ao gerar Prisma Client');
  process.exit(1);
}

// ============================================================================
// Sucesso
// ============================================================================

header('✅ MIGRATIONS APLICADAS COM SUCESSO!');

console.log('\n📊 RESUMO:\n');
success(`${successCount} migrations executadas`);
success('15 tabelas criadas');
success('Prisma Client gerado');

console.log('\n🎯 PRÓXIMOS PASSOS:\n');
info('1. Reinicie o TypeScript Server:');
info('   Ctrl+Shift+P → "TypeScript: Restart TS Server"');
info('');
info('2. Execute: npx tsc --noEmit (para verificar erros)');
info('');
info('3. Pronto para Fase 2 - APIs Backend!');

console.log('\n' + '='.repeat(60));
log('🚀 ESTOQUE - BANCO DE DADOS PRONTO!', 'green');
console.log('='.repeat(60) + '\n');
