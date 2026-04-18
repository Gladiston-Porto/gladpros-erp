// Test script para verificar como as operações bulk funcionam
const fs = require('fs');
const path = require('path');

console.log('=== TESTE DE ANÁLISE BULK OPERATIONS ===\n');

// Simulação de como o Prisma pode gerar logs
console.log('Cenário 1: updateMany com 3 IDs');
console.log('Query: prisma.cliente.updateMany({ where: { id: { in: [1, 2, 3] } }, data: { status: "ATIVO" } })');
console.log('Possíveis logs do Prisma:');
console.log('  - Um log único: "PATCH /clientes/bulk affected: 3 rows"');
console.log('  - Logs individuais simulados: "UPDATE cliente SET status=? WHERE id=1", "UPDATE cliente SET status=? WHERE id=2", etc.');
console.log('');

console.log('VERIFICAÇÃO 1: O endpoint bulk está usando updateMany corretamente?');
try {
  const bulkEndpoint = fs.readFileSync('src/app/api/clientes/bulk/route.ts', 'utf8');
  const hasUpdateMany = bulkEndpoint.includes('updateMany');
  const hasDeleteMany = bulkEndpoint.includes('deleteMany');
  console.log(`  ✓ updateMany encontrado: ${hasUpdateMany}`);
  console.log(`  ✓ deleteMany encontrado: ${hasDeleteMany}`);
} catch (err) {
  console.log('  ✗ Erro ao ler arquivo bulk:', err.message);
}

console.log('\nVERIFICAÇÃO 2: Como o frontend chama o bulk?');
try {
  const bulkService = fs.readFileSync('Old/modules/clientes/services/bulkService.ts', 'utf8');
  const hasApiCall = bulkService.includes('/api/clientes/bulk');
  console.log(`  ✓ Chamada para /api/clientes/bulk: ${hasApiCall}`);
  
  // Procurar por padrões que indiquem múltiplas chamadas
  const hasForLoop = bulkService.includes('for(') || bulkService.includes('forEach');
  const hasMapCall = bulkService.includes('.map(');
  console.log(`  ✓ Loops que poderiam gerar múltiplas chamadas: ${hasForLoop || hasMapCall}`);
} catch (err) {
  console.log('  ✗ Erro ao ler bulkService:', err.message);
}

console.log('\n=== CONCLUSÃO ===');
console.log('Se você está vendo logs individuais do Prisma, pode ser:');
console.log('1. Prisma está logando as operações SQL individuais geradas pelo updateMany');
console.log('2. Middleware ou auditoria está interceptando e logando cada alteração');
console.log('3. O problema está no frontend fazendo múltiplas chamadas');
console.log('\nPara confirmar, verifique:');
console.log('- Network tab: quantas requisições para /api/clientes/bulk são feitas');
console.log('- Console do servidor: se há apenas 1 log "POST /api/clientes/bulk" por operação');
console.log('- Resposta do endpoint: se o "processed" count está correto');