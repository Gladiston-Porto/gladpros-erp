// Teste de criação de usuário válido
const testValidUser = async () => {
  const testData = {
    email: 'teste.usuario.valido@test.com',
    nomeCompleto: 'Teste Usuário Válido', 
    telefone: '11999999999', // Telefone válido
    dataNascimento: '18/05/1979', // Data válida
    role: 'USUARIO',
    status: 'ATIVO',
    anotacoes: 'Usuário de teste criado automaticamente'
  };
  
  try {
    const response = await fetch('http://localhost:3000/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    console.log('Status:', response.status);
    const text = await response.text();
    
    if (text) {
      try {
        const json = JSON.parse(text);
        console.log('Parsed JSON:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Could not parse as JSON:', e.message);
        console.log('Raw response:', text);
      }
    }
  } catch (error) {
    console.error('Fetch error:', error.message);
  }
};

testValidUser();
