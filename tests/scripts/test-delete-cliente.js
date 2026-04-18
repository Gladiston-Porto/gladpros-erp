const fetch = require('node-fetch');

async function testDelete() {
  const baseUrl = 'http://localhost:3000';
  try {
    // Login as GERENTE (create if needed)
    const gerenteEmail = 'gerente@teste.local';
    const gerentePassword = 'Gerente@123';

    // Ensure gerente exists via prisma upsert (run via API is easier here - assume seed exists)
    // For test we'll login as admin and then change role to GERENTE in DB
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gladpros.local', password: 'Admin@12345' })
    });
    const cookie = loginRes.headers.get('set-cookie') || '';
    const m = cookie.match(/authToken=([^;]+)/);
    const adminToken = m ? m[1] : null;
    if (!adminToken) return console.log('Admin token not found');

    // Call API to create a gerente user
    await fetch(`${baseUrl}/api/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `authToken=${adminToken}` },
      body: JSON.stringify({ email: gerenteEmail, password: gerentePassword, nomeCompleto: 'Gerente Teste', role: 'GERENTE' })
    }).catch(()=>{});

    // Now login as gerente
    const loginGerente = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: gerenteEmail, password: gerentePassword })
    });
    console.log('Gerente login status:', loginGerente.status);
    const cookieG = loginGerente.headers.get('set-cookie') || '';
    const mg = cookieG.match(/authToken=([^;]+)/);
    const gerenteToken = mg ? mg[1] : null;

    if (!gerenteToken) return console.log('Gerente token not found');

    // Attempt to delete cliente id 2
    const res = await fetch(`${baseUrl}/api/clientes/2`, {
      method: 'DELETE',
      headers: { 'Cookie': `authToken=${gerenteToken}` }
    });

    console.log('DELETE status:', res.status);
    const json = await res.json().catch(()=>({}));
    console.log('Response:', json);

  } catch (e) {
    console.error('Erro no teste:', e.message);
  }
}

testDelete();