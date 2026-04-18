const fetch = require('node-fetch');

async function testUpdate() {
  const baseUrl = 'http://localhost:3000';
  try {
    console.log('Buscando cookie de admin para autenticação...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gladpros.local', password: 'Admin@12345' })
    });
    const loginJson = await loginRes.json();
    console.log('Login status:', loginRes.status, 'response:', loginJson);

    const cookie = loginRes.headers.get('set-cookie');
    let authToken = null;
    if (cookie) {
      const m = cookie.match(/authToken=([^;]+)/);
      if (m) authToken = m[1];
    }

    if (!authToken) {
      console.log('Não foi possível obter token de autenticação. Abortando teste.');
      return;
    }

    const updateData = {
      endereco: 'Rua Nova, 999',
      telefone: '(469)334-6918'
    };

    console.log('Fazendo PUT /api/clientes/1 com telefone formatado:', updateData.telefone);

    const res = await fetch(`${baseUrl}/api/clientes/1`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `authToken=${authToken}`
      },
      body: JSON.stringify(updateData)
    });

    const json = await res.json();
    console.log('PUT status:', res.status);
    console.log('Resposta:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('Erro no teste:', e.message);
  }
}

testUpdate();