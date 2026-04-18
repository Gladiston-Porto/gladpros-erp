// Teste simples do middleware
const fetch = require('node-fetch');

async function testMiddleware() {
  console.log('🧪 Testando FASE 3 - Middleware de Autenticação\n');

  try {
    // Teste 1: Acessar rota protegida sem autenticação
    console.log('1. Testando acesso ao dashboard sem autenticação...');
    const response = await fetch('http://localhost:3000/dashboard', {
      redirect: 'manual'  // Não seguir redirecionamentos automaticamente
    });
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Headers Location: ${response.headers.get('location') || 'N/A'}`);
    
    if (response.status === 307 || response.status === 302) {
      console.log('   ✅ Redirecionamento funcionando - middleware ativo!');
    } else {
      console.log('   ⚠️  Sem redirecionamento - verificar configuração');
    }

    // Teste 2: Acessar rota pública
    console.log('\n2. Testando acesso ao login (rota pública)...');
    const loginResponse = await fetch('http://localhost:3000/login');
    console.log(`   Status: ${loginResponse.status}`);
    
    if (loginResponse.status === 200) {
      console.log('   ✅ Rota pública acessível');
    }

    // Teste 3: API de autenticação (pública)
    console.log('\n3. Testando API de login...');
    const apiResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'teste@gladpros.com',
        password: '123456'
      })
    });
    
    console.log(`   Status: ${apiResponse.status}`);
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      console.log(`   Resposta: ${JSON.stringify(data, null, 2)}`);
    }

    console.log('\n✅ Testes do middleware concluídos!');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
  }
}

testMiddleware();
