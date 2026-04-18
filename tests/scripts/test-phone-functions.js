// Teste da função de formatação de telefone
const { formatTelefone } = require('./src/shared/lib/helpers/cliente-client.ts');

function testFormatTelefone() {
  console.log('📞 Testando função de formatação de telefone...\n');
  
  const testCases = [
    { input: '4693346918', expected: '(469)334-6918' },
    { input: '5551234567', expected: '(555)123-4567' },
    { input: '9876543210', expected: '(987)654-3210' },
    { input: '123456789', expected: '123456789' }, // 9 dígitos - não deve formatar
    { input: '12345678901', expected: '12345678901' }, // 11 dígitos - não deve formatar
    { input: '', expected: '' },
    { input: null, expected: '' }
  ];
  
  testCases.forEach((testCase, index) => {
    try {
      const result = formatTelefone(testCase.input);
      const status = result === testCase.expected ? '✅' : '❌';
      console.log(`${status} Teste ${index + 1}: "${testCase.input}" → "${result}" (esperado: "${testCase.expected}")`);
    } catch (error) {
      console.log(`💥 Erro no teste ${index + 1}: ${error.message}`);
    }
  });
  
  console.log('\n📞 Testes de formatação concluídos!');
}

// Simular a validação de 10 dígitos
function validatePhoneDigits(phone) {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10;
}

function testPhoneValidation() {
  console.log('\n🔍 Testando validação de 10 dígitos...\n');
  
  const testCases = [
    { input: '4693346918', valid: true },
    { input: '(469)334-6918', valid: true },
    { input: '469-334-6918', valid: true },
    { input: '469.334.6918', valid: true },
    { input: '469334691', valid: false }, // 9 dígitos
    { input: '14693346918', valid: false }, // 11 dígitos
    { input: '469334691234', valid: false }, // 12 dígitos
    { input: 'abc1234567', valid: false }, // letras
    { input: '', valid: false },
    { input: null, valid: false }
  ];
  
  testCases.forEach((testCase, index) => {
    const result = validatePhoneDigits(testCase.input);
    const status = result === testCase.valid ? '✅' : '❌';
    const digits = testCase.input ? testCase.input.replace(/\D/g, '') : '';
    console.log(`${status} Teste ${index + 1}: "${testCase.input}" → ${digits.length} dígitos (válido: ${result})`);
  });
  
  console.log('\n🔍 Testes de validação concluídos!');
}

console.log('🚀 Iniciando testes das funções de telefone...\n');
testFormatTelefone();
testPhoneValidation();
console.log('\n✅ Todos os testes concluídos!');