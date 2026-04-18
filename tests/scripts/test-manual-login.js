/**
 * Teste manual de login para debug
 */

const fetch = require('node-fetch');

async function testLogin() {
  console.log('🔐 Testando login...\n');
  
  const loginData = {
    email: 'admin@gladpros.com',
    password: 'admin123'
  };
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const text = await response.text();
    console.log('\nResponse Body:');
    console.log(text);
    
    if (response.ok) {
      const data = JSON.parse(text);
      console.log('\n✅ Login Response:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.mfaRequired) {
        console.log('\n🔑 MFA Required - Fetching code...');
        
        // Aguardar um pouco para o MFA ser gerado
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mfaResponse = await fetch('http://localhost:3000/api/test-helpers/get-last-mfa');
        const mfaData = await mfaResponse.json();
        
        console.log('MFA Code:', mfaData.mfa?.code);
      }
    } else {
      console.log('\n❌ Login failed!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testLogin();
