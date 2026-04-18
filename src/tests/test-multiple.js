// Teste de múltiplos erros de validação
const testMultipleErrors = async () => {
  const testData = {
    email: 'teste.multiplos.erros@test.com',
    nomeCompleto: 'Teste Múltiplos Erros', 
    telefone: '123', // Telefone inválido
    dataNascimento: '32/13/1979', // Data inválida
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

testMultipleErrors();
