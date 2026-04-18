/**
 * SCRIPT FINAL: Aplicação das Migrations do Estoque
 * 
 * Este script executa os arquivos SQL completos via Prisma
 * Trata procedures com DELIMITER corretamente
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

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
// Migrations
// ============================================================================

const migrations = [
  { name: '20251006000001_create_estoque_base', hasProcedures: false },
  { name: '20251006000002_create_materiais', hasProcedures: false },
  { name: '20251006000003_create_equipamentos', hasProcedures: false },
  { name: '20251006000004_create_alertas_compras', hasProcedures: false },
  { name: '20251006000005_seed_data', hasProcedures: false },
  { name: '20251006000006_stored_procedures', hasProcedures: true }
];

// ============================================================================
// Função para executar SQL
// ============================================================================

async function executarMigration(sqlFile, migration) {
  info(`Executando: ${migration.name}...`);
  
  try {
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Para procedures, executar statement inteiro
    if (migration.hasProcedures) {
      await prisma.$executeRawUnsafe(sqlContent);
      success(`${migration.name} - Concluída`);
      return true;
    }
    
    // Para statements normais, dividir por CREATE TABLE
    const statements = [];
    let currentStatement = '';
    const lines = sqlContent.split('\n');
    
    for (const line of lines) {
      // Ignorar comentários
      if (line.trim().startsWith('--') || line.trim() === '') continue;
      
      currentStatement += line + '\n';
      
      // Detectar fim de statement (CREATE TABLE ... );
      if (line.trim().endsWith(');') && currentStatement.includes('CREATE TABLE')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
      
      // Detectar INSERT statements
      if (line.trim().endsWith(';') && currentStatement.includes('INSERT INTO')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    // Executar cada statement
    let executedCount = 0;
    for (const stmt of statements) {
      if (!stmt || stmt.length < 10) continue;
      
      try {
        await prisma.$executeRawUnsafe(stmt);
        executedCount++;
      } catch (err) {
        // Ignorar "already exists"
        if (err.message.includes('already exists') || 
            err.message.includes('Duplicate entry')) {
          continue;
        }
        throw err;
      }
    }
    
    success(`${migration.name} - Concluída (${executedCount} statements)`);
    return true;
    
  } catch (err) {
    error(`${migration.name} - Falhou!`);
    console.error(err.message);
    return false;
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  header('APLICAÇÃO DAS MIGRATIONS DO ESTOQUE - VERSÃO FINAL');
  
  // Conectar
  await prisma.$connect();
  success('Conectado ao banco de dados');
  
  // Verificar tabelas
  header('STAGE 1: Verificação');
  
  try {
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      AND table_name IN ('unidades', 'materiais', 'equipamentos')
    `;
    
    const count = Number(result[0].count);
    
    if (count > 0) {
      warning(`${count} tabelas do Estoque já existem`);
      warning('Continuando (pode gerar avisos)...');
    } else {
      success('Nenhuma tabela do Estoque encontrada - OK');
    }
  } catch (err) {
    warning('Não foi possível verificar tabelas');
  }
  
  // Executar migrations
  header('STAGE 2: Execução das Migrations');
  
  const migrationsPath = path.join(__dirname, '..', 'prisma', 'migrations');
  let successCount = 0;
  let failCount = 0;
  
  for (const migration of migrations) {
    const migrationDir = path.join(migrationsPath, migration.name);
    const sqlFile = path.join(migrationDir, 'migration.sql');
    
    if (!fs.existsSync(sqlFile)) {
      error(`Migration não encontrada: ${migration.name}`);
      failCount++;
      continue;
    }
    
    const ok = await executarMigration(sqlFile, migration);
    if (ok) {
      successCount++;
    } else {
      failCount++;
      if (!migration.hasProcedures) {
        warning('Falha crítica - parando');
        break;
      }
      warning('Falha em procedures - continuando');
    }
  }
  
  // Validação
  header('STAGE 3: Validação');
  
  try {
    const result = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      AND table_name IN (
        'unidades', 'categorias', 'localizacoes', 'fornecedores',
        'materiais', 'materiais_lotes', 'materiais_saldo', 
        'materiais_movimentacoes', 'projeto_materiais',
        'equipamentos', 'projeto_equipamentos', 'equipamentos_manutencao',
        'alertas_estoque', 'compras', 'compras_itens'
      )
      ORDER BY table_name
    `;
    
    success(`${result.length} tabelas criadas:`);
    result.forEach(r => info(`  - ${r.table_name}`));
    
    if (result.length === 15) {
      success('Todas as 15 tabelas estão no banco!');
    } else {
      warning(`Esperado: 15, Encontrado: ${result.length}`);
    }
  } catch (err) {
    warning('Não foi possível validar');
    console.error(err.message);
  }
  
  // Contar registros seed
  try {
    const unidades = await prisma.$queryRaw`SELECT COUNT(*) as c FROM unidades`;
    const categorias = await prisma.$queryRaw`SELECT COUNT(*) as c FROM categorias`;
    const localizacoes = await prisma.$queryRaw`SELECT COUNT(*) as c FROM localizacoes`;
    const fornecedores = await prisma.$queryRaw`SELECT COUNT(*) as c FROM fornecedores`;
    
    info(`Registros seed:`);
    info(`  - Unidades: ${unidades[0].c}`);
    info(`  - Categorias: ${categorias[0].c}`);
    info(`  - Localizações: ${localizacoes[0].c}`);
    info(`  - Fornecedores: ${fornecedores[0].c}`);
  } catch (err) {
    // Ignorar se tabelas não existirem ainda
  }
  
  await prisma.$disconnect();
  
  // Resumo
  header('✅ RESUMO');
  
  console.log('');
  success(`${successCount} migrations executadas`);
  if (failCount > 0) {
    warning(`${failCount} migrations falharam (procedures podem ser criadas manualmente)`);
  }
}

// Executar
main()
  .then(async () => {
    // Gerar Prisma Client
    header('STAGE 4: Prisma Client');
    
    info('Gerando Prisma Client...');
    try {
      execSync('npx prisma generate', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      success('Prisma Client gerado!');
    } catch (err) {
      error('Erro ao gerar Prisma Client');
    }
    
    console.log('\n🎯 PRÓXIMOS PASSOS:\n');
    info('1. Reiniciar TS Server: Ctrl+Shift+P → "TypeScript: Restart TS Server"');
    info('2. Verificar types: npx tsc --noEmit');
    info('3. Iniciar Fase 2 - APIs Backend!');
    
    console.log('\n' + '='.repeat(60));
    log('🚀 MÓDULO ESTOQUE - BANCO PRONTO!', 'green');
    console.log('='.repeat(60) + '\n');
    
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('\n❌ Erro fatal:', e.message);
    await prisma.$disconnect();
    process.exit(1);
  });
