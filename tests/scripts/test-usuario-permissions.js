// Teste de permissões para usuário USUARIO
const fetch = require('node-fetch');

async function testUsuarioPermissions() {
  const baseUrl = 'http://localhost:3000';

  try {
    console.log('🚀 Testando permissões de USUARIO para criação de clientes\n');

    // Primeiro, criar um usuário USUARIO no banco
    console.log('1. Criando usuário USUARIO de teste...');

    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');

    const prisma = new PrismaClient();

    const userEmail = 'usuario@teste.com';
    const userPassword = 'Usuario@123';
    const hashedPassword = await bcrypt.hash(userPassword, 10);

    await prisma.usuario.upsert({
      where: { email: userEmail },
      update: { nivel: 'USUARIO', status: 'ATIVO' },
      create: {
        email: userEmail,
        senha: hashedPassword,
        nomeCompleto: 'Usuário Teste',
        nivel: 'USUARIO',
        status: 'ATIVO',
        endereco1: 'Rua Teste, 123',
        endereco2: '',
        cidade: 'São Paulo',
        estado: 'SP',
        zipcode: '01234-567',
        atualizadoEm: new Date(),
      },
    });

    console.log('✅ Usuário USUARIO criado/atualizado');

    await prisma.$disconnect();

    // 2. Fazer login com o usuário USUARIO
    console.log('\n2. Fazendo login com usuário USUARIO...');
    const loginData = {
      email: userEmail,
      password: userPassword
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
      return;
    }

    // 3. Testar criação de cliente
    console.log('\n3. Testando criação de cliente com usuário USUARIO...');

    const clienteData = {
      nome: "Maria Santos Teste",
      nomeCompleto: "Maria Santos Teste da Silva",
      email: "maria.teste@email.com",
      telefone: "4693346919",
      endereco: "Rua das Palmeiras, 456",
      empresa: "Empresa Teste 2 LTDA",
      tipo: "PF",
      observacoes: "Cliente teste criado por usuário USUARIO"
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
      console.log('✅ Cliente criado com sucesso por USUARIO!');
      console.log('📋 Cliente criado:', JSON.stringify(clienteResult, null, 2));
      console.log('\n🎉 CORREÇÃO CONFIRMADA: Usuário USUARIO pode criar clientes!');
    } else {
      const errorResult = await clienteResponse.json();
      console.log('❌ Falha na criação do cliente:', errorResult);

      if (clienteResponse.status === 403) {
        console.log('🚫 Problema de permissões: USUARIO ainda não pode criar clientes');
      }
    }

  } catch (error) {
    console.error('💥 Erro durante o teste:', error.message);
  }
}

testUsuarioPermissions()
  .then(() => console.log('\n✅ Teste de permissões USUARIO finalizado!'))
  .catch(err => console.error('💥 Erro no teste:', err));