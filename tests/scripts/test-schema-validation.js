// Teste direto da validação do schema de cliente
const { clienteCreateSchema } = require('./src/shared/lib/validations/cliente.ts');

function testSchemaValidation() {
  console.log('🧪 Testando validação do schema de cliente...\n');
  
  // Teste 1: Dados válidos com telefone americano
  const validData = {
    tipo: 'PF',
    nomeCompleto: 'João Silva',
    email: 'joao.silva@email.com',
    telefone: '4693346918', // 10 dígitos
    endereco1: 'Rua das Flores, 123',
    cidade: 'Dallas',
    estado: 'TX'
  };
  
  try {
    console.log('✅ Teste 1: Dados válidos');
    console.log('📋 Input:', JSON.stringify(validData, null, 2));
    const result = clienteCreateSchema.parse(validData);
    console.log('✅ Schema válido! Telefone processado:', result.telefone);
  } catch (error) {
    console.log('❌ Schema inválido:', error.errors);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Teste 2: Telefone com 9 dígitos (inválido)
  const invalidPhoneData = {
    tipo: 'PF',
    nomeCompleto: 'Maria Santos',
    email: 'maria.santos@email.com',
    telefone: '469334691', // 9 dígitos - inválido
    endereco1: 'Rua das Palmeiras, 456',
    cidade: 'Houston',
    estado: 'TX'
  };
  
  try {
    console.log('❌ Teste 2: Telefone inválido (9 dígitos)');
    console.log('📋 Input:', JSON.stringify(invalidPhoneData, null, 2));
    const result = clienteCreateSchema.parse(invalidPhoneData);
    console.log('⚠️ ALERTA: Schema deveria ter falhado, mas passou!', result.telefone);
  } catch (error) {
    console.log('✅ Schema rejeitou corretamente!');
    error.errors.forEach(err => {
      console.log(`   - ${err.path.join('.')}: ${err.message}`);
    });
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Teste 3: Telefone com formatação (deve ser limpo)
  const formattedPhoneData = {
    tipo: 'PF',
    nomeCompleto: 'Carlos Oliveira',
    email: 'carlos.oliveira@email.com',
    telefone: '(469) 334-6918', // Com formatação
    endereco1: 'Avenida Principal, 789',
    cidade: 'Austin',
    estado: 'TX'
  };
  
  try {
    console.log('🧹 Teste 3: Telefone com formatação');
    console.log('📋 Input:', JSON.stringify(formattedPhoneData, null, 2));
    const result = clienteCreateSchema.parse(formattedPhoneData);
    console.log('✅ Schema válido! Telefone limpo:', result.telefone);
  } catch (error) {
    console.log('❌ Schema inválido:', error.errors);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Teste 4: Telefone com 11 dígitos (inválido)
  const longPhoneData = {
    tipo: 'PF',
    nomeCompleto: 'Ana Costa',
    email: 'ana.costa@email.com',
    telefone: '14693346918', // 11 dígitos - inválido
    endereco1: 'Rua Secundária, 321',
    cidade: 'San Antonio',
    estado: 'TX'
  };
  
  try {
    console.log('❌ Teste 4: Telefone inválido (11 dígitos)');
    console.log('📋 Input:', JSON.stringify(longPhoneData, null, 2));
    const result = clienteCreateSchema.parse(longPhoneData);
    console.log('⚠️ ALERTA: Schema deveria ter falhado, mas passou!', result.telefone);
  } catch (error) {
    console.log('✅ Schema rejeitou corretamente!');
    error.errors.forEach(err => {
      console.log(`   - ${err.path.join('.')}: ${err.message}`);
    });
  }
}

console.log('🚀 Iniciando testes de validação do schema...\n');
testSchemaValidation();
console.log('\n✅ Testes de schema concluídos!');