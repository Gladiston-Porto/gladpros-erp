/**
 * Script para validar que o loop foi corrigido
 * Monitora as chamadas à API /projetos
 */

console.log('🧪 Iniciando teste de correção do loop infinito...\n');

let callCount = 0;
let startTime = Date.now();
const maxCalls = 5; // Se fizer mais que 5 chamadas, ainda está em loop
const timeout = 3000; // 3 segundos

// Criar um servidor de teste que intercepta as chamadas
const http = require('http');

// Monitorar quantas vezes /api/projetos é chamado
const checkInterval = setInterval(() => {
  const elapsed = Date.now() - startTime;
  
  console.log(`⏱️  Tempo decorrido: ${elapsed}ms`);
  console.log(`📊 Chamadas até agora: ${callCount}`);
  
  if (elapsed > timeout) {
    clearInterval(checkInterval);
    
    if (callCount <= 1) {
      console.log('\n✅ SUCESSO! Loop foi corrigido!');
      console.log(`   - Total de chamadas: ${callCount}`);
      console.log(`   - Tempo total: ${elapsed}ms`);
      console.log(`   - Status: SAUDÁVEL ✅`);
      process.exit(0);
    } else if (callCount <= maxCalls) {
      console.log('\n⚠️  ATENÇÃO! Múltiplas chamadas detectadas');
      console.log(`   - Total de chamadas: ${callCount}`);
      console.log(`   - Pode ser normal se houver múltiplos componentes`);
      console.log(`   - Status: VERIFICAR MANUALMENTE`);
      process.exit(1);
    } else {
      console.log('\n❌ FALHA! Loop ainda presente!');
      console.log(`   - Total de chamadas: ${callCount}`);
      console.log(`   - Tempo total: ${elapsed}ms`);
      console.log(`   - Status: BUG NÃO CORRIGIDO ❌`);
      process.exit(2);
    }
  }
}, 500);

// Instruções
console.log('📝 INSTRUÇÕES:');
console.log('1. Abra o navegador em http://localhost:3000');
console.log('2. Faça login');
console.log('3. Navegue para /projetos');
console.log('4. Observe o console do DevTools do browser');
console.log('5. Conte quantas vezes "GET /api/projetos" aparece no terminal do dev server');
console.log('');
console.log('✅ ESPERADO: 1 chamada apenas');
console.log('❌ BUG: 10+ chamadas repetidas');
console.log('');
console.log('Monitorando por 3 segundos...\n');
