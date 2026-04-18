// Teste de validação de telefone inválido
const testPhoneValidation = async () => {
  const testData = {
    email: 'teste.telefone.invalido@test.com',
    nomeCompleto: 'Teste Telefone Inválido', 
    telefone: '123', // Telefone muito curto
    dataNascimento: '18/05/1979', // Data válida
    role: 'USUARIO',
    status: 'ATIVO'
  };
  
  try {
    const response = await fetch('http://localhost:3000/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response Text:', text);
    
    if (text) {
      try {
        const json = JSON.parse(text);
        console.log('Parsed JSON:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Could not parse as JSON:', e.message);
      }
    }
  } catch (error) {
    console.error('Fetch error:', error.message);
  }
};

testPhoneValidation();
