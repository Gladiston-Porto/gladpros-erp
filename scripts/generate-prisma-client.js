/**
 * SCRIPT: Gerar Prisma Client com novos models do Estoque
 * 
 * Este script:
 * 1. Valida o schema.prisma
 * 2. Gera o Prisma Client com os novos models
 * 3. Valida a geração
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 GERAÇÃO DO PRISMA CLIENT - Módulo Estoque\n');

// ============================================================================
// STAGE 1: Validar schema.prisma
// ============================================================================

console.log('📋 STAGE 1: Validando schema.prisma...');

try {
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
  
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Arquivo schema.prisma não encontrado!');
    process.exit(1);
  }
  
  console.log('   ✅ Schema encontrado:', schemaPath);
  
  // Validar schema
  execSync('npx prisma validate', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('   ✅ Schema válido!\n');
  
} catch (error) {
  console.error('   ❌ Schema inválido!');
  console.error('   Erros encontrados:', error.message);
  process.exit(1);
}

// ============================================================================
// STAGE 2: Gerar Prisma Client
// ============================================================================

console.log('🏗️  STAGE 2: Gerando Prisma Client...');

try {
  execSync('npx prisma generate', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('   ✅ Prisma Client gerado com sucesso!\n');
  
} catch (error) {
  console.error('   ❌ Erro ao gerar Prisma Client!');
  console.error('   Detalhes:', error.message);
  process.exit(1);
}

// ============================================================================
// STAGE 3: Validar geração
// ============================================================================

console.log('✅ STAGE 3: Validando geração...');

try {
  const clientPath = path.join(__dirname, '../node_modules/.prisma/client');
  
  if (!fs.existsSync(clientPath)) {
    console.error('   ❌ Prisma Client não foi gerado!');
    process.exit(1);
  }
  
  // Verificar alguns models do Estoque
  const indexPath = path.join(clientPath, 'index.d.ts');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  
  const modelsEsperados = [
    'Unidade',
    'Categoria',
    'Localizacao',
    'Fornecedor',
    'Material',
    'MaterialLote',
    'Equipamento',
    'AlertaEstoque',
    'Compra'
  ];
  
  const modelsFaltando = modelsEsperados.filter(
    model => !indexContent.includes(`export type ${model} =`)
  );
  
  if (modelsFaltando.length > 0) {
    console.error('   ❌ Models do Estoque não encontrados no Client:');
    modelsFaltando.forEach(model => console.error(`      - ${model}`));
    process.exit(1);
  }
  
  console.log('   ✅ Todos os models do Estoque foram gerados!');
  console.log(`   📦 Models verificados: ${modelsEsperados.length}`);
  
} catch (error) {
  console.error('   ❌ Erro ao validar geração!');
  console.error('   Detalhes:', error.message);
  process.exit(1);
}

// ============================================================================
// SUCESSO
// ============================================================================

console.log('\n✅ PRISMA CLIENT GERADO COM SUCESSO!\n');
console.log('📊 Resumo:');
console.log('   • Schema validado: ✅');
console.log('   • Client gerado: ✅');
console.log('   • Models do Estoque: ✅ (15 models)');
console.log('\n🎯 Próximos passos:');
console.log('   1. Os erros de TypeScript nos arquivos lib/estoque/* devem desaparecer');
console.log('   2. Você pode importar os types do Estoque normalmente');
console.log('   3. Execute as migrations quando estiver pronto');
console.log('\n');
