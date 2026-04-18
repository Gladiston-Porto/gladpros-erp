/**
 * SCRIPT: Aplicação das Migrations do Estoque via Prisma Client
 * 
 * Este script executa SQL diretamente via Prisma.$executeRawUnsafe
 * Não requer MySQL CLI no PATH
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

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

async function executarSQL(sqlFile, migrationName) {
  info(`Executando: ${migrationName}...`);
  
  try {
    // Ler arquivo SQL
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Dividir em statements individuais
    // Ignora comentários e linhas vazias
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
    
    // Executar cada statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt) continue;
      
      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch (err) {
        // Ignorar erros de "table already exists" ou "duplicate entry"
        if (err.message.includes('already exists') || 
            err.message.includes('Duplicate entry')) {
          warning(`  Statement ${i + 1}: Já existe (ignorado)`);
          continue;
        }
        throw err;
      }
    }
    
    success(`${migrationName} - Concluída (${statements.length} statements)`);
    return true;
    
  } catch (err) {
    error(`${migrationName} - Falhou!`);
    console.error(err.message);
    return false;
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  header('APLICAÇÃO DAS MIGRATIONS DO ESTOQUE');
  
  // Conectar
  await prisma.$connect();
  success('Conectado ao banco de dados');
  
  // Verificar tabelas existentes
  header('STAGE 1: Verificação de Tabelas');
  
  try {
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      AND table_name IN ('unidades', 'materiais', 'equipamentos')
    `;
    
    if (result.length > 0) {
      warning('Tabelas do Estoque já existem:');
      result.forEach(r => warning(`  - ${r.table_name}`));
      
      console.log('\n❓ Deseja continuar mesmo assim? (pode dar erro)');
      console.log('   As migrations tentarão criar tabelas que já existem\n');
      
      // Aguardar 3 segundos
      await new Promise(resolve => setTimeout(resolve, 3000));
      warning('Continuando...');
    } else {
      success('Nenhuma tabela do Estoque encontrada - OK');
    }
  } catch (err) {
    warning('Não foi possível verificar tabelas existentes');
  }
  
  // Executar migrations
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
    
    const success = await executarSQL(sqlFile, migration);
    if (success) {
      successCount++;
    } else {
      failCount++;
      warning('Continuando para próxima migration...');
    }
  }
  
  // Validação
  header('STAGE 3: Validação');
  
  const tabelasEsperadas = [
    'unidades', 'categorias', 'localizacoes', 'fornecedores',
    'materiais', 'materiais_lotes', 'materiais_saldo', 'materiais_movimentacoes', 'projeto_materiais',
    'equipamentos', 'projeto_equipamentos', 'equipamentos_manutencao',
    'alertas_estoque', 'compras', 'compras_itens'
  ];
  
  try {
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      AND table_name IN (${prisma.Prisma.join(tabelasEsperadas)})
    `;
    
    const count = Number(result[0].count);
    
    if (count === 15) {
      success(`Todas as 15 tabelas foram criadas!`);
    } else {
      warning(`Esperado: 15 tabelas, Encontrado: ${count}`);
      
      // Listar tabelas faltando
      const existentes = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        AND table_name IN (${prisma.Prisma.join(tabelasEsperadas)})
      `;
      
      const tabelasExistentes = existentes.map(r => r.table_name);
      const tabelasFaltando = tabelasEsperadas.filter(t => !tabelasExistentes.includes(t));
      
      if (tabelasFaltando.length > 0) {
        warning('Tabelas faltando:');
        tabelasFaltando.forEach(t => warning(`  - ${t}`));
      }
    }
  } catch (err) {
    warning('Não foi possível validar tabelas');
    console.error(err);
  }
  
  // Resumo
  header('✅ RESUMO');
  
  console.log('');
  success(`${successCount} migrations executadas`);
  if (failCount > 0) {
    warning(`${failCount} migrations falharam`);
  }
  
  await prisma.$disconnect();
}

// Executar
main()
  .then(async () => {
    console.log('\n🎯 PRÓXIMOS PASSOS:\n');
    info('1. Gerar Prisma Client: npx prisma generate');
    info('2. Reiniciar TS Server: Ctrl+Shift+P → "TypeScript: Restart TS Server"');
    info('3. Pronto para Fase 2!');
    console.log('\n' + '='.repeat(60));
    log('🚀 MIGRATIONS APLICADAS!', 'green');
    console.log('='.repeat(60) + '\n');
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
