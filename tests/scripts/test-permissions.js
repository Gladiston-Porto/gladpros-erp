// Teste de permissões para criação de cliente
const fetch = require('node-fetch');

async function testClientePermissions() {
  const baseUrl = 'http://localhost:3002';

  // Dados do cliente para teste
  const clienteData = {
    nome: "João Silva Teste",
    email: "joao.teste@email.com",
    telefone: "4693346918",
    endereco: "Rua das Flores, 123",
    empresa: "Empresa Teste LTDA",
    observacoes: "Cliente teste para verificar permissões"
  };

  // Token JWT simulado para usuário (você pode precisar gerar um token real)
  const userToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoiVVNVQVJJTyIsImlhdCI6MTY4MzYwMDAwMCwiZXhwIjoxNjgzNjg2NDAwfQ.signature';

  try {
    console.log('🧪 Testando criação de cliente com permissões de USUARIO...');
    console.log('📋 Dados do cliente:', JSON.stringify(clienteData, null, 2));

    const response = await fetch(`${baseUrl}/api/clientes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(clienteData)
    });

    console.log('📊 Status da resposta:', response.status);

    if (response.status === 401) {
      console.log('🔐 Token inválido - isso é esperado se o token for simulado');
      console.log('✅ Sistema de autenticação está funcionando');
    } else if (response.status === 403) {
      console.log('🚫 Acesso negado - permissões ainda não foram corrigidas');
      const result = await response.json();
      console.log('📋 Detalhes:', result);
    } else if (response.ok) {
      const result = await response.json();
      console.log('✅ Cliente criado com sucesso!');
      console.log('📋 Resposta:', JSON.stringify(result, null, 2));
      console.log('🎉 Permissões corrigidas - usuário pode criar clientes!');
    } else {
      const result = await response.json();
      console.log('❌ Erro inesperado:', result);
    }

  } catch (error) {
    console.error('💥 Erro durante o teste:', error.message);
  }
}

console.log('🚀 Testando permissões do módulo de clientes...\n');
testClientePermissions()
  .then(() => console.log('\n✅ Teste de permissões concluído!'))
  .catch(err => console.error('💥 Erro no teste:', err));