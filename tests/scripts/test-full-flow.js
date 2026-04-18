// Teste completo: login + criação de cliente
const fetch = require('node-fetch');

async function testFullFlow() {
  const baseUrl = 'http://localhost:3000';

  try {
    console.log('🚀 Iniciando teste completo: Login + Criação de Cliente\n');

    // 1. Fazer login
    console.log('1. Fazendo login com usuário ADMIN...');
    const loginData = {
      email: 'admin@gladpros.local',
      password: 'Admin@12345'
    };

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    const loginResult = await loginResponse.json();

    console.log('📊 Status do login:', loginResponse.status);

    if (!loginResponse.ok) {
      console.log('❌ Falha no login:', loginResult.error);
      return;
    }

    // Extrair o token do cookie
    const cookieHeader = loginResponse.headers.get('set-cookie');
    let authToken = null;

    if (cookieHeader) {
      const tokenMatch = cookieHeader.match(/authToken=([^;]+)/);
      if (tokenMatch) {
        authToken = tokenMatch[1];
        console.log('✅ Token obtido do cookie!');
      }
    }

    if (!authToken) {
      console.log('❌ Token não encontrado no cookie');
      console.log('📋 Headers de resposta:', loginResponse.headers.raw());
      return;
    }

    // 2. Testar criação de cliente
    console.log('\n2. Testando criação de cliente...');

    const clienteData = {
      nome: "João Silva Teste",
      nomeCompleto: "João Silva Teste da Silva",
      email: "joao.teste@email.com",
      telefone: "4693346918",
      endereco: "Rua das Flores, 123",
      empresa: "Empresa Teste LTDA",
      tipo: "PF",
      observacoes: "Cliente teste criado após correção de permissões"
    };

    const clienteResponse = await fetch(`${baseUrl}/api/clientes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `authToken=${authToken}`
      },
      body: JSON.stringify(clienteData)
    });

    console.log('📊 Status da criação:', clienteResponse.status);

    if (clienteResponse.ok) {
      const clienteResult = await clienteResponse.json();
      console.log('✅ Cliente criado com sucesso!');
      console.log('📋 Cliente criado:', JSON.stringify(clienteResult, null, 2));
      console.log('\n🎉 CORREÇÃO CONFIRMADA: Usuário ADMIN pode criar clientes!');
    } else {
      const errorResult = await clienteResponse.json();
      console.log('❌ Falha na criação do cliente:', errorResult);

      if (clienteResponse.status === 403) {
        console.log('🚫 Problema de permissões ainda persiste');
      }
    }

  } catch (error) {
    console.error('💥 Erro durante o teste:', error.message);
  }
}

testFullFlow()
  .then(() => console.log('\n✅ Teste completo finalizado!'))
  .catch(err => console.error('💥 Erro no teste:', err));