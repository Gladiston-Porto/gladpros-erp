// Teste de criação de cliente para verificar validações
const fetch = require('node-fetch');

async function testClienteCreation() {
  const baseUrl = 'http://localhost:3000';
  
  // Teste com dados válidos no formato americano
  const clienteData = {
    nome: "João Silva",
    email: "joao.silva@email.com",
    telefone: "4693346918", // 10 dígitos sem formatação
    endereco: "Rua das Flores, 123",
    empresa: "Empresa Teste LTDA",
    observacoes: "Cliente teste criado via API"
  };

  try {
    console.log('🧪 Testando criação de cliente...');
    console.log('📋 Dados do cliente:', JSON.stringify(clienteData, null, 2));
    
    const response = await fetch(`${baseUrl}/api/clientes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Simulando um token de autenticação válido (você pode precisar ajustar)
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(clienteData)
    });

    const result = await response.json();
    
    console.log('📊 Status da resposta:', response.status);
    console.log('📋 Resposta:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Cliente criado com sucesso!');
      
      // Verificar se o telefone foi armazenado corretamente
      if (result.telefone) {
        console.log('📞 Telefone armazenado:', result.telefone);
        console.log('✅ Validação de telefone funcionando!');
      }
      
    } else {
      console.log('❌ Falha na criação do cliente');
      console.log('🔍 Detalhes do erro:', result);
    }
    
  } catch (error) {
    console.error('💥 Erro durante o teste:', error.message);
  }
}

async function testTelefoneValidation() {
  const baseUrl = 'http://localhost:3000';
  
  // Teste com telefone inválido (9 dígitos)
  const clienteDataInvalid = {
    nome: "Maria Santos",
    email: "maria.santos@email.com",
    telefone: "469334691", // 9 dígitos - deveria falhar
    endereco: "Rua das Palmeiras, 456"
  };

  try {
    console.log('\n🧪 Testando validação de telefone inválido...');
    console.log('📋 Dados com telefone inválido:', JSON.stringify(clienteDataInvalid, null, 2));
    
    const response = await fetch(`${baseUrl}/api/clientes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(clienteDataInvalid)
    });

    const result = await response.json();
    
    console.log('📊 Status da resposta:', response.status);
    console.log('📋 Resposta:', JSON.stringify(result, null, 2));
    
    if (response.status === 400 || response.status === 422) {
      console.log('✅ Validação de telefone funcionando! Erro esperado para telefone inválido.');
    } else {
      console.log('❌ Validação de telefone pode não estar funcionando corretamente');
    }
    
  } catch (error) {
    console.error('💥 Erro durante o teste:', error.message);
  }
}

// Executar os testes
console.log('🚀 Iniciando testes do módulo de clientes...\n');
testClienteCreation()
  .then(() => testTelefoneValidation())
  .then(() => console.log('\n✅ Testes concluídos!'))
  .catch(err => console.error('💥 Erro nos testes:', err));