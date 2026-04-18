// Script final para testar se o problema foi resolvido
const fetch = require('node-fetch');

async function testFinalFlow() {
  try {
    console.log('=== TESTE FINAL - FLUXO CORRETO ===\n');
    
    const loginData = {
      email: 'gladiston.porto@gladpros.com',
      password: '123456' // Ajuste para a senha correta
    };
    
    console.log('1. Testando login com API real...');
    
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    const loginResult = await loginResponse.json();
    
    console.log('\n--- RESULTADO DO LOGIN ---');
    console.log('Status:', loginResponse.status);
    console.log('MFA Required:', loginResult.mfaRequired);
    console.log('Next Step:', loginResult.nextStep);
    console.log('Primeiro Acesso:', loginResult.user?.primeiroAcesso);
    console.log('Senha Provisória:', loginResult.user?.senhaProvisoria);
    
    if (loginResult.mfaRequired && loginResult.nextStep === 'primeiro-acesso') {
      console.log('\n✅ SUCESSO! O fluxo está correto:');
      console.log('   → Login detectou primeiro acesso');
      console.log('   → MFA será obrigatório');
      console.log('   → Após MFA, irá para página de primeiro acesso');
      console.log('   → Usuário será obrigado a trocar senha');
    } else {
      console.log('\n❌ Ainda há problema no fluxo');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testFinalFlow();
