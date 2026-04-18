// Teste simples de validação da API - Formato MM/DD/YYYY
const testValidation = async () => {
  const testData = {
    email: 'teste.data.invalida@test.com',
    nomeCompleto: 'Teste Data Inválida', 
    dataNascimento: '13/32/1979', // Data inválida (mês 13, dia 32) em formato MM/DD/YYYY
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
    console.log('Headers:', Object.fromEntries(response.headers));
    
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

testValidation();
